"""Transaction ledger, payout management, and balance logic"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import generate_id
from routes.deps import get_current_user, require_role
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

class PayoutRequestCreate(BaseModel):
    amount: float
    method: str
    walletAddress: Optional[str] = None
    note: Optional[str] = None

class BalanceAdjustRequest(BaseModel):
    userId: str
    amount: float
    note: Optional[str] = None

@router.get("/ledger")
async def get_ledger(request: Request, limit: int = Query(50, ge=1), p=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (p['id'], limit)).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/payout-request")
async def create_payout_request(request: Request, body: PayoutRequestCreate, p=Depends(get_current_user)):
    if not p: raise HTTPException(status_code=401)
    if body.amount < 50.0: raise HTTPException(400, "Minimum payout is $50.00")

    with get_db() as conn:
        user = conn.execute("SELECT balance FROM users WHERE id=?", (p['id'],)).fetchone()
        if user['balance'] < body.amount: raise HTTPException(400, "Insufficient balance")

        new_bal = user['balance'] - body.amount
        conn.execute("UPDATE users SET balance=? WHERE id=?", (new_bal, p['id']))

        rid = generate_id()
        conn.execute("INSERT INTO payout_requests (id, user_id, username, amount, method, wallet_address, note, status) VALUES (?,?,?,?,?,?,?,'pending')",
                     (rid, p['id'], p['username'], body.amount, body.method, body.walletAddress, body.note))

        conn.execute("INSERT INTO transactions (id, user_id, username, tx_type, amount, balance_before, balance_after, note) VALUES (?,?,?,?,?,?,?,?)",
                     (generate_id(), p['id'], p['username'], 'payout_hold', -body.amount, user['balance'], new_bal, f"Withdrawal: {body.method}"))

    return {"message": "Payout request submitted", "id": rid}

@router.get("/payout-requests")
async def list_payout_requests(request: Request, p=Depends(get_current_user)):
    if not p: raise HTTPException(status_code=401)
    conds, params = [], []
    if p['role'] not in ['admin', 'manager']:
        conds.append("user_id = ?"); params.append(p['id'])

    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT * FROM payout_requests WHERE {where} ORDER BY created_at DESC"
        rows = conn.execute(q, params).fetchall()
    return {"data": [dict(r) for r in rows]}

@router.put("/payout-requests/{rid}/approve")
async def approve_payout(rid: str, p=Depends(require_role(['admin', 'manager']))):
    with get_db() as conn:
        conn.execute("UPDATE payout_requests SET status='approved', reviewed_by=? WHERE id=?", (p['username'], rid))
    return {"message": "Payout approved"}

@router.put("/payout-requests/{rid}/reject")
async def reject_payout(rid: str, p=Depends(require_role(['admin', 'manager']))):
    with get_db() as conn:
        req = conn.execute("SELECT * FROM payout_requests WHERE id=?", (rid,)).fetchone()
        if req and req['status'] == 'pending':
            user = conn.execute("SELECT balance FROM users WHERE id=?", (req['user_id'],)).fetchone()
            new_bal = user['balance'] + req['amount']
            conn.execute("UPDATE users SET balance=? WHERE id=?", (new_bal, req['user_id']))
            conn.execute("UPDATE payout_requests SET status='rejected', reviewed_by=? WHERE id=?", (p['username'], rid))
    return {"message": "Payout rejected"}

@router.post("/payout-requests/{rid}/cancel")
async def cancel_payout(rid: str, p=Depends(get_current_user)):
    with get_db() as conn:
        req = conn.execute("SELECT * FROM payout_requests WHERE id=? AND user_id=?", (rid, p['id'])).fetchone()
        if not req: raise HTTPException(404, "Request not found")
        if req['status'] != 'pending': raise HTTPException(400, "Cannot cancel non-pending request")

        user = conn.execute("SELECT balance FROM users WHERE id=?", (p['id'],)).fetchone()
        new_bal = user['balance'] + req['amount']
        conn.execute("UPDATE users SET balance=? WHERE id=?", (new_bal, p['id']))
        conn.execute("DELETE FROM payout_requests WHERE id=?", (rid,))
        conn.execute("INSERT INTO transactions (id, user_id, username, tx_type, amount, balance_before, balance_after, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                     (generate_id(), p['id'], p['username'], 'payout_cancel', req['amount'], user['balance'], new_bal, "Payout cancelled by user"))
    return {"message": "Payout request cancelled"}

@router.post("/balance-adjust")
async def adjust_balance(body: BalanceAdjustRequest, p=Depends(require_role(['admin', 'manager']))):
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (body.userId,)).fetchone()
        if not target: raise HTTPException(404, "User not found")
        before = target['balance']
        after = before + body.amount
        conn.execute("UPDATE users SET balance=? WHERE id=?", (after, body.userId))
        conn.execute("INSERT INTO transactions (id, user_id, username, tx_type, amount, balance_before, balance_after, note, created_by) VALUES (?,?,?,?,?,?,?,?,?)",
                     (generate_id(), body.userId, target['username'], 'adjust', body.amount, before, after, body.note, p['username']))
    return {"message": "Balance adjusted"}
