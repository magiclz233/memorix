import { videoCollections } from '@/app/lib/front-data';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('front.collections');
  const tData = await getTranslations();

  const translatedCollections = videoCollections.map((collection) => ({
    ...collection,
    title: tData(collection.title),
    description: tData(collection.description),
    tags: collection.tags?.map((tag) => tData(tag)) ?? [],
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
        {translatedCollections.map((collection) => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            labels={{
              photo: t('badge.photo'),
              video: t('badge.video'),
              itemCount: (count) => t('itemCount', { count }),
            }}
          />
        ))}
      </div>
    </div>
  );
}
