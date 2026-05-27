import json
import redis
import os
import asyncio
import logging

logger = logging.getLogger("queue_manager")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class QueueManager:
    def __init__(self):
        try:
            self.redis = redis.from_url(REDIS_URL, decode_responses=True)
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis = None

    def push(self, queue_name: str, data: dict):
        if self.redis:
            try:
                self.redis.lpush(queue_name, json.dumps(data))
                return True
            except Exception as e:
                logger.error(f"Redis push error: {e}")
        return False

    def pop(self, queue_name: str, timeout=1):
        if self.redis:
            try:
                item = self.redis.brpop(queue_name, timeout=timeout)
                if item:
                    return json.loads(item[1])
            except Exception as e:
                logger.error(f"Redis pop error: {e}")
        return None

queue_manager = QueueManager()
