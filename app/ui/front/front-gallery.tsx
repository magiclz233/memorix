import { galleryMedia } from '@/app/lib/front-data';
import { spaceGrotesk } from '@/app/ui/fonts';
import { GalleryFilter } from '@/app/ui/front/gallery-filter';
import { cn } from '@/lib/utils';

export function FrontGallery() {
  return (
    <div className='space-y-12'>
      <header className='front-fade-up space-y-4'>
        <p className='text-xs uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400'>
          Gallery / Archive
        </p>
        <h1
          className={cn(
            spaceGrotesk.className,
            'text-4xl font-semibold text-zinc-900 dark:text-white md:text-5xl'
          )}
        >
          画廊
        </h1>
        <p className='max-w-2xl text-sm text-zinc-500 dark:text-zinc-400'>
          以时间线与媒介切换浏览影像档案，探索每一次拍摄留下的光痕。
        </p>
      </header>
      <GalleryFilter items={galleryMedia} />
    </div>
  );
}
