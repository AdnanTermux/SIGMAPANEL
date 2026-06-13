"""Extended numbers routes for bulk operations, allocation, and real exports"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import generate_id
from routes.deps import get_current_user, require_role
from datetime import datetime
import re, io, csv
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

router = APIRouter(prefix="/api/numbers-ext", tags=["numbers-ext"])

class BulkImport(BaseModel):
    numbersText: str
    countryName: Optional[str] = "Unknown"
    rangeName: Optional[str] = None
    rangeId: Optional[str] = None
    rate: Optional[float] = 0.05
    profitMargin: Optional[float] = 50.0

class BulkRevokeRequest(BaseModel):
    scope: str  # global | user | range
    userId: Optional[str] = None
    rangeName: Optional[str] = None

class BulkAllocateRequest(BaseModel):
    userId: str
    rangeName: str
    quantity: int

class AllocateNumbers(BaseModel):
    rangeName: str
    quantity: int
    duration: Optional[str] = "monthly"

@router.get("/export")
async def export_numbers(
    format: str = Query("csv"),
    rangeName: Optional[str] = Query(None),
    p=Depends(get_current_user)
):
    if p['role'] not in ['admin', 'manager']:
        q = "SELECT number, range_name, country_name, status, assigned_at FROM numbers WHERE assigned_to = ?"
        params = [p['username']]
    else:
        q = "SELECT number, range_name, country_name, status, assigned_to, assigned_at FROM numbers"
        params = []
        if rangeName and rangeName != "all":
            q += " WHERE range_name = ?"
            params.append(rangeName)

    with get_db() as conn:
        rows = conn.execute(q, params).fetchall()
        if not rows: raise HTTPException(404, "No numbers found")
        df = pd.DataFrame([dict(r) for r in rows])

    filename = f"export_{datetime.now().strftime('%Y%m%d')}"

    if format == "csv":
        stream = io.StringIO()
        df.to_csv(stream, index=False)
        return StreamingResponse(io.BytesIO(stream.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}.csv"})
    elif format == "txt":
        content = "\n".join(df['number'].tolist())
        return StreamingResponse(io.BytesIO(content.encode()), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename={filename}.txt"})
    elif format == "xlsx":
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        return StreamingResponse(io.BytesIO(output.getvalue()), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"})
    elif format == "pdf":
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        y = 750
        c.drawString(50, y, f"Numbers Export - {datetime.now().strftime('%Y-%m-%d')}")
        y -= 30
        for i, row in df.head(100).iterrows():
            c.drawString(50, y, f"{row['number']} | {row.get('range_name','-')}")
            y -= 15
            if y < 50: c.showPage(); y = 750
        c.save()
        return StreamingResponse(io.BytesIO(buffer.getvalue()), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}.pdf"})

    raise HTTPException(400, "Unsupported format")

@router.post("/bulk-import")
async def bulk_import(body: BulkImport, p=Depends(require_role(["admin", "manager", "test_user"]))):
    lines = [l.strip() for l in body.numbersText.splitlines() if l.strip()]
    success = 0
    with get_db() as conn:
        for line in lines:
            num = re.sub(r'[\s\-\(\)]', '', line)
            if not num.startswith('+'): num = '+' + num
            try:
                conn.execute("INSERT OR IGNORE INTO numbers (id,number,country_name,range_name,range_id,rate,profit_margin,status,assigned_to) VALUES (?,?,?,?,?,?,?,?,?)",
                             (generate_id(), num, body.countryName, body.rangeName, body.rangeId, body.rate, body.profitMargin, 'active', p['username'] if p['role']=='test_user' else None))
                success += 1
            except: pass
    return {"success": success}

@router.post("/bulk-allocate")
async def bulk_allocate(body: BulkAllocateRequest, p=Depends(require_role(["admin", "manager"]))):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        user = conn.execute("SELECT username FROM users WHERE id=?", (body.userId,)).fetchone()
        available = conn.execute("SELECT id FROM numbers WHERE range_name=? AND (assigned_to IS NULL OR assigned_to='') LIMIT ?", (body.rangeName, body.quantity)).fetchall()
        if len(available) < body.quantity: raise HTTPException(400, "Insufficient numbers")
        for n in available:
            conn.execute("UPDATE numbers SET assigned_to=?, assigned_at=? WHERE id=?", (user['username'], now, n['id']))
    return {"message": "Allocated"}

@router.post("/allocate")
async def allocate_numbers(body: AllocateNumbers, p=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (p['id'],)).fetchone()
        if user['self_allocation_limit_enabled']:
            curr = conn.execute("SELECT COUNT(*) FROM numbers WHERE assigned_to=?", (p['username'],)).fetchone()[0]
            if curr + body.quantity > user['self_allocation_limit']: raise HTTPException(400, "Self-allocation limit reached")

        available = conn.execute("SELECT id FROM numbers WHERE range_name=? AND (assigned_to IS NULL OR assigned_to='') LIMIT ?", (body.rangeName, body.quantity)).fetchall()
        if len(available) < body.quantity: raise HTTPException(400, "Stock empty")
        for n in available:
            conn.execute("UPDATE numbers SET assigned_to=?, assigned_at=? WHERE id=?", (p['username'], now, n['id']))
    return {"allocated": len(available)}

@router.post("/bulk-revoke")
async def bulk_revoke(body: BulkRevokeRequest, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        if body.scope == "global": conn.execute("UPDATE numbers SET assigned_to=NULL")
        elif body.scope == "range": conn.execute("UPDATE numbers SET assigned_to=NULL WHERE range_name=?", (body.rangeName,))
    return {"message": "Revoked"}

@router.get("/blacklist")
async def list_blacklist(p=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM blacklisted_apps").fetchall()
    return {"data": [dict(r) for r in rows]}
