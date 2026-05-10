"""Ranges CRUD routes"""
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_token, extract_token, generate_id

router = APIRouter(prefix="/api/ranges", tags=["ranges"])

def _authenticate(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    if not token:
        return None
    return verify_token(token)

class RangeCreate(BaseModel):
    name: str
    providerId: Optional[str] = None
    countryCode: Optional[str] = None
    countryName: Optional[str] = None
    rate: Optional[float] = 0
    profitMargin: Optional[float] = 0
    otpLimitPerDay: Optional[int] = 0
    otpDailyResetHour: Optional[int] = 0
    allocationLimitGlobal: Optional[int] = 10000
    allocationLimitPerUser: Optional[int] = 100
    allocationPeriod: Optional[str] = 'daily'
    status: Optional[str] = 'active'

class RangeUpdate(BaseModel):
    name: Optional[str] = None
    providerId: Optional[str] = None
    countryCode: Optional[str] = None
    countryName: Optional[str] = None
    rate: Optional[float] = None
    profitMargin: Optional[float] = None
    otpLimitPerDay: Optional[int] = None
    otpDailyResetHour: Optional[int] = None
    allocationLimitGlobal: Optional[int] = None
    allocationLimitPerUser: Optional[int] = None
    allocationPeriod: Optional[str] = None
    status: Optional[str] = None

@router.get("")
async def list_ranges(
    request: Request,
    country: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
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
        conditions.append("country_code = ?")
        params.append(country)
    if status:
        conditions.append("status = ?")
        params.append(status)
    if search:
        conditions.append("(name LIKE ? OR country_name LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    
    where = " AND ".join(conditions) if conditions else "1=1"
    
    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT r.*, (SELECT COUNT(*) FROM numbers WHERE range_id = r.id) as numbers_count
                FROM ranges r WHERE {where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?""",
            params + [limit, offset]
        ).fetchall()
        
        total = conn.execute(f"SELECT COUNT(*) FROM ranges WHERE {where}", params).fetchone()[0]
    
    data = []
    for row in rows:
        d = dict(row)
        d['_count'] = {'numbers': d.pop('numbers_count', 0)}
        data.append(d)
    
    return {
        "data": data,
        "pagination": {
            "total": total, "page": page, "limit": limit,
            "totalPages": (total + limit - 1) // limit,
            "hasMore": offset + limit < total,
        },
    }

@router.post("")
async def create_range(request: Request, body: RangeCreate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM ranges WHERE name = ?", (body.name,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Range name already exists")
        
        range_id = generate_id()
        conn.execute(
            """INSERT INTO ranges (id, name, provider_id, country_code, country_name, rate, profit_margin,
               otp_limit_per_day, otp_daily_reset_hour, allocation_limit_global, allocation_limit_per_user,
               allocation_period, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (range_id, body.name, body.providerId, body.countryCode, body.countryName,
             body.rate, body.profitMargin, body.otpLimitPerDay, body.otpDailyResetHour,
             body.allocationLimitGlobal, body.allocationLimitPerUser, body.allocationPeriod, body.status)
        )
        
        row = conn.execute("SELECT * FROM ranges WHERE id = ?", (range_id,)).fetchone()
        return JSONResponse(status_code=201, content={"data": dict(row)})

@router.put("/{item_id}")
async def update_range(request: Request, item_id: str, body: RangeUpdate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM ranges WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Range not found")
        
        field_map = {
            'name': 'name', 'providerId': 'provider_id', 'countryCode': 'country_code',
            'countryName': 'country_name', 'rate': 'rate', 'profitMargin': 'profit_margin',
            'otpLimitPerDay': 'otp_limit_per_day', 'otpDailyResetHour': 'otp_daily_reset_hour',
            'allocationLimitGlobal': 'allocation_limit_global', 'allocationLimitPerUser': 'allocation_limit_per_user',
            'allocationPeriod': 'allocation_period', 'status': 'status',
        }
        
        updates = {}
        for py_key, db_key in field_map.items():
            val = getattr(body, py_key, None)
            if val is not None:
                updates[db_key] = val
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            conn.execute(f"UPDATE ranges SET {set_clause} WHERE id = ?", list(updates.values()) + [item_id])
        
        row = conn.execute("SELECT * FROM ranges WHERE id = ?", (item_id,)).fetchone()
        return {"data": dict(row)}

@router.delete("/{item_id}")
async def delete_range(request: Request, item_id: str):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM ranges WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Range not found")
        
        # Remove rangeId from associated numbers
        conn.execute("UPDATE numbers SET range_id = NULL, range_name = NULL WHERE range_id = ?", (item_id,))
        conn.execute("DELETE FROM ranges WHERE id = ?", (item_id,))
        
        return {"message": "Range deleted successfully", "deletedRange": existing['name']}
