import type { Collection } from '@/app/lib/definitions';
import { cn } from '@/lib/utils';

type CollectionCardProps = {
  collection: Collection;
};

export function CollectionCard({ collection }: CollectionCardProps) {
  const typeLabel = collection.type === 'photo' ? '照片集' : '视频集';

  return (
    <div className='group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-70 transition duration-500 group-hover:opacity-90',
          collection.cover
        )}
      />
      <div className='relative z-10 flex h-full flex-col justify-between gap-6'>
        <div className='space-y-3'>
          <span className='inline-flex items-center rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/90 dark:border-white/20 dark:bg-white/10'>
            {typeLabel}
          </span>
          <div>
            <h3 className='text-xl font-semibold text-white'>{collection.title}</h3>
            <p className='mt-2 text-sm text-white/70'>
              {collection.description}
            </p>
          </div>
        </div>
        <div className='flex flex-wrap items-center justify-between gap-3 text-xs text-white/80'>
          <span>{collection.count} 项内容</span>
          <div className='flex flex-wrap gap-2'>
            {(collection.tags ?? []).map((tag) => (
              <span
                key={tag}
                className='rounded-full border border-white/20 px-2 py-1 text-[10px]'
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
