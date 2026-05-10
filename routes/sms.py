"""SMS Reports routes"""
from fastapi import APIRouter, Request, HTTPException, Query
from database import get_db
from auth import verify_token, extract_token

router = APIRouter(prefix="/api/sms", tags=["sms"])

def _authenticate(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    if not token:
        return None
    return verify_token(token)

@router.get("")
async def list_sms(
    request: Request,
    service: str = Query(None),
    country: str = Query(None),
    number: str = Query(None),
    startDate: str = Query(None),
    endDate: str = Query(None),
    hasOtp: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    offset = (page - 1) * limit
    conditions = []
    params = []
    
    if service:
        conditions.append("service LIKE ?")
        params.append(f"%{service}%")
    if country:
        conditions.append("country = ?")
        params.append(country)
    if number:
        conditions.append("number LIKE ?")
        params.append(f"%{number}%")
    if hasOtp == 'true':
        conditions.append("otp IS NOT NULL")
    elif hasOtp == 'false':
        conditions.append("otp IS NULL")
    if startDate:
        conditions.append("received_at >= ?")
        params.append(startDate)
    if endDate:
        conditions.append("received_at <= ?")
        params.append(endDate + "T23:59:59")
    
    # Non-admin only sees their assigned numbers
    if payload['role'] != 'admin':
        conditions.append("assigned_to = ?")
        params.append(payload['username'])
    
    where = " AND ".join(conditions) if conditions else "1=1"
    
    with get_db() as conn:
        sms_list = conn.execute(
            f"SELECT * FROM sms_received WHERE {where} ORDER BY received_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset]
        ).fetchall()
        
        total = conn.execute(
            f"SELECT COUNT(*) FROM sms_received WHERE {where}",
            params
        ).fetchone()[0]
    
    return {
        "data": [dict(row) for row in sms_list],
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit,
            "hasMore": offset + limit < total,
        },
    }
