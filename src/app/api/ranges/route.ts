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
    const country = searchParams.get('country') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (country) where.countryCode = country;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { countryName: { contains: search } },
      ];
    }

    const [ranges, total] = await Promise.all([
      db.range.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              numbers: true,
            },
          },
        },
      }),
      db.range.count({ where }),
    ]);

    return NextResponse.json({
      data: ranges,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Ranges list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, providerId, countryCode, countryName,
      rate, profitMargin, otpLimitPerDay, otpDailyResetHour,
      allocationLimitGlobal, allocationLimitPerUser, allocationPeriod, status,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Range name is required' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db.range.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Range name already exists' }, { status: 409 });
    }

    const created = await db.range.create({
      data: {
        name,
        providerId,
        countryCode,
        countryName,
        rate: rate || 0,
        profitMargin: profitMargin || 0,
        otpLimitPerDay: otpLimitPerDay || 0,
        otpDailyResetHour: otpDailyResetHour || 0,
        allocationLimitGlobal: allocationLimitGlobal || 10000,
        allocationLimitPerUser: allocationLimitPerUser || 100,
        allocationPeriod: allocationPeriod || 'daily',
        status: status || 'active',
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error('Range create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
