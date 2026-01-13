import { Play } from 'lucide-react';
import type { MediaItem } from '@/app/lib/definitions';
import { cn } from '@/lib/utils';

type MediaCardProps = {
  item: MediaItem;
  showDate?: boolean;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function MediaCard({ item, showDate }: MediaCardProps) {
  const typeLabel = item.type === 'photo' ? '照片' : '视频';
  const isVideo = item.type === 'video';
  const tags = item.tags ?? [];
  const hasImage = Boolean(item.coverUrl);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-lg shadow-zinc-200/50 transition duration-300 hover:-translate-y-1 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50',
        isVideo ? 'aspect-video' : 'aspect-[4/5]'
      )}
    >
      {hasImage ? (
        <img
          src={item.coverUrl}
          alt={item.title}
          loading='lazy'
          className='absolute inset-0 h-full w-full object-cover'
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br opacity-70 transition duration-500 group-hover:opacity-90',
            item.cover ?? 'from-zinc-200/50 via-zinc-500/40 to-zinc-900/80'
          )}
        />
      )}
      <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent' />
      {isVideo ? (
        <div className='absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-lg shadow-black/40 dark:border-white/20 dark:bg-black/40 dark:shadow-[0_0_18px_rgba(99,102,241,0.7)]'>
          <Play className='h-4 w-4 fill-white text-white' />
        </div>
      ) : null}
      <div className='relative z-10 flex h-full flex-col justify-between gap-6 p-5 text-white'>
        <div className='flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/80'>
          <span>{typeLabel}</span>
          {showDate ? <span>{formatDate(item.createdAt)}</span> : null}
        </div>
        <div className='space-y-3'>
          <h3 className='text-lg font-semibold'>{item.title}</h3>
          {tags.length ? (
            <div className='flex flex-wrap gap-2 text-[11px] text-white/60'>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className='rounded-full border border-white/20 px-2 py-1'
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
