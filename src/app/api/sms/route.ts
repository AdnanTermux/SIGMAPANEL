import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

async function authenticate(request: Request) {
  const token = extractToken(request.headers.get('Authorization'));
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service') || undefined;
    const country = searchParams.get('country') || undefined;
    const number = searchParams.get('number') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const hasOtp = searchParams.get('hasOtp');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (service) where.service = { contains: service };
    if (country) where.country = country;
    if (number) where.number = { contains: number };
    if (hasOtp === 'true') where.otp = { not: null };
    if (hasOtp === 'false') where.otp = null;

    // Date range filter
    if (startDate || endDate) {
      where.receivedAt = {};
      if (startDate) {
        (where.receivedAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (where.receivedAt as Record<string, unknown>).lte = end;
      }
    }

    // Non-admin users only see their assigned numbers
    if (payload.role !== 'admin') {
      where.assignedTo = payload.username;
    }

    const [sms, total] = await Promise.all([
      db.smsReceived.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.smsReceived.count({ where }),
    ]);

    return NextResponse.json({
      data: sms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('SMS list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
