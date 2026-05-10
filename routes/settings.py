"""Settings routes"""
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_token, extract_token, generate_id

router = APIRouter(prefix="/api/settings", tags=["settings"])

def _authenticate(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    if not token:
        return None
    return verify_token(token)

class SettingCreate(BaseModel):
    key: str
    value: str
    userId: Optional[str] = None

@router.get("")
async def list_settings(request: Request, key: str = Query(None)):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    conditions = []
    params = []
    
    if payload['role'] != 'admin':
        conditions.append("(user_id IS NULL OR user_id = ?)")
        params.append(payload['userId'])
    
    if key:
        conditions.append("setting_key = ?")
        params.append(key)
    
    where = " AND ".join(conditions) if conditions else "1=1"
    
    with get_db() as conn:
        rows = conn.execute(f"SELECT * FROM settings WHERE {where} ORDER BY setting_key ASC", params).fetchall()
    
    return {"data": [dict(row) for row in rows]}

@router.post("")
async def upsert_setting(request: Request, body: SettingCreate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    setting_user_id = body.userId if payload['role'] == 'admin' else payload['userId']
    
    with get_db() as conn:
        # Check if exists
        existing = conn.execute(
            "SELECT id FROM settings WHERE setting_key = ? AND (user_id = ? OR (user_id IS NULL AND ? IS NULL))",
            (body.key, setting_user_id, setting_user_id)
        ).fetchone()
        
        if existing:
            conn.execute(
                "UPDATE settings SET setting_value = ? WHERE id = ?",
                (body.value, existing['id'])
            )
            row = conn.execute("SELECT * FROM settings WHERE id = ?", (existing['id'],)).fetchone()
        else:
            setting_id = generate_id()
            conn.execute(
                "INSERT INTO settings (id, setting_key, setting_value, user_id) VALUES (?, ?, ?, ?)",
                (setting_id, body.key, body.value, setting_user_id)
            )
            row = conn.execute("SELECT * FROM settings WHERE id = ?", (setting_id,)).fetchone()
        
        return {"data": dict(row)}
