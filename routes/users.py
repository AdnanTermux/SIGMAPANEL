"""Users CRUD with strict role-based permissions and data isolation"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from typing import Optional
import re
from database import get_db
from auth import verify_token, extract_token, generate_id, hash_password
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/users", tags=["users"])

# -- Role hierarchy --
CAN_CREATE = {
    "admin": {"admin", "manager", "reseller", "sub_reseller", "test_user"},
    "manager": {"reseller", "sub_reseller"},
    "reseller": {"sub_reseller"},
    "sub_reseller": set(),
}
CAN_MANAGE_USERS = {"admin", "manager", "reseller"}

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: Optional[str] = "sub_reseller"
    fullName: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    parentId: Optional[str] = None
    balance: Optional[float] = 0
    creditLimit: Optional[float] = 0
    self_allocation_limit: Optional[int] = 100
    self_allocation_limit_enabled: Optional[int] = 0

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', v):
            raise ValueError("Username must be 3-50 chars")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6: raise ValueError("Min 6 chars")
        return v

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    fullName: Optional[str] = None
    balance: Optional[float] = None
    password: Optional[str] = None
    self_allocation_limit: Optional[int] = None
    self_allocation_limit_enabled: Optional[int] = None

@router.get("")
async def list_users(search: str = Query(None), role: str = Query(None), p=Depends(get_current_user)):
    if p["role"] not in CAN_MANAGE_USERS: raise HTTPException(403)
    conds, params = [], []

    # BUG 16: FIX MANAGER VISIBILITY
    if p["role"] == "manager":
        conds.append("(id = ? OR parent_id = ? OR parent_id IN (SELECT id FROM users WHERE parent_id = ?))")
        params.extend([p["id"], p["id"], p["id"]])
    elif p["role"] == "reseller":
        conds.append("(id = ? OR parent_id = ?)")
        params.extend([p["id"], p["id"]])

    if search:
        conds.append("(username LIKE ? OR email LIKE ?)")
        params.extend([f"%{search}%"] * 2)
    if role:
        conds.append("role = ?"); params.append(role)

    where = " AND ".join(conds) if conds else "1=1"
    with get_db() as conn:
        q = f"SELECT u.*, (SELECT COUNT(*) FROM users WHERE parent_id = u.id) as children_count FROM users u WHERE {where} ORDER BY created_at DESC"
        rows = conn.execute(q, params).fetchall()

    data = []
    for r in rows:
        d = dict(r)
        if 'password' in d: del d['password']
        d["_count"] = {"children": d.pop("children_count")}
        data.append(d)
    return {"data": data}

@router.post("")
async def create_user(body: UserCreate, p=Depends(get_current_user)):
    if p["role"] not in CAN_MANAGE_USERS: raise HTTPException(403)
    allowed = CAN_CREATE.get(p["role"], set())
    if body.role not in allowed: raise HTTPException(403, "Cannot create this role")

    with get_db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE username=?", (body.username,)).fetchone(): raise HTTPException(409, "Exists")
        uid = generate_id()
        parent = body.parentId or p["id"]
        conn.execute(
            """INSERT INTO users (id,username,email,password,role,status,full_name,phone,country,parent_id,balance,self_allocation_limit,self_allocation_limit_enabled)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, body.username, body.email, hash_password(body.password), body.role, "active", body.fullName, body.phone, body.country, parent, body.balance, body.self_allocation_limit, body.self_allocation_limit_enabled)
        )
    return {"message": "User created", "id": uid}

@router.put("/{item_id}")
async def update_user(item_id: str, body: UserUpdate, p=Depends(get_current_user)):
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target: raise HTTPException(404)

        is_admin = p["role"] == "admin"
        is_self = item_id == p["id"]

        updates = {}
        if body.email: updates["email"] = body.email
        if body.fullName: updates["full_name"] = body.fullName
        if body.password: updates["password"] = hash_password(body.password)

        if is_admin:
            if body.role: updates["role"] = body.role
            if body.balance is not None: updates["balance"] = body.balance
            if body.status: updates["status"] = body.status
            if body.self_allocation_limit is not None: updates["self_allocation_limit"] = body.self_allocation_limit
            if body.self_allocation_limit_enabled is not None: updates["self_allocation_limit_enabled"] = body.self_allocation_limit_enabled

        if updates:
            conn.execute(f"UPDATE users SET {','.join(f'{k}=?' for k in updates)} WHERE id=?", list(updates.values()) + [item_id])
    return {"message": "Updated"}

@router.delete("/{item_id}")
async def delete_user(item_id: str, p=Depends(require_role(["admin"]))):
    if item_id == p["id"]: raise HTTPException(400)
    with get_db() as conn:
        conn.execute("DELETE FROM users WHERE id=?", (item_id,))
    return {"message": "Deleted"}

@router.get("/registration-requests")
async def list_reg_requests(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM registration_requests WHERE status='pending'").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/registration-requests/{req_id}/approve")
async def approve_reg_request(req_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        req = conn.execute("SELECT * FROM registration_requests WHERE id=?", (req_id,)).fetchone()
        if not req: raise HTTPException(404)
        uid = generate_id()
        conn.execute("INSERT INTO users (id,username,email,password,role,status,parent_id) VALUES (?,?,?,?,'sub_reseller','active',?)",
                     (uid, req["username"], req["email"], req["password"], p["id"]))
        conn.execute("UPDATE registration_requests SET status='approved' WHERE id=?", (req_id,))
    return {"message": "Approved"}

@router.post("/registration-requests/{req_id}/reject")
async def reject_reg_request(req_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        conn.execute("UPDATE registration_requests SET status='rejected' WHERE id=?", (req_id,))
    return {"message": "Rejected"}
