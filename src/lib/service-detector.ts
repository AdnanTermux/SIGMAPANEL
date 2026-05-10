/**
 * Service detection from SMS data
 * Priority: from field → service field → message keywords
 */

/**
 * Canonical service name mapping (case-insensitive)
 */
export const SERVICE_MAP: Record<string, string> = {
  'google': 'Google',
  'gmail': 'Google',
  'g.co': 'Google',
  'whatsapp': 'WhatsApp',
  'wa': 'WhatsApp',
  'telegram': 'Telegram',
  'tg': 'Telegram',
  'facebook': 'Facebook',
  'fb': 'Facebook',
  'meta': 'Facebook',
  'instagram': 'Instagram',
  'ig': 'Instagram',
  'twitter': 'Twitter',
  'x.com': 'Twitter',
  'x': 'Twitter',
  'tiktok': 'TikTok',
  'uber': 'Uber',
  'amazon': 'Amazon',
  'netflix': 'Netflix',
  'spotify': 'Spotify',
  'linkedin': 'LinkedIn',
  'snapchat': 'Snapchat',
  'discord': 'Discord',
  'microsoft': 'Microsoft',
  'outlook': 'Microsoft',
  'hotmail': 'Microsoft',
  'live': 'Microsoft',
  'apple': 'Apple',
  'icloud': 'Apple',
  'yahoo': 'Yahoo',
  'paypal': 'PayPal',
  'stripe': 'Stripe',
  'openai': 'OpenAI',
  'foodpanda': 'Foodpanda',
  'panda': 'Foodpanda',
  'grab': 'Grab',
  'line': 'LINE',
  'wechat': 'WeChat',
  'viber': 'Viber',
  'signal': 'Signal',
  'kakao': 'Kakao',
  'naver': 'Naver',
  'paypal': 'PayPal',
  'venmo': 'Venmo',
  'cashapp': 'CashApp',
  'coinbase': 'Coinbase',
  'binance': 'Binance',
  'steam': 'Steam',
  'epic': 'Epic Games',
  'riot': 'Riot Games',
  'ea': 'EA',
  'origin': 'EA',
  'ubisoft': 'Ubisoft',
  'yahoo': 'Yahoo',
  'protonmail': 'ProtonMail',
  'tutanota': 'Tutanota',
  'mailru': 'Mail.ru',
  'yandex': 'Yandex',
  'vk': 'VK',
  'ok': 'OK',
  'tinder': 'Tinder',
  'badoo': 'Badoo',
  'bumble': 'Bumble',
  'hinge': 'Hinge',
  'doordash': 'DoorDash',
  'lyft': 'Lyft',
  'ola': 'Ola',
  'mercadolibre': 'MercadoLibre',
  'mercado': 'MercadoLibre',
  'alibaba': 'Alibaba',
  'aliexpress': 'AliExpress',
  'shein': 'SHEIN',
  'shopee': 'Shopee',
  'lazada': 'Lazada',
  'tokopedia': 'Tokopedia',
  'bukalapak': 'Bukalapak',
  'blibli': 'Blibli',
  'ola': 'Ola',
  'swiggy': 'Swiggy',
  'zomato': 'Zomato',
  'deliveroo': 'Deliveroo',
  'justeat': 'Just Eat',
  'paytm': 'Paytm',
  'phonepe': 'PhonePe',
  'gpay': 'Google Pay',
  'samsung': 'Samsung',
  'huawei': 'Huawei',
  'xiaomi': 'Xiaomi',
  'oppo': 'OPPO',
  'vivo': 'Vivo',
  'oneplus': 'OnePlus',
  'realme': 'Realme',
};

/**
 * Message keyword patterns for service detection
 * Ordered by specificity (more specific first)
 */
const MESSAGE_PATTERNS: Array<{ pattern: RegExp; service: string }> = [
  { pattern: /\bwhatsapp\b/i, service: 'WhatsApp' },
  { pattern: /\btelegram\b/i, service: 'Telegram' },
  { pattern: /\bfacebook\b|\bmeta\b/i, service: 'Facebook' },
  { pattern: /\binstagram\b/i, service: 'Instagram' },
  { pattern: /\btwitter\b|\bx\.com\b/i, service: 'Twitter' },
  { pattern: /\btiktok\b/i, service: 'TikTok' },
  { pattern: /\bgoogle\b|\bgoogle\b/i, service: 'Google' },
  { pattern: /\bgmail\b/i, service: 'Google' },
  { pattern: /\bmicrosoft\b|\boutlook\b|\bhotmail\b/i, service: 'Microsoft' },
  { pattern: /\bapple\b|\bicloud\b/i, service: 'Apple' },
  { pattern: /\bamazon\b/i, service: 'Amazon' },
  { pattern: /\bnetflix\b/i, service: 'Netflix' },
  { pattern: /\bspotify\b/i, service: 'Spotify' },
  { pattern: /\blinkedin\b/i, service: 'LinkedIn' },
  { pattern: /\bsnapchat\b/i, service: 'Snapchat' },
  { pattern: /\bdiscord\b/i, service: 'Discord' },
  { pattern: /\bpaypal\b/i, service: 'PayPal' },
  { pattern: /\bstripe\b/i, service: 'Stripe' },
  { pattern: /\buber\b/i, service: 'Uber' },
  { pattern: /\byahoo\b/i, service: 'Yahoo' },
  { pattern: /\bline\b/i, service: 'LINE' },
  { pattern: /\bviber\b/i, service: 'Viber' },
  { pattern: /\bsignal\b/i, service: 'Signal' },
  { pattern: /\bgrab\b/i, service: 'Grab' },
  { pattern: /\bopenai\b/i, service: 'OpenAI' },
  { pattern: /\bfoodpanda\b/i, service: 'Foodpanda' },
  { pattern: /\bcoinbase\b/i, service: 'Coinbase' },
  { pattern: /\bbinance\b/i, service: 'Binance' },
  { pattern: /\bsteam\b/i, service: 'Steam' },
  { pattern: /\btinder\b/i, service: 'Tinder' },
  { pattern: /\blyft\b/i, service: 'Lyft' },
  { pattern: /\bdoordash\b/i, service: 'DoorDash' },
  { pattern: /\bshein\b/i, service: 'SHEIN' },
  { pattern: /\bshopee\b/i, service: 'Shopee' },
  { pattern: /\bpaytm\b/i, service: 'Paytm' },
];

/**
 * Normalize a service name using the canonical mapping
 */
function normalizeServiceName(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) return null;

  // Direct match in SERVICE_MAP
  if (SERVICE_MAP[cleaned]) {
    return SERVICE_MAP[cleaned];
  }

  // Try matching as a key within the raw string
  for (const [key, canonical] of Object.entries(SERVICE_MAP)) {
    if (cleaned.includes(key)) {
      return canonical;
    }
  }

  return null;
}

/**
 * Detect service from available fields
 * Priority: from field → service field → message keywords
 */
export function detectService(
  fromField?: string,
  serviceField?: string,
  message?: string
): string | null {
  // Priority 1: from field (sender name = service)
  if (fromField) {
    const fromService = normalizeServiceName(fromField);
    if (fromService) return fromService;
  }

  // Priority 2: explicit service field in payload
  if (serviceField) {
    const serviceFromField = normalizeServiceName(serviceField);
    if (serviceFromField) return serviceFromField;
  }

  // Priority 3: Keyword matching in message text
  if (message && typeof message === 'string') {
    for (const { pattern, service } of MESSAGE_PATTERNS) {
      if (pattern.test(message)) {
        return service;
      }
    }
  }

  return null;
}
