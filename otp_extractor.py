"""OTP extraction with improved priority order"""
import re

OTP_PATTERNS = [
    # 1. OTP with separator (Japanese & English)
    (re.compile(r'OTP[は:]\s*(\d{4,8})', re.I), 1),
    # 2. "code" with separator
    (re.compile(r'code[は:\s]+(\d{4,8})', re.I), 2),
    # 3. "verification" with separator
    (re.compile(r'verification[コード:\s]+(\d{4,8})', re.I), 3),
    # 3.5. Security/login/auth code
    (re.compile(r'(?:security|login|auth|access)[\s-]?code[\s:]+(\d{4,8})', re.I), 3.5),
    # 4. pin/password
    (re.compile(r'(?:pin|パスワード|password)[\s:]+(\d{4,8})', re.I), 4),
    # 4.5. "use XXXXX to verify"
    (re.compile(r'(?:use|using)[\s]*(\d{4,8})[\s]*(?:to|for)', re.I), 4.5),
    # 5. "XXXXX is your/the code" pattern
    (re.compile(r'(\d{4,8})\s*(?:is your|is the|次のコード)', re.I), 5),
    # 9. "your code is XXXXX"
    (re.compile(r'your[\s]*(?:code| OTP)[\s]*(?:is|:)\s*(\d{4,8})', re.I), 9),
    # LAST RESORT: any standalone 4-8 digit number
    (re.compile(r'\b(\d{4,8})\b'), 10),
]

def extract_otp(message: str) -> str | None:
    if not message or not isinstance(message, str):
        return None
    
    sorted_patterns = sorted(OTP_PATTERNS, key=lambda x: x[1])
    
    for pattern, priority in sorted_patterns:
        match = pattern.search(message)
        if match and match.group(1):
            otp = match.group(1)
            num = int(otp)
            # Avoid matching years when not in OTP context
            if priority == 10 and 2000 <= num <= 2099:
                continue
            return otp
    
    return None
