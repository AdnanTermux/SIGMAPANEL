"""SMS Processing Engine - Handles multiple HTTP response formats and processes incoming SMS"""

from ..database import get_db, SessionLocal
from ..models.sms import SMSReceived
from ..models.number import Number
from ..models.range import Range
from ..models.profit_log import ProfitLog
from .phone_utils import normalize_phone_number
from .otp_extractor import extract_otp
from .service_detector import detect_service
from .country_detector import detect_country
from datetime import datetime, timezone
from decimal import Decimal

NUMBER_FIELDS = ['number', 'phone', 'recipient', 'msisdn', 'to_num', 'dest', 'destination']
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
    number_raw = _extract_field(payload, NUMBER_FIELDS)
    message = _extract_field(payload, MESSAGE_FIELDS)
    from_val = _extract_field(payload, FROM_FIELDS)
    to_val = _extract_field(payload, ['to', 'recipient', 'dest', 'destination', 'to_num'])
    
    if not message and not number_raw:
        return None
    
    return {
        'number': number_raw or to_val or from_val or '',
        'message': message or '',
        'from': from_val,
        'to': to_val,
        'service': _extract_field(payload, ['service']),
        'timestamp': _extract_field(payload, ['timestamp', 'time', 'date', 'created_at', 'received_at']),
    }

def _process_single_sms(data: dict) -> dict:
    normalized_number = normalize_phone_number(data['number'])
    if not normalized_number:
        return {'success': False, 'error': 'Invalid or empty phone number'}

    # Detect service, OTP, country
    service = detect_service(data.get('from'), data.get('service'), data.get('message'))
    otp = extract_otp(data.get('message', ''))
    country_info = detect_country(normalized_number)
    
    db = SessionLocal()
    try:
        # Look up existing number
        existing = db.query(Number).filter(Number.number == normalized_number).first()
        
        country = country_info['name'] if country_info else (existing.country_name if existing else None)
        country_code = country_info['code'] if country_info else (existing.country if existing else None)
        range_name = existing.range_name if existing else None
        assigned_to = existing.assigned_to if existing else None
        rate = float(existing.rate) if existing else 0
        profit_margin = float(existing.profit_margin) if existing else 0
        range_id = existing.range_id if existing else None
        profit = rate * (profit_margin / 100)
        
        now = datetime.now(timezone.utc)
        
        # Auto-create number if doesn't exist
        if not existing:
            new_number = Number(
                number=normalized_number,
                country=country_code or '',
                country_name=country,
                range_name=range_name,
                service=service,
                total_sms=0,
                last_sms_at=now,
                rate=Decimal(str(rate)),
                profit_margin=Decimal(str(profit_margin)),
            )
            db.add(new_number)
            db.flush()  # Flush to get the id
            num_id = new_number.id
        else:
            num_id = existing.id
        
        # Save SMS
        sms_record = SMSReceived(
            number=normalized_number,
            service=service,
            country=country_code or country,
            range_name=range_name,
            message=data['message'],
            otp=otp,
            assigned_to=assigned_to,
            rate=Decimal(str(rate)),
            profit=Decimal(str(profit)),
            currency='USD',
            received_at=now,
        )
        db.add(sms_record)
        db.flush()  # Flush to get the sms id
        sms_id = sms_record.id
        
        # Update number stats
        db.query(Number).filter(Number.number == normalized_number).update({
            Number.total_sms: Number.total_sms + 1,
            Number.last_sms_at: now,
        })
        # Update service if detected and number has no service
        if service and not existing:
            pass  # Already set on creation above
        elif service:
            db.query(Number).filter(Number.id == num_id).filter(
                Number.service.is_(None)
            ).update({Number.service: service})
        
        # Update range total SMS
        if range_id:
            db.query(Range).filter(Range.id == int(range_id) if isinstance(range_id, str) else range_id).update({
                Range.total_sms: Range.total_sms + 1,
            })
        
        # Log profit
        if profit > 0:
            profit_record = ProfitLog(
                number_id=num_id,
                sms_received_id=sms_id,
                rate_applied=Decimal(str(rate)),
                profit_amount=Decimal(str(profit)),
                currency='USD',
            )
            db.add(profit_record)
        
        db.commit()
    except Exception as e:
        db.rollback()
        return {'success': False, 'error': f'Database error: {str(e)}'}
    finally:
        db.close()
    
    return {
        'success': True,
        'number': normalized_number,
        'service': service,
        'otp': otp,
        'country': country,
        'countryCode': country_code,
        'message': data['message'],
        'smsId': sms_id,
    }

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
