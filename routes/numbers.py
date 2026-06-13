"""Main Numbers Management routes"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import re
from datetime import datetime
from database import get_db
from auth import generate_id
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/numbers", tags=["numbers"])

class NumberCreate(BaseModel):
    number: str
    countryName: Optional[str] = "Unknown"
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    service: Optional[str] = None
    status: Optional[str] = "active"
    assignedTo: Optional[str] = None
    rate: Optional[float] = 0.05
    profitMargin: Optional[float] = 50.0

@router.get("")
async def list_numbers(
    country: str = Query(None),
    service: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    rangeName: str = Query(None),
    assignedTo: str = Query(None),
    available: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    p=Depends(get_current_user)
):
    offset = (page - 1) * limit
    conds, params = [], []
    if p["role"] == "sub_reseller":
        conds.append("assigned_to = ?")
        params.append(p["username"])
    elif p["role"] == "reseller":
        conds.append("(assigned_to = ? OR assigned_to IN (SELECT username FROM users WHERE parent_id = ?))")
        params.extend([p["username"], p["id"]])

    if status: conds.append("status = ?"); params.append(status)
    if search: conds.append("(number LIKE ? OR country_name LIKE ?)"); params.extend([f"%{search}%"] * 2)

    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT * FROM numbers WHERE {where} ORDER BY created_at DESC LIMIT ? OFFSET ?"
        rows = conn.execute(q, params + [limit, offset]).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM numbers WHERE {where}", params).fetchone()[0]

    return {
        "data": [dict(r) for r in rows],
        "pagination": { "total": total, "page": page, "limit": limit, "totalPages": (total + limit - 1) // limit, "hasMore": offset + limit < total }
    }

@router.post("")
async def create_number(body: NumberCreate, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        nid = generate_id()
        conn.execute("INSERT INTO numbers (id,number,country_name,range_name,range_id,service,status,assigned_to,rate,profit_margin) VALUES (?,?,?,?,?,?,?,?,?,?)",
                     (nid, body.number, body.countryName, body.rangeName, body.rangeId, body.service, body.status, body.assignedTo, body.rate, body.profitMargin))
    return {"message": "Created"}

@router.get("/test-panel")
async def list_test_numbers(rangeId: str = Query(None), p=Depends(get_current_user)):
    with get_db() as conn:
        q = "SELECT * FROM ranges WHERE status = 'active'"
        params = []
        if rangeId: q += " AND id = ?"; params.append(rangeId)
        ranges = conn.execute(q, params).fetchall()
        result = []
        for r in ranges:
            nums = conn.execute("SELECT * FROM numbers WHERE range_id = ? AND status = 'active' ORDER BY RANDOM() LIMIT 10", (r["id"],)).fetchall()
            for n in nums:
                d = dict(n); d["range_name"] = r["name"]; result.append(d)
    return {"data": result}

@router.post("/{item_id}/revoke")
async def revoke_number(item_id: str, p=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute("UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE id=?", (item_id,))
    return {"message": "Revoked"}

@router.delete("/{item_id}")
async def delete_number(item_id: str, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM numbers WHERE id=?", (item_id,))
    return {"message": "Deleted"}
