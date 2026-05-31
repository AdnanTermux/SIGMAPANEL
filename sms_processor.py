"""SMS Processing Engine - Handles multiple HTTP response formats and processes incoming SMS"""

from database import get_db
from phone_utils import normalize_phone_number
from otp_extractor import extract_otp
from service_detector import detect_service
from country_detector import detect_country
from auth import generate_id
from datetime import datetime

NUMBER_FIELDS = ['number', 'phone', 'recipient', 'msisdn', 'to_num', 'dest', 'destination', 'to']
MESSAGE_FIELDS = ['message', 'text', 'body', 'sms', 'content', 'msg', 'sms_text']
FROM_FIELDS = ['from', 'sender', 'from_num', 'source']

def _extract_field(payload: dict, fields: list) -> str | None:
    for field in fields:
        value = payload.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None

def _detect_format(payload) -> str:
    if not payload or not isinstance(payload, dict):
        if isinstance(payload, list):
            return 'array'
        return 'unknown'
    
    if 'aaData' in payload and isinstance(payload['aaData'], list):
        return 'aadata'
    if 'data' in payload and isinstance(payload['data'], dict) and payload['data']:
        return 'nested_data'
    if 'sms' in payload and isinstance(payload['sms'], dict):
        return 'provider_sms'
    
    all_fields = NUMBER_FIELDS + MESSAGE_FIELDS + FROM_FIELDS
    for field in all_fields:
        if field in payload and isinstance(payload[field], str) and payload[field].strip():
            return 'standard'
    
    return 'unknown'

def _extract_sms_data(payload: dict) -> dict | None:
    # 1. Try to find a provider by a token or identifier in the payload
    # This allows using provider-specific field mappings
    provider = None
    with get_db() as conn:
        # If payload has a secret_token, it might be a user's token
        # But we also want to support provider-specific logic if possible.
        # For now, we use a global approach but prioritize the fields from the image.
        pass

    number_raw = _extract_field(payload, NUMBER_FIELDS)
    message = _extract_field(payload, MESSAGE_FIELDS)
    from_val = _extract_field(payload, FROM_FIELDS)
    to_val = _extract_field(payload, ['to', 'recipient', 'dest', 'destination', 'to_num'])
    uuid_val = _extract_field(payload, ['uuid', 'msg_id', 'message_id', 'id'])
    
    if not message and not number_raw:
        return None
    
    return {
        'number': number_raw or to_val or from_val or '',
        'message': message or '',
        'from': from_val,
        'to': to_val,
        'uuid': uuid_val,
        'service': _extract_field(payload, ['service']),
        'timestamp': _extract_field(payload, ['timestamp', 'time', 'date', 'created_at', 'received_at']),
    }

def _process_single_sms(data: dict) -> dict:
    normalized_number = normalize_phone_number(data['number'])
    if not normalized_number:
        return {'success': False, 'error': 'Invalid or empty phone number'}

    # Alphanumeric CLI Detection
    sender = data.get('from', '')
    is_alphanumeric_cli = False
    if sender and not sender.replace('+', '').isdigit():
        is_alphanumeric_cli = True
        # Keep as is, bypass normalization
    else:
        sender = normalize_phone_number(sender) if sender else sender

    # Detect service, OTP, country
    service = detect_service(sender, data.get('service'), data.get('message'))
    otp = extract_otp(data.get('message', ''))
    country_info = detect_country(normalized_number)
    
    with get_db() as conn:
        # Look up existing number
        existing = conn.execute("SELECT * FROM numbers WHERE number = ?", (normalized_number,)).fetchone()
        
        country = country_info['name'] if country_info else (existing['country_name'] if existing else None)
        country_code = country_info['code'] if country_info else (existing['country'] if existing else None)
        range_name = existing['range_name'] if existing else None
        assigned_to = existing['assigned_to'] if existing else None
        rate = existing['rate'] if existing else 0
        profit_margin = existing['profit_margin'] if existing else 0
        range_id = existing['range_id'] if existing else None
        profit = rate * (profit_margin / 100)
        
        now = datetime.utcnow().isoformat()
        sms_id = generate_id()
        
        # Auto-create number if doesn't exist
        if not existing:
            num_id = generate_id()
            conn.execute(
                """INSERT INTO numbers (id, number, country, country_name, range_name, service, total_sms, last_sms_at, rate, profit_margin)
                   VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)""",
                (num_id, normalized_number, country_code, country, range_name, service, now, rate, profit_margin)
            )
        else:
            num_id = existing['id']
        
        # Save SMS
        conn.execute(
            """INSERT INTO sms_received (id, number, sender, recipient, service, country, range_name, otp, message, assigned_to, is_alphanumeric_cli, rate, profit, currency, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?)""",
            (sms_id, normalized_number, sender, data.get('to'), service, country_code or country, range_name, otp, data['message'], assigned_to, 1 if is_alphanumeric_cli else 0, rate, profit, now)
        )
        
        # Update number stats
        conn.execute(
            "UPDATE numbers SET total_sms = total_sms + 1, last_sms_at = ?, service = COALESCE(?, service) WHERE number = ?",
            (now, service, normalized_number)
        )
        
        # Update range total SMS
        if range_id:
            conn.execute("UPDATE ranges SET total_sms = total_sms + 1 WHERE id = ?", (range_id,))
        
        # Log profit
        if profit > 0:
            profit_id = generate_id()
            conn.execute(
                """INSERT INTO profit_log (id, number_id, sms_received_id, rate_applied, profit_amount, currency)
                   VALUES (?, ?, ?, ?, ?, 'USD')""",
                (profit_id, num_id, sms_id, rate, profit)
            )
    
    res = {
        'success': True,
        'number': normalized_number,
        'sender': sender,
        'is_alphanumeric_cli': is_alphanumeric_cli,
        'service': service,
        'otp': otp,
        'country': country,
        'countryCode': country_code,
        'message': data['message'],
        'smsId': sms_id,
    }

    # We'll handle Redis push asynchronously in the background
    # to avoid blocking the main processing if Redis is slow
    async def _async_push():
        from queue_manager import queue_manager
        await self._mock_process(res)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_async_push())
    except Exception:
        pass

    return res

import asyncio

def process_incoming_sms(payload) -> dict | list:
    """Process incoming SMS - auto-detects format"""
    fmt = _detect_format(payload)
    
    if fmt == 'aadata':
        return _process_aadata(payload)
    elif fmt == 'array':
        return _process_array_sms(payload)
    elif fmt == 'nested_data':
        return _process_nested_sms(payload)
    elif fmt == 'provider_sms':
        return _process_provider_sms(payload)
    elif fmt == 'standard':
        return _process_standard_sms(payload)
    else:
        return {'success': False, 'error': 'Could not detect SMS format from payload'}

def _process_standard_sms(payload: dict) -> dict:
    data = _extract_sms_data(payload)
    if not data:
        return {'success': False, 'error': 'Could not extract SMS data from payload'}
    return _process_single_sms(data)

def _process_aadata(payload: dict) -> list:
    aa_data = payload.get('aaData', [])
    if not isinstance(aa_data, list):
        return [{'success': False, 'error': 'Invalid aaData format'}]
    
    results = []
    for row in aa_data:
        if not isinstance(row, list):
            continue
        data = {
            'number': str(row[2] if len(row) > 2 else ''),
            'message': str(row[5] if len(row) > 5 else ''),
            'from': str(row[3] if len(row) > 3 else ''),
            'service': str(row[3] if len(row) > 3 else ''),
            'to': str(row[2] if len(row) > 2 else ''),
            'timestamp': str(row[0] if len(row) > 0 else ''),
        }
        if data['number'] or data['message']:
            results.append(_process_single_sms(data))
    return results

def _process_array_sms(items: list) -> list:
    results = []
    for item in items:
        if not isinstance(item, dict):
            continue
        data = _extract_sms_data(item)
        if data:
            results.append(_process_single_sms(data))
        else:
            results.append({'success': False, 'error': 'Could not extract SMS data from array item'})
    return results

def _process_nested_sms(payload: dict) -> dict:
    inner = payload.get('data')
    if not inner or not isinstance(inner, dict):
        return {'success': False, 'error': 'Missing nested data object'}
    return _process_standard_sms(inner)

def _process_provider_sms(payload: dict) -> dict:
    sms_obj = payload.get('sms')
    if sms_obj and isinstance(sms_obj, dict):
        data = _extract_sms_data(sms_obj)
        if data:
            return _process_single_sms(data)
    return _process_standard_sms(payload)
