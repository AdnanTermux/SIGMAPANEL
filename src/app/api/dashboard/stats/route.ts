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

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel
    const [
      todaySms,
      weekSms,
      monthSms,
      todayProfit,
      monthProfit,
      totalNumbers,
      activeNumbers,
      totalUsers,
      todaySmsByService,
      weekSmsByDay,
    ] = await Promise.all([
      // SMS counts
      db.smsReceived.count({
        where: { receivedAt: { gte: startOfDay } },
      }),
      db.smsReceived.count({
        where: { receivedAt: { gte: startOfWeek } },
      }),
      db.smsReceived.count({
        where: { receivedAt: { gte: startOfMonth } },
      }),

      // Profit sums
      db.profitLog.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { profitAmount: true },
      }),
      db.profitLog.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { profitAmount: true },
      }),

      // Number stats
      db.number.count(),
      db.number.count({ where: { status: 'active' } }),

      // User count
      db.user.count(),

      // Today SMS by service (top 10)
      db.smsReceived.groupBy({
        by: ['service'],
        where: {
          receivedAt: { gte: startOfDay },
          service: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // Weekly SMS by day for chart (last 7 days)
      Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const dayStart = new Date(now);
          dayStart.setDate(now.getDate() - (6 - i));
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);
          return db.smsReceived
            .count({ where: { receivedAt: { gte: dayStart, lt: dayEnd } } })
            .then((count) => ({
              date: dayStart.toISOString().split('T')[0],
              count,
            }));
        })
      ),
    ]);

    return NextResponse.json({
      todaySms,
      weekSms,
      monthSms,
      todayProfit: todayProfit._sum.profitAmount || 0,
      monthProfit: monthProfit._sum.profitAmount || 0,
      totalNumbers,
      activeNumbers,
      totalUsers,
      todaySmsByService: todaySmsByService.map((s) => ({
        service: s.service,
        count: s._count.id,
      })),
      weekSmsByDay,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
