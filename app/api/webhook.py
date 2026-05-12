"""
SMS Webhook API
Receives SMS from provider via HTTP - Enhanced version
Supports: JSON, Form-encoded, text/plain, Nested JSON, DataTables (aaData), Array formats
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
from loguru import logger
from datetime import datetime
import re
import json

from ..database import get_db
from ..schemas.sms import SMSWebhook
from ..models.sms import SMSReceived
from ..models.number import Number
from ..core.security import extract_otp, detect_service, detect_country

router = APIRouter()


@router.post("/sms")
async def receive_sms(
    request: Request,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Enhanced SMS Webhook Endpoint
    Auto-detects and parses multiple HTTP formats:
    1. JSON (standard, nested, array of objects)
    2. Form-encoded (application/x-www-form-urlencoded)
    3. Text/plain (raw text body)
    4. DataTables format (aaData array)
    5. Direct query parameters (GET-style fields in POST body)
    """
    client_ip = request.client.host
    content_type = request.headers.get("content-type", "")
    logger.info(f"SMS Webhook called from IP: {client_ip}, Content-Type: {content_type}")

    try:
        raw_body = await request.body()
    except Exception:
        raw_body = b""

    body_str = raw_body.decode("utf-8", errors="replace").strip()

    # ── Attempt 1: Parse as JSON ──
    payload = None
    if content_type.startswith("application/json") or body_str.startswith("{") or body_str.startswith("["):
        try:
            payload = json.loads(body_str)
            logger.info("Parsed as JSON")
        except json.JSONDecodeError:
            payload = None

    # ── Attempt 2: Parse as Form-encoded ──
    if payload is None and (content_type.startswith("application/x-www-form-urlencoded") or "=" in body_str[:200]):
        try:
            form = await request.form()
            payload = dict(form)
            logger.info(f"Parsed as form-encoded, keys: {list(payload.keys())}")
        except Exception:
            payload = None

    # ── Attempt 3: Parse as text/plain (key=value lines or raw text) ──
    if payload is None and body_str:
        payload = parse_text_plain(body_str)
        if payload:
            logger.info("Parsed as text/plain")

    # ── Attempt 4: Try query parameters ──
    if payload is None:
        payload = dict(request.query_params)
        if payload:
            logger.info(f"Parsed from query params, keys: {list(payload.keys())}")

    # ── No data could be parsed ──
    if not payload:
        raise HTTPException(status_code=400, detail="Could not parse request body. Send JSON, form-encoded, or text/plain.")

    # ── Handle DataTables format (aaData) ──
    if isinstance(payload, dict) and "aaData" in payload and isinstance(payload["aaData"], list):
        aaData = payload["aaData"]
        if aaData and isinstance(aaData[0], list):
            return await process_datatables_format(aaData, db)

    # ── Handle Array of objects ──
    if isinstance(payload, list):
        return await process_array_format(payload, db)

    # ── Handle nested JSON (data.sms, data.messages, etc.) ──
    if isinstance(payload, dict):
        payload = flatten_nested_json(payload)

    # ── Handle single SMS (dict) ──
    if isinstance(payload, dict):
        return await process_standard_format(payload, db)

    raise HTTPException(status_code=400, detail="Unrecognized payload format")


def parse_text_plain(body: str) -> Dict[str, str]:
    """
    Parse text/plain body. Supports:
    - key=value&key2=value2 (URL-encoded style without Content-Type header)
    - key=value\\n key2=value2 (newline-separated)
    - Raw text (store entirely as message, try to extract number from context)
    """
    result = {}

    # Try key=value&key2=value2 format
    if "&" in body and "=" in body:
        from urllib.parse import unquote_plus
        pairs = body.split("&")
        for pair in pairs:
            if "=" in pair:
                key, val = pair.split("=", 1)
                result[key.strip()] = unquote_plus(val.strip())
        return result if result else None

    # Try newline-separated key=value
    lines = body.strip().split("\n")
    kv_pairs = 0
    for line in lines:
        if "=" in line and not line.startswith("#"):
            key, val = line.split("=", 1)
            result[key.strip()] = val.strip()
            kv_pairs += 1
    if kv_pairs >= 2:
        return result

    # Raw text — try to detect number and OTP from the text itself
    if body.strip():
        result = {"message": body.strip()}
        # Try to find a phone number in the text
        phone_match = re.search(r'(\+?\d{7,15})', body)
        if phone_match:
            result["number"] = phone_match.group(1)
        return result

    return None


def flatten_nested_json(data: dict, depth: int = 0) -> dict:
    """
    Recursively flatten nested JSON to find SMS-related fields.
    Looks into common wrappers like: data, sms, message, messages, result, payload, etc.
    """
    # If it looks like an SMS record already (has number/message-like fields), return as-is
    sms_keys = {"number", "phone", "to", "from", "message", "text", "msg", "sms", "content",
                "recipient", "receiver", "otp", "service", "country"}
    flat_keys = {k.lower() for k in data.keys() if isinstance(k, str)}
    if flat_keys & sms_keys:
        return data

    # Recursively search into common wrapper keys
    wrapper_keys = ["data", "sms", "message", "messages", "result", "payload", "content",
                    "body", "entry", "response", "notification", "event"]

    for key in wrapper_keys:
        if key in data:
            val = data[key]
            if isinstance(val, dict) and depth < 3:
                result = flatten_nested_json(val, depth + 1)
                if result and isinstance(result, dict) and ({k.lower() for k in result.keys()} & sms_keys):
                    return result
            elif isinstance(val, list) and val and isinstance(val[0], dict):
                # Return the first item from the array
                result = flatten_nested_json(val[0], depth + 1)
                if result and isinstance(result, dict) and ({k.lower() for k in result.keys()} & sms_keys):
                    return result

    return data


async def process_array_format(items: list, db: Session) -> Dict[str, Any]:
    """Process array of SMS objects (bulk)"""
    success_count = 0
    error_count = 0
    errors = []

    logger.info(f"Processing array format with {len(items)} records")

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            error_count += 1
            errors.append(f"Item {index}: Not a JSON object")
            continue
        try:
            await _save_single_sms(item, db)
            success_count += 1
        except Exception as e:
            error_count += 1
            errors.append(f"Item {index}: {str(e)}")
            logger.error(f"Error processing item {index}: {e}")

    try:
        db.commit()
        logger.info(f"Successfully saved {success_count} SMS records from array")
    except Exception as e:
        db.rollback()
        logger.error(f"Database commit failed: {e}")
        return {"status": "error", "message": "Database error", "error": str(e)}

    return {
        "status": "success",
        "message": f"Processed {len(items)} records",
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors[:10]
    }


async def process_datatables_format(aaData: list, db: Session) -> Dict[str, Any]:
    """Process DataTables format (bulk SMS)"""
    success_count = 0
    error_count = 0
    errors = []

    logger.info(f"Processing DataTables format with {len(aaData)} records")

    for index, row in enumerate(aaData):
        try:
            if len(row) < 6:
                error_count += 1
                errors.append(f"Row {index}: Insufficient data")
                continue

            timestamp_str = row[0] if len(row) > 0 else None
            range_name = row[1] if len(row) > 1 else None
            number = row[2] if len(row) > 2 else None
            service = row[3] if len(row) > 3 else None
            assigned_to = row[4] if len(row) > 4 else None
            message = row[5] if len(row) > 5 else None
            currency = row[6] if len(row) > 6 else "USD"
            rate = float(row[7]) if len(row) > 7 and row[7] else 0.0
            profit = float(row[8]) if len(row) > 8 and row[8] else 0.0

            if not number or not message:
                error_count += 1
                errors.append(f"Row {index}: Missing number or message")
                continue

            number = normalize_phone_number(number)
            otp = extract_otp(message)
            country = detect_country(number)

            if not service or service == "null":
                service = detect_service(message)

            received_at = None
            if timestamp_str:
                try:
                    received_at = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                except:
                    received_at = datetime.utcnow()
            else:
                received_at = datetime.utcnow()

            sms = SMSReceived(
                number=number, country=country, range_name=range_name, service=service,
                message=message, otp=otp,
                assigned_to=assigned_to if assigned_to and assigned_to != "null" else None,
                currency=currency if currency and currency != "null" else "USD",
                rate=rate, profit=profit,
                received_at=received_at, processed_at=datetime.utcnow()
            )
            db.add(sms)
            success_count += 1

        except Exception as e:
            error_count += 1
            errors.append(f"Row {index}: {str(e)}")
            logger.error(f"Error processing row {index}: {e}")

    try:
        db.commit()
        logger.info(f"Successfully saved {success_count} SMS records")
    except Exception as e:
        db.rollback()
        logger.error(f"Database commit failed: {e}")
        return {"status": "error", "message": "Database error", "error": str(e)}

    return {
        "status": "success",
        "message": f"Processed {len(aaData)} records",
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors[:10]
    }


async def process_standard_format(data: dict, db: Session) -> Dict[str, Any]:
    """Process standard format (single SMS) from parsed dict"""

    # Extract number from various field names
    number = (
        data.get("number") or data.get("phone") or data.get("to") or
        data.get("from") or data.get("from_") or data.get("recipient") or
        data.get("receiver") or data.get("destination") or data.get("msisdn") or
        data.get("dest") or data.get("num") or data.get("mobile")
    )
    # Clean number - if 'from' contains a service name (non-numeric), treat it as service
    from_val = data.get("from") or data.get("from_") or ""
    if from_val and not re.match(r'^\+?\d+$', str(from_val).strip()):
        number = data.get("to") or data.get("number") or data.get("phone") or data.get("recipient") or data.get("msisdn")

    # Extract message from various field names
    message = (
        data.get("message") or data.get("text") or data.get("sms") or
        data.get("content") or data.get("msg") or data.get("body") or
        data.get("full_message")
    )

    if not number or not message:
        missing = []
        if not number: missing.append("number")
        if not message: missing.append("message")
        logger.error(f"Missing required fields: {', '.join(missing)}. Received keys: {list(data.keys())}")
        raise HTTPException(
            status_code=400,
            detail=f"Missing required fields: {', '.join(missing)}"
        )

    # Normalize phone number
    number = normalize_phone_number(str(number))

    # Extract OTP if not provided
    otp = data.get("otp") or data.get("code") or data.get("pin")
    if not otp:
        otp = extract_otp(str(message))

    # Auto-detect service (from "from" field if it's a service name)
    service = data.get("service")
    if not service:
        from_val = data.get("from") or data.get("from_") or ""
        if from_val and not re.match(r'^\+?\d+$', str(from_val).strip()):
            service = str(from_val).strip()
        else:
            service = detect_service(str(message))

    # Auto-detect country
    country = data.get("country")
    if not country:
        country = detect_country(number)

    # Check if number exists in database
    number_record = db.query(Number).filter(Number.number == number).first()

    rate = 0.0
    profit = 0.0
    assigned_to = None
    range_name = None

    if number_record:
        rate = float(number_record.rate)
        profit = rate * (float(number_record.profit_margin) / 100)
        assigned_to = number_record.assigned_to
        range_name = number_record.range_name
        number_record.total_sms += 1
        number_record.last_sms_at = datetime.utcnow()

    # Get provider ID from various field names
    provider_id = (
        data.get("uuid") or data.get("id") or data.get("msgid") or
        data.get("message_id") or data.get("messageId") or data.get("msg_id") or
        data.get("sms_id") or data.get("transaction_id") or data.get("reference")
    )

    sms = SMSReceived(
        number=number, country=country, range_name=range_name, service=service,
        message=str(message), otp=otp, assigned_to=assigned_to,
        currency="USD", rate=rate, profit=profit,
        provider_id=str(provider_id) if provider_id else None,
        received_at=datetime.utcnow(), processed_at=datetime.utcnow()
    )

    db.add(sms)

    try:
        db.commit()
        db.refresh(sms)
        logger.info(f"SMS saved: ID={sms.id}, Number={number}, Service={service}, OTP={otp}")
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database error")

    return {
        "status": "success",
        "message": "SMS received successfully",
        "sms_id": sms.id,
        "data": {
            "number": number,
            "service": service,
            "country": country,
            "otp": otp,
            "received_at": sms.received_at.isoformat()
        }
    }


async def _save_single_sms(data: dict, db: Session):
    """Helper to save a single SMS from a dict (used by array format)"""
    number = (
        data.get("number") or data.get("phone") or data.get("to") or
        data.get("recipient") or data.get("msisdn") or data.get("dest")
    )
    message = (
        data.get("message") or data.get("text") or data.get("sms") or
        data.get("content") or data.get("msg") or data.get("body")
    )
    if not number or not message:
        raise ValueError("Missing number or message")

    number = normalize_phone_number(str(number))
    otp = data.get("otp") or data.get("code") or extract_otp(str(message))

    service = data.get("service")
    if not service:
        from_val = data.get("from") or data.get("from_") or ""
        if from_val and not re.match(r'^\+?\d+$', str(from_val).strip()):
            service = str(from_val).strip()
        else:
            service = detect_service(str(message))

    country = data.get("country") or detect_country(number)

    number_record = db.query(Number).filter(Number.number == number).first()
    rate = 0.0
    profit = 0.0
    assigned_to = None
    range_name = None
    if number_record:
        rate = float(number_record.rate)
        profit = rate * (float(number_record.profit_margin) / 100)
        assigned_to = number_record.assigned_to
        range_name = number_record.range_name
        number_record.total_sms += 1
        number_record.last_sms_at = datetime.utcnow()

    sms = SMSReceived(
        number=number, country=country, range_name=range_name, service=service,
        message=str(message), otp=otp, assigned_to=assigned_to,
        currency="USD", rate=rate, profit=profit,
        received_at=datetime.utcnow(), processed_at=datetime.utcnow()
    )
    db.add(sms)


def normalize_phone_number(number: str) -> str:
    """Normalize phone number format"""
    number = re.sub(r'[\s\-\(\)]', '', str(number))
    if not number.startswith('+'):
        number = '+' + number
    return number
