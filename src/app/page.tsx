import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { queryAll, type DbOrder } from '@/db';
import { seedDatabase } from '@/db/seed';
import { isClientAccessExpired } from '@/lib/constants';
import LoginForm from '@/components/LoginForm';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  await seedDatabase(false);
  const session = await getSession();
  const params = await searchParams;

  if (session) {
    if (session.role === 'TECHNICIAN') {
      redirect('/tecnico');
    }
    const clientOrders = await queryAll<Pick<DbOrder, 'status' | 'delivered_at'>>(
      `SELECT status, delivered_at FROM orders WHERE client_user_id = ?`,
      [session.userId]
    );
    const hasActiveAccess = clientOrders.some(
      (order) => !isClientAccessExpired(order)
    );
    if (hasActiveAccess) {
      redirect('/cliente');
    }
  }

  return <LoginForm accessExpired={params.expired === '1'} />;
}
