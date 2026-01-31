import { fetchPhotoCollections } from '@/app/lib/data';
import { BentoGrid } from '@/components/ui/bento-grid';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import type { Collection } from '@/app/lib/definitions';

export default async function Page() {
  const t = await getTranslations('front.collections');
  const collections = await fetchPhotoCollections();

  const mappedCollections: Collection[] = collections.map(c => ({
    id: String(c.id),
    type: 'photo',
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
          {t('photo.eyebrow')}
        </p>
        <h1
          className={cn(
            'font-serif',
            'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl'
          )}
        >
          {t('photo.title')}
        </h1>
        <p className='max-w-2xl text-sm text-zinc-600/80 dark:text-white/60'>
          {t('photo.description')}
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
                  href={`/photo-collections/${collection.id}`}
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
