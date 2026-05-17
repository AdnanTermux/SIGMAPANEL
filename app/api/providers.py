"""
Provider Management API Routes
CRUD for HTTP and SMPP SMS providers
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..core.deps import get_current_user, get_current_admin, require_permission
from ..models.user import User, UserRole
from ..models.provider import Provider, ProviderType, ProviderStatus

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class ProviderCreate(BaseModel):
    name: str
    type: Optional[str] = "http"  # http | smpp
    status: Optional[str] = "active"
    # HTTP fields
    api_url: Optional[str] = None
    api_token: Optional[str] = None
    api_method: Optional[str] = "POST"
    field_to: Optional[str] = "to"
    field_from: Optional[str] = "from"
    field_msg: Optional[str] = "msg"
    field_uuid: Optional[str] = "uuid"
    # SMPP fields
    smpp_host: Optional[str] = None
    smpp_port: Optional[int] = 2775
    smpp_system_id: Optional[str] = None
    smpp_password: Optional[str] = None
    smpp_system_type: Optional[str] = ""
    smpp_service_type: Optional[str] = None
    smpp_source_ton: Optional[int] = 1
    smpp_source_npi: Optional[int] = 1
    smpp_dest_ton: Optional[int] = 1
    smpp_dest_npi: Optional[int] = 1
    smpp_data_coding: Optional[int] = 0
    notes: Optional[str] = None


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    api_url: Optional[str] = None
    api_token: Optional[str] = None
    api_method: Optional[str] = None
    field_to: Optional[str] = None
    field_from: Optional[str] = None
    field_msg: Optional[str] = None
    field_uuid: Optional[str] = None
    smpp_host: Optional[str] = None
    smpp_port: Optional[int] = None
    smpp_system_id: Optional[str] = None
    smpp_password: Optional[str] = None
    smpp_system_type: Optional[str] = None
    smpp_service_type: Optional[str] = None
    smpp_source_ton: Optional[int] = None
    smpp_source_npi: Optional[int] = None
    smpp_dest_ton: Optional[int] = None
    smpp_dest_npi: Optional[int] = None
    smpp_data_coding: Optional[int] = None
    notes: Optional[str] = None


def _provider_to_dict(p: Provider) -> Dict[str, Any]:
    """Convert Provider ORM object to dict for JSON serialization"""
    return {
        "id": p.id,
        "name": p.name,
        "type": p.type.value if p.type else None,
        "status": p.status.value if p.status else None,
        "api_url": p.api_url,
        "api_token": p.api_token,
        "api_method": p.api_method,
        "field_to": p.field_to,
        "field_from": p.field_from,
        "field_msg": p.field_msg,
        "field_uuid": p.field_uuid,
        "smpp_host": p.smpp_host,
        "smpp_port": p.smpp_port,
        "smpp_system_id": p.smpp_system_id,
        "smpp_password": p.smpp_password,
        "smpp_system_type": p.smpp_system_type,
        "smpp_service_type": p.smpp_service_type,
        "smpp_source_ton": p.smpp_source_ton,
        "smpp_source_npi": p.smpp_source_npi,
        "smpp_dest_ton": p.smpp_dest_ton,
        "smpp_dest_npi": p.smpp_dest_npi,
        "smpp_data_coding": p.smpp_data_coding,
        "notes": p.notes,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_providers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    provider_type: Optional[str] = Query(None, alias="type"),
    provider_status: Optional[str] = Query(None, alias="status"),
) -> Dict[str, Any]:
    """List all providers (any authenticated user can view)"""
    query = db.query(Provider).order_by(Provider.created_at.desc())
    if provider_type:
        query = query.filter(Provider.type == provider_type)
    if provider_status:
        query = query.filter(Provider.status == provider_status)
    providers = query.all()
    return {"data": [_provider_to_dict(p) for p in providers]}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_provider(
    body: ProviderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Create a new provider (admin only)"""
    # Check name uniqueness
    if db.query(Provider).filter(Provider.name == body.name).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Provider name already exists"
        )

    try:
        ptype = ProviderType(body.type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider type: {body.type}. Must be 'http' or 'smpp'"
        )

    try:
        pstatus = ProviderStatus(body.status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {body.status}. Must be 'active' or 'inactive'"
        )

    provider = Provider(
        name=body.name,
        type=ptype,
        status=pstatus,
        api_url=body.api_url,
        api_token=body.api_token,
        api_method=body.api_method,
        field_to=body.field_to,
        field_from=body.field_from,
        field_msg=body.field_msg,
        field_uuid=body.field_uuid,
        smpp_host=body.smpp_host,
        smpp_port=body.smpp_port,
        smpp_system_id=body.smpp_system_id,
        smpp_password=body.smpp_password,
        smpp_system_type=body.smpp_system_type,
        smpp_service_type=body.smpp_service_type,
        smpp_source_ton=body.smpp_source_ton,
        smpp_source_npi=body.smpp_source_npi,
        smpp_dest_ton=body.smpp_dest_ton,
        smpp_dest_npi=body.smpp_dest_npi,
        smpp_data_coding=body.smpp_data_coding,
        notes=body.notes,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return {"data": _provider_to_dict(provider)}


@router.get("/{provider_id}")
async def get_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get a single provider by ID"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    return {"data": _provider_to_dict(provider)}


@router.put("/{provider_id}")
async def update_provider(
    provider_id: int,
    body: ProviderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, Any]:
    """Update a provider (admin only)"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )

    update_data = body.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"]:
        try:
            update_data["type"] = ProviderType(update_data["type"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider type: {update_data['type']}"
            )
    if "status" in update_data and update_data["status"]:
        try:
            update_data["status"] = ProviderStatus(update_data["status"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {update_data['status']}"
            )

    for key, value in update_data.items():
        setattr(provider, key, value)

    db.commit()
    db.refresh(provider)
    return {"data": _provider_to_dict(provider)}


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> Dict[str, str]:
    """Delete a provider (admin only)"""
    provider = db.query(Provider).filter(Provider.id == provider_id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    name = provider.name
    db.delete(provider)
    db.commit()
    return {"message": "Provider deleted", "name": name}
