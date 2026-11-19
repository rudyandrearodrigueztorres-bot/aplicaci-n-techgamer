import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TechnicianDashboard from '@/components/TechnicianDashboard';

export default async function TechnicianPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'TECHNICIAN') redirect('/cliente');

  return <TechnicianDashboard technicianName={session.fullName} />;
}

