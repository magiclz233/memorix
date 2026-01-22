import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUserByEmail, fetchUserStorages } from '@/app/lib/data';
import { UploadCenter } from '@/app/ui/admin/upload-center';
import { Button } from '@/components/ui/button';

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
};

const buildStorageOption = (
  storage: {
    id: number;
    type: string;
    config: unknown;
  },
  t: (key: string) => string
) => {
  const config = (storage.config ?? {}) as StorageConfig;
  const label = t(`storage.view.types.${storage.type}`);
  const name =
    config.alias ||
    config.bucket ||
    config.rootPath ||
    config.endpoint ||
    t('upload.unnamed');
  const description =
    storage.type === 'local' || storage.type === 'nas'
      ? config.rootPath ?? t('upload.noPath')
      : config.endpoint ?? config.region ?? t('upload.noConnection');
  return {
    id: storage.id,
    label: `${label} · ${name}`,
    description,
  };
};

export default async function Page() {
  const t = await getTranslations('dashboard');
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('upload.title')}
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

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('upload.title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('upload.userNotFound')}
        </p>
      </div>
    );
  }

  const storages = await fetchUserStorages(user.id);
  const options = storages.map((s) => buildStorageOption(s, t));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('upload.title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('upload.description')}
        </p>
      </header>
      <UploadCenter storages={options} />
    </div>
  );
}
