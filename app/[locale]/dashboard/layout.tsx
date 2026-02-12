import { headers } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { auth } from '@/auth';
import DashboardShell from '@/components/dashboard-shell';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableRefresh: true },
  });

  if (!session) {
    redirect({ href: '/login', locale });
    return null;
  }

  if (session.user.role !== 'admin') {
    redirect({ href: '/gallery', locale });
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
