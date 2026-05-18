"""Extended numbers routes: bulk import, assign range, return numbers"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import verify_token, extract_token, generate_id
from datetime import datetime
import re

router = APIRouter(prefix="/api/numbers-ext", tags=["numbers-ext"])

def _auth(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    return verify_token(token) if token else None

def _admin(request: Request):
    p = _auth(request)
    if not p: raise HTTPException(401, "Authentication required")
    if p['role'] != 'admin': raise HTTPException(403, "Admin access required")
    return p

class BulkImport(BaseModel):
    numbersText: str           # one number per line
    country: str
    countryName: Optional[str] = None
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    rate: Optional[float] = 0.0
    profitMargin: Optional[float] = 50.0

class AssignRange(BaseModel):
    rangeName: str
    username: str

class ReturnNumbers(BaseModel):
    username: Optional[str] = None
    rangeName: Optional[str] = None
    numberIds: Optional[List[str]] = None

class AllocateNumbers(BaseModel):
    rangeName: str
    quantity: int
    duration: str             # weekly | monthly | yearly | custom
    customDays: Optional[int] = None

@router.post("/bulk-import")
async def bulk_import(request: Request, body: BulkImport):
    _admin(request)
    lines = [l.strip() for l in body.numbersText.splitlines() if l.strip()]
    success, skipped, errors = 0, 0, []
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        for line in lines:
            num = re.sub(r'[\s\-\(\)]', '', line)
            if not num: continue
            if not num.startswith('+'): num = '+' + num
            if conn.execute("SELECT id FROM numbers WHERE number=?", (num,)).fetchone():
                skipped += 1; continue
            try:
                conn.execute("""INSERT INTO numbers (id,number,country,country_name,range_name,range_id,rate,profit_margin,status,total_sms)
                                VALUES (?,?,?,?,?,?,?,?,'active',0)""",
                             (generate_id(), num, body.country, body.countryName, body.rangeName, body.rangeId, body.rate, body.profitMargin))
                success += 1
            except Exception as e:
                errors.append(f"{num}: {e}")
        if body.rangeId:
            conn.execute("UPDATE ranges SET total_numbers=(SELECT COUNT(*) FROM numbers WHERE range_id=?) WHERE id=?",
                         (body.rangeId, body.rangeId))
    return {"success": success, "skipped": skipped, "errors": errors[:20], "total": len(lines)}

@router.post("/assign-range")
async def assign_range(request: Request, body: AssignRange):
    _admin(request)
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        nums = conn.execute("SELECT id FROM numbers WHERE range_name=? AND (assigned_to IS NULL OR assigned_to='')",
                             (body.rangeName,)).fetchall()
        count = 0
        for n in nums:
            conn.execute("UPDATE numbers SET assigned_to=?, assigned_at=? WHERE id=?",
                         (body.username, now, n['id']))
            count += 1
    return {"assigned": count, "to": body.username}

@router.post("/return-numbers")
async def return_numbers(request: Request, body: ReturnNumbers):
    _admin(request)
    with get_db() as conn:
        if body.numberIds:
            q = ",".join("?" * len(body.numberIds))
            conn.execute(f"UPDATE numbers SET assigned_to=NULL,assigned_at=NULL WHERE id IN ({q})", body.numberIds)
            count = len(body.numberIds)
        elif body.username and body.rangeName:
            r = conn.execute("UPDATE numbers SET assigned_to=NULL,assigned_at=NULL WHERE assigned_to=? AND range_name=?",
                              (body.username, body.rangeName))
            count = r.rowcount
        elif body.username:
            r = conn.execute("UPDATE numbers SET assigned_to=NULL,assigned_at=NULL WHERE assigned_to=?", (body.username,))
            count = r.rowcount
        elif body.rangeName:
            r = conn.execute("UPDATE numbers SET assigned_to=NULL,assigned_at=NULL WHERE range_name=?", (body.rangeName,))
            count = r.rowcount
        else:
            raise HTTPException(400, "Specify username, rangeName, or numberIds")
    return {"returned": count}

@router.post("/allocate")
async def allocate_numbers(request: Request, body: AllocateNumbers):
    p = _auth(request)
    if not p: raise HTTPException(401, "Authentication required")
    from datetime import timedelta
    now = datetime.utcnow()
    expires_map = {"weekly": 7, "monthly": 30, "yearly": 365}
    days = body.customDays if body.duration == "custom" else expires_map.get(body.duration, 30)
    expires_at = (now + timedelta(days=days)).isoformat()

    with get_db() as conn:
        rng = conn.execute("SELECT * FROM ranges WHERE name=?", (body.rangeName,)).fetchone()
        if not rng: raise HTTPException(404, "Range not found")
        if not rng['status'] == 'active': raise HTTPException(400, "Range is not active")

        per_user_limit = rng['allocation_limit_per_user'] or 100
        global_limit = rng['allocation_limit_global'] or 10000
        allocated = rng['allocated_numbers'] or 0

        if body.quantity > per_user_limit:
            raise HTTPException(400, f"Max {per_user_limit} numbers per request")
        if allocated + body.quantity > global_limit:
            remaining = global_limit - allocated
            if remaining <= 0:
                raise HTTPException(400, "Self-allocation limit reached for this range. Contact support for additional numbers.")
            raise HTTPException(400, f"Only {remaining} allocation slots available. Contact support for more.")

        available = conn.execute("""SELECT id,number FROM numbers WHERE range_name=? AND status='active'
                                    AND (assigned_to IS NULL OR assigned_to='') LIMIT ?""",
                                  (body.rangeName, body.quantity)).fetchall()
        if len(available) < body.quantity:
            raise HTTPException(400, f"Only {len(available)} numbers available in this range")

        now_str = now.isoformat()
        numbers_allocated = []
        for n in available:
            conn.execute("UPDATE numbers SET assigned_to=?,assigned_at=? WHERE id=?",
                         (p['username'], now_str, n['id']))
            numbers_allocated.append(n['number'])

        conn.execute("UPDATE ranges SET allocated_numbers=allocated_numbers+? WHERE id=?",
                     (body.quantity, rng['id']))

        alloc_id = generate_id()
        conn.execute("""INSERT INTO allocations (id,user_id,username,range_name,range_id,quantity,duration,expires_at,status,number_ids)
                        VALUES (?,?,?,?,?,?,?,?,'active',?)""",
                     (alloc_id, p['userId'], p['username'], body.rangeName, rng['id'],
                      body.quantity, body.duration, expires_at, ",".join(numbers_allocated)))

    return {"allocated": body.quantity, "expires_at": expires_at, "allocation_id": alloc_id}

@router.get("/allocations")
async def list_allocations(request: Request, status: Optional[str] = None):
    p = _auth(request)
    if not p: raise HTTPException(401, "Authentication required")
    with get_db() as conn:
        conds = [] if p['role'] == 'admin' else [f"user_id='{p['userId']}'"]
        if status: conds.append(f"status='{status}'")
        where = " AND ".join(conds) if conds else "1=1"
        rows = conn.execute(f"SELECT * FROM allocations WHERE {where} ORDER BY created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/allocations/{aid}/return")
async def return_allocation(request: Request, aid: str):
    p = _auth(request)
    if not p: raise HTTPException(401, "Authentication required")
    with get_db() as conn:
        alloc = conn.execute("SELECT * FROM allocations WHERE id=?", (aid,)).fetchone()
        if not alloc: raise HTTPException(404, "Allocation not found")
        if p['role'] != 'admin' and alloc['user_id'] != p['userId']:
            raise HTTPException(403, "Not authorized")
        if alloc['number_ids']:
            nums = [n for n in alloc['number_ids'].split(",") if n]
            for num in nums:
                conn.execute("UPDATE numbers SET assigned_to=NULL,assigned_at=NULL WHERE number=?", (num,))
            conn.execute("UPDATE ranges SET allocated_numbers=MAX(0,allocated_numbers-?) WHERE name=?",
                         (len(nums), alloc['range_name']))
        conn.execute("UPDATE allocations SET status='returned',returned_at=? WHERE id=?",
                     (datetime.utcnow().isoformat(), aid))
    return {"returned": len(nums) if alloc['number_ids'] else 0}
