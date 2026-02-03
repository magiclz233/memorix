import { fetchCollections } from '@/app/lib/data';
import { BentoGrid } from '@/components/ui/bento-grid';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import type { Collection } from '@/app/lib/definitions';

export default async function Page() {
  const t = await getTranslations('front.collections');
  const collections = await fetchCollections({ status: 'published' });

  const mappedCollections: Collection[] = collections.map((c) => ({
    id: String(c.id),
    type: c.type,
    title: c.title,
    cover: c.cover?.thumbUrl || c.cover?.url || '',
    covers: c.covers?.map(cover => cover.thumbUrl || cover.url || '').filter(Boolean) || [],
    count: c.itemCount,
    description: c.description || '',
    author: c.author || undefined,
    tags: [],
  }));

  return (
    <div className="space-y-12">
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

      <div className="relative z-10">
        <BentoGrid className="mx-0 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 md:auto-rows-auto max-w-none">
          {mappedCollections.map((collection) => (
            <div key={collection.id} className="row-span-1">
              <Link href={`/collections/${collection.id}`} className="block h-full">
                <CollectionCard
                  collection={collection}
                  labels={{
                    photo: t('badge.photo'),
                    video: t('badge.video'),
                    mixed: t('badge.mixed'),
                    itemCount: t('itemCount', { count: collection.count }),
                  }}
                />
              </Link>
            </div>
          ))}
        </BentoGrid>
      </div>
    </div>
  );
}
