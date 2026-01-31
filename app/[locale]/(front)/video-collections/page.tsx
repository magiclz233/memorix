import { fetchVideoSeries } from '@/app/lib/data';
import { BentoGrid } from '@/components/ui/bento-grid';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import type { Collection } from '@/app/lib/definitions';

export default async function Page() {
  const t = await getTranslations('front.collections');
  const collections = await fetchVideoSeries();

  const mappedCollections: Collection[] = collections.map(c => ({
    id: String(c.id),
    type: 'video',
    title: c.title,
    cover: c.coverImage || '',
    count: c.itemCount,
    description: c.description || '',
    tags: []
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

      <div className='relative z-10'>
          <BentoGrid className="max-w-none mx-0 md:auto-rows-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mappedCollections.map((collection, i) => (
              <div 
                key={collection.id} 
                className="row-span-1"
              >
                <Link 
                  href={`/video-collections/${collection.id}`}
                  className="block h-full"
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
              </div>
            ))}
          </BentoGrid>
       </div>
    </div>
  )
}
