import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { seedDatabase } from '@/db/seed';
import LoginForm from '@/components/LoginForm';

export default async function HomePage() {
  seedDatabase(false);
  const session = await getSession();

  if (session) {
    redirect(session.role === 'TECHNICIAN' ? '/tecnico' : '/cliente');
  }

  return <LoginForm />;
}

