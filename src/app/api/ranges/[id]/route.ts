import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

async function authenticate(request: Request) {
  const token = extractToken(request.headers.get('Authorization'));
  if (!token) return null;
  return verifyToken(token);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.range.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Range not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'providerId', 'countryCode', 'countryName',
      'rate', 'profitMargin', 'otpLimitPerDay', 'otpDailyResetHour',
      'allocationLimitGlobal', 'allocationLimitPerUser', 'allocationPeriod', 'status',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await db.range.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Range update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.range.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Range not found' }, { status: 404 });
    }

    // Remove rangeId from associated numbers
    await db.number.updateMany({
      where: { rangeId: id },
      data: { rangeId: null, rangeName: null },
    });

    await db.range.delete({ where: { id } });

    return NextResponse.json({
      message: 'Range deleted successfully',
      deletedRange: existing.name,
    });
  } catch (error) {
    console.error('Range delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
