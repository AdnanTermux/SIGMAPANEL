import asyncio
import json
import logging
from queue_manager import queue_manager
from database import get_db, init_db

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
                    from phone_utils import normalize_phone_number
                    from otp_extractor import extract_otp
                    from service_detector import detect_service

                    sms_id = generate_id()
                    now = datetime.utcnow().isoformat()

                    normalized_number = normalize_phone_number(number)
                    sender = sender or ""
                    is_alpha = data.get('is_alphanumeric_cli') or (sender and not sender.replace('+', '').isdigit())

                    service = detect_service(sender, data.get('service'), msg)
                    otp = data.get('otp') or extract_otp(msg)

                    # Look up number info
                    existing = conn.execute("SELECT range_name FROM numbers WHERE number = ?", (normalized_number,)).fetchone()
                    range_name = existing['range_name'] if existing else None

                    # Persistence
                    conn.execute(
                        """INSERT INTO sms_received (id, number, sender, recipient, service, otp, message, is_alphanumeric_cli, range_name, received_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (sms_id, normalized_number, sender, data.get('recipient'), service,
                         otp, msg, 1 if is_alpha else 0, range_name, now)
                    )

                    # Updates
                    conn.execute("UPDATE numbers SET total_sms = total_sms + 1, last_sms_at = ? WHERE number = ?", (now, normalized_number))

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
    init_db() # Ensure tables exist
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
