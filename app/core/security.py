"""
Security Utilities
"""
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..config import settings
import bcrypt as _bcrypt_lib
import secrets
import re


def hash_password(password: str) -> str:
    """Hash a password using bcrypt directly"""
    return _bcrypt_lib.hashpw(password.encode('utf-8'), _bcrypt_lib.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password. Handles both $2b$ (Python) and $2y$ (PHP) bcrypt hashes."""
    try:
        normalized = hashed_password.replace('$2y$', '$2b$')
        return _bcrypt_lib.checkpw(plain_password.encode('utf-8'), normalized.encode('utf-8'))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode JWT access token"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def generate_api_token() -> str:
    """Generate random API token"""
    return secrets.token_urlsafe(48)


def extract_otp(message: str) -> Optional[str]:
    """Extract OTP code from message"""
    patterns = [
        r'\b(\d{4,8})\b',
        r'code[:\s]+(\d{4,8})',
        r'verification[:\s]+(\d{4,8})',
        r'OTP[:\s]+(\d{4,8})',
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def detect_service(message: str) -> str:
    """Detect service from message content"""
    message_lower = message.lower()
    services = {
        'whatsapp': ['whatsapp', 'wa'],
        'telegram': ['telegram', 'tg'],
        'facebook': ['facebook', 'fb'],
        'instagram': ['instagram', 'ig'],
        'google': ['google', 'gmail'],
        'twitter': ['twitter', 'x.com'],
        'tiktok': ['tiktok'],
        'uber': ['uber'],
        'amazon': ['amazon'],
        'netflix': ['netflix'],
        'spotify': ['spotify'],
        'linkedin': ['linkedin'],
        'snapchat': ['snapchat'],
        'discord': ['discord'],
        'foodpanda': ['foodpanda', 'panda'],
    }
    for service, keywords in services.items():
        for keyword in keywords:
            if keyword in message_lower:
                return service.capitalize()
    return "Unknown"


def detect_country(phone_number: str) -> Optional[str]:
    """Detect country from phone number"""
    number = re.sub(r'\D', '', phone_number)
    country_codes = {
        '1': 'US', '44': 'GB', '91': 'IN', '86': 'CN', '81': 'JP',
        '82': 'KR', '49': 'DE', '33': 'FR', '39': 'IT', '34': 'ES',
        '7': 'RU', '55': 'BR', '52': 'MX', '61': 'AU', '64': 'NZ',
        '27': 'ZA', '20': 'EG', '234': 'NG', '254': 'KE', '95': 'MM',
        '66': 'TH', '84': 'VN', '62': 'ID', '63': 'PH', '60': 'MY',
        '65': 'SG', '92': 'PK', '880': 'BD', '94': 'LK', '977': 'NP',
    }
    for code, country in sorted(country_codes.items(), key=lambda x: len(x[0]), reverse=True):
        if number.startswith(code):
            return country
    return None


def mask_service_name(service: str) -> str:
    """Mask service name for privacy"""
    if not service or len(service) < 3:
        return service
    return service[:3].upper() + '*' * 4


def mask_message(message: str) -> str:
    """Mask message content for privacy"""
    return '*' * 6


def sanitize_input(text: str) -> str:
    """Sanitize user input"""
    text = re.sub(r"""[<>"']""", '', text)
    return text.strip()


def validate_trc20_address(address: str) -> bool:
    """Validate USDT TRC-20 address"""
    return address.startswith('T') and len(address) == 34 and address.isalnum()


def validate_binance_id(binance_id: str) -> bool:
    """Validate Binance ID"""
    if '@' in binance_id:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, binance_id))
    return binance_id.isdigit() and len(binance_id) >= 6
