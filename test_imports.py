import sys
import os
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Mock settings and deps for import test
sys.path.append(os.getcwd())

try:
    from routes.dashboard import router as d_router
    from routes.sms import router as s_router
    from routes.users import router as u_router
    from routes.settings import router as set_router
    print("Dashboard/SMS/Users/Settings routers imported successfully")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
