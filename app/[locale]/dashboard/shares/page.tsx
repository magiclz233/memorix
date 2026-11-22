import { getRequestSession } from '@/app/lib/auth-session';
import { getSessionUserId } from '@/app/lib/session-user';
import { listSharesForUser, fetchSelectableMediaForUser } from '@/app/lib/data/shares';
import { ShareManager } from '@/app/ui/admin/shares/share-manager';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // 分享管理文案在 messages 的 front.share.admin 下（历史结构），管理端复用同一组文案。
  const t = await getTranslations('front.share.admin');
  const session = await getRequestSession();
  const userId = getSessionUserId(session);

  if (!userId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{t('title')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noShares')}</p>
      </div>
    );
  }

  const [shareRows, media] = await Promise.all([
    listSharesForUser(userId),
    fetchSelectableMediaForUser(userId),
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
      <ShareManager
        initialShares={shares}
        selectableMedia={selectable}
        now={Date.now()}
      />
    </div>
  );
}
