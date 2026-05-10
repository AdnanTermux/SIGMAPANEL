import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const [sms, total] = await Promise.all([
      db.smsReceived.findMany({
        orderBy: { receivedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          number: true,
          from: true,
          to: true,
          service: true,
          country: true,
          rangeName: true,
          otp: true,
          message: true,
          assignedTo: true,
          rate: true,
          profit: true,
          receivedAt: true,
        },
      }),
      db.smsReceived.count(),
    ]);

    return NextResponse.json({
      data: sms,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Recent SMS error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
