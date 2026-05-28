"""SIGMAPANEL - SMS OTP Management System v3"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from security_middleware import FirewallMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import os
import asyncio
import logging

from database import init_db, get_db
from queue_manager import queue_manager
from routes.auth import router as auth_router
from routes.webhook import router as webhook_router
from routes.sms import router as sms_router
from routes.numbers import router as numbers_router
from routes.ranges import router as ranges_router
from routes.users import router as users_router
from routes.dashboard import router as dashboard_router
from routes.settings import router as settings_router
from routes.providers import router as providers_router
from routes.transactions import router as transactions_router
from routes.payments import router as payments_router
from routes.numbers_ext import router as numbers_ext_router
from routes.api_management import router as api_management_router
from routes.notifications import router as notifications_router
from routes.smpp_interconnect import router as smpp_interconnect_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting SIGMAPANEL Backend...")
    init_db()

    # Independent Worker Tasks (Background)
    # Note: In production, worker.py should run as a separate process,
    # but we can also spawn them as tasks for simpler standalone deployments.
    from worker import process_sms_queue, process_dlr_queue
    sms_task = asyncio.create_task(process_sms_queue())
    dlr_task = asyncio.create_task(process_dlr_queue())

    yield

    # Shutdown
    logger.info("Shutting down SIGMAPANEL Backend...")
    sms_task.cancel()
    dlr_task.cancel()
    await queue_manager.close()

app = FastAPI(title="SIGMAPANEL", version="3.0", lifespan=lifespan)
app.add_middleware(FirewallMiddleware)

# Health Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SIGMAPANEL API"}

@app.get("/health/redis")
async def redis_health():
    is_up = await queue_manager.is_healthy()
    return {"status": "up" if is_up else "down", "latency": "low" if is_up else "n/a"}

@app.get("/health/database")
async def db_health():
    try:
        with get_db() as conn:
            conn.execute("SELECT 1").fetchone()
        return {"status": "up"}
    except Exception as e:
        return {"status": "down", "error": str(e)}

@app.get("/health/workers")
async def workers_health():
    # Simple check for now
    return {"status": "running", "count": 2}

app.include_router(auth_router)
app.include_router(webhook_router)
app.include_router(sms_router)
app.include_router(numbers_router)
app.include_router(ranges_router)
app.include_router(users_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(providers_router)
app.include_router(transactions_router)
app.include_router(payments_router)
app.include_router(numbers_ext_router)
app.include_router(api_management_router)
app.include_router(notifications_router)
app.include_router(smpp_interconnect_router)

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/{path:path}")
async def spa(path: str):
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Endpoint not found"})
    return FileResponse(os.path.join(static_dir, "index.html"))
