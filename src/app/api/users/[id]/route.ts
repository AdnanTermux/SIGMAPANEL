import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyToken, hashPassword } from '@/lib/auth';

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

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'email', 'role', 'status', 'fullName', 'phone',
      'country', 'timezone', 'language', 'balance', 'creditLimit',
      'parentId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle password change separately
    if (body.password) {
      updateData.password = await hashPassword(body.password);
    }

    // Handle account unlock
    if (body.unlock === true) {
      updateData.failedLoginAttempts = 0;
      updateData.lockedUntil = null;
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        fullName: true,
        balance: true,
        creditLimit: true,
        phone: true,
        country: true,
        parentId: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('User update error:', error);
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

    // Don't allow deleting yourself
    if (id === payload.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Reassign children to parent or null
    await db.user.updateMany({
      where: { parentId: id },
      data: { parentId: existing.parentId },
    });

    // Delete user's settings
    await db.settings.deleteMany({ where: { userId: id } });

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      message: 'User deleted successfully',
      deletedUser: existing.username,
    });
  } catch (error) {
    console.error('User delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
