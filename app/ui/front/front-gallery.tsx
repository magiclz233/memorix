import { spaceGrotesk } from '@/app/ui/fonts';
import { GalleryFilter } from '@/app/ui/front/gallery-filter';
import type { MediaItem } from '@/app/lib/definitions';
import { cn } from '@/lib/utils';

type FrontGalleryProps = {
  items: MediaItem[];
};

export function FrontGallery({ items }: FrontGalleryProps) {
  return (
    <div className='space-y-12'>
      <header className='front-fade-up space-y-4'>
        <p className='text-xs uppercase tracking-[0.4em] text-zinc-600/80 dark:text-white/60'>
          Gallery / Archive
        </p>
        <h1
          className={cn(
            spaceGrotesk.className,
            'text-4xl font-semibold text-zinc-800/90 dark:text-white/85 md:text-5xl'
          )}
        >
          画廊
        </h1>
        <p className='max-w-2xl text-sm text-zinc-600/80 dark:text-white/60'>
          以时间线与媒介切换浏览影像档案，探索每一次拍摄留下的光痕。
        </p>
      </header>
      <GalleryFilter items={items} />
    </div>
  );
}
