import { db } from '@/app/lib/drizzle';
import { performanceMetrics, errorLogs } from '@/app/lib/schema';
import { gte, sql } from 'drizzle-orm';
import { getRequestSession } from '@/app/lib/auth-session';
import { redirect } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { AdminPageHeader } from '@/app/ui/admin/shared/admin-page-header';
import { MonitoringClient } from '@/app/ui/admin/monitoring/monitoring-client';

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getRequestSession();
  if (!session?.user || session.user.role !== 'admin') {
    redirect({ href: '/login', locale });
    return null;
  }

  const t = await getTranslations('dashboard.monitoring');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [vitals, errorStats] = await Promise.all([
    db
      .select({
        metric: performanceMetrics.metricName,
        avg: sql<number>`ROUND(AVG(${performanceMetrics.metricValue})::numeric, 2)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(performanceMetrics)
      .where(gte(performanceMetrics.createdAt, since))
      .groupBy(performanceMetrics.metricName)
      .orderBy(performanceMetrics.metricName),
    db
      .select({
        level: errorLogs.level,
        count: sql<number>`COUNT(*)`,
      })
      .from(errorLogs)
      .where(gte(errorLogs.createdAt, since))
      .groupBy(errorLogs.level)
      .orderBy(errorLogs.level),
  ]);

  return (
    <main className="space-y-6">
      <AdminPageHeader title={t('title')} description={t('description')} />
      <MonitoringClient
        vitals={vitals.map((v) => ({
          metric: v.metric,
          avg: Number(v.avg ?? 0),
          count: Number(v.count ?? 0),
        }))}
        errorStats={errorStats.map((s) => ({
          level: s.level,
          count: Number(s.count ?? 0),
        }))}
      />
    </main>
  );
}
