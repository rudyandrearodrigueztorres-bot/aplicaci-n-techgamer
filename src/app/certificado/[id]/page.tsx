import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getOrderWithDetails } from '@/db';
import { isCertificateAvailable } from '@/lib/constants';
import CertificateView from '@/components/CertificateView';

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/');

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    redirect(session.role === 'TECHNICIAN' ? '/tecnico' : '/cliente');
  }

  const order = getOrderWithDetails(orderId);
  if (!order) {
    redirect(session.role === 'TECHNICIAN' ? '/tecnico' : '/cliente');
  }

  if (session.role === 'CLIENT') {
    if (order.client_user_id !== session.userId) {
      redirect('/cliente');
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

