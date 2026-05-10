/**
 * Phone number normalization utilities
 */

/**
 * Strip all non-digit characters from a phone number
 */
export function stripNonDigits(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Normalize a phone number to E.164 format
 * - Strips spaces, dashes, parentheses, dots
 * - Strips leading zeros (unless it's a short number)
 * - Adds + prefix if missing
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';

  let cleaned = phone.trim();

  // Remove common formatting characters
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');

  // If starts with +, keep it and clean the rest
  if (cleaned.startsWith('+')) {
    cleaned = '+' + stripNonDigits(cleaned.slice(1));
  } else {
    // Remove leading 00 (international dial prefix)
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.slice(2);
    }
    // Remove leading zero (national dial prefix) - only if number is long enough
    if (cleaned.startsWith('0') && cleaned.length > 5) {
      cleaned = cleaned.slice(1);
    }
    cleaned = stripNonDigits(cleaned);
    // Add + prefix
    if (cleaned.length > 0) {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Extract just the digits from a phone number (no + prefix)
 */
export function getDigits(phone: string): string {
  return stripNonDigits(phone);
}

/**
 * Check if a phone number looks valid (7-15 digits)
 */
export function isValidPhone(phone: string): boolean {
  const digits = getDigits(phone);
  return digits.length >= 7 && digits.length <= 15;
}
