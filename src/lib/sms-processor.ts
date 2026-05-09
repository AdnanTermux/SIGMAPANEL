/**
 * SMS Processing Engine
 * Handles multiple HTTP response formats and processes incoming SMS
 */

import { db } from '@/lib/db';
import { normalizePhoneNumber } from '@/lib/phone-utils';
import { extractOtp } from '@/lib/otp-extractor';
import { detectService } from '@/lib/service-detector';
import { detectCountry } from '@/lib/country-detector';

export interface ProcessingResult {
  success: boolean;
  number?: string;
  service?: string | null;
  otp?: string | null;
  country?: string | null;
  countryCode?: string | null;
  message?: string;
  error?: string;
  smsId?: string;
}

interface SmsData {
  number: string;
  message: string;
  from?: string;
  to?: string;
  service?: string;
  timestamp?: string;
}

// ==================== FIELD EXTRACTION ====================

const NUMBER_FIELDS = ['number', 'phone', 'recipient', 'msisdn', 'to_num', 'dest', 'destination'];
const MESSAGE_FIELDS = ['message', 'text', 'body', 'sms', 'content', 'msg', 'sms_text'];
const FROM_FIELDS = ['from', 'sender', 'from_num', 'source', 'origin'];

function extractField(payload: Record<string, unknown>, fields: string[]): string | null {
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

// ==================== FORMAT DETECTION ====================

type PayloadFormat =
  | 'aadata'
  | 'array'
  | 'nested_data'
  | 'provider_sms'
  | 'standard'
  | 'unknown';

function detectFormat(payload: unknown): PayloadFormat {
  if (!payload || typeof payload !== 'object') return 'unknown';

  const obj = payload as Record<string, unknown>;

  // aaData format (DataTables)
  if ('aaData' in obj && Array.isArray(obj.aaData)) {
    return 'aadata';
  }

  // Array format
  if (Array.isArray(obj)) {
    return 'array';
  }

  // Nested data format
  if ('data' in obj && typeof obj.data === 'object' && obj.data !== null && !Array.isArray(obj.data)) {
    return 'nested_data';
  }

  // Provider-specific: {"sms": {"phone": "...", "text": "..."}}
  if ('sms' in obj && typeof obj.sms === 'object' && obj.sms !== null) {
    return 'provider_sms';
  }

  // Check if it has at least a number or message field
  const allFields = [...NUMBER_FIELDS, ...MESSAGE_FIELDS, ...FROM_FIELDS];
  for (const field of allFields) {
    if (field in obj && typeof obj[field] === 'string' && (obj[field] as string).trim()) {
      return 'standard';
    }
  }

  return 'unknown';
}

// ==================== SMS DATA EXTRACTION ====================

function extractSmsData(payload: Record<string, unknown>): SmsData | null {
  const numberRaw = extractField(payload, NUMBER_FIELDS);
  const message = extractField(payload, MESSAGE_FIELDS);
  const from = extractField(payload, FROM_FIELDS);
  const to = extractField(payload, ['to', 'recipient', 'dest', 'destination', 'to_num']);

  if (!message && !numberRaw) return null;

  return {
    number: numberRaw || to || from || '',
    message: message || '',
    from: from,
    to: to,
    service: extractField(payload, ['service']),
    timestamp: extractField(payload, ['timestamp', 'time', 'date', 'created_at', 'received_at']),
  };
}

function extractSmsDataFromProvider(payload: Record<string, unknown>): SmsData | null {
  const smsObj = payload.sms as Record<string, unknown> | null;
  if (!smsObj) return null;

  return extractSmsData(smsObj) || extractSmsData(payload);
}

// ==================== CORE PROCESSING ====================

async function processSingleSms(data: SmsData): Promise<ProcessingResult> {
  // Normalize the phone number
  const normalizedNumber = normalizePhoneNumber(data.number);
  if (!normalizedNumber) {
    return { success: false, error: 'Invalid or empty phone number' };
  }

  // Detect service: from field → service field → message keywords
  const service = detectService(data.from, data.service, data.message);

  // Extract OTP from message
  const otp = extractOtp(data.message);

  // Detect country from phone number
  const countryInfo = detectCountry(normalizedNumber);

  // Look up existing number record
  const existingNumber = await db.number.findUnique({
    where: { number: normalizedNumber },
  });

  // Determine country/range from existing record if not detected from phone
  const country = countryInfo?.name || existingNumber?.countryName || countryInfo?.code || null;
  const countryCode = countryInfo?.code || existingNumber?.country || null;
  const rangeName = existingNumber?.rangeName || null;
  const assignedTo = existingNumber?.assignedTo || null;

  // Calculate rate/profit
  const rate = existingNumber?.rate || 0;
  const profitMargin = existingNumber?.profitMargin || 0;
  const profit = rate * (profitMargin / 100);

  // Ensure the Number record exists BEFORE creating SMS (foreign key constraint)
  if (!existingNumber) {
    // Auto-create number record if it doesn't exist
    await db.number.create({
      data: {
        number: normalizedNumber,
        country: countryCode,
        countryName: country,
        rangeName,
        service,
        totalSms: 0, // will increment below
        lastSmsAt: new Date(),
        rate,
        profitMargin,
      },
    });
  }

  // Save SMS to database (now the Number FK is satisfied)
  const smsRecord = await db.smsReceived.create({
    data: {
      number: normalizedNumber,
      from: data.from || null,
      to: data.to || null,
      service,
      otp,
      country: countryCode || country,
      rangeName,
      message: data.message,
      assignedTo,
      rate,
      profit,
      currency: 'USD',
    },
  });

  // Update number record: increment SMS count, update last SMS time
  await db.number.update({
    where: { number: normalizedNumber },
    data: {
      totalSms: { increment: 1 },
      lastSmsAt: new Date(),
      ...(service ? { service } : {}),
    },
  });

  // Update range total SMS if applicable
  if (existingNumber?.rangeId) {
    await db.range.update({
      where: { id: existingNumber.rangeId },
      data: { totalSms: { increment: 1 } },
    });
  }

  // Log profit if applicable
  if (profit > 0) {
    await db.profitLog.create({
      data: {
        numberId: existingNumber?.id,
        smsReceivedId: smsRecord.id,
        rateApplied: rate,
        profitAmount: profit,
        currency: 'USD',
      },
    });
  }

  return {
    success: true,
    number: normalizedNumber,
    service,
    otp,
    country,
    countryCode,
    message: data.message,
    smsId: smsRecord.id,
  };
}

// ==================== PUBLIC API ====================

/**
 * Process incoming SMS - auto-detects format
 */
export async function processIncomingSms(
  payload: unknown
): Promise<ProcessingResult | ProcessingResult[]> {
  const format = detectFormat(payload);

  switch (format) {
    case 'aadata':
      return processAaData(payload as Record<string, unknown>);

    case 'array':
      return processArraySms(payload as Record<string, unknown>[]);

    case 'nested_data':
      return processNestedSms(payload as Record<string, unknown>);

    case 'provider_sms':
      return processProviderSms(payload as Record<string, unknown>);

    case 'standard':
      return processStandardSms(payload as Record<string, unknown>);

    default:
      return { success: false, error: 'Could not detect SMS format from payload' };
  }
}

/**
 * Process standard single SMS payload
 */
export async function processStandardSms(
  payload: Record<string, unknown>
): Promise<ProcessingResult> {
  const data = extractSmsData(payload);
  if (!data) {
    return { success: false, error: 'Could not extract SMS data from payload' };
  }
  return processSingleSms(data);
}

/**
 * Process DataTables aaData format
 * aaData is an array of arrays: [[timestamp, range, number, service, user, message], ...]
 */
export async function processAaData(
  payload: Record<string, unknown>
): Promise<ProcessingResult[]> {
  const aaData = payload.aaData;
  if (!Array.isArray(aaData)) {
    return [{ success: false, error: 'Invalid aaData format' }];
  }

  const results: ProcessingResult[] = [];

  for (const row of aaData) {
    if (!Array.isArray(row)) continue;

    // aaData format: [timestamp, range, number, service, user, message]
    const data: SmsData = {
      number: String(row[2] || ''),
      message: String(row[5] || ''),
      from: String(row[3] || ''), // service is in position 3, use as from
      service: String(row[3] || ''),
      to: String(row[2] || ''),
      timestamp: String(row[0] || ''),
    };

    if (!data.number && !data.message) continue;
    results.push(await processSingleSms(data));
  }

  return results;
}

/**
 * Process array of SMS objects
 */
async function processArraySms(
  items: Record<string, unknown>[]
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (const item of items) {
    const data = extractSmsData(item);
    if (!data) {
      results.push({ success: false, error: 'Could not extract SMS data from array item' });
      continue;
    }
    results.push(await processSingleSms(data));
  }

  return results;
}

/**
 * Process nested data format: {"data": {"number": "...", "message": "..."}}
 */
async function processNestedSms(
  payload: Record<string, unknown>
): Promise<ProcessingResult> {
  const inner = payload.data as Record<string, unknown> | null;
  if (!inner) {
    return { success: false, error: 'Missing nested data object' };
  }
  return processStandardSms(inner);
}

/**
 * Process provider-specific format: {"sms": {"phone": "...", "text": "..."}}
 */
async function processProviderSms(
  payload: Record<string, unknown>
): Promise<ProcessingResult> {
  const data = extractSmsDataFromProvider(payload);
  if (!data) {
    return { success: false, error: 'Could not extract SMS data from provider format' };
  }
  return processSingleSms(data);
}
