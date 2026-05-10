import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractToken, verifyToken, hashPassword } from '@/lib/auth';

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
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const role = searchParams.get('role') || undefined;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Admin sees all users; others see only their children
    if (payload.role !== 'admin') {
      where.parentId = payload.userId;
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
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
          _count: {
            select: { children: true },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Users list error:', error);
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
    const { username, email, password, role, fullName, phone, country, parentId, balance, creditLimit } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check for duplicate username
    const existingUser = await db.user.findUnique({ where: { username: username.trim().toLowerCase() } });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Check for duplicate email
    if (email) {
      const existingEmail = await db.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: username.trim().toLowerCase(),
        email,
        password: hashedPassword,
        role: role || 'sub_reseller',
        status: 'active',
        fullName,
        phone,
        country,
        parentId: parentId || null,
        balance: balance || 0,
        creditLimit: creditLimit || 0,
      },
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
        createdAt: true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    console.error('User create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
