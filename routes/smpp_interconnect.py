"""SMPP Interconnection Routes - Manage remote server connections"""
from routes.deps import get_current_user, require_role
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from auth import verify_token, extract_token, generate_id
from datetime import datetime

router = APIRouter(prefix="/api/smpp-interconnect", tags=["smpp-interconnect"])


class RemoteServerCreate(BaseModel):
    name: str
    host: str
    port: int = 2775
    system_id: str
    password: str
    bind_type: str = "transceiver"
    src_ton: int = 1
    src_npi: int = 1
    dst_ton: int = 1
    dst_npi: int = 1
    enquire_link_interval: int = 30
    dlr_enabled: int = 1
    throughput_limit: int = 10
    allowed_ips: Optional[str] = None
    priority: int = 1
    is_active: int = 1

@router.get("/servers")
async def list_servers(request: Request):
    Depends(require_role(["admin"]))
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_remote_servers ORDER BY priority DESC, created_at DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/servers")
async def add_server(request: Request, body: RemoteServerCreate):
    Depends(require_role(["admin"]))
    sid = generate_id()
    with get_db() as conn:
        conn.execute("""
            INSERT INTO smpp_remote_servers (
                id, name, host, port, system_id, password, bind_type,
                src_ton, src_npi, dst_ton, dst_npi, enquire_link_interval,
                dlr_enabled, throughput_limit, allowed_ips, priority, is_active
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            sid, body.name, body.host, body.port, body.system_id, body.password, body.bind_type,
            body.src_ton, body.src_npi, body.dst_ton, body.dst_npi, body.enquire_link_interval,
            body.dlr_enabled, body.throughput_limit, body.allowed_ips, body.priority, body.is_active
        ))
        row = conn.execute("SELECT * FROM smpp_remote_servers WHERE id=?", (sid,)).fetchone()
    return {"data": dict(row)}

@router.delete("/servers/{sid}")
async def delete_server(request: Request, sid: str):
    Depends(require_role(["admin"]))
    with get_db() as conn:
        conn.execute("DELETE FROM smpp_remote_servers WHERE id=?", (sid,))
    return {"message": "Server configuration deleted"}

@router.post("/servers/{sid}/toggle")
async def toggle_server(request: Request, sid: str):
    Depends(require_role(["admin"]))
    with get_db() as conn:
        r = conn.execute("SELECT is_active FROM smpp_remote_servers WHERE id=?", (sid,)).fetchone()
        if not r: raise HTTPException(404, "Server not found")
        new_val = 0 if r["is_active"] else 1
        conn.execute("UPDATE smpp_remote_servers SET is_active=? WHERE id=?", (new_val, sid))
    return {"message": "Status updated"}

@router.post("/test-connection")
async def test_connection(request: Request, body: RemoteServerCreate):
    Depends(require_role(["admin"]))
    import asyncio
    try:
        # One-off connection test
        reader, writer = await asyncio.wait_for(asyncio.open_connection(body.host, body.port), timeout=5)
        # We won't do a full bind here to avoid keeping sessions open, just a socket test
        writer.close()
        await writer.wait_closed()
        return {"message": "Connection to host/port successful"}
    except Exception as e:
        raise HTTPException(400, f"Connection failed: {str(e)}")

@router.get("/logs")
async def list_logs(request: Request, limit: int = 50):
    Depends(require_role(["admin"]))
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_connection_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return {"data": [dict(r) for r in rows]}
