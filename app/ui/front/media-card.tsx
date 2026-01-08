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

  return (
    <div className='group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-70 transition duration-500 group-hover:opacity-90',
          item.cover
        )}
      />
      <div className='relative z-10 flex h-full flex-col justify-between gap-6 p-5 text-white'>
        <div className='flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-white/80'>
          <span>{typeLabel}</span>
          {showDate ? <span>{formatDate(item.createdAt)}</span> : null}
        </div>
        <div className='space-y-3'>
          <h3 className='text-lg font-semibold'>{item.title}</h3>
          <div className='flex flex-wrap gap-2 text-[11px] text-white/70'>
            {item.tags.map((tag) => (
              <span
                key={tag}
                className='rounded-full border border-white/20 px-2 py-1'
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
