"""
Dependencies for FastAPI routes - Enterprise RBAC System
Role Hierarchy: super_admin → admin → manager → reseller → sub_reseller → user
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models.user import User, UserRole
from ..models.test_user import TestUser
from .security import decode_access_token

security = HTTPBearer()

# ── Role Level Map ──
ROLE_LEVELS = {
    UserRole.SUPER_ADMIN: 100,
    UserRole.ADMIN: 80,
    UserRole.MANAGER: 60,
    UserRole.RESELLER: 40,
    UserRole.SUB_RESELLER: 20,
    UserRole.USER: 10,
}

# ── Permission Matrix ──
# Each role's permissions define what they can do
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: {
        "manage_system": True, "manage_providers": True, "manage_settings": True,
        "backup_restore": True, "maintenance": True, "view_all_sms": True,
        "manage_all_users": True, "manage_finances": True, "manage_ranges": True,
        "manage_numbers": True, "view_all_numbers": True, "self_allocate": True,
        "view_live_access": True, "manage_commissions": True, "impersonate": True,
        "manage_smpp": True, "view_reports": True, "manage_support": True,
        "manage_api_tokens": True, "white_label": True,
    },
    UserRole.ADMIN: {
        "manage_system": False, "manage_providers": True, "manage_settings": True,
        "backup_restore": True, "maintenance": False, "view_all_sms": True,
        "manage_all_users": True, "manage_finances": True, "manage_ranges": True,
        "manage_numbers": True, "view_all_numbers": True, "self_allocate": True,
        "view_live_access": True, "manage_commissions": True, "impersonate": False,
        "manage_smpp": True, "view_reports": True, "manage_support": True,
        "manage_api_tokens": True, "white_label": True,
    },
    UserRole.MANAGER: {
        "manage_system": False, "manage_providers": False, "manage_settings": False,
        "backup_restore": False, "maintenance": False, "view_all_sms": True,
        "manage_all_users": False, "manage_finances": False, "manage_ranges": False,
        "manage_numbers": True, "view_all_numbers": True, "self_allocate": False,
        "view_live_access": True, "manage_commissions": False, "impersonate": False,
        "manage_smpp": False, "view_reports": True, "manage_support": False,
        "manage_api_tokens": False, "white_label": False,
    },
    UserRole.RESELLER: {
        "manage_system": False, "manage_providers": False, "manage_settings": False,
        "backup_restore": False, "maintenance": False, "view_all_sms": False,
        "manage_all_users": False, "manage_finances": True, "manage_ranges": False,
        "manage_numbers": False, "view_all_numbers": True, "self_allocate": True,
        "view_live_access": False, "manage_commissions": False, "impersonate": False,
        "manage_smpp": False, "view_reports": True, "manage_support": False,
        "manage_api_tokens": False, "white_label": False,
    },
    UserRole.SUB_RESELLER: {
        "manage_system": False, "manage_providers": False, "manage_settings": False,
        "backup_restore": False, "maintenance": False, "view_all_sms": False,
        "manage_all_users": False, "manage_finances": True, "manage_ranges": False,
        "manage_numbers": False, "view_all_numbers": False, "self_allocate": True,
        "view_live_access": False, "manage_commissions": False, "impersonate": False,
        "manage_smpp": False, "view_reports": True, "manage_support": False,
        "manage_api_tokens": False, "white_label": False,
    },
    UserRole.USER: {
        "manage_system": False, "manage_providers": False, "manage_settings": False,
        "backup_restore": False, "maintenance": False, "view_all_sms": False,
        "manage_all_users": False, "manage_finances": False, "manage_ranges": False,
        "manage_numbers": False, "view_all_numbers": False, "self_allocate": False,
        "view_live_access": False, "manage_commissions": False, "impersonate": False,
        "manage_smpp": False, "view_reports": False, "manage_support": False,
        "manage_api_tokens": False, "white_label": False,
    },
}

# ── Helper functions ──
def has_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission"""
    role_perms = ROLE_PERMISSIONS.get(user.role, {})
    return role_perms.get(permission, False)

def get_accessible_user_ids(user: User, db: Session) -> List[int]:
    """Get IDs of users accessible to current user (recursive parent-child)"""
    if user.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        all_users = db.query(User.id).filter(User.status == "active").all()
        return [u.id for u in all_users]
    
    accessible = [user.id]
    def get_children(parent_id):
        children = db.query(User.id).filter(User.parent_id == parent_id, User.status == "active").all()
        for child in children:
            accessible.append(child.id)
            get_children(child.id)
    
    get_children(user.id)
    return accessible

def can_manage_user(actor: User, target: User) -> bool:
    """Check if actor can manage target user"""
    actor_level = ROLE_LEVELS.get(actor.role, 0)
    target_level = ROLE_LEVELS.get(target.role, 0)
    if actor_level <= target_level:
        return False
    # Check parent-child chain
    if actor.role in (UserRole.SUPER_ADMIN, UserRole.ADMIN):
        return True
    # Recursive check
    parent_id = target.parent_id
    while parent_id:
        if parent_id == actor.id:
            return True
        parent = db.query(User).filter(User.id == parent_id).first()
        if not parent:
            break
        parent_id = parent.parent_id
    return False

def should_mask_data(user: User) -> bool:
    """Check if user should see masked data (Reseller: OTP visible, app+message masked)"""
    return user.role in (UserRole.RESELLER, UserRole.SUB_RESELLER, UserRole.USER)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    username = payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is not active")
    return user

def get_current_test_user(request: Request, db: Session = Depends(get_db)) -> TestUser:
    """Get current authenticated test user from session"""
    test_username = request.session.get("test_username")
    if not test_username:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    test_user = db.query(TestUser).filter(TestUser.username == test_username).first()
    if not test_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Test user not found")
    if test_user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Test user account is blocked")
    return test_user

def require_permission(permission: str):
    """Dependency that requires a specific permission"""
    def checker(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Permission denied: {permission}")
        return current_user
    return checker

def require_min_role(min_role: UserRole):
    """Dependency that requires minimum role level"""
    def checker(current_user: User = Depends(get_current_user)):
        user_level = ROLE_LEVELS.get(current_user.role, 0)
        required_level = ROLE_LEVELS.get(min_role, 0)
        if user_level < required_level:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires {min_role.value} or higher role")
        return current_user
    return checker

get_current_super_admin = require_min_role(UserRole.SUPER_ADMIN)
get_current_admin = require_min_role(UserRole.ADMIN)
get_current_manager = require_min_role(UserRole.MANAGER)

def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            return None
        user = db.query(User).filter(User.username == payload["sub"]).first()
        return user if user and user.status == "active" else None
    except:
        return None
