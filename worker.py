import asyncio
import json
import logging
from queue_manager import queue_manager
from database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

async def process_sms_queue():
    logger.info("SMS Worker task started")
    while True:
        try:
            data = await queue_manager.pop("sms_queue", timeout=2)
            if data:
                number = data.get('number') or data.get('to')
                sender = data.get('sender') or data.get('from')
                msg = data.get('message') or data.get('msg')

                logger.info(f"Worker popped SMS: {number} from {sender}")

                with get_db() as conn:
                    from auth import generate_id
                    from datetime import datetime

                    sms_id = generate_id()
                    now = datetime.utcnow().isoformat()

                    # Persistence
                    conn.execute(
                        """INSERT INTO sms_received (id, number, sender, recipient, service, otp, message, is_alphanumeric_cli, received_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (sms_id, number, sender, data.get('recipient'), data.get('service'),
                         data.get('otp'), msg, 1 if data.get('is_alphanumeric_cli') else 0, now)
                    )

                    # Updates
                    conn.execute("UPDATE numbers SET total_sms = total_sms + 1, last_sms_at = ? WHERE number = ?", (now, number))

            await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.info("SMS Worker task cancelling...")
            break
        except Exception as e:
            logger.error(f"SMS Worker error: {e}")
            await asyncio.sleep(2)

async def process_dlr_queue():
    logger.info("DLR Worker task started")
    while True:
        try:
            data = await queue_manager.pop("dlr_queue", timeout=2)
            if data:
                msg_id = data.get('msg_id') or data.get('raw')
                status = data.get('status') or 'RECEIVED'
                logger.info(f"Worker popped DLR for {msg_id}: {status}")

                with get_db() as conn:
                    from auth import generate_id
                    conn.execute(
                        """INSERT INTO firewall_events (id, event_type, severity, detail)
                           VALUES (?, 'DLR_RECEIVED', 'info', ?)""",
                        (generate_id(), f"MsgID: {msg_id}, Status: {status}")
                    )

            await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.info("DLR Worker task cancelling...")
            break
        except Exception as e:
            logger.error(f"DLR Worker error: {e}")
            await asyncio.sleep(2)

async def main():
    logger.info("Standalone Workers starting...")
    try:
        await asyncio.gather(
            process_sms_queue(),
            process_dlr_queue()
        )
    except KeyboardInterrupt:
        pass
    finally:
        await queue_manager.close()

if __name__ == "__main__":
    asyncio.run(main())
