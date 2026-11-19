import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import NewOrderForm from '@/components/NewOrderForm';

export default async function NewOrderPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'TECHNICIAN') redirect('/cliente');

  return <NewOrderForm technicianName={session.fullName} />;
}

