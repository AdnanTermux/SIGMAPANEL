import time
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis
import os

logger = logging.getLogger("firewall")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class FirewallMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        try:
            self.redis = redis.from_url(REDIS_URL, decode_responses=True)
        except:
            self.redis = None

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host

        # 1. IP Blacklist Check
        if self.redis and self.redis.sismember("blacklisted_ips", client_ip):
            return JSONResponse(status_code=403, content={"detail": "IP Access Denied - Security Restriction"})

        # 2. Rate Limiting (General)
        if self.redis:
            key = f"rate_limit:{client_ip}"
            current = self.redis.get(key)
            if current and int(current) > 100: # 100 req / minute
                return JSONResponse(status_code=429, content={"detail": "Too many requests. Calm down."})

            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, 60)
            pipe.execute()

        # 3. Security Headers
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com;"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
