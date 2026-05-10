import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

/**
 * Helper: Authenticate request and return user payload
 */
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
    const country = searchParams.get('country') || undefined;
    const service = searchParams.get('service') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const rangeName = searchParams.get('rangeName') || undefined;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (country) where.country = country;
    if (service) where.service = { contains: service, mode: 'insensitive' as const };
    if (status) where.status = status;
    if (rangeName) where.rangeName = rangeName;
    if (search) {
      where.OR = [
        { number: { contains: search } },
        { countryName: { contains: search } },
        { service: { contains: search } },
      ];
    }

    // Non-admin users can only see numbers assigned to them
    if (payload.role !== 'admin') {
      where.assignedTo = payload.username;
    }

    const [numbers, total] = await Promise.all([
      db.number.findMany({
        where,
        orderBy: { lastSmsAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          range: {
            select: { name: true, status: true },
          },
        },
      }),
      db.number.count({ where }),
    ]);

    return NextResponse.json({
      data: numbers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Numbers list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admin can create numbers
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { number, country, countryName, rangeName, rangeId, service, status, assignedTo, rate, profitMargin } = body;

    if (!number) {
      return NextResponse.json({ error: 'Number is required' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.number.findUnique({ where: { number } });
    if (existing) {
      return NextResponse.json({ error: 'Number already exists' }, { status: 409 });
    }

    const created = await db.number.create({
      data: {
        number,
        country,
        countryName,
        rangeName,
        rangeId,
        service,
        status: status || 'active',
        assignedTo,
        rate: rate || 0,
        profitMargin: profitMargin || 0,
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Number create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
