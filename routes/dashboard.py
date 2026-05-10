"""Dashboard routes - Stats and Recent SMS"""
from fastapi import APIRouter, Request, HTTPException, Query
from database import get_db
from auth import verify_token, extract_token

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_stats(request: Request):
    auth_header = request.headers.get('Authorization')
    token = extract_token(auth_header)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_day - timedelta(days=now.weekday())
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    with get_db() as conn:
        today_sms = conn.execute(
            "SELECT COUNT(*) FROM sms_received WHERE received_at >= ?", (start_of_day.isoformat(),)
        ).fetchone()[0]
        
        week_sms = conn.execute(
            "SELECT COUNT(*) FROM sms_received WHERE received_at >= ?", (start_of_week.isoformat(),)
        ).fetchone()[0]
        
        month_sms = conn.execute(
            "SELECT COUNT(*) FROM sms_received WHERE received_at >= ?", (start_of_month.isoformat(),)
        ).fetchone()[0]
        
        today_profit = conn.execute(
            "SELECT COALESCE(SUM(profit_amount), 0) FROM profit_log WHERE created_at >= ?", (start_of_day.isoformat(),)
        ).fetchone()[0]
        
        month_profit = conn.execute(
            "SELECT COALESCE(SUM(profit_amount), 0) FROM profit_log WHERE created_at >= ?", (start_of_month.isoformat(),)
        ).fetchone()[0]
        
        total_numbers = conn.execute("SELECT COUNT(*) FROM numbers").fetchone()[0]
        active_numbers = conn.execute("SELECT COUNT(*) FROM numbers WHERE status = 'active'").fetchone()[0]
        total_users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        
        # Today SMS by service (top 10)
        service_rows = conn.execute(
            """SELECT service, COUNT(*) as cnt FROM sms_received
               WHERE received_at >= ? AND service IS NOT NULL
               GROUP BY service ORDER BY cnt DESC LIMIT 10""",
            (start_of_day.isoformat(),)
        ).fetchall()
        today_sms_by_service = [{"service": r['service'], "count": r['cnt']} for r in service_rows]
        
        # Weekly SMS by day for chart
        week_sms_by_day = []
        for i in range(7):
            day_start = now - timedelta(days=6 - i)
            day_start = day_start.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = conn.execute(
                "SELECT COUNT(*) FROM sms_received WHERE received_at >= ? AND received_at < ?",
                (day_start.isoformat(), day_end.isoformat())
            ).fetchone()[0]
            week_sms_by_day.append({"date": day_start.strftime('%Y-%m-%d'), "count": count})
    
    return {
        "todaySms": today_sms,
        "weekSms": week_sms,
        "monthSms": month_sms,
        "todayProfit": today_profit,
        "monthProfit": month_profit,
        "totalNumbers": total_numbers,
        "activeNumbers": active_numbers,
        "totalUsers": total_users,
        "todaySmsByService": today_sms_by_service,
        "weekSmsByDay": week_sms_by_day,
    }

@router.get("/recent-sms")
async def get_recent_sms(request: Request, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
    auth_header = request.headers.get('Authorization')
    token = extract_token(auth_header)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, number, sender, recipient, service, country, range_name, otp, message,
                      assigned_to, rate, profit, received_at
               FROM sms_received ORDER BY received_at DESC LIMIT ? OFFSET ?""",
            (limit, offset)
        ).fetchall()
        
        total = conn.execute("SELECT COUNT(*) FROM sms_received").fetchone()[0]
    
    return {
        "data": [dict(row) for row in rows],
        "pagination": {"total": total, "limit": limit, "offset": offset, "hasMore": offset + limit < total},
    }
