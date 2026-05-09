/**
 * OTP extraction with improved priority order
 * Most specific patterns are tried first
 */

const OTP_PATTERNS = [
  // 1. OTP with separator (Japanese & English)
  { pattern: /OTP[は:]\s*(\d{4,8})/i, priority: 1 },
  // 2. "code" with separator
  { pattern: /code[は:\s]+(\d{4,8})/i, priority: 2 },
  // 3. "verification" with separator
  { pattern: /verification[コード:\s]+(\d{4,8})/i, priority: 3 },
  // 4. pin/password
  { pattern: /(?:pin|パスワード|password)[\s:]+(\d{4,8})/i, priority: 4 },
  // 5. "XXXXX is your/the code" pattern
  { pattern: /(\d{4,8})\s*(?:is your|is the|次のコード)/i, priority: 5 },
  // 6. Security code / login code / auth code
  { pattern: /(?:security|login|auth|access)[\s-]?code[\s:]+(\d{4,8})/i, priority: 3.5 },
  // 7. Confirmation code
  { pattern: /confirmation[\s-]?code[\s:]+(\d{4,8})/i, priority: 3.5 },
  // 8. "use XXXXX to verify"
  { pattern: /(?:use|using)[\s]*(\d{4,8})[\s]*(?:to|for)/i, priority: 4.5 },
  // 9. "your code is XXXXX"
  { pattern: /your[\s]*(?:code| OTP)[\s]*(?:is|:)\s*(\d{4,8})/i, priority: 3.5 },
  // LAST RESORT: any standalone 4-8 digit number
  { pattern: /\b(\d{4,8})\b/, priority: 10 },
];

/**
 * Extract OTP from an SMS message
 * Returns null if no OTP is found
 */
export function extractOtp(message: string): string | null {
  if (!message || typeof message !== 'string') return null;

  // Sort patterns by priority
  const sorted = [...OTP_PATTERNS].sort((a, b) => a.priority - b.priority);

  for (const { pattern } of sorted) {
    const match = message.match(pattern);
    if (match && match[1]) {
      // Validate: should not be a year (2000-2099) unless it's in context
      const otp = match[1];
      const num = parseInt(otp, 10);
      // Avoid matching years when not in OTP context (for the last-resort pattern only)
      if (pattern.priority === 10 && num >= 2000 && num <= 2099) {
        continue;
      }
      return otp;
    }
  }

  return null;
}
