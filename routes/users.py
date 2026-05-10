"""Users CRUD routes"""
from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import verify_token, extract_token, hash_password, generate_id

router = APIRouter(prefix="/api/users", tags=["users"])

def _authenticate(request: Request):
    token = extract_token(request.headers.get('Authorization'))
    if not token:
        return None
    return verify_token(token)

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: Optional[str] = 'sub_reseller'
    fullName: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    parentId: Optional[str] = None
    balance: Optional[float] = 0
    creditLimit: Optional[float] = 0

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    fullName: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    balance: Optional[float] = None
    creditLimit: Optional[float] = None
    parentId: Optional[str] = None
    password: Optional[str] = None
    unlock: Optional[bool] = False

@router.get("")
async def list_users(
    request: Request,
    search: str = Query(None),
    status: str = Query(None),
    role: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    offset = (page - 1) * limit
    conditions = []
    params = []
    
    if payload['role'] != 'admin':
        conditions.append("parent_id = ?")
        params.append(payload['userId'])
    
    if search:
        conditions.append("(username LIKE ? OR full_name LIKE ? OR email LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    if status:
        conditions.append("status = ?")
        params.append(status)
    if role:
        conditions.append("role = ?")
        params.append(role)
    
    where = " AND ".join(conditions) if conditions else "1=1"
    
    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT u.*, (SELECT COUNT(*) FROM users WHERE parent_id = u.id) as children_count
                FROM users u WHERE {where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?""",
            params + [limit, offset]
        ).fetchall()
        
        total = conn.execute(f"SELECT COUNT(*) FROM users WHERE {where}", params).fetchone()[0]
    
    data = []
    for row in rows:
        d = dict(row)
        d['_count'] = {'children': d.pop('children_count', 0)}
        if 'password' in d:
            del d['password']
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
async def create_user(request: Request, body: UserCreate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE username = ?", (body.username.strip().lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
        
        if body.email:
            existing_email = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
            if existing_email:
                raise HTTPException(status_code=409, detail="Email already in use")
        
        hashed = hash_password(body.password)
        user_id = generate_id()
        conn.execute(
            """INSERT INTO users (id, username, email, password, role, status, full_name, phone, country, parent_id, balance, credit_limit)
               VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)""",
            (user_id, body.username.strip().lower(), body.email, hashed, body.role,
             body.fullName, body.phone, body.country, body.parentId, body.balance, body.creditLimit)
        )
        
        row = conn.execute(
            """SELECT id, username, email, role, status, full_name, balance, credit_limit, phone, country, parent_id, created_at
               FROM users WHERE id = ?""", (user_id,)
        ).fetchone()
        return JSONResponse(status_code=201, content={"data": dict(row)})

@router.put("/{item_id}")
async def update_user(request: Request, item_id: str, body: UserUpdate):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM users WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        field_map = {
            'email': 'email', 'role': 'role', 'status': 'status', 'fullName': 'full_name',
            'phone': 'phone', 'country': 'country', 'timezone': 'timezone', 'language': 'language',
            'balance': 'balance', 'creditLimit': 'credit_limit', 'parentId': 'parent_id',
        }
        
        updates = {}
        for py_key, db_key in field_map.items():
            val = getattr(body, py_key, None)
            if val is not None:
                updates[db_key] = val
        
        if body.password:
            updates['password'] = hash_password(body.password)
        
        if body.unlock:
            updates['failed_login_attempts'] = 0
            updates['locked_until'] = None
        
        if updates:
            set_clause = ", ".join(f"{k} = ?" for k in updates)
            conn.execute(f"UPDATE users SET {set_clause} WHERE id = ?", list(updates.values()) + [item_id])
        
        row = conn.execute(
            """SELECT id, username, email, role, status, full_name, balance, credit_limit, phone, country,
                      parent_id, last_login, created_at, updated_at FROM users WHERE id = ?""", (item_id,)
        ).fetchone()
        return {"data": dict(row)}

@router.delete("/{item_id}")
async def delete_user(request: Request, item_id: str):
    payload = _authenticate(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Authentication required")
    if payload['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    if item_id == payload['userId']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM users WHERE id = ?", (item_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Reassign children to parent
        conn.execute("UPDATE users SET parent_id = ? WHERE parent_id = ?", (existing['parent_id'], item_id))
        conn.execute("DELETE FROM settings WHERE user_id = ?", (item_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (item_id,))
        
        return {"message": "User deleted successfully", "deletedUser": existing['username']}
