"""
System Settings API Routes
Webhook config, system IP/port, user preferences
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import socket
import os

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, has_permission
from ..models.user import User, UserRole
from ..models.setting import SystemSetting

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class SettingUpsert(BaseModel):
    key: str
    value: str
    user_id: Optional[int] = None


class SettingBulkUpdate(BaseModel):
    settings: List[SettingUpsert]


def _setting_to_dict(s: SystemSetting) -> Dict[str, Any]:
    """Convert SystemSetting ORM object to dict"""
    return {
        "id": s.id,
        "key": s.setting_key,
        "value": s.setting_value,
        "user_id": s.user_id,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    key: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """Get all settings. Admin sees all; regular users see only global and their own."""
    query = db.query(SystemSetting)
    if not has_permission(current_user, "manage_settings"):
        query = query.filter(
            (SystemSetting.user_id.is_(None)) | (SystemSetting.user_id == current_user.id)
        )
    if key:
        query = query.filter(SystemSetting.setting_key == key)
    rows = query.order_by(SystemSetting.setting_key).all()
    return {"data": [_setting_to_dict(s) for s in rows]}


@router.put("")
async def bulk_update_settings(
    body: SettingBulkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Bulk update/create settings (admin only)"""
    results = []
    for item in body.settings:
        uid = item.user_id or current_user.id
        existing = db.query(SystemSetting).filter(
            SystemSetting.setting_key == item.key,
            (SystemSetting.user_id == uid) | (SystemSetting.user_id.is_(None) & (uid is None)),
        ).first()
        if existing:
            existing.setting_value = item.value
            db.commit()
            db.refresh(existing)
            results.append(_setting_to_dict(existing))
        else:
            setting = SystemSetting(
                setting_key=item.key,
                setting_value=item.value,
                user_id=uid,
            )
            db.add(setting)
            db.commit()
            db.refresh(setting)
            results.append(_setting_to_dict(setting))
    return {"data": results}


@router.post("")
async def upsert_setting(
    body: SettingUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Create or update a single setting"""
    uid = body.user_id
    if not has_permission(current_user, "manage_settings"):
        uid = current_user.id  # Regular users can only write their own

    existing = db.query(SystemSetting).filter(
        SystemSetting.setting_key == body.key,
        (SystemSetting.user_id == uid) | (SystemSetting.user_id.is_(None) & (uid is None)),
    ).first()
    if existing:
        existing.setting_value = body.value
        db.commit()
        db.refresh(existing)
        return {"data": _setting_to_dict(existing)}
    else:
        setting = SystemSetting(
            setting_key=body.key,
            setting_value=body.value,
            user_id=uid,
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
        return {"data": _setting_to_dict(setting)}


@router.get("/webhook-info")
async def webhook_info(
    request: Request,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns server IP, port and webhook URL for display in settings page"""
    host = request.headers.get("host", "")

    # Detect public IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        server_ip = s.getsockname()[0]
        s.close()
    except Exception:
        server_ip = "127.0.0.1"

    port = os.environ.get("PORT", "8000")
    scheme = "https" if request.headers.get("x-forwarded-proto") == "https" else "http"

    if host and "." in host:
        base_url = f"{scheme}://{host}"
    else:
        base_url = f"http://{server_ip}:{port}"

    return {
        "serverIp": server_ip,
        "port": port,
        "baseUrl": base_url,
        "webhookUrl": f"{base_url}/api/webhook/sms",
        "method": "POST",
        "contentType": "application/json",
        "fields": {
            "to": "Destination number (international format: +525529001312)",
            "from": "Service name / sender",
            "msg": "Message body",
            "uuid": "Unique message ID",
        },
        "example": {
            "to": "+525529001312",
            "from": "AmericanExpress",
            "msg": "Your OTP is 847291",
            "uuid": "msg-204953",
        },
    }
