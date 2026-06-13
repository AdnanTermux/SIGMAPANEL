"""SMS Business Logic Engine - Handles Limits and Persistence"""
from database import get_db
from phone_utils import normalize_phone_number
from otp_extractor import extract_otp
from service_detector import detect_service
from auth import generate_id
from datetime import datetime
import logging

logger = logging.getLogger("sms_processor")

def process_incoming_sms(payload: dict):
    """Core logic to process incoming SMS and save to DB with limit enforcement"""
    number = payload.get('to') or payload.get('number')
    sender = payload.get('from') or payload.get('sender') or ""
    message = payload.get('msg') or payload.get('message') or ""
    
    if not number or not message:
        return {'success': False, 'error': 'Missing required fields'}

    normalized_number = normalize_phone_number(number)
    if not normalized_number:
        return {'success': False, 'error': 'Invalid number format'}

    # Business Logic: Service Detection & OTP Extraction
    is_alpha = (sender and not sender.replace('+', '').isdigit())
    service = detect_service(sender, payload.get('service'), message)
    otp = extract_otp(message)
    
    with get_db() as conn:
        # 1. Resolve Number & Range
        num_row = conn.execute("SELECT * FROM numbers WHERE number = ?", (normalized_number,)).fetchone()
        
        range_id = num_row['range_id'] if num_row else None
        range_name = num_row['range_name'] if num_row else None
        assigned_to = num_row['assigned_to'] if num_row else None
        rate = num_row['rate'] if num_row else 0.05
        profit_margin = num_row['profit_margin'] if num_row else 50.0
        
        # Default profit
        profit = rate * (profit_margin / 100.0)
        
        # 2. BUSINESS RULE: Daily OTP Limit Per Range
        if otp and range_id:
            rng = conn.execute("SELECT id, daily_otp_limit, otp_limit_enabled, otp_count_today, otp_count_date FROM ranges WHERE id = ?", (range_id,)).fetchone()
            if rng:
                today = datetime.utcnow().strftime('%Y-%m-%d')
                count = rng['otp_count_today']
                if rng['otp_count_date'] != today:
                    count = 0 # Reset for new day

                if rng['otp_limit_enabled'] and rng['daily_otp_limit'] > 0:
                    if count >= rng['daily_otp_limit']:
                        profit = 0.0 # Limit reached: Zero payout but deliver SMS
                        logger.info(f"OTP Limit reached for range {range_id}. Setting profit to 0.")

                # Increment OTP counter for range
                conn.execute("UPDATE ranges SET otp_count_today = ?, otp_count_date = ? WHERE id = ?", (count + 1, today, range_id))

        # 3. Persistence
        sms_id = generate_id()
        now = datetime.utcnow().isoformat()
        
        conn.execute(
            """INSERT INTO sms_received (id, number, sender, recipient, service, otp, message, assigned_to, is_alphanumeric_cli, range_name, profit, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sms_id, normalized_number, sender, payload.get('recipient'), service, otp, message,
             assigned_to, 1 if is_alpha else 0, range_name, profit, now)
        )
        
        # Update number activity
        conn.execute("UPDATE numbers SET total_sms = total_sms + 1, last_sms_at = ?, service = COALESCE(?, service) WHERE number = ?",
                     (now, service, normalized_number))
        
        # Log profit to ledger if applicable
        if profit > 0 and assigned_to:
            user = conn.execute("SELECT id FROM users WHERE username = ?", (assigned_to,)).fetchone()
            if user:
                conn.execute("INSERT INTO profit_log (id, user_id, number_id, sms_received_id, profit_amount) VALUES (?, ?, ?, ?, ?)",
                             (generate_id(), user['id'], num_row['id'] if num_row else None, sms_id, profit))

    return {'success': True, 'smsId': sms_id, 'service': service, 'otp': otp}
