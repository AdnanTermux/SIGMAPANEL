"""
Blacklist API Routes
App blacklist management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, get_current_manager, has_permission
from ..models.user import User, UserRole
from ..models.blacklisted_app import BlacklistedApp

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class BlacklistCreate(BaseModel):
    app_name: str
    pattern: Optional[str] = None
    description: Optional[str] = None


class BlacklistUpdate(BaseModel):
    app_name: Optional[str] = None
    pattern: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


def _blacklist_to_dict(b: BlacklistedApp) -> Dict[str, Any]:
    """Convert BlacklistedApp ORM object to dict"""
    return {
        "id": b.id,
        "app_name": b.app_name,
        "pattern": b.pattern,
        "description": b.description,
        "is_active": b.is_active,
        "created_by": b.created_by,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }


def _require_admin_or_manager(current_user: User) -> User:
    """Helper: require admin or manager role"""
    if not has_permission(current_user, "manage_numbers"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin/Manager access required"
        )
    return current_user


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_blacklist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """List all blacklisted apps"""
    entries = db.query(BlacklistedApp).order_by(BlacklistedApp.created_at.desc()).all()
    return {"data": [_blacklist_to_dict(e) for e in entries]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_to_blacklist(
    body: BlacklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Add app to blacklist (admin/manager only)"""
    _require_admin_or_manager(current_user)

    # Check for duplicate
    if db.query(BlacklistedApp).filter(BlacklistedApp.app_name == body.app_name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="App already blacklisted"
        )

    entry = BlacklistedApp(
        app_name=body.app_name,
        pattern=body.pattern,
        description=body.description,
        is_active=True,
        created_by=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"data": _blacklist_to_dict(entry)}


@router.put("/{entry_id}")
async def update_blacklist_entry(
    entry_id: int,
    body: BlacklistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update blacklist entry (admin/manager only)"""
    _require_admin_or_manager(current_user)

    entry = db.query(BlacklistedApp).filter(BlacklistedApp.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blacklist entry not found"
        )

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return {"data": _blacklist_to_dict(entry)}


@router.patch("/{entry_id}/toggle")
async def toggle_blacklist_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Toggle active status of a blacklist entry (admin/manager only)"""
    _require_admin_or_manager(current_user)

    entry = db.query(BlacklistedApp).filter(BlacklistedApp.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blacklist entry not found"
        )

    entry.is_active = not entry.is_active
    db.commit()
    db.refresh(entry)
    return {"data": _blacklist_to_dict(entry)}


@router.delete("/{entry_id}")
async def remove_from_blacklist(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    """Remove app from blacklist (admin/manager only)"""
    _require_admin_or_manager(current_user)

    entry = db.query(BlacklistedApp).filter(BlacklistedApp.id == entry_id).first()
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blacklist entry not found"
        )

    db.delete(entry)
    db.commit()
    return {"message": "Removed from blacklist"}
