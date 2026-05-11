"""
Dependencies for FastAPI routes
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models.user import User
from ..models.test_user import TestUser
from .security import decode_access_token

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    return user


def get_current_test_user(
    request: Request,
    db: Session = Depends(get_db)
) -> TestUser:
    """Get current authenticated test user from session"""
    test_username = request.session.get("test_username")
    
    if not test_username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    test_user = db.query(TestUser).filter(TestUser.username == test_username).first()
    if not test_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Test user not found"
        )
    
    if test_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test user account is blocked"
        )
    
    return test_user


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        payload = decode_access_token(token)
        
        if not payload:
            return None
        
        username = payload.get("sub")
        if not username:
            return None
        
        user = db.query(User).filter(User.username == username).first()
        return user if user and user.status == "active" else None
    except:
        return None
