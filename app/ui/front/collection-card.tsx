import Image from 'next/image';
import type { Collection } from '@/app/lib/definitions';
import { cn } from '@/lib/utils';

type CollectionCardProps = {
  collection: Collection;
  labels: {
    photo: string;
    video: string;
    mixed: string;
    itemCount: (count: number) => string;
  };
};

const fallbackGradient =
  'from-indigo-500/35 via-slate-900/70 to-slate-950';

export function CollectionCard({ collection, labels }: CollectionCardProps) {
  if (collection.type === 'video') {
    return <VideoCollectionCard collection={collection} labels={labels} />;
  }

  if (collection.type === 'mixed') {
    return <MixedCollectionCard collection={collection} labels={labels} />;
  }

  return <PhotoCollectionCard collection={collection} labels={labels} />;
}

const isCoverUrl = (cover?: string | null) => {
  if (!cover) return false;
  const value = cover.trim();
  if (!value) return false;
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:')
  );
};

function PhotoCollectionCard({ collection, labels }: CollectionCardProps) {
  const coverIsUrl = isCoverUrl(collection.cover);
  const gradientClass = coverIsUrl
    ? fallbackGradient
    : collection.cover?.trim()
      ? collection.cover
      : fallbackGradient;
  return (
    <div className='group relative'>
      <div className='absolute inset-0 -translate-x-3 translate-y-3 rounded-3xl border border-zinc-200 bg-white shadow-md shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/40' />
      <div className='absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-3xl border border-zinc-200/80 bg-white/80 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-black/30' />
      <div className='relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/50 transition duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50'>
        {coverIsUrl ? (
          <Image
            src={collection.cover ?? ''}
            alt={collection.title}
            fill
            sizes='(max-width: 768px) 100vw, 33vw'
            className='object-cover'
          />
        ) : null}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-40 dark:opacity-70',
            gradientClass
          )}
        />
        <div className='relative z-10 flex h-full flex-col justify-between gap-6'>
          <div className='space-y-3'>
            <span className='inline-flex items-center rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-600/80 dark:border-white/10 dark:bg-black/40 dark:text-white/60'>
              {labels.photo}
            </span>
            <div>
              <h3 className='text-xl font-semibold text-zinc-900 dark:text-white'>
                {collection.title}
              </h3>
              <p className='mt-2 text-sm text-zinc-600/80 dark:text-white/60'>
                {collection.description}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600/80 dark:text-white/60'>
            <span>{labels.itemCount(collection.count)}</span>
            <div className='flex flex-wrap gap-2'>
              {(collection.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className='rounded-full border border-zinc-200 px-2 py-1 text-[10px] dark:border-zinc-700'
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoCollectionCard({ collection, labels }: CollectionCardProps) {
  const coverIsUrl = isCoverUrl(collection.cover);
  const gradientClass = coverIsUrl
    ? fallbackGradient
    : collection.cover?.trim()
      ? collection.cover
      : fallbackGradient;
  return (
    <div className='group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/50 transition duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50'>
      <div className='relative aspect-video'>
        {coverIsUrl ? (
          <Image
            src={collection.cover ?? ''}
            alt={collection.title}
            fill
            sizes='(max-width: 768px) 100vw, 33vw'
            className='object-cover'
          />
        ) : null}
        <div
          className={cn('absolute inset-0 bg-gradient-to-br', gradientClass)}
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent' />
        <span className='absolute left-4 top-4 rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white'>
          {labels.video}
        </span>
      </div>
      <div className='relative z-10 space-y-3 border-t border-white/10 bg-white/90 p-5 text-zinc-900 dark:border-white/5 dark:bg-black/90 dark:text-white'>
        <div>
          <h3 className='text-lg font-semibold'>{collection.title}</h3>
          <p className='mt-2 text-sm text-zinc-600/80 dark:text-white/60'>
            {collection.description}
          </p>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600/80 dark:text-white/60'>
          <span>{labels.itemCount(collection.count)}</span>
          <div className='flex flex-wrap gap-2'>
            {(collection.tags ?? []).map((tag) => (
              <span
                key={tag}
                className='rounded-full border border-zinc-200 px-2 py-1 text-[10px] dark:border-zinc-700'
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MixedCollectionCard({ collection, labels }: CollectionCardProps) {
  const coverIsUrl = isCoverUrl(collection.cover);
  const gradientClass = coverIsUrl
    ? fallbackGradient
    : collection.cover?.trim()
      ? collection.cover
      : fallbackGradient;
  return (
    <div className='group relative'>
      <div className='absolute inset-0 -translate-x-3 translate-y-3 rounded-3xl border border-zinc-200 bg-white shadow-md shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/40' />
      <div className='absolute inset-0 -translate-x-1.5 translate-y-1.5 rounded-3xl border border-zinc-200/80 bg-white/80 shadow-md shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:shadow-black/30' />
      <div className='relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-200/50 transition duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50'>
        {coverIsUrl ? (
          <Image
            src={collection.cover ?? ''}
            alt={collection.title}
            fill
            sizes='(max-width: 768px) 100vw, 33vw'
            className='object-cover'
          />
        ) : null}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-40 dark:opacity-70',
            gradientClass
          )}
        />
        <div className='relative z-10 flex h-full flex-col justify-between gap-6'>
          <div className='space-y-3'>
            <span className='inline-flex items-center rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-zinc-600/80 dark:border-white/10 dark:bg-black/40 dark:text-white/60'>
              {labels.mixed}
            </span>
            <div>
              <h3 className='text-xl font-semibold text-zinc-900 dark:text-white'>
                {collection.title}
              </h3>
              <p className='mt-2 text-sm text-zinc-600/80 dark:text-white/60'>
                {collection.description}
              </p>
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600/80 dark:text-white/60'>
            <span>{labels.itemCount(collection.count)}</span>
            <div className='flex flex-wrap gap-2'>
              {(collection.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className='rounded-full border border-zinc-200 px-2 py-1 text-[10px] dark:border-zinc-700'
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
