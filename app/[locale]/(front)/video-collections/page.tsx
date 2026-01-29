import { fetchVideoSeries } from '@/app/lib/data';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('front.collections');
  const collections = await fetchVideoSeries();

  const mappedCollections = collections.map((c) => ({
    id: String(c.id),
    type: 'video' as const,
    title: c.title,
    description: c.description || '',
    cover: c.coverImage || '',
    count: c.itemCount,
    tags: [],
  }));

  return (
    <div className='space-y-12'>
      <header className='front-fade-up space-y-4'>
        <p className='text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60'>
          {t('video.eyebrow')}
        </p>
        <h1
          className={cn(
            'font-serif',
            'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl'
          )}
        >
          {t('video.title')}
        </h1>
        <p className='max-w-2xl text-sm text-zinc-600/80 dark:text-white/60'>
          {t('video.description')}
        </p>
      </header>
      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        {mappedCollections.map((collection) => (
          <Link
            key={collection.id}
            href={`/video-collections/${collection.id}`}
            className='block'
          >
            <CollectionCard
              collection={collection}
              labels={{
                photo: t('badge.photo'),
                video: t('badge.video'),
                itemCount: (count) => t('itemCount', { count }),
              }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
