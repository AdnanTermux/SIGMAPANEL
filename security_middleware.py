import time
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
import os

logger = logging.getLogger("firewall")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class FirewallMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.redis = None
        self._last_reconnect = 0

    async def _get_redis(self):
        now = time.time()
        if self.redis is None and now - self._last_reconnect > 10:
            try:
                self.redis = redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_timeout=1.0,
                    socket_connect_timeout=1.0
                )
                await self.redis.ping()
            except Exception:
                self.redis = None
                self._last_reconnect = now
        return self.redis

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host

        r = await self._get_redis()
        try:
            # 1. IP Blacklist Check
            if r and await r.sismember("blacklisted_ips", client_ip):
                return JSONResponse(status_code=403, content={"detail": "IP Access Denied - Security Restriction"})

            # 2. Rate Limiting (General)
            if r:
                key = f"rate_limit:{client_ip}"
                current = await r.get(key)
                if current and int(current) > 100: # 100 req / minute
                    return JSONResponse(status_code=429, content={"detail": "Too many requests. Calm down."})

                async with r.pipeline() as pipe:
                    await pipe.incr(key)
                    await pipe.expire(key, 60)
                    await pipe.execute()
        except Exception as e:
            logger.error(f"Firewall error: {e}")
            self.redis = None # Trigger reconnect next time

        # 3. Security Headers
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net;"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
