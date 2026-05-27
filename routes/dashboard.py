"""Dashboard - stats scoped by role"""
from fastapi import APIRouter, Request, HTTPException, Query
from database import get_db
from auth import verify_token, extract_token
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

def _require(request: Request):
    tok = extract_token(request.headers.get("Authorization"))
    p = verify_token(tok) if tok else None
    if not p: raise HTTPException(401, "Authentication required")
    return p

@router.get("/stats")
async def get_stats(request: Request):
    p = _require(request)
    now = datetime.utcnow()
    day_start   = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start  = (now - timedelta(days=now.weekday())).replace(hour=0,minute=0,second=0,microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    role = p["role"]
    username = p["username"]
    user_id  = p["userId"]

    with get_db() as conn:
        # SMS scope filter
        if role == "end_user":
            sms_cond = "assigned_to = ?"
            sms_param = username
        elif role == "reseller":
            my_users = [r["username"] for r in conn.execute(
                "SELECT username FROM users WHERE parent_id=?", (user_id,)
            ).fetchall()]
            names = [username] + my_users
            ph = ",".join("?"*len(names))
            sms_cond = f"assigned_to IN ({ph})"
            sms_param = names
        else:
            sms_cond = "1=1"
            sms_param = None

        def sms_count(extra_where=""):
            q = f"SELECT COUNT(*) FROM sms_received WHERE {sms_cond}"
            if extra_where: q += f" AND {extra_where}"
            if isinstance(sms_param, list): return conn.execute(q, sms_param).fetchone()[0]
            elif sms_param: return conn.execute(q, (sms_param,)).fetchone()[0]
            else: return conn.execute(q).fetchone()[0]

        today_sms = sms_count(f"received_at >= '{day_start}'")
        week_sms  = sms_count(f"received_at >= '{week_start}'")
        month_sms = sms_count(f"received_at >= '{month_start}'")

        # Numbers scope
        if role == "end_user":
            num_cond, num_p = "assigned_to=?", (username,)
        elif role == "reseller":
            num_cond = f"assigned_to IN ({ph})"
            num_p = tuple(names)
        else:
            num_cond, num_p = "1=1", ()

        total_numbers  = conn.execute(f"SELECT COUNT(*) FROM numbers WHERE {num_cond}", num_p).fetchone()[0]
        active_numbers = conn.execute(f"SELECT COUNT(*) FROM numbers WHERE {num_cond} AND status='active'", num_p).fetchone()[0]

        # Users count
        if role == "admin":
            total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        elif role == "manager":
            total_users = conn.execute("SELECT COUNT(*) FROM users WHERE role='reseller'").fetchone()[0]
        elif role == "reseller":
            total_users = conn.execute("SELECT COUNT(*) FROM users WHERE parent_id=?", (user_id,)).fetchone()[0]
        else:
            total_users = 0

        # Profit
        def profit_sum(extra=""):
            q = "SELECT COALESCE(SUM(profit_amount),0) FROM profit_log"
            if extra: q += f" WHERE {extra}"
            return conn.execute(q).fetchone()[0]

        today_profit = profit_sum(f"created_at >= '{day_start}'")
        month_profit = profit_sum(f"created_at >= '{month_start}'")

        # Chart: sms by day for last 7 days
        week_by_day = []
        for i in range(7):
            ds = (now - timedelta(days=6-i)).replace(hour=0,minute=0,second=0,microsecond=0)
            de = ds + timedelta(days=1)
            q = f"SELECT COUNT(*) FROM sms_received WHERE {sms_cond} AND received_at>=? AND received_at<?"
            args_base = list(sms_param) if isinstance(sms_param, list) else ([sms_param] if sms_param else [])
            cnt = conn.execute(q, args_base + [ds.isoformat(), de.isoformat()]).fetchone()[0]
            week_by_day.append({"date": ds.strftime("%Y-%m-%d"), "count": cnt})

        # Top services today
        q = f"SELECT service, COUNT(*) cnt FROM sms_received WHERE {sms_cond} AND service IS NOT NULL AND received_at>=? GROUP BY service ORDER BY cnt DESC LIMIT 8"
        args_base = list(sms_param) if isinstance(sms_param, list) else ([sms_param] if sms_param else [])
        svc_rows = conn.execute(q, args_base + [day_start]).fetchall()
        services = [{"service": r["service"], "count": r["cnt"]} for r in svc_rows]

    return {
        "todaySms": today_sms,
        "weekSms": week_sms,
        "monthSms": month_sms,
        "todayProfit": today_profit,
        "monthProfit": month_profit,
        "totalNumbers": total_numbers,
        "activeNumbers": active_numbers,
        "totalUsers": total_users,
        "todaySmsByService": services,
        "weekSmsByDay": week_by_day,
        "role": role,
    }

@router.get("/recent-sms")
async def recent_sms(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    p = _require(request)
    role, username, user_id = p["role"], p["username"], p["userId"]

    with get_db() as conn:
        if role == "end_user":
            cond, params = "assigned_to=?", [username]
        elif role == "reseller":
            my = [r["username"] for r in conn.execute("SELECT username FROM users WHERE parent_id=?", (user_id,)).fetchall()]
            names = [username] + my
            cond = f"assigned_to IN ({','.join('?'*len(names))})"
            params = names
        else:
            cond, params = "1=1", []

        rows = conn.execute(
            f"SELECT * FROM sms_received WHERE {cond} ORDER BY received_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM sms_received WHERE {cond}", params).fetchone()[0]

    return {
        "data": [dict(r) for r in rows],
        "pagination": {"total": total, "limit": limit, "offset": offset, "hasMore": offset+limit<total},
    }

@router.get("/analytics")
async def get_analytics(request: Request):
    p = _require(request)
    return {
        "sms_over_time": [],
        "profit_over_time": [],
        "success_rates": {"global": 0.98}
    }

@router.get("/live-activity")
async def get_live_activity(request: Request):
    p = _require(request)
    return {
        "active_users": 5,
        "active_numbers": 120,
        "recent_events": []
    }
