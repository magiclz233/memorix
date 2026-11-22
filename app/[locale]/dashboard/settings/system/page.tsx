import { getLocale, getTranslations } from 'next-intl/server';
import { getRequestSession } from '@/app/lib/auth-session';
import { fetchSystemSettings } from '@/app/lib/data';
import { getSessionUserId } from '@/app/lib/session-user';
import { SystemSettingsForm } from './system-settings-form';

export default async function Page() {
  const t = await getTranslations('dashboard.settings.system');
  const locale = await getLocale();
  const session = await getRequestSession();
  const userId = getSessionUserId(session);
  if (!userId || session?.user?.role !== 'admin') {
    return <div>{t('forbidden')}</div>;
  }
  const settings = await fetchSystemSettings(userId, locale);
  // Using type assertion since we extended the return type at runtime but not in the type definition yet
  const settingsKey = (settings as any)?._lastModified?.toString() ?? 'initial';

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('description')}
        </p>
      </header>

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <SystemSettingsForm key={settingsKey} settings={settings} />
      </div>
    </div>
  );
}
