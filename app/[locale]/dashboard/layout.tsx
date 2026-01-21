import { headers } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { auth } from '@/auth';
import DashboardShell from '@/components/dashboard-shell';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/gallery');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
