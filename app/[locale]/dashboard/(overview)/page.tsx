import { Link } from '@/i18n/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchDashboardOverview, fetchUserByEmail } from '@/app/lib/data';
import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type StatCardProps = {
  label: string;
  value: number;
  description: string;
};

const StatCard = ({ label, value, description }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
    </CardContent>
  </Card>
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
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-base text-muted-foreground">{t('loginRequired')}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
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
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-base text-muted-foreground">{t('userNotFound')}</p>
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
    <main className="space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('description')}
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{t('quickLinks.title')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/storage">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-6">
                <CardTitle className="text-base font-medium">{t('quickLinks.storage')}</CardTitle>
                <CardDescription>Manage your storage and files</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/gallery">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="p-6">
                <CardTitle className="text-base font-medium">{t('quickLinks.gallery')}</CardTitle>
                <CardDescription>View the public gallery</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>
    </main>
  );
}
