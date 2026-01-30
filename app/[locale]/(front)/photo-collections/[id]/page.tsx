import { fetchCollectionById, fetchCollectionItems } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Gallery25 } from '@/components/gallery25';
import { cn } from '@/lib/utils';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await fetchCollectionById(Number(id));

  if (!collection) {
    notFound();
  }

  const items = await fetchCollectionItems(collection.id);
  const hasCover = Boolean(collection.coverImage?.trim());

  // Transform items to Gallery25 format
  const galleryItems = items.map(({ file, metadata }) => {
    const isHeic = file.path?.toLowerCase().endsWith('.heic') || file.path?.toLowerCase().endsWith('.heif');
    return {
    id: String(file.id),
    type: (file.mediaType === 'video' ? 'video' : 'photo') as 'video' | 'photo',
    src: file.thumbUrl || (file.mediaType === 'video' || isHeic ? `/api/media/thumb/${file.id}` : file.url) || '',
    title: file.title || '',
    description: metadata?.description,
    width: metadata?.resolutionWidth || 1920,
    height: metadata?.resolutionHeight || 1080,
    blurHash: file.blurHash,
    isPublished: true,
    createdAt: file.createdAt.toISOString(),
    resolution: metadata?.resolutionWidth
      ? `${metadata.resolutionWidth}×${metadata.resolutionHeight}`
      : undefined,
    camera: metadata?.camera,
    lens: metadata?.lens,
    aperture: metadata?.aperture,
    iso: metadata?.iso,
    focalLength: metadata?.focalLength,
    exposure: metadata?.exposure,
    dateShot: metadata?.dateShot?.toISOString(),
    size: file.size,
    videoUrl: file.mediaType === 'video' ? file.url : undefined,
    liveType: (metadata?.liveType as 'none' | 'embedded' | 'paired') || undefined,
    videoDuration: metadata?.videoDuration,
  };
});

  return (
    <div className='min-h-screen pb-20'>
      {/* Immersive Hero Section */}
      <section className='relative h-[70vh] w-full overflow-hidden'>
        {hasCover ? (
          <div className='absolute inset-0'>
            <Image
              src={collection.coverImage ?? ''}
              alt={collection.title}
              fill
              priority
              className='object-cover'
              sizes='100vw'
              unoptimized
            />
            <div className='absolute inset-0 bg-black/20' />
          </div>
        ) : (
          <div className='absolute inset-0 bg-zinc-900'>
            <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-zinc-900/50 to-black' />
          </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className='absolute inset-0 bg-gradient-to-t from-zinc-50 via-zinc-50/10 to-transparent dark:from-zinc-950 dark:via-zinc-950/20' />

        {/* Hero Content */}
        <div className='absolute bottom-0 left-0 right-0 z-20 px-6 pb-12 pt-32 md:px-12'>
          <div className='front-fade-up mx-auto max-w-7xl'>
            <div className='max-w-3xl space-y-6'>
              <div className='space-y-2'>
                <div className='flex items-center gap-3 text-sm font-medium uppercase tracking-wider text-indigo-500 dark:text-indigo-400'>
                  <span className='h-px w-8 bg-current' />
                  <span>Photo Collection</span>
                </div>
                <h1 className='font-serif text-4xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-6xl lg:text-7xl'>
                  {collection.title}
                </h1>
              </div>
              
              {collection.description && (
                <p className='text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 md:text-xl'>
                  {collection.description}
                </p>
              )}

              <div className='flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400'>
                <div className='flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 backdrop-blur-md dark:border-zinc-800 dark:bg-black/50'>
                  <span className='font-mono font-semibold text-zinc-900 dark:text-white'>
                    {items.length}
                  </span>
                  <span>Photos</span>
                </div>
                {items.length > 0 && (
                  <div className='hidden items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 backdrop-blur-md dark:border-zinc-800 dark:bg-black/50 sm:flex'>
                    <span>Updated</span>
                    <span className='font-mono font-semibold text-zinc-900 dark:text-white'>
                      {new Date(collection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className='front-fade-up relative z-20 mx-auto -mt-8 max-w-[1920px] px-4 md:px-8'>
        <Gallery25 items={galleryItems} showChrome={false} />
      </section>
    </div>
  );
}
