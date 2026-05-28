import json
import redis
import os
import asyncio
import logging
import time

logger = logging.getLogger("queue_manager")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class QueueManager:
    def __init__(self):
        self.redis = None
        self.pool = None
        self._connect()

    def _connect(self):
        try:
            self.pool = redis.ConnectionPool.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
                max_connections=20
            )
            self.redis = redis.Redis(connection_pool=self.pool)
            logger.info("Connected to Redis with connection pool")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis = None

    def push(self, queue_name: str, data: dict):
        for attempt in range(3):
            try:
                if not self.redis: self._connect()
                if self.redis:
                    self.redis.lpush(queue_name, json.dumps(data))
                    return True
            except (redis.ConnectionError, redis.TimeoutError) as e:
                logger.warning(f"Redis push retry {attempt+1}: {e}")
                self.redis = None
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Redis push error: {e}")
                break
        return False

    def pop(self, queue_name: str, timeout=5):
        for attempt in range(3):
            try:
                if not self.redis: self._connect()
                if self.redis:
                    item = self.redis.brpop(queue_name, timeout=timeout)
                    if item:
                        return json.loads(item[1])
                    return None
            except (redis.ConnectionError, redis.TimeoutError) as e:
                logger.warning(f"Redis pop retry {attempt+1}: {e}")
                self.redis = None
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Redis pop error: {e}")
                break
        return None

queue_manager = QueueManager()
