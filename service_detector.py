"""Service detection from SMS data"""

SERVICE_MAP = {
    'google': 'Google', 'gmail': 'Google', 'g.co': 'Google',
    'whatsapp': 'WhatsApp', 'wa': 'WhatsApp',
    'telegram': 'Telegram', 'tg': 'Telegram',
    'facebook': 'Facebook', 'fb': 'Facebook', 'meta': 'Facebook',
    'instagram': 'Instagram', 'ig': 'Instagram',
    'twitter': 'Twitter', 'x.com': 'Twitter',
    'tiktok': 'TikTok',
    'uber': 'Uber',
    'amazon': 'Amazon',
    'netflix': 'Netflix',
    'spotify': 'Spotify',
    'linkedin': 'LinkedIn',
    'snapchat': 'Snapchat',
    'discord': 'Discord',
    'microsoft': 'Microsoft', 'outlook': 'Microsoft', 'hotmail': 'Microsoft',
    'apple': 'Apple', 'icloud': 'Apple',
    'yahoo': 'Yahoo',
    'paypal': 'PayPal',
    'stripe': 'Stripe',
    'openai': 'OpenAI',
    'foodpanda': 'Foodpanda', 'panda': 'Foodpanda',
    'grab': 'Grab',
    'line': 'LINE',
    'wechat': 'WeChat',
    'viber': 'Viber',
    'signal': 'Signal',
    'kakao': 'Kakao',
    'binance': 'Binance',
    'coinbase': 'Coinbase',
    'steam': 'Steam',
    'tinder': 'Tinder',
    'venmo': 'Venmo',
    'cashapp': 'CashApp',
    'protonmail': 'ProtonMail',
    'tutanota': 'Tutanota',
    'yandex': 'Yandex',
    'vk': 'VK',
    'shein': 'SHEIN',
    'shopee': 'Shopee',
    'paytm': 'Paytm',
    'gpay': 'Google Pay',
    'samsung': 'Samsung',
    'xiaomi': 'Xiaomi',
    'oneplus': 'OnePlus',
    'oppo': 'OPPO',
    'vivo': 'Vivo',
    'huawei': 'Huawei',
    'realme': 'Realme',
}

import re

MESSAGE_PATTERNS = [
    (re.compile(r'\bwhatsapp\b', re.I), 'WhatsApp'),
    (re.compile(r'\btelegram\b', re.I), 'Telegram'),
    (re.compile(r'\bfacebook\b|\bmeta\b', re.I), 'Facebook'),
    (re.compile(r'\binstagram\b', re.I), 'Instagram'),
    (re.compile(r'\btwitter\b|\bx\.com\b', re.I), 'Twitter'),
    (re.compile(r'\btiktok\b', re.I), 'TikTok'),
    (re.compile(r'\bgoogle\b|\bgmail\b', re.I), 'Google'),
    (re.compile(r'\bmicrosoft\b|\boutlook\b|\bhotmail\b', re.I), 'Microsoft'),
    (re.compile(r'\bapple\b|\bicloud\b', re.I), 'Apple'),
    (re.compile(r'\bamazon\b', re.I), 'Amazon'),
    (re.compile(r'\bnetflix\b', re.I), 'Netflix'),
    (re.compile(r'\bspotify\b', re.I), 'Spotify'),
    (re.compile(r'\blinkedin\b', re.I), 'LinkedIn'),
    (re.compile(r'\bsnapchat\b', re.I), 'Snapchat'),
    (re.compile(r'\bdiscord\b', re.I), 'Discord'),
    (re.compile(r'\bpaypal\b', re.I), 'PayPal'),
    (re.compile(r'\bstripe\b', re.I), 'Stripe'),
    (re.compile(r'\buber\b', re.I), 'Uber'),
    (re.compile(r'\byahoo\b', re.I), 'Yahoo'),
    (re.compile(r'\bline\b', re.I), 'LINE'),
    (re.compile(r'\bviber\b', re.I), 'Viber'),
    (re.compile(r'\bsignal\b', re.I), 'Signal'),
    (re.compile(r'\bgrab\b', re.I), 'Grab'),
    (re.compile(r'\bopenai\b', re.I), 'OpenAI'),
    (re.compile(r'\bfoodpanda\b', re.I), 'Foodpanda'),
    (re.compile(r'\bcoinbase\b', re.I), 'Coinbase'),
    (re.compile(r'\bbinance\b', re.I), 'Binance'),
    (re.compile(r'\bsteam\b', re.I), 'Steam'),
    (re.compile(r'\btinder\b', re.I), 'Tinder'),
    (re.compile(r'\bshein\b', re.I), 'SHEIN'),
    (re.compile(r'\bshopee\b', re.I), 'Shopee'),
    (re.compile(r'\bpaytm\b', re.I), 'Paytm'),
]

def _normalize_service_name(raw: str) -> str | None:
    if not raw or not isinstance(raw, str):
        return None
    cleaned = raw.strip().lower()
    if not cleaned:
        return None
    if cleaned in SERVICE_MAP:
        return SERVICE_MAP[cleaned]
    for key, canonical in SERVICE_MAP.items():
        if key in cleaned:
            return canonical
    return None

def detect_service(from_field: str = None, service_field: str = None, message: str = None) -> str | None:
    # Priority 1: from field (sender name = service)
    if from_field:
        result = _normalize_service_name(from_field)
        if result:
            return result
    
    # Priority 2: explicit service field
    if service_field:
        result = _normalize_service_name(service_field)
        if result:
            return result
    
    # Priority 3: keyword matching in message
    if message and isinstance(message, str):
        for pattern, service in MESSAGE_PATTERNS:
            if pattern.search(message):
                return service
    
    return None
