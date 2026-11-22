import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { fetchUserStorages } from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';
import { buildUploadStorageOption } from '@/app/lib/upload-storage-option';
import { TestUploadCenter } from '@/app/ui/test/test-upload-center';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function Page() {
  const t = await getTranslations('dashboard');
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = getSessionUserId(session);
  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          上传中心测试页面
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
    <div className="container mx-auto space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          上传中心测试页面
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Task 22: Checkpoint - 上传中心验证
        </p>
      </header>

      <TestUploadCenter storages={options} />
    </div>
  );
}
