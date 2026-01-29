import { fetchVideoSeriesById, fetchVideoSeriesItems } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Gallery25 } from '@/components/gallery25';
import { cn } from '@/lib/utils';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await fetchVideoSeriesById(Number(id));

  if (!series) {
    notFound();
  }

  const items = await fetchVideoSeriesItems(series.id);
  const hasCover = Boolean(series.coverImage?.trim());

  // Data transformation layer
  const galleryItems = items.map(({ file, metadata }) => ({
    id: String(file.id),
    type: 'video' as const,
    src: file.thumbUrl || `/api/media/thumb/${file.id}`,
    title: file.title || '',
    width: metadata?.width || 1920,
    height: metadata?.height || 1080,
    blurHash: file.blurHash,
    isPublished: true,
    createdAt: file.createdAt.toISOString(),
    resolution: metadata?.width
      ? `${metadata.width}×${metadata.height}`
      : undefined,
    size: file.size,
    videoUrl: file.url, // This is crucial for video playback
    videoDuration: metadata?.duration,
    dateShot: file.mtime?.toISOString() || file.createdAt.toISOString(), // Video might not have dateShot
  }));

  return (
    <div className='space-y-12'>
      <section className='front-fade-up'>
        <div className='relative overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white/80 shadow-lg shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900/60 dark:shadow-black/50'>
          <div className='relative h-[50vh] md:h-[60vh]'>
            {hasCover ? (
              <Image
                src={series.coverImage ?? ''}
                alt={series.title}
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
                  {series.title}
                </h1>
                {series.description ? (
                  <p className='text-sm text-white/75 md:text-base'>
                    {series.description}
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
