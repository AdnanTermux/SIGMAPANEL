"""SIGMAPANEL - SMS OTP Management System v3"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from security_middleware import FirewallMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os

from database import init_db
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
from routes.numbers_ext import router as numbers_ext_router
from routes.api_management import router as api_management_router
from routes.notifications import router as notifications_router

app = FastAPI(title="SIGMAPANEL", version="3.0")
app.add_middleware(FirewallMiddleware)

@app.on_event("startup")
async def startup():
    init_db()

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
app.include_router(numbers_ext_router)
app.include_router(api_management_router)
app.include_router(notifications_router)

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/{path:path}")
async def spa(path: str):
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Endpoint not found"})
    return FileResponse(os.path.join(static_dir, "index.html"))
