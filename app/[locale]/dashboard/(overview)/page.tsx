import { Link } from '@/i18n/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchDashboardOverview, fetchUserByEmail } from '@/app/lib/data';
import { getTranslations } from 'next-intl/server';

type StatCardProps = {
  label: string;
  value: number;
  description: string;
};

const StatCard = ({ label, value, description }: StatCardProps) => (
  <div className="rounded-xl border border-zinc-200/70 bg-white/80 p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-zinc-900">{value}</p>
    <p className="mt-2 text-sm text-zinc-500">{description}</p>
  </div>
);

export default async function Page() {
  const t = await getTranslations('dashboard.overview');
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t('title')}</h1>
          <p className="text-base text-zinc-500">{t('loginRequired')}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {t('goToLogin')}
        </Link>
      </main>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <main className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{t('title')}</h1>
          <p className="text-base text-zinc-500">{t('userNotFound')}</p>
        </div>
      </main>
    );
  }

  const overview = await fetchDashboardOverview(user.id);
  const stats = [
    {
      label: t('stats.storage'),
      value: overview.storageCount,
      description: t('stats.storageDesc'),
    },
    {
      label: t('stats.assets'),
      value: overview.fileCount,
      description: t('stats.assetsDesc'),
    },
    {
      label: t('stats.published'),
      value: overview.publishedCount,
      description: t('stats.publishedDesc'),
    },
    {
      label: t('stats.photoCollections'),
      value: overview.photoCollectionsCount,
      description: t('stats.photoCollectionsDesc'),
    },
    {
      label: t('stats.videoCollections'),
      value: overview.videoSeriesCount,
      description: t('stats.videoCollectionsDesc'),
    },
  ];

  return (
    <main className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">{t('title')}</h1>
        <p className="text-base text-zinc-500">
          {t('description')}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">{t('quickLinks.title')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/storage"
            className="rounded-xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
          >
            {t('quickLinks.storage')}
          </Link>
          <Link
            href="/gallery"
            className="rounded-xl border border-zinc-200/70 bg-white/70 px-4 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
          >
            {t('quickLinks.gallery')}
          </Link>
        </div>
      </section>
    </main>
  );
}
