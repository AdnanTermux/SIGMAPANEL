"""
Audit Log API Routes
Read-only audit trail viewing
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, has_permission
from ..models.user import User
from ..models.audit_log import AuditLog

router = APIRouter()


def _audit_to_dict(a: AuditLog) -> Dict[str, Any]:
    """Convert AuditLog ORM object to dict"""
    return {
        "id": a.id,
        "user_id": a.user_id,
        "action": a.action,
        "resource_type": a.resource_type,
        "resource_id": a.resource_id,
        "old_values": a.old_values,
        "new_values": a.new_values,
        "ip_address": a.ip_address,
        "user_agent": a.user_agent,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
    days: int = Query(7, ge=1, le=90),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> Dict[str, Any]:
    """List audit logs with filters (admin only)"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    query = db.query(AuditLog).filter(AuditLog.created_at >= cutoff)

    if action:
        query = query.filter(AuditLog.action.like(f"%{action}%"))
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "data": [_audit_to_dict(log) for log in logs],
        "total": total,
        "offset": offset,
        "limit": limit,
    }
