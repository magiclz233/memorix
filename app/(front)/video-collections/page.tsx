import { videoCollections } from '@/app/lib/front-data';
import { spaceGrotesk } from '@/app/ui/fonts';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { cn } from '@/lib/utils';

export default function Page() {
  return (
    <div className='space-y-12'>
      <header className='front-fade-up space-y-4'>
        <p className='text-xs uppercase tracking-[0.4em] text-muted-foreground'>
          Collections / Video
        </p>
        <h1
          className={cn(
            spaceGrotesk.className,
            'text-4xl font-semibold text-foreground md:text-5xl'
          )}
        >
          视频作品集
        </h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>
          以动态影像记录节奏、音乐与空间的互动，呈现不同主题的叙事线。
        </p>
      </header>
      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
        {videoCollections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  );
}
