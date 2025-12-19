function PhotoCardSkeleton({ className }: { className: string }) {
  return (
    <div className={className}>
      <div className="h-full w-full overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="h-full w-full animate-pulse bg-gray-100" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="h-screen w-full">
      <div className="relative mx-auto grid h-full w-full max-w-7xl grid-cols-1 gap-4 p-10 md:grid-cols-3">
        <PhotoCardSkeleton className="md:col-span-2" />
        <PhotoCardSkeleton className="col-span-1" />
        <PhotoCardSkeleton className="col-span-1" />
        <PhotoCardSkeleton className="md:col-span-2" />
      </div>
    </div>
  );
}
