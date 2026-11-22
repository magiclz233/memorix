import { getTranslations } from 'next-intl/server';

import { getRequestSession } from '@/app/lib/auth-session';
import { fetchUserStorages } from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';
import { buildUploadStorageOption } from '@/app/lib/upload-storage-option';
import { CreateTaskForm } from '@/app/ui/admin/upload/create-task-form';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function Page() {
  const t = await getTranslations('dashboard');
  const session = await getRequestSession();

  const userId = getSessionUserId(session);
  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('upload.createTask')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('upload.loginRequired')}
        </p>
        <Button asChild variant="outline">
          <Link href="/login">{t('upload.goToLogin')}</Link>
        </Button>
      </div>
    );
  }

  const storages = await fetchUserStorages(userId);
  const options = storages.map((storage) => buildUploadStorageOption(storage, t));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('upload.createTask')}
        </h1>
        <Button asChild variant="ghost">
          <Link href="/dashboard/upload">{t('upload.backToList')}</Link>
        </Button>
      </div>

      <CreateTaskForm storages={options} />
    </div>
  );
}