import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClientDashboard from '@/components/ClientDashboard';

export default async function ClientPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'CLIENT') redirect('/tecnico');

  return <ClientDashboard clientName={session.fullName} />;
}

