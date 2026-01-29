import { fetchPhotoCollections } from '@/app/lib/data';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

export default async function Page() {
  const t = await getTranslations('front.collections');
  const collections = await fetchPhotoCollections();

  const mappedCollections = collections.map((c) => ({
    id: String(c.id),
    type: 'photo' as const,
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
      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        {mappedCollections.map((collection) => (
          <Link
            key={collection.id}
            href={`/photo-collections/${collection.id}`}
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
