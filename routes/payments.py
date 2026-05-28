"""Payment and Payout Requests"""
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_token, extract_token, generate_id
from datetime import datetime

router = APIRouter(prefix="/api/payments", tags=["payments"])

def _auth(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    return verify_token(token) if token else None

class PayoutRequest(BaseModel):
    amount: float
    method: str # Binance / USDT

@router.post("/requests")
async def create_payout_request(request: Request, body: PayoutRequest):
    p = _auth(request)
    if not p: raise HTTPException(401, "Auth required")
    if body.amount <= 0: raise HTTPException(400, "Invalid amount")

    with get_db() as conn:
        user = conn.execute("SELECT balance FROM users WHERE id=?", (p['userId'],)).fetchone()
        if user['balance'] < body.amount:
            raise HTTPException(400, "Insufficient balance")

        rid = generate_id()
        conn.execute("""INSERT INTO payment_requests (id, user_id, username, amount, method, status)
                        VALUES (?, ?, ?, ?, ?, 'pending')""",
                     (rid, p['userId'], p['username'], body.amount, body.method))
    return {"message": "Payout request submitted", "id": rid}

@router.get("/requests")
async def list_payout_requests(request: Request, status: Optional[str] = None):
    p = _auth(request)
    if not p: raise HTTPException(401, "Auth required")

    conds, params = [], []
    if p['role'] != 'admin':
        conds.append("user_id = ?"); params.append(p['userId'])
    if status:
        conds.append("status = ?"); params.append(status)

    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM payment_requests WHERE {where} ORDER BY created_at DESC", params).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/requests/{rid}/approve")
async def approve_payout(request: Request, rid: str):
    p = _auth(request)
    if p['role'] not in ('admin', 'manager'): raise HTTPException(403, "Unauthorized")

    with get_db() as conn:
        req = conn.execute("SELECT * FROM payment_requests WHERE id=?", (rid,)).fetchone()
        if not req: raise HTTPException(404, "Request not found")
        if req['status'] != 'pending': raise HTTPException(400, "Already processed")

        user = conn.execute("SELECT balance FROM users WHERE id=?", (req['user_id'],)).fetchone()
        if user['balance'] < req['amount']:
            conn.execute("UPDATE payment_requests SET status='rejected', rejection_reason='Insufficient balance' WHERE id=?", (rid,))
            raise HTTPException(400, "Insufficient user balance")

        # Deduct balance and approve
        new_bal = user['balance'] - req['amount']
        conn.execute("UPDATE users SET balance=? WHERE id=?", (new_bal, req['user_id']))
        conn.execute("UPDATE payment_requests SET status='approved' WHERE id=?", (rid,))

        # Log transaction
        conn.execute("""INSERT INTO transactions (id, user_id, username, tx_type, amount, balance_before, balance_after, note)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (generate_id(), req['user_id'], req['username'], 'payout', -req['amount'], user['balance'], new_bal, f"Payout approved: {req['method']}"))

    return {"message": "Payout approved"}

@router.post("/requests/{rid}/reject")
async def reject_payout(request: Request, rid: str, reason: str = "Policy violation"):
    p = _auth(request)
    if p['role'] not in ('admin', 'manager'): raise HTTPException(403, "Unauthorized")
    with get_db() as conn:
        conn.execute("UPDATE payment_requests SET status='rejected', rejection_reason=? WHERE id=?", (reason, rid))
    return {"message": "Payout rejected"}
