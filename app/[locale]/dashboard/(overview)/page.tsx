import { Link } from '@/i18n/navigation';
import {
  Activity,
  ArrowUpRight,
  Eye,
  EyeOff,
  FolderKanban,
  HardDrive,
  Image as ImageIcon,
  Share2,
  Trash2,
  UploadCloud,
  AlertTriangle,
} from 'lucide-react';
import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';
import { getRequestSession } from '@/app/lib/auth-session';
import { db } from '@/app/lib/drizzle';
import { files, scanJobs, shares, userStorages } from '@/app/lib/schema';
import { fetchDashboardOverview } from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';
import { getTranslations } from 'next-intl/server';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/app/ui/admin/shared/admin-page-header';

type StatCardProps = {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const StatCard = ({ label, value, description, href, icon }: StatCardProps) => (
  <Link href={href} className="group block">
    <SpotlightCard className="flex h-full flex-col transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-500/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {label}
        </CardTitle>
        <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-indigo-500/15 dark:group-hover:text-indigo-400">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-3xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
          {value.toLocaleString()}
        </div>
        <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{description}</span>
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
      </CardContent>
    </SpotlightCard>
  </Link>
);

export default async function Page() {
  const t = await getTranslations('dashboard.overview');
  const session = await getRequestSession();
  const userId = getSessionUserId(session);

  if (!userId) {
    return (
      <main className="space-y-6">
        <AdminPageHeader title={t('title')} description={t('loginRequired')} />
        <Button asChild variant="outline">
          <Link href="/login">{t('goToLogin')}</Link>
        </Button>
      </main>
    );
  }

  const [overview, trashedRes, failedScanRes, activeShareRes] = await Promise.all([
    fetchDashboardOverview(userId),
    db
      .select({ count: count() })
      .from(files)
      .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
      .where(and(eq(userStorages.userId, userId), isNotNull(files.deletedAt))),
    db
      .select({ count: count() })
      .from(scanJobs)
      .where(and(eq(scanJobs.userId, userId), eq(scanJobs.status, 'failed'))),
    db
      .select({ count: count() })
      .from(shares)
      .where(and(eq(shares.userId, userId), isNull(shares.revokedAt))),
  ]);

  const trashedCount = Number(trashedRes[0]?.count ?? 0);
  const failedScanCount = Number(failedScanRes[0]?.count ?? 0);
  const activeShareCount = Number(activeShareRes[0]?.count ?? 0);
  const unpublishedCount = Math.max(0, overview.fileCount - overview.publishedCount);
  const publishRate =
    overview.fileCount > 0
      ? Math.round((overview.publishedCount / overview.fileCount) * 100)
      : 0;

  const stats: StatCardProps[] = [
    {
      label: t('stats.storage'),
      value: overview.storageCount,
      description: t('stats.storageDesc'),
      href: '/dashboard/storage',
      icon: <HardDrive className="h-4 w-4" />,
    },
    {
      label: t('stats.assets'),
      value: overview.fileCount,
      description: t('stats.assetsDesc'),
      href: '/dashboard/media',
      icon: <ImageIcon className="h-4 w-4" />,
    },
    {
      label: t('stats.published'),
      value: overview.publishedCount,
      description: t('stats.publishedDesc'),
      href: '/dashboard/media?status=published',
      icon: <Eye className="h-4 w-4" />,
    },
    {
      label: t('stats.collections'),
      value: overview.collectionsCount,
      description: t('stats.collectionsDesc'),
      href: '/dashboard/collections',
      icon: <FolderKanban className="h-4 w-4" />,
    },
  ];

  const quickLinks = [
    {
      href: '/dashboard/media?status=unpublished',
      title: t('quickLinks.unpublished'),
      desc: t('quickLinks.unpublishedDesc', { count: unpublishedCount }),
      icon: <EyeOff className="h-4 w-4 text-zinc-500" />,
    },
    {
      href: '/dashboard/upload/create',
      title: t('quickLinks.upload'),
      desc: t('quickLinks.uploadDesc'),
      icon: <UploadCloud className="h-4 w-4 text-indigo-500" />,
    },
    {
      href: '/dashboard/storage',
      title: t('quickLinks.storage'),
      desc: t('quickLinks.storageDesc'),
      icon: <HardDrive className="h-4 w-4 text-emerald-500" />,
    },
    {
      href: '/dashboard/shares',
      title: t('quickLinks.shares'),
      desc: t('quickLinks.sharesDesc', { count: activeShareCount }),
      icon: <Share2 className="h-4 w-4 text-indigo-500" />,
    },
    {
      href: '/dashboard/trash',
      title: t('quickLinks.trash'),
      desc: t('quickLinks.trashDesc', { count: trashedCount }),
      icon: <Trash2 className="h-4 w-4 text-amber-500" />,
    },
    {
      href: '/dashboard/monitoring',
      title: t('quickLinks.monitoring'),
      desc: t('quickLinks.monitoringDesc'),
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
    },
  ];

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/gallery">
                <ArrowUpRight className="h-4 w-4" />
                <span>{t('quickLinks.gallery')}</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Link href="/dashboard/upload/create">
                <UploadCloud className="h-4 w-4" />
                <span>{t('quickLinks.upload')}</span>
              </Link>
            </Button>
          </>
        }
      />

      {/* 核心指标卡片 */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {/* 状态摘要条：发布率 + 扫描异常提醒 */}
      <section className="grid gap-4 lg:grid-cols-3">
        <SpotlightCard className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('health.publishProgress')}</CardTitle>
            <CardDescription>
              {t('health.publishProgressDesc', {
                published: overview.publishedCount,
                unpublished: unpublishedCount,
                rate: publishRate,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all dark:bg-indigo-500"
                style={{ width: `${publishRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              <span>{t('stats.published')}: {overview.publishedCount.toLocaleString()}</span>
              <span>{publishRate}%</span>
            </div>
          </CardContent>
        </SpotlightCard>

        <SpotlightCard>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle
                className={
                  failedScanCount > 0 ? 'h-4 w-4 text-amber-500' : 'h-4 w-4 text-emerald-500'
                }
              />
              <span>{t('health.attention')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center justify-between">
              <span>{t('health.failedScans')}</span>
              <Link
                href="/dashboard/storage"
                className="font-mono font-semibold tabular-nums text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {failedScanCount}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('health.trashedItems')}</span>
              <Link
                href="/dashboard/trash"
                className="font-mono font-semibold tabular-nums text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {trashedCount}
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <span>{t('health.activeShares')}</span>
              <Link
                href="/dashboard/shares"
                className="font-mono font-semibold tabular-nums text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {activeShareCount}
              </Link>
            </div>
          </CardContent>
        </SpotlightCard>
      </section>

      {/* 快捷操作矩阵 */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {t('quickLinks.title')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="group block">
              <SpotlightCard className="h-full transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-500/40">
                <CardHeader className="flex flex-row items-start gap-3 p-5">
                  <div className="mt-0.5 rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="flex items-center justify-between text-sm font-medium">
                      <span>{item.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </CardTitle>
                    <CardDescription className="text-xs">{item.desc}</CardDescription>
                  </div>
                </CardHeader>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
