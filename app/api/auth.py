"""
Authentication API Routes
Login, logout, register, profile management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any

from ..database import get_db
from ..models.user import User
from ..models.security_log import SecurityLog
from ..schemas.user import UserLogin, UserCreate, UserResponse, UserUpdate
from ..core.security import verify_password, hash_password, create_access_token
from ..core.deps import get_current_user, get_current_admin
from ..config import settings

router = APIRouter()


def _safe_log(db, **kwargs):
    """Write security log without crashing if table missing"""
    try:
        log = SecurityLog(**kwargs)
        db.add(log)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


@router.post("/login")
async def login(
    user_data: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Login endpoint - Returns JWT token
    """
    client_ip = request.client.host if request.client else "unknown"

    # Get user
    user = db.query(User).filter(User.username == user_data.username).first()

    if not user:
        _safe_log(db,
            event_type="login_failed", severity="warning",
            username=user_data.username, ip_address=client_ip,
            message="Login failed: User not found"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Check if user is active FIRST
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Please contact support."
        )

    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = (user.locked_until - datetime.utcnow()).seconds // 60
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is temporarily locked. Try again in {remaining + 1} minute(s)."
        )

    # If lock has expired, clear it
    if user.locked_until and user.locked_until <= datetime.utcnow():
        user.locked_until = None
        user.failed_login_attempts = 0
        try:
            db.commit()
        except Exception:
            db.rollback()

    # Verify password
    if not verify_password(user_data.password, user.password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        try:
            db.commit()
        except Exception:
            db.rollback()

        _safe_log(db,
            event_type="login_failed", severity="warning",
            username=user_data.username, ip_address=client_ip,
            message=f"Login failed: Invalid password (attempt {user.failed_login_attempts})"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    # Success - reset counters
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    try:
        db.commit()
    except Exception:
        db.rollback()

    # Create JWT token
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )

    _safe_log(db,
        event_type="login_success", severity="info",
        username=user.username, user_id=user.id,
        ip_address=client_ip,
        message="User logged in successfully"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role.value,
            "full_name": user.full_name
        }
    }


@router.post("/register")
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> UserResponse:
    """
    Register new user (Admin only)
    """
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Create user
    user = User(
        username=user_data.username,
        password=hash_password(user_data.password),
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        parent_id=user_data.parent_id or current_user.id,
        status="active"
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Logout endpoint
    """
    # Log logout
    _safe_log(db,
        event_type="logout", severity="info",
        username=current_user.username, user_id=current_user.id,
        ip_address=request.client.host if request.client else "unknown",
        message="User logged out"
    )
    
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user information
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Update current user profile
    """
    if user_data.email:
        # Check if email is taken by another user
        existing = db.query(User).filter(
            User.email == user_data.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = user_data.email
    
    if user_data.full_name:
        current_user.full_name = user_data.full_name
    
    if user_data.phone:
        current_user.phone = user_data.phone
    
    if user_data.country:
        current_user.country = user_data.country
    
    if user_data.timezone:
        current_user.timezone = user_data.timezone
    
    if user_data.language:
        current_user.language = user_data.language
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """
    Change user password
    """
    # Verify old password
    if not verify_password(old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid current password"
        )
    
    # Update password
    current_user.password = hash_password(new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}
