import { NextResponse } from 'next/server';
import { isPostgres, purgeExpiredOrders, queryAll, type DbOrder } from '@/db';
import { seedDatabase } from '@/db/seed';
import { getSession, type UserRole } from '@/lib/auth';
import { isClientAccessExpired } from '@/lib/constants';

interface UserRow {
  id: number;
  username: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export async function GET() {
  await seedDatabase(false);
  await purgeExpiredOrders();

  const session = await getSession();
  if (!session || session.role !== 'TECHNICIAN') {
    return NextResponse.json(
      { error: 'Acceso restringido al rol Técnico' },
      { status: 403 }
    );
  }

  const users = await queryAll<UserRow>(
    `SELECT id, username, role, full_name, email, phone, created_at
     FROM users
     ORDER BY role DESC, created_at DESC`
  );

  const orders = await queryAll<
    Pick<
      DbOrder,
      'id' | 'order_number' | 'client_user_id' | 'status' | 'delivered_at' | 'device_brand' | 'device_model'
    >
  >(
    `SELECT id, order_number, client_user_id, status, delivered_at, device_brand, device_model
     FROM orders
     WHERE client_user_id IS NOT NULL`
  );

  const ordersByUser = new Map<number, typeof orders>();
  for (const order of orders) {
    if (order.client_user_id === null) continue;
    const list = ordersByUser.get(order.client_user_id) || [];
    list.push(order);
    ordersByUser.set(order.client_user_id, list);
  }

  const enriched = users.map((u) => {
    const linked = ordersByUser.get(u.id) || [];
    const accessExpired =
      u.role === 'CLIENT' &&
      linked.length > 0 &&
      linked.every((o) => isClientAccessExpired(o));

    return {
      ...u,
      isCurrentUser: u.id === session.userId,
      accessExpired,
      orders: linked.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        device: `${o.device_brand} ${o.device_model}`,
      })),
    };
  });

  return NextResponse.json({
    users: enriched,
    storage: {
      persistentDb: isPostgres(),
      onVercel: Boolean(process.env.VERCEL),
    },
  });
}
