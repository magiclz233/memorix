import { redirect } from '@/i18n/navigation';
import { getRequestSession } from '@/app/lib/auth-session';
import { fetchPublicSystemSettings } from '@/app/lib/data';
import { resolveSiteName } from '@/app/lib/site-brand';
import DashboardShell from '@/components/dashboard-shell';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getRequestSession();

  if (!session) {
    redirect({ href: '/login', locale });
    return null;
  }

  if (session.user.role !== 'admin') {
    redirect({ href: '/gallery', locale });
    return null;
  }

  let settings = null;
  try {
    settings = await fetchPublicSystemSettings(locale);
  } catch {
    settings = null;
  }
  const siteName = resolveSiteName(settings?.siteName);

  const user = {
    name: session.user.name?.trim() || session.user.email?.trim() || 'Administrator',
    email: session.user.email ?? '',
    avatar: (session.user as { image?: string | null }).image ?? null,
  };

  return (
    <DashboardShell user={user} siteName={siteName}>
      {children}
    </DashboardShell>
  );
}
