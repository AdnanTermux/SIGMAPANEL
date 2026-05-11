"""
Sigma SMS A2P - Python Version
FastAPI Main Application
"""
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger
import sys

from .config import settings
from .database import engine, Base
from .api import auth, webhook, dashboard, users, numbers, ranges, crypto, payments, test_panel

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL
)

# logger.add("logs/sigma-sms/app.log")  # Enable for file logging  # or just remove file logging

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Professional SMS OTP Management System with Crypto Payouts",
    version="2.0.0",
    docs_url="/api/docs" if settings.APP_DEBUG else None,
    redoc_url="/api/redoc" if settings.APP_DEBUG else None,
    openapi_url="/api/openapi.json" if settings.APP_DEBUG else None
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie=settings.SESSION_COOKIE_NAME,
    max_age=settings.SESSION_LIFETIME,
    same_site="lax",
    https_only=not settings.APP_DEBUG
)

# Templates
templates = Jinja2Templates(directory="app/templates")

# Static files (if directory exists)
try:
    app.mount("/static", StaticFiles(directory="app/static"), name="static")
except:
    logger.warning("Static directory not found, skipping static files mount")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(webhook.router, prefix="/api/webhook", tags=["Webhook"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(numbers.router, prefix="/api/numbers", tags=["Numbers"])
app.include_router(crypto.router, prefix="/api/crypto", tags=["Crypto Wallets"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(test_panel.router, prefix="/api/test", tags=["Test Panel"])
app.include_router(ranges.router, prefix="/api/ranges", tags=["Ranges"])


# Root endpoints
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Landing page"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Login page"""
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    """Dashboard page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/numbers", response_class=HTMLResponse)
async def numbers_page(request: Request):
    """Numbers page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/sms-reports", response_class=HTMLResponse)
async def sms_reports_page(request: Request):
    """SMS Reports page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/users", response_class=HTMLResponse)
async def users_page(request: Request):
    """Users page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/crypto-wallets", response_class=HTMLResponse)
async def crypto_wallets_page(request: Request):
    """Crypto Wallets page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/payments", response_class=HTMLResponse)
async def payments_page(request: Request):
    """Payments page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/test-users", response_class=HTMLResponse)
async def test_users_page(request: Request):
    """Test Users page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    """Profile page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/ranges", response_class=HTMLResponse)
async def ranges_page(request: Request):
    """Ranges page"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/test-login", response_class=HTMLResponse)
async def test_login_page(request: Request):
    """Test panel login page"""
    return templates.TemplateResponse("test_login.html", {"request": request})


@app.get("/test-dashboard", response_class=HTMLResponse)
async def test_dashboard_page(request: Request):
    """Test panel dashboard"""
    return templates.TemplateResponse("test_dashboard.html", {"request": request})


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "environment": settings.APP_ENV
    }


@app.get("/api/info")
async def api_info():
    """API information"""
    return {
        "name": settings.APP_NAME,
        "version": "2.0.0",
        "environment": settings.APP_ENV,
        "endpoints": {
            "docs": "/api/docs" if settings.APP_DEBUG else "disabled",
            "webhook": "/api/webhook/sms",
            "dashboard": "/api/dashboard/stats",
            "auth": "/api/auth/login"
        }
    }


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """404 error handler"""
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=404,
            content={"detail": "Endpoint not found"}
        )
    return HTMLResponse("""
    <html><head><title>404 - Not Found</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6;}
    .box{text-align:center;}.code{font-size:6rem;font-weight:bold;color:#735DFF;}.msg{font-size:1.5rem;color:#374151;margin-bottom:1rem;}
    a{color:#735DFF;text-decoration:none;font-weight:bold;}</style></head>
    <body><div class="box"><div class="code">404</div><div class="msg">Page Not Found</div>
    <a href="/login">← Back to Login</a></div></body></html>
    """, status_code=404)


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    """500 error handler"""
    logger.error(f"Internal server error: {exc}")
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    return HTMLResponse("""
    <html><head><title>500 - Server Error</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6;}
    .box{text-align:center;}.code{font-size:6rem;font-weight:bold;color:#dc2626;}.msg{font-size:1.5rem;color:#374151;margin-bottom:1rem;}
    a{color:#735DFF;text-decoration:none;font-weight:bold;}</style></head>
    <body><div class="box"><div class="code">500</div><div class="msg">Internal Server Error</div>
    <a href="/login">← Back to Login</a></div></body></html>
    """, status_code=500)




@app.get("/debug-login")
async def debug_login():
    """Temporary debug endpoint - shows DB state and fixes passwords"""
    from sqlalchemy import text as _text
    from .database import SessionLocal, engine
    from .core.security import verify_password, hash_password
    
    result = {"db_columns": [], "raw_users": [], "test_users": [], "actions": [], "errors": []}
    
    # Step 1: Check actual columns in users table
    try:
        with engine.connect() as conn:
            cols = conn.execute(_text("SHOW COLUMNS FROM users")).fetchall()
            result["db_columns"] = [c[0] for c in cols]
    except Exception as e:
        result["errors"].append(f"SHOW COLUMNS failed: {e}")
    
    # Step 2: Raw query to get users without ORM
    try:
        with engine.connect() as conn:
            rows = conn.execute(_text("SELECT id, username, LEFT(password,15), role, status FROM users")).fetchall()
            for r in rows:
                result["raw_users"].append({
                    "id": r[0], "username": r[1],
                    "hash_prefix": r[2], "role": r[3], "status": r[4]
                })
    except Exception as e:
        result["errors"].append(f"SELECT users failed: {e}")

    # Step 3: Raw query test_users
    try:
        with engine.connect() as conn:
            rows = conn.execute(_text("SELECT id, username, LEFT(password,15), status FROM test_users")).fetchall()
            for r in rows:
                result["test_users"].append({
                    "id": r[0], "username": r[1],
                    "hash_prefix": r[2], "status": r[3]
                })
    except Exception as e:
        result["errors"].append(f"SELECT test_users failed: {e}")

    # Step 4: Fix passwords via raw SQL (bypasses ORM column issues)
    new_admin_hash = hash_password("admin123")
    new_test_hash = hash_password("test123")
    
    try:
        with engine.connect() as conn:
            # Check if admin exists
            row = conn.execute(_text("SELECT id FROM users WHERE username='admin'")).fetchone()
            if row:
                conn.execute(_text(
                    "UPDATE users SET password=:p, failed_login_attempts=0, locked_until=NULL, status='active' WHERE username='admin'"
                ), {"p": new_admin_hash})
                conn.commit()
                result["actions"].append("FIXED: admin password=admin123, unlocked, status=active")
            else:
                conn.execute(_text(
                    "INSERT INTO users (username, email, password, role, status, failed_login_attempts) VALUES ('admin','admin@sigma-sms.com',:p,'admin','active',0)"
                ), {"p": new_admin_hash})
                conn.commit()
                result["actions"].append("CREATED: admin with password=admin123")
    except Exception as e:
        result["errors"].append(f"Fix admin failed: {e}")

    try:
        with engine.connect() as conn:
            row = conn.execute(_text("SELECT id FROM test_users WHERE username='test123'")).fetchone()
            if row:
                conn.execute(_text(
                    "UPDATE test_users SET password=:p, status='active' WHERE username='test123'"
                ), {"p": new_test_hash})
                conn.commit()
                result["actions"].append("FIXED: test123 password=test123, status=active")
            else:
                conn.execute(_text(
                    "INSERT INTO test_users (username, password, number_limit, status) VALUES ('test123',:p,10,'active')"
                ), {"p": new_test_hash})
                conn.commit()
                result["actions"].append("CREATED: test123 with password=test123")
    except Exception as e:
        result["errors"].append(f"Fix test123 failed: {e}")

    # Step 5: verify the new hash works
    try:
        with engine.connect() as conn:
            row = conn.execute(_text("SELECT password FROM users WHERE username='admin'")).fetchone()
            if row:
                ok = verify_password("admin123", row[0])
                result["actions"].append(f"VERIFY admin123 against stored hash: {ok}")
    except Exception as e:
        result["errors"].append(f"Verify failed: {e}")

    return result


# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info(f"Starting {settings.APP_NAME} v2.0.0")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Debug mode: {settings.APP_DEBUG}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("Shutting down application")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.APP_DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
