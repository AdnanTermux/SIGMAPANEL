"""Users CRUD with strict role-based permissions"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Optional
import re
from database import get_db
from auth import verify_token, extract_token, generate_id, hash_password
from routes.deps import get_current_user, require_role

router = APIRouter(prefix="/api/users", tags=["users"])

# ── Role hierarchy ─────────────────────────────────────────────────────────────
CAN_CREATE = {
    "admin":    {"admin", "manager", "reseller", "sub_reseller"},
    "manager":  {"reseller", "sub_reseller"},
    "reseller": {"sub_reseller"},
    "sub_reseller": set(),
}

CAN_MANAGE_USERS = {"admin", "manager", "reseller"}

# ── Schemas ────────────────────────────────────────────────────────────────────

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
    notes: Optional[str] = None
    tags: Optional[str] = None
    commissionRate: Optional[float] = 0.0
    profitShare: Optional[float] = 0.0
    apiQuota: Optional[int] = 1000

    @validator("username")
    def validate_username(cls, v):
        v = v.strip().lower()
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', v):
            raise ValueError("Username must be 3-50 chars: letters, numbers, underscore only")
        return v

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @validator("email")
    def validate_email(cls, v):
        if v and v.strip():
            if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
                raise ValueError("Invalid email format")
            return v.strip().lower()
        return None

    @validator("phone")
    def validate_phone(cls, v):
        if v and v.strip():
            cleaned = re.sub(r'[\s\-\(\)]', '', v)
            if not re.match(r'^\+?[0-9]{7,20}$', cleaned):
                raise ValueError("Invalid phone number format")
            return cleaned
        return None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    fullName: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    balance: Optional[float] = None
    creditLimit: Optional[float] = None
    parentId: Optional[str] = None
    password: Optional[str] = None
    unlock: Optional[bool] = False
    notes: Optional[str] = None
    tags: Optional[str] = None
    commissionRate: Optional[float] = None
    profitShare: Optional[float] = None
    apiQuota: Optional[int] = None
    violation_reason: Optional[str] = None

# ── List ───────────────────────────────────────────────────────────────────────

@router.get("")
async def list_users(
    request: Request,
    search: str = Query(None),
    status: str = Query(None),
    role: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    p=Depends(get_current_user)
):
    if p["role"] not in CAN_MANAGE_USERS:
        raise HTTPException(403, "Not authorized to list users")

    offset = (page - 1) * limit
    conds, params = [], []

    if p["role"] == "manager":
        conds.append("(parent_id = ? OR parent_id IN (SELECT id FROM users WHERE parent_id = ?))")
        params.extend([p["id"], p["id"]])
    elif p["role"] == "reseller":
        conds.append("parent_id = ?")
        params.append(p["id"])

    if search:
        conds.append("(username LIKE ? OR full_name LIKE ? OR email LIKE ? OR phone LIKE ?)")
        params.extend([f"%{search}%"] * 4)
    if status:
        conds.append("status = ?")
        params.append(status)
    if role:
        conds.append("role = ?")
        params.append(role)

    where = " AND ".join(conds) if conds else "1=1"

    with get_db() as conn:
        rows = conn.execute(
            f"""SELECT u.id, u.username, u.email, u.role, u.status, u.full_name,
                       u.phone, u.country, u.address, u.balance, u.credit_limit,
                       u.violation_count, u.suspended_until, u.violation_reason,
                       u.api_token, u.notes, u.tags, u.commission_rate, u.profit_share,
                       u.api_quota, u.parent_id, u.last_login, u.created_at,
                       (SELECT COUNT(*) FROM users WHERE parent_id = u.id) as children_count
                FROM users u WHERE {where}
                ORDER BY u.created_at DESC LIMIT ? OFFSET ?""",
            params + [limit, offset],
        ).fetchall()
        total = conn.execute(f"SELECT COUNT(*) FROM users WHERE {where}", params).fetchone()[0]

    data = []
    for row in rows:
        d = dict(row)
        d["_count"] = {"children": d.pop("children_count", 0)}
        data.append(d)

    return {
        "data": data,
        "pagination": {
            "total": total, "page": page, "limit": limit,
            "totalPages": (total + limit - 1) // limit,
            "hasMore": offset + limit < total,
        },
    }

# ── Create ─────────────────────────────────────────────────────────────────────

@router.post("")
async def create_user(request: Request, body: UserCreate, p=Depends(require_role(['admin', 'manager']))):
    allowed = CAN_CREATE.get(p["role"], set())
    if body.role not in allowed:
        raise HTTPException(
            403,
            f"Your role ({p['role']}) cannot create '{body.role}' accounts. "
            f"Allowed: {', '.join(sorted(allowed)) or 'none'}"
        )

    with get_db() as conn:
        if conn.execute("SELECT id FROM users WHERE username=?", (body.username,)).fetchone():
            raise HTTPException(409, "Username already exists")
        if body.email and conn.execute("SELECT id FROM users WHERE email=?", (body.email,)).fetchone():
            raise HTTPException(409, "Email already in use")

        uid = generate_id()
        parent = body.parentId or p["id"]
        conn.execute(
            """INSERT INTO users
               (id,username,email,password,role,status,full_name,phone,country,address,
                parent_id,balance,credit_limit,notes,tags,commission_rate,profit_share,api_quota)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid, body.username, body.email, hash_password(body.password),
             body.role, "active", body.fullName, body.phone, body.country, body.address,
             parent, body.balance, body.creditLimit, body.notes, body.tags,
             body.commissionRate, body.profitShare, body.apiQuota),
        )
        row = conn.execute(
            """SELECT id,username,email,role,status,full_name,balance,credit_limit,
                      phone,country,address,parent_id,notes,tags,created_at
               FROM users WHERE id=?""", (uid,)
        ).fetchone()
    return JSONResponse(status_code=201, content={"data": dict(row)})

# ── Update ─────────────────────────────────────────────────────────────────────

@router.put("/{item_id}")
async def update_user(request: Request, item_id: str, body: UserUpdate, p=Depends(get_current_user)):
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")

        is_self = item_id == p["id"]
        if not is_self:
            if p["role"] == "sub_reseller":
                raise HTTPException(403, "Not authorized")
            if p["role"] == "reseller" and target["parent_id"] != p["id"]:
                raise HTTPException(403, "Not authorized to edit this user")
            if p["role"] == "manager":
                if target["role"] not in ("reseller", "sub_reseller"):
                    raise HTTPException(403, "Manager can only edit resellers and sub-resellers")

        updates = {}
        for py_key, db_key in [
            ("email","email"), ("fullName","full_name"), ("phone","phone"),
            ("country","country"), ("address","address"), ("timezone","timezone"),
            ("language","language"), ("notes","notes"), ("tags","tags"),
        ]:
            v = getattr(body, py_key, None)
            if v is not None:
                updates[db_key] = v

        if p["role"] in ("admin", "manager"):
            if body.balance is not None:       updates["balance"] = body.balance
            if body.creditLimit is not None:   updates["credit_limit"] = body.creditLimit
            if body.commissionRate is not None: updates["commission_rate"] = body.commissionRate
            if body.profitShare is not None:   updates["profit_share"] = body.profitShare
            if body.apiQuota is not None:      updates["api_quota"] = body.apiQuota
            if body.parentId is not None:      updates["parent_id"] = body.parentId

        if body.role is not None and body.role != target["role"]:
            if p["role"] != "admin":
                raise HTTPException(403, "Only admin can change roles")
            updates["role"] = body.role

        if body.status is not None and not is_self:
            if p["role"] in ("admin", "manager"):
                updates["status"] = body.status
                if body.violation_reason is not None:
                    updates["violation_reason"] = body.violation_reason

        if body.password:
            if len(body.password) < 6:
                raise HTTPException(400, "Password must be at least 6 characters")
            updates["password"] = hash_password(body.password)

        if body.unlock:
            updates["failed_login_attempts"] = 0
            updates["locked_until"] = None
            updates["suspended_until"] = None
            updates["status"] = "active"

        if updates:
            set_clause = ", ".join(f"{k}=?" for k in updates)
            conn.execute(f"UPDATE users SET {set_clause},updated_at=datetime('now') WHERE id=?",
                         list(updates.values()) + [item_id])

        row = conn.execute(
            """SELECT id,username,email,role,status,full_name,balance,credit_limit,
                      phone,country,address,violation_count,suspended_until,violation_reason,
                      api_token,notes,tags,commission_rate,profit_share,api_quota,
                      parent_id,last_login,created_at,updated_at FROM users WHERE id=?""", (item_id,)
        ).fetchone()
    return {"data": dict(row)}

# ── Delete ─────────────────────────────────────────────────────────────────────

@router.delete("/{item_id}")
async def delete_user(request: Request, item_id: str, p=Depends(require_role(["admin", "manager"]))):
    if item_id == p["id"]:
        raise HTTPException(400, "Cannot delete your own account")

    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager" and target["role"] not in ("reseller", "sub_reseller"):
            raise HTTPException(403, "Manager can only delete resellers and sub-resellers")

        conn.execute("UPDATE numbers SET assigned_to=NULL, assigned_at=NULL WHERE assigned_to=?",
                     (target["username"],))
        conn.execute("UPDATE users SET parent_id=? WHERE parent_id=?", (target["parent_id"], item_id))
        conn.execute("DELETE FROM settings WHERE user_id=?", (item_id,))
        conn.execute("DELETE FROM users WHERE id=?", (item_id,))

    return {"message": "User deleted", "deletedUser": target["username"]}

# ── Suspend / Block / Unblock ──────────────────────────────────────────────────

class SuspendBody(BaseModel):
    minutes: int
    reason: Optional[str] = "Policy violation"

@router.post("/{item_id}/suspend")
async def suspend_user(request: Request, item_id: str, body: SuspendBody, p=Depends(require_role(["admin", "manager"]))):
    from datetime import datetime, timedelta
    until = (datetime.utcnow() + timedelta(minutes=body.minutes)).isoformat()
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager" and target["role"] not in ("reseller", "sub_reseller"):
            raise HTTPException(403, "Not authorized")
        conn.execute(
            "UPDATE users SET status='suspended',suspended_until=?,violation_reason=? WHERE id=?",
            (until, body.reason, item_id)
        )
    return {"message": f"User suspended until {until}"}

@router.post("/{item_id}/unblock")
async def unblock_user(request: Request, item_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET status='active',suspended_until=NULL,violation_reason=NULL,"
            "failed_login_attempts=0,locked_until=NULL WHERE id=?", (item_id,)
        )
    return {"message": "User restored to active"}

class DeductBody(BaseModel):
    amount: float
    reason: str = "Policy violation"

@router.get("/activity-logs")
async def get_activity_logs(request: Request, p=Depends(require_role(["admin", "manager"]))):
    return {"data": []}

@router.get("/permissions")
async def get_permissions(request: Request, p=Depends(require_role(["admin"]))):
    return {"roles": CAN_CREATE}

@router.get("/registration-requests")
async def list_reg_requests(request: Request, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM registration_requests WHERE status='pending' ORDER BY created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/registration-requests/{req_id}/approve")
async def approve_reg_request(request: Request, req_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        req = conn.execute("SELECT * FROM registration_requests WHERE id=?", (req_id,)).fetchone()
        if not req: raise HTTPException(404, "Request not found")

        if conn.execute("SELECT id FROM users WHERE username=?", (req["username"],)).fetchone():
             conn.execute("UPDATE registration_requests SET status='rejected' WHERE id=?", (req_id,))
             raise HTTPException(400, "Username already exists. Request auto-rejected.")

        uid = generate_id()
        pw_hash = req["password"] or hash_password("Sigma123!")

        conn.execute(
            """INSERT INTO users (id, username, email, password, role, status, full_name, phone, country, parent_id)
               VALUES (?, ?, ?, ?, 'sub_reseller', 'active', ?, ?, ?, ?)""",
            (uid, req["username"], req["email"], pw_hash, req["full_name"], req["phone"], req["country"], p["id"])
        )
        conn.execute("UPDATE registration_requests SET status='approved' WHERE id=?", (req_id,))
    return {"message": "User approved and created"}

@router.post("/registration-requests/{req_id}/reject")
async def reject_reg_request(request: Request, req_id: str, p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        conn.execute("UPDATE registration_requests SET status='rejected' WHERE id=?", (req_id,))
    return {"message": "Request rejected"}

@router.post("/{item_id}/deduct-balance")
async def deduct_balance(request: Request, item_id: str, body: DeductBody, p=Depends(require_role(["admin", "manager"]))):
    """Manager or admin can deduct user balance as violation penalty"""
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager" and target["role"] not in ("reseller", "sub_reseller"):
            raise HTTPException(403, "Not authorized")
        before = float(target["balance"] or 0)
        after = max(0, before - body.amount)
        conn.execute("UPDATE users SET balance=? WHERE id=?", (after, item_id))
        tid = generate_id()
        conn.execute(
            """INSERT INTO transactions (id,user_id,username,tx_type,amount,balance_before,balance_after,note,created_by)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (tid, item_id, target["username"], "debit", -body.amount, before, after, body.reason, p["id"])
        )
    return {"message": f"Deducted ${body.amount:.4f}", "new_balance": after}
