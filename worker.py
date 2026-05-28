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
                # Normalizing key names if they come from different sources
                number = data.get('number') or data.get('to')
                sender = data.get('sender') or data.get('from')
                msg = data.get('message') or data.get('msg')

                logger.info(f"Processing SMS from queue: {number} from {sender}")

                # Persistence logic already mostly handled in sms_processor.py if called via HTTP
                # But for SMPP server, we need to ensure it's logged.
                # If sms_processor was already called, it might be a duplicate or we just update Live Feed.

                with get_db() as conn:
                    # check if already processed (simplified check)
                    # For production, we'd use a unique hash or msg_id
                    from auth import generate_id
                    from datetime import datetime

                    sms_id = generate_id()
                    now = datetime.utcnow().isoformat()

                    conn.execute(
                        """INSERT INTO sms_received (id, number, sender, recipient, service, otp, message, is_alphanumeric_cli, received_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (sms_id, number, sender, data.get('recipient'), data.get('service'),
                         data.get('otp'), msg, 1 if data.get('is_alphanumeric_cli') else 0, now)
                    )

                    # Update counts
                    conn.execute("UPDATE numbers SET total_sms = total_sms + 1, last_sms_at = ? WHERE number = ?", (now, number))
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
                msg_id = data.get('msg_id')
                status = data.get('status')
                logger.info(f"Processing DLR for {msg_id}: {status}")

                with get_db() as conn:
                    # Assuming we have a way to map SMPP msg_id to our internal records
                    # For now, log the event
                    conn.execute(
                        """INSERT INTO firewall_events (id, event_type, severity, detail)
                           VALUES (?, 'DLR_RECEIVED', 'info', ?)""",
                        (f"dlr-{msg_id}", f"MsgID: {msg_id}, Status: {status}, Error: {data.get('error_code')}")
                    )
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
