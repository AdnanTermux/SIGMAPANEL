import asyncio
import json
import logging
from queue_manager import queue_manager
from database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

async def process_sms_queue():
    logger.info("SMS Worker started")
    while True:
        try:
            data = queue_manager.pop("sms_queue")
            if data:
                logger.info(f"Processing SMS from queue: {data.get('number')}")
                # Real-time persistence and webhook forwarding logic here
                # ...
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Worker error: {e}")
            await asyncio.sleep(1)

async def process_dlr_queue():
    logger.info("DLR Worker started")
    while True:
        try:
            data = queue_manager.pop("dlr_queue")
            if data:
                logger.info(f"Processing DLR from queue: {data.get('msg_id')}")
                # Update status in DB
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"DLR Worker error: {e}")
            await asyncio.sleep(1)

async def main():
    await asyncio.gather(
        process_sms_queue(),
        process_dlr_queue()
    )

if __name__ == "__main__":
    asyncio.run(main())
