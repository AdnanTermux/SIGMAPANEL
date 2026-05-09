/**
 * Authentication utilities
 * Uses bcryptjs for password hashing and crypto for token management
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'sigmapanel-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a simple JWT-like token
 * Format: base64(header).base64(payload).base64(signature)
 */
export function generateToken(payload: {
  userId: string;
  username: string;
  role: string;
}): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = parseExpiry(TOKEN_EXPIRY);
  const tokenPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + expirySeconds,
  };

  const body = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a token
 * Returns payload if valid, null if invalid/expired
 */
export function verifyToken(
  token: string
): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload: TokenPayload = JSON.parse(
      Buffer.from(body, 'base64url').toString()
    );

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * Supports "Bearer <token>" and raw token
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return authHeader.trim();
}

/**
 * Parse expiry string like "7d", "24h", "30m" to seconds
 */
function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 86400; // default 1 day

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 86400;
  }
}

export type { TokenPayload };
