import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { purgeExpiredOrders, queryAll, type DbOrder } from '@/db';
import { seedDatabase } from '@/db/seed';
import { isClientAccessExpired } from '@/lib/constants';
import ClientDashboard from '@/components/ClientDashboard';

export default async function ClientPage() {
  await seedDatabase(false);
  await purgeExpiredOrders();

  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'CLIENT') redirect('/tecnico');

  const clientOrders = await queryAll<Pick<DbOrder, 'status' | 'delivered_at'>>(
    `SELECT status, delivered_at FROM orders WHERE client_user_id = ?`,
    [session.userId]
  );

  const hasActiveAccess = clientOrders.some(
    (order) => !isClientAccessExpired(order)
  );
  if (clientOrders.length > 0 && !hasActiveAccess) {
    redirect('/?expired=1');
  }

  return <ClientDashboard clientName={session.fullName} />;
}
