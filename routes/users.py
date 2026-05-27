"""Users CRUD with strict role-based permissions"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Optional
import re
from database import get_db
from auth import verify_token, extract_token, generate_id, hash_password
from routes.deps import require_role

router = APIRouter(prefix="/api/users", tags=["users"])

# ── Role hierarchy ─────────────────────────────────────────────────────────────
# admin    : full control
# manager  : create resellers, manage their numbers/balance, block/suspend, view all OTPs
# reseller : create end_users, assign numbers to users
# end_user : read-only — own numbers and messages only

CAN_CREATE = {
    "admin":    {"admin", "manager", "reseller", "end_user"},
    "manager":  {"reseller"},
    "reseller": {"end_user"},
    "end_user": set(),
}

CAN_MANAGE_USERS = {"admin", "manager", "reseller"}

def _auth(request: Request):
    tok = extract_token(request.headers.get("Authorization"))
    return verify_token(tok) if tok else None

def _require(request: Request):
    p = _auth(request)
    if not p:
        raise HTTPException(401, "Authentication required")
    return p

def _require_role(request: Request, *roles):
    p = _require(request)
    if p["role"] not in roles:
        raise HTTPException(403, f"Requires role: {', '.join(roles)}")
    return p

# ── Schemas ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: Optional[str] = "end_user"
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
):
    p = _require(request)
    if p["role"] not in CAN_MANAGE_USERS:
        raise HTTPException(403, "Not authorized to list users")

    offset = (page - 1) * limit
    conds, params = [], []

    # Scope visibility
    if p["role"] == "manager":
        # Manager sees all resellers (direct children and theirs)
        conds.append("(parent_id = ? OR role = 'reseller')")
        params.append(p["userId"])
    elif p["role"] == "reseller":
        conds.append("parent_id = ?")
        params.append(p["userId"])
    # admin sees all

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

@router.post("", dependencies=[Depends(require_role(['admin', 'manager']))])
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
        parent = body.parentId or p["userId"]
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
async def update_user(request: Request, item_id: str, body: UserUpdate):
    p = _require(request)

    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")

        # Permission: can actor manage this target?
        is_self = item_id == p["userId"]
        if not is_self:
            if p["role"] == "end_user":
                raise HTTPException(403, "Not authorized")
            if p["role"] == "reseller" and target["parent_id"] != p["userId"]:
                raise HTTPException(403, "Not authorized to edit this user")
            if p["role"] == "manager":
                # manager can edit resellers and their children
                if target["role"] not in ("reseller", "end_user"):
                    raise HTTPException(403, "Manager can only edit resellers and end-users")

        updates = {}

        # Profile fields (self or authorized manager/admin)
        for py_key, db_key in [
            ("email","email"), ("fullName","full_name"), ("phone","phone"),
            ("country","country"), ("address","address"), ("timezone","timezone"),
            ("language","language"), ("notes","notes"), ("tags","tags"),
        ]:
            v = getattr(body, py_key, None)
            if v is not None:
                updates[db_key] = v

        # Admin/manager only fields
        if p["role"] in ("admin", "manager"):
            if body.balance is not None:       updates["balance"] = body.balance
            if body.creditLimit is not None:   updates["credit_limit"] = body.creditLimit
            if body.commissionRate is not None: updates["commission_rate"] = body.commissionRate
            if body.profitShare is not None:   updates["profit_share"] = body.profitShare
            if body.apiQuota is not None:      updates["api_quota"] = body.apiQuota
            if body.parentId is not None:      updates["parent_id"] = body.parentId

        # Role change — only admin
        if body.role is not None and body.role != target["role"]:
            if p["role"] != "admin":
                raise HTTPException(403, "Only admin can change roles")
            updates["role"] = body.role

        # Status change — admin or manager (not self)
        if body.status is not None and not is_self:
            if p["role"] in ("admin", "manager"):
                updates["status"] = body.status
                if body.violation_reason is not None:
                    updates["violation_reason"] = body.violation_reason

        # Password
        if body.password:
            if len(body.password) < 6:
                raise HTTPException(400, "Password must be at least 6 characters")
            updates["password"] = hash_password(body.password)

        # Unlock
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
async def delete_user(request: Request, item_id: str):
    p = _require_role(request, "admin", "manager")
    if item_id == p["userId"]:
        raise HTTPException(400, "Cannot delete your own account")

    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager" and target["role"] not in ("reseller", "end_user"):
            raise HTTPException(403, "Manager can only delete resellers and end-users")

        # Unassign numbers belonging to this user
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
async def suspend_user(request: Request, item_id: str, body: SuspendBody):
    p = _require_role(request, "admin", "manager")
    from datetime import datetime, timedelta
    until = (datetime.utcnow() + timedelta(minutes=body.minutes)).isoformat()
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager" and target["role"] not in ("reseller", "end_user"):
            raise HTTPException(403, "Not authorized")
        conn.execute(
            "UPDATE users SET status='suspended',suspended_until=?,violation_reason=? WHERE id=?",
            (until, body.reason, item_id)
        )
    return {"message": f"User suspended until {until}"}

@router.post("/{item_id}/unblock")
async def unblock_user(request: Request, item_id: str):
    p = _require_role(request, "admin", "manager")
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET status='active',suspended_until=NULL,violation_reason=NULL,"
            "failed_login_attempts=0,locked_until=NULL WHERE id=?", (item_id,)
        )
    return {"message": "User restored to active"}

class DeductBody(BaseModel):
    amount: float
    reason: str = "Policy violation"

@router.post("/{item_id}/deduct-balance")
async def deduct_balance(request: Request, item_id: str, body: DeductBody):
    """Manager or admin can deduct user balance as violation penalty"""
    p = _require_role(request, "admin", "manager")
    if body.amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    with get_db() as conn:
        target = conn.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        if p["role"] == "manager" and target["role"] not in ("reseller", "end_user"):
            raise HTTPException(403, "Not authorized")
        before = float(target["balance"] or 0)
        after = max(0, before - body.amount)
        conn.execute("UPDATE users SET balance=? WHERE id=?", (after, item_id))
        tid = generate_id()
        conn.execute(
            """INSERT INTO transactions (id,user_id,username,tx_type,amount,balance_before,balance_after,note,created_by)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (tid, item_id, target["username"], "debit", -body.amount, before, after, body.reason, p["userId"])
        )
    return {"message": f"Deducted ${body.amount:.4f}", "new_balance": after}
