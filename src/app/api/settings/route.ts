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
    const key = searchParams.get('key');

    const where: Record<string, unknown> = {};

    // Admin sees all settings; others see only their own or global settings
    if (payload.role !== 'admin') {
      where.OR = [
        { userId: null },
        { userId: payload.userId },
      ];
    }

    if (key) {
      where.settingKey = key;
    }

    const settings = await db.settings.findMany({
      where,
      orderBy: { settingKey: 'asc' },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error('Settings get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await authenticate(request);
    if (!payload) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, userId } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Setting key and value are required' },
        { status: 400 }
      );
    }

    // Non-admin users can only set their own settings
    const settingUserId = payload.role === 'admin' ? (userId || null) : payload.userId;

    // Upsert: create or update
    const setting = await db.settings.upsert({
      where: {
        settingKey_userId: {
          settingKey: key,
          userId: settingUserId || null,
        },
      },
      create: {
        settingKey: key,
        settingValue: typeof value === 'string' ? value : JSON.stringify(value),
        userId: settingUserId,
      },
      update: {
        settingValue: typeof value === 'string' ? value : JSON.stringify(value),
      },
    });

    return NextResponse.json({ data: setting });
  } catch (error) {
    console.error('Settings post error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
