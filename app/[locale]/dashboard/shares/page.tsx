import { headers } from 'next/headers';
import { auth } from '@/auth';
import { fetchUserByEmail } from '@/app/lib/data';
import { listSharesForUser, fetchSelectableMediaForUser } from '@/app/lib/data/shares';
import { ShareManager } from '@/app/ui/admin/shares/share-manager';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const t = await getTranslations('dashboard.share');
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noShares')}</p>
      </div>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return null;
  }

  const [shareRows, media] = await Promise.all([
    listSharesForUser(user.id),
    fetchSelectableMediaForUser(user.id),
  ]);

  const shares = shareRows.map((s) => ({
    id: s.id,
    token: s.token,
    name: s.name,
    fileCount: Array.isArray(s.fileIds) ? s.fileIds.length : 0,
    hasPassword: Boolean(s.passwordHash),
    expiresAt: s.expiresAt ? s.expiresAt.toISOString() : null,
    role: s.role,
    allowDownload: s.allowDownload,
    viewCount: s.viewCount,
    createdAt: s.createdAt.toISOString(),
  }));

  const selectable = media.map((m) => ({
    id: m.id,
    title: m.title,
    path: m.path,
    mediaType: m.mediaType,
    thumbUrl: m.thumbUrl,
    isPublished: m.isPublished,
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('description')}</p>
      </div>
      <ShareManager initialShares={shares} selectableMedia={selectable} />
    </div>
  );
}
