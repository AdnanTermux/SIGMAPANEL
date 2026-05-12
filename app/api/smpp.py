"""
SMPP Connection Management API Routes
CRUD operations for SMPP connections
Supports SMPP 3.4 protocol for receiving SMS
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from loguru import logger

from ..database import get_db
from ..models.user import User
from ..models.smpp_connection import SMPPConnection, SMPPStatus
from ..core.deps import get_current_admin, get_current_user, has_permission
from ..core.security import hash_password

router = APIRouter()


@router.get("/connections")
async def list_smpp_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """List SMPP connections"""
    if not has_permission(current_user, "manage_smpp"):
        raise HTTPException(status_code=403, detail="SMPP management requires admin access")
    
    connections = db.query(SMPPConnection).order_by(SMPPConnection.created_at.desc()).all()
    
    return {
        "total": len(connections),
        "data": [
            {
                "id": c.id,
                "name": c.name,
                "host": c.host,
                "port": c.port,
                "system_id": c.system_id,
                "system_type": c.system_type,
                "interface_version": c.interface_version,
                "status": c.status.value if hasattr(c.status, 'value') else c.status,
                "last_activity_at": c.last_activity_at.isoformat() if c.last_activity_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in connections
        ]
    }


@router.get("/connections/{connection_id}")
async def get_smpp_connection(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get SMPP connection by ID"""
    if not has_permission(current_user, "manage_smpp"):
        raise HTTPException(status_code=403, detail="SMPP management requires admin access")
    
    c = db.query(SMPPConnection).filter(SMPPConnection.id == connection_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="SMPP connection not found")
    
    return {
        "id": c.id,
        "name": c.name,
        "host": c.host,
        "port": c.port,
        "system_id": c.system_id,
        "password": c.password,  # Only shown to admin
        "system_type": c.system_type,
        "interface_version": c.interface_version,
        "status": c.status.value if hasattr(c.status, 'value') else c.status,
        "last_activity_at": c.last_activity_at.isoformat() if c.last_activity_at else None,
        "created_at": c.created_at.isoformat() if c.created_at else None
    }


@router.post("/connections")
async def create_smpp_connection(
    request_body: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Create new SMPP connection (Admin only)"""
    name = request_body.get("name")
    host = request_body.get("host")
    port = request_body.get("port", 2775)
    system_id = request_body.get("system_id")
    password = request_body.get("password")
    system_type = request_body.get("system_type", "SMPP")
    interface_version = request_body.get("interface_version", "3.4")
    
    if not name or not host or not system_id or not password:
        raise HTTPException(status_code=400, detail="name, host, system_id, and password are required")
    
    connection = SMPPConnection(
        name=name,
        host=host,
        port=int(port),
        system_id=system_id,
        password=password,
        system_type=system_type,
        interface_version=interface_version,
        status=SMPPStatus.ACTIVE
    )
    
    db.add(connection)
    db.commit()
    db.refresh(connection)
    
    logger.info(f"SMPP connection created: {name} ({host}:{port})")
    
    return {"id": connection.id, "name": connection.name, "message": "SMPP connection created successfully"}


@router.put("/connections/{connection_id}")
async def update_smpp_connection(
    connection_id: int,
    request_body: dict,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Update SMPP connection (Admin only)"""
    c = db.query(SMPPConnection).filter(SMPPConnection.id == connection_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="SMPP connection not found")
    
    if "name" in request_body:
        c.name = request_body["name"]
    if "host" in request_body:
        c.host = request_body["host"]
    if "port" in request_body:
        c.port = int(request_body["port"])
    if "system_id" in request_body:
        c.system_id = request_body["system_id"]
    if "password" in request_body:
        c.password = request_body["password"]
    if "system_type" in request_body:
        c.system_type = request_body["system_type"]
    if "interface_version" in request_body:
        c.interface_version = request_body["interface_version"]
    if "status" in request_body:
        c.status = request_body["status"]
    
    db.commit()
    db.refresh(c)
    
    return {"id": c.id, "message": "SMPP connection updated successfully"}


@router.delete("/connections/{connection_id}")
async def delete_smpp_connection(
    connection_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Delete SMPP connection (Admin only)"""
    c = db.query(SMPPConnection).filter(SMPPConnection.id == connection_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="SMPP connection not found")
    
    db.delete(c)
    db.commit()
    
    return {"message": "SMPP connection deleted successfully"}


@router.post("/connections/{connection_id}/test")
async def test_smpp_connection(
    connection_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> dict:
    """Test SMPP connection (Admin only)"""
    import socket
    
    c = db.query(SMPPConnection).filter(SMPPConnection.id == connection_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="SMPP connection not found")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((c.host, c.port))
        sock.close()
        
        if result == 0:
            c.last_activity_at = datetime.utcnow()
            db.commit()
            return {"status": "success", "message": f"Connection to {c.host}:{c.port} successful"}
        else:
            return {"status": "failed", "message": f"Could not connect to {c.host}:{c.port}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/status")
async def smpp_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Get SMPP system status"""
    if not has_permission(current_user, "manage_smpp"):
        raise HTTPException(status_code=403, detail="SMPP management requires admin access")
    
    active_connections = db.query(SMPPConnection).filter(
        SMPPConnection.status == SMPPStatus.ACTIVE
    ).count()
    
    total_connections = db.query(SMPPConnection).count()
    
    return {
        "total_connections": total_connections,
        "active_connections": active_connections,
        "inactive_connections": total_connections - active_connections,
        "protocol_version": "SMPP 3.4",
        "supported_encodings": ["GSM7", "UCS2"],
        "deliver_sm_format": "Standard SMPP 3.4 PDU"
    }
