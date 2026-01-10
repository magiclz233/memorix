import { photoCollections } from '@/app/lib/front-data';
import { spaceGrotesk } from '@/app/ui/fonts';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { cn } from '@/lib/utils';

export default function Page() {
  return (
    <div className='space-y-12'>
      <header className='front-fade-up space-y-4'>
        <p className='text-xs uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400'>
          Collections / Photo
        </p>
        <h1
          className={cn(
            spaceGrotesk.className,
            'text-4xl font-semibold text-zinc-900 dark:text-white md:text-5xl'
          )}
        >
          照片作品集
        </h1>
        <p className='max-w-2xl text-sm text-zinc-500 dark:text-zinc-400'>
          每一个主题都是一段独立的光影旅程，聚焦构图与氛围的沉浸感。
        </p>
      </header>
      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        {photoCollections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  );
}
