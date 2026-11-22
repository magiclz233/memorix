import { getRequestSession } from '@/app/lib/auth-session';
import { Link } from '@/i18n/navigation';
import { fetchUserStorages } from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';
import { StorageView } from '@/app/ui/admin/storage/storage-view';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('dashboard.storage');
  const session = await getRequestSession();
  const userId = getSessionUserId(session);

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('loginRequired')}
        </p>
        <Button asChild variant="outline">
          <Link href="/login">{t('goToLogin')}</Link>
        </Button>
      </div>
    );
  }

  const storages = await fetchUserStorages(userId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
      </div>
      
      <StorageView storages={storages} />
    </div>
  );
}