import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getOrderWithDetails, purgeExpiredOrders } from '@/db';
import { isCertificateAvailable, isClientAccessExpired } from '@/lib/constants';
import { seedDatabase } from '@/db/seed';
import CertificateView from '@/components/CertificateView';

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await seedDatabase(false);
  await purgeExpiredOrders();
  const session = await getSession();
  if (!session) redirect('/');

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    redirect(session.role === 'TECHNICIAN' ? '/tecnico' : '/cliente');
  }

  const order = await getOrderWithDetails(orderId);
  if (!order) {
    redirect(session.role === 'TECHNICIAN' ? '/tecnico' : '/cliente');
  }

  if (session.role === 'CLIENT') {
    if (order.client_user_id !== session.userId) {
      redirect('/cliente');
    }
    if (isClientAccessExpired(order)) {
      redirect('/?expired=1');
    }
    if (!isCertificateAvailable(order.status)) {
      redirect('/cliente');
    }
  }

  return (
    <CertificateView
      order={order}
      backHref={
        session.role === 'TECHNICIAN'
          ? `/tecnico/ordenes/${order.id}`
          : '/cliente'
      }
      isTechnician={session.role === 'TECHNICIAN'}
    />
  );
}
