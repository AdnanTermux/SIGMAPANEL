import json
import redis.asyncio as redis
import os
import asyncio
import logging
from typing import Optional, Any

logger = logging.getLogger("queue_manager")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
REDIS_TIMEOUT = float(os.environ.get("REDIS_TIMEOUT", "2.0"))
REDIS_MAX_RETRIES = int(os.environ.get("REDIS_MAX_RETRIES", "5"))

class QueueManager:
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._pool: Optional[redis.ConnectionPool] = None
        self._initialized = False

    async def _init_redis(self):
        if self._initialized and self._redis:
            return

        try:
            self._pool = redis.ConnectionPool.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=REDIS_TIMEOUT,
                socket_connect_timeout=REDIS_TIMEOUT,
                max_connections=50
            )
            self._redis = redis.Redis(connection_pool=self._pool)
            self._initialized = True
            logger.info("Async Redis initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            self._initialized = False

    async def is_healthy(self) -> bool:
        if not self._initialized:
            await self._init_redis()
        if not self._redis:
            return False
        try:
            return await self._redis.ping()
        except Exception:
            return False

    async def push(self, queue_name: str, data: dict) -> bool:
        if not self._initialized:
            await self._init_redis()

        if not self._redis:
            # Memory fallback for dev/restricted environments
            if not hasattr(self, '_mem_queues'): self._mem_queues = {}
            if queue_name not in self._mem_queues: self._mem_queues[queue_name] = asyncio.Queue()
            await self._mem_queues[queue_name].put(data)
            return True

        backoff = 0.1
        for attempt in range(REDIS_MAX_RETRIES):
            try:
                await self._redis.lpush(queue_name, json.dumps(data))
                return True
            except (redis.ConnectionError, redis.TimeoutError) as e:
                if attempt == REDIS_MAX_RETRIES - 1:
                    logger.error(f"Redis push failed after {REDIS_MAX_RETRIES} attempts. Falling back to memory.")
                    if not hasattr(self, '_mem_queues'): self._mem_queues = {}
                    if queue_name not in self._mem_queues: self._mem_queues[queue_name] = asyncio.Queue()
                    await self._mem_queues[queue_name].put(data)
                    return True
                await asyncio.sleep(backoff)
                backoff *= 2
            except Exception as e:
                logger.error(f"Unexpected Redis push error: {e}")
                break
        return False

    async def pop(self, queue_name: str, timeout: int = 2) -> Optional[Any]:
        if not self._initialized:
            await self._init_redis()

        if not self._redis:
            # Memory fallback
            if not hasattr(self, '_mem_queues'): self._mem_queues = {}
            if queue_name not in self._mem_queues: self._mem_queues[queue_name] = asyncio.Queue()
            try:
                return await asyncio.wait_for(self._mem_queues[queue_name].get(), timeout=timeout)
            except asyncio.TimeoutError:
                return None

        try:
            # We use blpop with a smaller timeout to keep the loop responsive
            item = await self._redis.brpop(queue_name, timeout=timeout)
            if item:
                return json.loads(item[1])
        except (redis.ConnectionError, redis.TimeoutError):
            # Log only occasionally to prevent spam
            pass
        except Exception as e:
            logger.error(f"Redis pop error: {e}")
            await asyncio.sleep(1)

        return None

    async def close(self):
        if self._redis:
            await self._redis.close()
        if self._pool:
            await self._pool.disconnect()
        self._initialized = False

queue_manager = QueueManager()
