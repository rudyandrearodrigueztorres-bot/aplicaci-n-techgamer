import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredOrders } from '@/db';
import { seedDatabase } from '@/db/seed';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  seedDatabase(false);
  const purgedCount = purgeExpiredOrders();

  return NextResponse.json({
    ok: true,
    purgedOrders: purgedCount,
    executedAt: new Date().toISOString(),
  });
}

