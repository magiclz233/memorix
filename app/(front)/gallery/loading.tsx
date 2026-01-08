function MediaCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className='h-full w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none'>
        <div className='h-full w-full animate-pulse bg-slate-200/70 dark:bg-slate-800/70' />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
      <MediaCardSkeleton className='md:col-span-2 h-60' />
      <MediaCardSkeleton className='h-60' />
      <MediaCardSkeleton className='h-60' />
      <MediaCardSkeleton className='md:col-span-2 h-60' />
      <MediaCardSkeleton className='h-60' />
      <MediaCardSkeleton className='h-60' />
    </div>
  );
}
