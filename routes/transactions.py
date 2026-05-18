"""Transaction ledger, audit logs, pricing, support tickets, bulk number import"""
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_token, extract_token, generate_id
from datetime import datetime, timedelta
import csv, io

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

def _auth(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    return verify_token(token) if token else None

def _require(request: Request):
    p = _auth(request)
    if not p: raise HTTPException(401, "Authentication required")
    return p

def _admin(request: Request):
    p = _require(request)
    if p['role'] != 'admin': raise HTTPException(403, "Admin access required")
    return p

# ── Ledger ────────────────────────────────────────────────────────────────────

@router.get("/ledger")
async def get_ledger(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    tx_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    p = _require(request)
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    conds, params = ["created_at >= ?"], [cutoff]
    if p['role'] != 'admin':
        conds.append("user_id = ?"); params.append(p['userId'])
    if tx_type:
        conds.append("tx_type = ?"); params.append(tx_type)
    where = " AND ".join(conds)
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM transactions WHERE {where} ORDER BY created_at DESC LIMIT ?",
                             params + [limit]).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM transactions WHERE {where}", params).fetchone()[0]
    return {"data": [dict(r) for r in rows], "total": total}

@router.get("/ledger/export")
async def export_ledger(request: Request, days: int = Query(30, ge=1, le=365)):
    _admin(request)
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM transactions WHERE created_at >= ? ORDER BY created_at DESC", (cutoff,)).fetchall()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ID","User","Type","Amount","Before","After","Note","Date"])
    for r in rows:
        w.writerow([r['id'],r['username'],r['tx_type'],r['amount'],r['balance_before'],r['balance_after'],r['note'],r['created_at']])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ledger_{days}d.csv"})

# ── Balance adjust (admin) ────────────────────────────────────────────────────

class BalanceAdjust(BaseModel):
    userId: str
    amount: float
    note: Optional[str] = "Manual adjustment"

@router.post("/balance-adjust")
async def balance_adjust(request: Request, body: BalanceAdjust):
    _admin(request)
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (body.userId,)).fetchone()
        if not user: raise HTTPException(404, "User not found")
        before = user['balance'] or 0
        after = before + body.amount
        conn.execute("UPDATE users SET balance=? WHERE id=?", (after, body.userId))
        tid = generate_id()
        conn.execute("""INSERT INTO transactions (id,user_id,username,tx_type,amount,balance_before,balance_after,note)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (tid, body.userId, user['username'],
                      'credit' if body.amount >= 0 else 'debit',
                      body.amount, before, after, body.note))
    return {"message": "Balance adjusted", "new_balance": after}

# ── Balance transfer ──────────────────────────────────────────────────────────

class BalanceTransfer(BaseModel):
    fromUserId: str
    toUserId: str
    amount: float
    note: Optional[str] = ""

@router.post("/balance-transfer")
async def balance_transfer(request: Request, body: BalanceTransfer):
    p = _require(request)
    if body.amount <= 0: raise HTTPException(400, "Amount must be positive")
    with get_db() as conn:
        src = conn.execute("SELECT * FROM users WHERE id=?", (body.fromUserId,)).fetchone()
        dst = conn.execute("SELECT * FROM users WHERE id=?", (body.toUserId,)).fetchone()
        if not src or not dst: raise HTTPException(404, "User not found")
        if p['role'] != 'admin' and src['id'] != p['userId']:
            raise HTTPException(403, "Not authorized")
        if (src['balance'] or 0) < body.amount:
            raise HTTPException(400, "Insufficient balance")
        sb, db_ = src['balance'] or 0, dst['balance'] or 0
        conn.execute("UPDATE users SET balance=? WHERE id=?", (sb - body.amount, src['id']))
        conn.execute("UPDATE users SET balance=? WHERE id=?", (db_ + body.amount, dst['id']))
        note = body.note or f"Transfer to {dst['username']}"
        for uid, uname, typ, amt, bf, af in [
            (src['id'], src['username'], 'transfer_out', -body.amount, sb, sb-body.amount),
            (dst['id'], dst['username'], 'transfer_in',  body.amount, db_, db_+body.amount),
        ]:
            conn.execute("""INSERT INTO transactions (id,user_id,username,tx_type,amount,balance_before,balance_after,note)
                            VALUES (?,?,?,?,?,?,?,?)""", (generate_id(), uid, uname, typ, amt, bf, af, note))
    return {"message": f"Transferred ${body.amount:.4f} from {src['username']} to {dst['username']}"}

# ── Audit logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_logs(request: Request, days: int = Query(7, ge=1, le=90),
                          action: Optional[str] = Query(None), actor: Optional[str] = Query(None),
                          limit: int = Query(200, ge=1, le=500)):
    _admin(request)
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    conds, params = ["created_at >= ?"], [cutoff]
    if action: conds.append("action LIKE ?"); params.append(f"%{action}%")
    if actor:  conds.append("actor = ?"); params.append(actor)
    where = " AND ".join(conds)
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM audit_logs WHERE {where} ORDER BY created_at DESC LIMIT ?",
                             params + [limit]).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM audit_logs WHERE {where}", params).fetchone()[0]
    return {"data": [dict(r) for r in rows], "total": total}

# ── Pricing rules ─────────────────────────────────────────────────────────────

class PricingCreate(BaseModel):
    name: str
    scope: Optional[str] = 'global'
    role: Optional[str] = None
    rangeName: Optional[str] = None
    rate: Optional[float] = 0.0
    profitMargin: Optional[float] = 50.0

@router.get("/pricing")
async def list_pricing(request: Request):
    _require(request)
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM pricing_rules ORDER BY created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/pricing")
async def create_pricing(request: Request, body: PricingCreate):
    p = _require(request)
    with get_db() as conn:
        rid = generate_id()
        conn.execute("""INSERT INTO pricing_rules (id,name,scope,role,range_name,rate,profit_margin,created_by)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (rid, body.name, body.scope, body.role, body.rangeName, body.rate, body.profitMargin, p['userId']))
        row = conn.execute("SELECT * FROM pricing_rules WHERE id=?", (rid,)).fetchone()
    return JSONResponse(status_code=201, content={"data": dict(row)})

@router.put("/pricing/{rid}")
async def update_pricing(request: Request, rid: str, body: PricingCreate):
    _require(request)
    with get_db() as conn:
        if not conn.execute("SELECT id FROM pricing_rules WHERE id=?", (rid,)).fetchone():
            raise HTTPException(404, "Not found")
        conn.execute("""UPDATE pricing_rules SET name=?,scope=?,role=?,range_name=?,rate=?,profit_margin=? WHERE id=?""",
                     (body.name, body.scope, body.role, body.rangeName, body.rate, body.profitMargin, rid))
        row = conn.execute("SELECT * FROM pricing_rules WHERE id=?", (rid,)).fetchone()
    return {"data": dict(row)}

@router.delete("/pricing/{rid}")
async def delete_pricing(request: Request, rid: str):
    _admin(request)
    with get_db() as conn:
        if not conn.execute("SELECT id FROM pricing_rules WHERE id=?", (rid,)).fetchone():
            raise HTTPException(404, "Not found")
        conn.execute("DELETE FROM pricing_rules WHERE id=?", (rid,))
    return {"message": "Deleted"}

# ── Support tickets ───────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    subject: str
    message: str
    priority: Optional[str] = 'medium'

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    reply: Optional[str] = None

@router.get("/tickets")
async def list_tickets(request: Request, status: Optional[str] = Query(None),
                        priority: Optional[str] = Query(None)):
    p = _require(request)
    conds, params = [], []
    if p['role'] != 'admin':
        conds.append("user_id = ?"); params.append(p['userId'])
    if status: conds.append("status = ?"); params.append(status)
    if priority: conds.append("priority = ?"); params.append(priority)
    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM support_tickets WHERE {where} ORDER BY created_at DESC", params).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/tickets")
async def create_ticket(request: Request, body: TicketCreate):
    p = _require(request)
    with get_db() as conn:
        user = conn.execute("SELECT username FROM users WHERE id=?", (p['userId'],)).fetchone()
        tid = generate_id()
        conn.execute("""INSERT INTO support_tickets (id,user_id,username,subject,message,priority,status)
                        VALUES (?,?,?,?,?,?,?)""",
                     (tid, p['userId'], user['username'] if user else p.get('username',''), body.subject, body.message, body.priority, 'open'))
        row = conn.execute("SELECT * FROM support_tickets WHERE id=?", (tid,)).fetchone()
    return JSONResponse(status_code=201, content={"data": dict(row)})

@router.put("/tickets/{tid}")
async def update_ticket(request: Request, tid: str, body: TicketUpdate):
    p = _require(request)
    with get_db() as conn:
        t = conn.execute("SELECT * FROM support_tickets WHERE id=?", (tid,)).fetchone()
        if not t: raise HTTPException(404, "Ticket not found")
        if p['role'] != 'admin' and t['user_id'] != p['userId']:
            raise HTTPException(403, "Not authorized")
        upd = {}
        if body.status: upd['status'] = body.status
        if body.reply:  upd['reply'] = body.reply; upd['replied_at'] = datetime.utcnow().isoformat()
        if upd:
            conn.execute(f"UPDATE support_tickets SET {','.join(f'{k}=?' for k in upd)} WHERE id=?",
                         list(upd.values()) + [tid])
        row = conn.execute("SELECT * FROM support_tickets WHERE id=?", (tid,)).fetchone()
    return {"data": dict(row)}

# ── Blacklist ─────────────────────────────────────────────────────────────────

class BlacklistCreate(BaseModel):
    appName: str
    pattern: Optional[str] = None
    description: Optional[str] = None

@router.get("/blacklist")
async def list_blacklist(request: Request):
    _require(request)
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM blacklisted_apps ORDER BY created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/blacklist")
async def add_blacklist(request: Request, body: BlacklistCreate):
    p = _require(request)
    if p['role'] not in ('admin', 'manager'): raise HTTPException(403, "Admin/Manager only")
    with get_db() as conn:
        if conn.execute("SELECT id FROM blacklisted_apps WHERE app_name=?", (body.appName,)).fetchone():
            raise HTTPException(409, "App already blacklisted")
        bid = generate_id()
        conn.execute("INSERT INTO blacklisted_apps (id,app_name,pattern,description,is_active,created_by) VALUES (?,?,?,?,1,?)",
                     (bid, body.appName, body.pattern, body.description, p['userId']))
        row = conn.execute("SELECT * FROM blacklisted_apps WHERE id=?", (bid,)).fetchone()
    return JSONResponse(status_code=201, content={"data": dict(row)})

@router.put("/blacklist/{bid}")
async def update_blacklist(request: Request, bid: str, body: BlacklistCreate):
    p = _require(request)
    if p['role'] not in ('admin', 'manager'): raise HTTPException(403, "Admin/Manager only")
    with get_db() as conn:
        if not conn.execute("SELECT id FROM blacklisted_apps WHERE id=?", (bid,)).fetchone():
            raise HTTPException(404, "Not found")
        conn.execute("UPDATE blacklisted_apps SET app_name=?,pattern=?,description=? WHERE id=?",
                     (body.appName, body.pattern, body.description, bid))
        row = conn.execute("SELECT * FROM blacklisted_apps WHERE id=?", (bid,)).fetchone()
    return {"data": dict(row)}

@router.patch("/blacklist/{bid}/toggle")
async def toggle_blacklist(request: Request, bid: str):
    p = _require(request)
    if p['role'] not in ('admin', 'manager'): raise HTTPException(403, "Admin/Manager only")
    with get_db() as conn:
        r = conn.execute("SELECT * FROM blacklisted_apps WHERE id=?", (bid,)).fetchone()
        if not r: raise HTTPException(404, "Not found")
        conn.execute("UPDATE blacklisted_apps SET is_active=? WHERE id=?", (0 if r['is_active'] else 1, bid))
        row = conn.execute("SELECT * FROM blacklisted_apps WHERE id=?", (bid,)).fetchone()
    return {"data": dict(row)}

@router.delete("/blacklist/{bid}")
async def delete_blacklist(request: Request, bid: str):
    p = _require(request)
    if p['role'] not in ('admin', 'manager'): raise HTTPException(403, "Admin/Manager only")
    with get_db() as conn:
        if not conn.execute("SELECT id FROM blacklisted_apps WHERE id=?", (bid,)).fetchone():
            raise HTTPException(404, "Not found")
        conn.execute("DELETE FROM blacklisted_apps WHERE id=?", (bid,))
    return {"message": "Removed from blacklist"}
