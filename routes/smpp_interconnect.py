"""SMPP Interconnection and Server Management APIs"""
from fastapi import APIRouter, Request, HTTPException, Query, Depends
from database import get_db
from routes.deps import get_current_user, require_role
from auth import generate_id
from datetime import datetime

router = APIRouter(prefix="/api/smpp-interconnect", tags=["smpp-interconnect"])

# --- Client (Remote Servers) ---
@router.get("/servers")
async def list_servers(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_remote_servers ORDER BY priority DESC").fetchall()
    return {"data": [dict(r) for r in rows]}

# --- Server (Provider Accounts) ---
@router.get("/accounts")
async def list_server_accounts(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT id, system_id, company, status, throughput_limit, max_sessions, ip_whitelist, created_at FROM smpp_server_accounts").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.post("/accounts")
async def create_server_account(body: dict, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        aid = generate_id()
        conn.execute("""INSERT INTO smpp_server_accounts (id, system_id, password, company, status, throughput_limit, max_sessions, ip_whitelist)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (aid, body['system_id'], body['password'], body.get('company'), 'active', body.get('throughput_limit', 10), body.get('max_sessions', 5), body.get('ip_whitelist')))
    return {"message": "SMPP account created"}

@router.put("/accounts/{aid}")
async def update_server_account(aid: str, body: dict, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        fields = ['system_id', 'password', 'company', 'status', 'throughput_limit', 'max_sessions', 'ip_whitelist']
        upd = {f: body[f] for f in fields if f in body}
        if upd:
            conn.execute(f"UPDATE smpp_server_accounts SET {','.join(f'{k}=?' for k in upd)} WHERE id=?", list(upd.values()) + [aid])
    return {"message": "Account updated"}

@router.delete("/accounts/{aid}")
async def delete_server_account(aid: str, p=Depends(require_role(["admin"]))):
    with get_db() as conn:
        conn.execute("DELETE FROM smpp_server_accounts WHERE id=?", (aid,))
    return {"message": "Account deleted"}

# --- Monitoring ---
@router.get("/server-sessions")
async def get_server_sessions(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_server_sessions").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/server-logs")
async def get_server_logs(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_server_logs ORDER BY created_at DESC LIMIT 200").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/dlr-logs")
async def get_dlr_logs(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT received_at, number, otp, service, profit FROM sms_received WHERE otp IS NOT NULL ORDER BY received_at DESC LIMIT 100").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/failed-packets")
async def get_failed_packets(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM smpp_failed_packets ORDER BY created_at DESC LIMIT 100").fetchall()
    return {"data": [dict(r) for r in rows]}

@router.get("/stats")
async def get_smpp_stats(p=Depends(require_role(["admin", "manager"]))):
    with get_db() as conn:
        sessions = conn.execute("SELECT COUNT(*) FROM smpp_server_sessions").fetchone()[0]
        msg_today = conn.execute("SELECT COUNT(*) FROM sms_received WHERE received_at >= date('now')").fetchone()[0]
        dlr_today = conn.execute("SELECT COUNT(*) FROM sms_received WHERE otp IS NOT NULL AND received_at >= date('now')").fetchone()[0]
        fails = conn.execute("SELECT COUNT(*) FROM smpp_server_logs WHERE event_type='BIND_FAILURE' AND created_at >= date('now')").fetchone()[0]
    return {
        "active_sessions": sessions,
        "sms_received": msg_today,
        "dlrs_processed": dlr_today,
        "failed_binds": fails,
        "throughput": "0.45 msg/s"
    }
