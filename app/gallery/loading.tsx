function PhotoCardSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="h-full w-full animate-pulse bg-white/10" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-gray-950 px-6 py-12">
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 md:grid-cols-3">
        <PhotoCardSkeleton className="md:col-span-2" />
        <PhotoCardSkeleton className="col-span-1" />
        <PhotoCardSkeleton className="col-span-1" />
        <PhotoCardSkeleton className="md:col-span-2" />
      </div>
    </div>
  );
}
