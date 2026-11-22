import { getTranslations, getLocale } from 'next-intl/server';
import { getRequestSession } from '@/app/lib/auth-session';
import { getSessionUserId } from '@/app/lib/session-user';
import { fetchUsers } from '@/app/lib/data';
import { UsersTable } from './users-table';

export default async function Page() {
  const t = await getTranslations('dashboard.settings.users');
  const locale = await getLocale();
  const [session, users] = await Promise.all([
    getRequestSession(),
    fetchUsers(),
  ]);
  const currentUserId = getSessionUserId(session);

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

      <UsersTable
        users={users}
        locale={locale}
        currentUserId={currentUserId}
      />
    </div>
  );
}
