import { getTranslations } from 'next-intl/server';
import { getRequestSession } from '@/app/lib/auth-session';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { users } from '@/app/lib/schema';
import { fetchTrashedMedia } from '@/app/lib/data/trash';
import { parsePageNumber, getTotalPages, resolveListPageSize } from '@/app/lib/list-view';
import { TrashView } from '@/app/ui/admin/trash/trash-view';

export const runtime = 'nodejs';

type TrashPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; limit?: string }>;
};

export default async function TrashPage({ params, searchParams }: TrashPageProps) {
  const t = await getTranslations('dashboard.trash');

  const session = await getRequestSession();
  const email = session?.user?.email;
  if (!email || session?.user?.role !== 'admin') {
    redirect('/login');
  }
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    redirect('/login');
  }

  const { locale } = await params;
  const { page: pageParam, limit: limitParam } = await searchParams;
  const pageSize = resolveListPageSize(limitParam);
  const requestedPage = parsePageNumber(pageParam);
  let result = await fetchTrashedMedia(user.id, {
    limit: pageSize,
    offset: (requestedPage - 1) * pageSize,
  });

  // 页码超出范围时收敛到最后一页（例如清理后总数变少）。
  const totalPages = getTotalPages(result.total, pageSize);
  const page = Math.min(requestedPage, totalPages);
  if (page !== requestedPage) {
    result = await fetchTrashedMedia(user.id, {
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  }

  const { rows, total } = result;

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    mediaType: row.mediaType,
    mimeType: row.mimeType,
    size: row.size,
    isPublished: row.isPublished,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    storageId: row.storageId,
    storageType: row.storageType,
  }));

  return (
    <div className='space-y-8 p-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>{t('title')}</h1>
        <p className='mt-1 text-sm text-muted-foreground'>{t('description')}</p>
      </div>
      <TrashView
        items={items}
        total={total}
        page={page}
        pageSize={pageSize}
        locale={locale}
      />
    </div>
  );
}
