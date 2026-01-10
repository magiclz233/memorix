function MediaCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className='h-full w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-lg shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-2xl dark:shadow-black/50'>
        <div className='h-full w-full animate-pulse bg-zinc-200/70 dark:bg-zinc-800/70' />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className='columns-1 gap-x-6 md:columns-2 xl:columns-3'>
      <MediaCardSkeleton className='mb-6 aspect-[4/5] break-inside-avoid' />
      <MediaCardSkeleton className='mb-6 aspect-video break-inside-avoid' />
      <MediaCardSkeleton className='mb-6 aspect-[4/5] break-inside-avoid' />
      <MediaCardSkeleton className='mb-6 aspect-[4/5] break-inside-avoid' />
      <MediaCardSkeleton className='mb-6 aspect-video break-inside-avoid' />
      <MediaCardSkeleton className='mb-6 aspect-[4/5] break-inside-avoid' />
    </div>
  );
}
