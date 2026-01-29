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
  const galleryItems = items.map(({ file, metadata }) => ({
    id: String(file.id),
    type: (file.mediaType === 'video' ? 'video' : 'photo') as 'video' | 'photo',
    src: file.thumbUrl || (file.mediaType === 'video' ? `/api/media/thumb/${file.id}` : file.url) || '',
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
  }));

  return (
    <div className='space-y-12'>
      <section className='front-fade-up'>
        <div className='relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white/80 shadow-lg shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/50'>
          <div className='relative h-[50vh] md:h-[60vh]'>
            {hasCover ? (
              <Image
                src={collection.coverImage ?? ''}
                alt={collection.title}
                fill
                priority
                className='object-cover'
                sizes='100vw'
                unoptimized
              />
            ) : (
              <div className='absolute inset-0 bg-gradient-to-br from-indigo-500/35 via-slate-900/70 to-slate-950' />
            )}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-transparent',
                'z-10',
              )}
            />
            <div className='absolute inset-0 bg-gradient-to-t from-zinc-50/80 via-transparent to-transparent dark:from-zinc-950/80' />
            <div className='relative z-20 flex h-full items-center justify-center px-6 text-center'>
              <div className='max-w-3xl space-y-4 rounded-3xl border border-white/20 bg-black/30 px-8 py-10 text-white shadow-2xl shadow-black/40 backdrop-blur-md'>
                <h1 className='font-serif text-3xl font-semibold tracking-tight md:text-5xl'>
                  {collection.title}
                </h1>
                {collection.description ? (
                  <p className='text-sm text-white/75 md:text-base'>
                    {collection.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='front-fade-up'>
        <Gallery25 items={galleryItems} showChrome={false} />
      </section>
    </div>
  );
}
