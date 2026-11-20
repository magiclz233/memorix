import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { fetchGalleryTimelineBuckets, fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';
import { TimelineView } from '@/app/ui/front/timeline/timeline-view';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

async function TimelineContent() {
  const [buckets, records] = await Promise.all([
    fetchGalleryTimelineBuckets(),
    fetchPublishedMediaForGallery({ limit: PAGE_SIZE + 1, offset: 0 }),
  ]);
  const hasNext = records.length > PAGE_SIZE;
  const items = buildGalleryItems(records.slice(0, PAGE_SIZE));
  return <TimelineView buckets={buckets} initialItems={items} initialHasNext={hasNext} pageSize={PAGE_SIZE} />;
}

export default async function TimelinePage() {
  const t = await getTranslations('front.timeline');
  return (
    <div className="space-y-10">
      <header className="front-fade-up space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60">
          {t('eyebrow')}
        </p>
        <h1
          className={cn(
            'font-serif',
            'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl',
          )}
        >
          {t('title')}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600/80 dark:text-white/60">
          {t('description')}
        </p>
      </header>

      <Suspense fallback={<GallerySkeleton />}>
        <TimelineContent />
      </Suspense>
    </div>
  );
}
