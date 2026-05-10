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

    // Find existing number
    const existing = await db.number.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Number not found' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'country', 'countryName', 'rangeName', 'rangeId',
      'service', 'status', 'assignedTo', 'rate', 'profitMargin',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await db.number.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Number update error:', error);
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

    const existing = await db.number.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Number not found' }, { status: 404 });
    }

    // Delete related SMS records first
    await db.smsReceived.deleteMany({ where: { number: existing.number } });

    // Delete the number
    await db.number.delete({ where: { id } });

    return NextResponse.json({
      message: 'Number deleted successfully',
      deletedNumber: existing.number,
    });
  } catch (error) {
    console.error('Number delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
