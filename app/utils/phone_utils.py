"""Phone number normalization utilities"""

def strip_non_digits(phone: str) -> str:
    return ''.join(c for c in phone if c.isdigit())

def normalize_phone_number(phone: str) -> str:
    if not phone or not isinstance(phone, str):
        return ''
    
    cleaned = phone.strip()
    cleaned = cleaned.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('.', '')
    
    if cleaned.startswith('+'):
        cleaned = '+' + strip_non_digits(cleaned[1:])
    else:
        if cleaned.startswith('00'):
            cleaned = cleaned[2:]
        if cleaned.startswith('0') and len(cleaned) > 5:
            cleaned = cleaned[1:]
        cleaned = strip_non_digits(cleaned)
        if cleaned:
            cleaned = '+' + cleaned
    
    return cleaned

def get_digits(phone: str) -> str:
    return strip_non_digits(phone)

def is_valid_phone(phone: str) -> bool:
    digits = get_digits(phone)
    return 7 <= len(digits) <= 15
