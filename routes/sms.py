"""SMS Reports routes"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from database import get_db
from auth import verify_token, extract_token
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/sms", tags=["sms"])

@router.get("")
async def list_sms(
    request: Request,
    service: str = Query(None),
    number: str = Query(None),
    search: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    p=Depends(get_current_user)
):
    offset = (page - 1) * limit
    conds, params = [], []

    if p['role'] not in ['admin', 'manager', 'test_user']:
        conds.append("assigned_to = ?")
        params.append(p['username'])
    
    if service:
        conds.append("service LIKE ?"); params.append(f"%{service}%")
    if number:
        conds.append("number LIKE ?"); params.append(f"%{number}%")
    if search:
        conds.append("(message LIKE ? OR sender LIKE ? OR number LIKE ?)")
        params.extend([f"%{search}%"] * 3)
    
    where = " AND ".join(conds) if conds else "1=1"
    
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM sms_received WHERE {where} ORDER BY received_at DESC LIMIT ? OFFSET ?", params + [limit, offset]).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM sms_received WHERE {where}", params).fetchone()[0]
    
    return {
        "data": [dict(r) for r in rows],
        "pagination": { "total": total, "page": page, "limit": limit, "totalPages": (total + limit - 1) // limit, "hasMore": offset + limit < total }
    }

@router.get("/delivery-logs")
async def delivery_logs(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM sms_received WHERE otp IS NOT NULL ORDER BY received_at DESC LIMIT 100").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/failed")
async def failed_sms(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM firewall_events WHERE event_type='SMS_FAILED' ORDER BY created_at DESC LIMIT 100").fetchall()
    return {"data": [dict(r) for r in rows]}
