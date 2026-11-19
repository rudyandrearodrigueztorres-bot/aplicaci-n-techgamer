import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TechnicianOrderDetail from '@/components/TechnicianOrderDetail';

export default async function TechnicianOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'TECHNICIAN') redirect('/cliente');

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    redirect('/tecnico');
  }

  return (
    <TechnicianOrderDetail
      orderId={orderId}
      technicianName={session.fullName}
    />
  );
}

