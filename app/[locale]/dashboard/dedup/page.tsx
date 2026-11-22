import { getTranslations } from 'next-intl/server';
import { getRequestSession } from '@/app/lib/auth-session';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { users } from '@/app/lib/schema';
import { fetchDuplicateGroups, fetchDedupSummary } from '@/app/lib/data/dedup';
import { DedupView } from '@/app/ui/admin/dedup/dedup-view';

export const runtime = 'nodejs';

export default async function DedupPage() {
  const t = await getTranslations('dashboard.dedup');

  const session = await getRequestSession();
  const email = session?.user?.email;
  if (!email || session?.user?.role !== 'admin') {
    redirect('/login');
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    redirect('/login');
  }

  const [groups, summary] = await Promise.all([
    fetchDuplicateGroups(user.id),
    fetchDedupSummary(user.id),
  ]);

  const serializedGroups = groups.map((group) => ({
    fileHash: group.fileHash,
    count: group.count,
    totalSize: group.totalSize,
    items: group.items.map((item) => ({
      id: item.id,
      title: item.title,
      path: item.path,
      mediaType: item.mediaType,
      size: item.size,
      storageId: item.storageId,
      storageType: item.storageType,
      mtime: item.mtime ? item.mtime.toISOString() : null,
    })),
  }));

  return (
    <div className='space-y-8 p-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
        <p className='mt-1 text-sm text-muted-foreground'>{t('description')}</p>
      </div>
      <DedupView
        groups={serializedGroups}
        summary={{
          groups: summary.groups,
          duplicateFiles: summary.duplicateFiles,
          duplicateBytes: summary.duplicateBytes,
        }}
      />
    </div>
  );
}
