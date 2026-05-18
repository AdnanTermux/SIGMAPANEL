import hashlib
import hmac
import json
import time
import base64
import secrets
from datetime import datetime, timedelta

TOKEN_SECRET = "sigmapanel-secret-key-change-in-production"
TOKEN_EXPIRY_DAYS = 7

def hash_password(password: str) -> str:
    """Hash password using bcrypt via hashlib + salt"""
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash"""
    import bcrypt
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def generate_token(user_id: str, username: str, role: str) -> str:
    """Generate a simple JWT-like token"""
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    
    now = int(time.time())
    expiry = now + (TOKEN_EXPIRY_DAYS * 86400)
    payload = _b64url(json.dumps({
        "userId": user_id,
        "username": username,
        "role": role,
        "iat": now,
        "exp": expiry,
    }).encode())
    
    signature = hmac.new(
        TOKEN_SECRET.encode(),
        f"{header}.{payload}".encode(),
        hashlib.sha256
    ).digest()
    sig = _b64url(signature)
    
    return f"{header}.{payload}.{sig}"

def verify_token(token: str) -> dict | None:
    """Verify and decode a token"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header, body, signature = parts
        
        expected_sig = hmac.new(
            TOKEN_SECRET.encode(),
            f"{header}.{body}".encode(),
            hashlib.sha256
        ).digest()
        expected = _b64url(expected_sig)
        
        if signature != expected:
            return None
        
        payload = json.loads(base64.urlsafe_b64decode(body + '=='))
        
        if payload.get('exp', 0) < int(time.time()):
            return None
        
        return payload
    except Exception:
        return None

def extract_token(auth_header: str | None) -> str | None:
    """Extract token from Authorization header"""
    if not auth_header:
        return None
    if auth_header.startswith('Bearer '):
        return auth_header[7:].strip()
    return auth_header.strip()

def generate_id() -> str:
    """Generate a unique ID"""
    return secrets.token_hex(8) + secrets.token_hex(4) + secrets.token_hex(4)
