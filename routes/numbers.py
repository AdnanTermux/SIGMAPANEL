"""Numbers CRUD routes"""
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_token, extract_token, generate_id

router = APIRouter(prefix="/api/numbers", tags=["numbers"])

def _authenticate(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    if not token:
        return None
    return verify_token(token)

class NumberCreate(BaseModel):
    number: str
    country: Optional[str] = None
    countryName: Optional[str] = None
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    service: Optional[str] = None
    status: Optional[str] = 'active'
    assignedTo: Optional[str] = None
    rate: Optional[float] = 0
    profitMargin: Optional[float] = 0

class NumberUpdate(BaseModel):
    country: Optional[str] = None
    countryName: Optional[str] = None
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    service: Optional[str] = None
    status: Optional[str] = None
    assignedTo: Optional[str] = None
    rate: Optional[float] = None
    profitMargin: Optional[float] = None

@router.get("")
async def list_numbers(
    request: Request,
    country: str = Query(None),
    service: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    rangeName: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    offset = (page - 1) * limit
    conditions = []
    params = []
    
    if country:
        conditions.append("n.country = ?")
        params.append(country)
    if service:
        conditions.append("n.service LIKE ?")
        params.append(f"%{service}%")
    if status:
        conditions.append("n.status = ?")
        params.append(status)
    if rangeName:
        conditions.append("n.range_name = ?")
        params.append(rangeName)
    if search:
        conditions.append("(n.number LIKE ? OR n.country_name LIKE ? OR n.service LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    
    if payload['role'] != 'admin':
        conditions.append("n.assigned_to = ?")
        params.append(payload['username'])
    
    where = " AND ".join(conditions) if conditions else "1=1"
    
    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT n.*, r.name as range_status_name, r.status as range_status
                FROM numbers n LEFT JOIN ranges r ON n.range_id = r.id
                WHERE {where} ORDER BY n.last_sms_at DESC LIMIT ? OFFSET ?""",
            params + [limit, offset]
        ).fetchall()
        
        total = conn.execute(
            f"SELECT COUNT(*) FROM numbers n WHERE {where}", params
        ).fetchone()[0]
    
    return {
        "data": [dict(row) for row in rows],
        "pagination": {
            "total": total, "page": page, "limit": limit,
            "totalPages": (total + limit - 1) // limit,
            "hasMore": offset + limit < total,
        },
    }

@router.post("")
async def create_number(request: Request, body: NumberCreate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM numbers WHERE number = ?", (body.number,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Number already exists")
        
        num_id = generate_id()
        conn.execute(
            """INSERT INTO numbers (id, number, country, country_name, range_name, range_id, service, status, assigned_to, rate, profit_margin)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (num_id, body.number, body.country, body.countryName, body.rangeName, body.rangeId,
             body.service, body.status, body.assignedTo, body.rate, body.profitMargin)
        )
        
        row = conn.execute("SELECT * FROM numbers WHERE id = ?", (num_id,)).fetchone()
        return JSONResponse(status_code=201, content={"data": dict(row)})

@router.put("/{item_id}")
async def update_number(request: Request, item_id: str, body: NumberUpdate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM numbers WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Number not found")
        
        updates = {}
        if body.country is not None: updates['country'] = body.country
        if body.countryName is not None: updates['country_name'] = body.countryName
        if body.rangeName is not None: updates['range_name'] = body.rangeName
        if body.rangeId is not None: updates['range_id'] = body.rangeId
        if body.service is not None: updates['service'] = body.service
        if body.status is not None: updates['status'] = body.status
        if body.assignedTo is not None: updates['assigned_to'] = body.assignedTo
        if body.rate is not None: updates['rate'] = body.rate
        if body.profitMargin is not None: updates['profit_margin'] = body.profitMargin
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            conn.execute(f"UPDATE numbers SET {set_clause} WHERE id = ?", list(updates.values()) + [item_id])
        
        row = conn.execute("SELECT * FROM numbers WHERE id = ?", (item_id,)).fetchone()
        return {"data": dict(row)}

@router.delete("/{item_id}")
async def delete_number(request: Request, item_id: str):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM numbers WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Number not found")
        
        number_val = existing['number']
        conn.execute("DELETE FROM sms_received WHERE number = ?", (number_val,))
        conn.execute("DELETE FROM numbers WHERE id = ?", (item_id,))
        
        return {"message": "Number deleted successfully", "deletedNumber": number_val}
