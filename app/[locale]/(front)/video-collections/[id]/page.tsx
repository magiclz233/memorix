import { fetchVideoSeriesById, fetchVideoSeriesItems } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Gallery25 } from '@/components/gallery25';
import { ParallaxHeader } from '@/components/ui/parallax-header';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await fetchVideoSeriesById(Number(id));

  if (!series) {
    notFound();
  }

  const items = await fetchVideoSeriesItems(series.id);

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
    resolution:
      metadata?.width && metadata?.height
        ? `${metadata.width}×${metadata.height}`
        : undefined,
    size: file.size,
    videoUrl: file.url,
    duration: metadata?.duration,
    dateShot: file.mtime?.toISOString() || file.createdAt.toISOString(),
  }));

  return (
    <div className='min-h-screen bg-zinc-950 text-zinc-50 pb-20'>
      <ParallaxHeader 
        src={series.coverImage} 
        className="h-[70vh]"
        overlayFrom="from-zinc-950"
      >
        <div className='absolute bottom-0 left-0 right-0 z-20 px-6 pb-12 pt-32 md:px-12'>
          <div className='mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards'>
            <div className='max-w-3xl space-y-6'>
              <div className='space-y-2'>
                <div className='flex items-center gap-3 text-sm font-medium uppercase tracking-wider text-indigo-400'>
                  <span className='h-px w-8 bg-current' />
                  <span>Video Series</span>
                </div>
                <h1 className='font-serif text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl'>
                  {series.title}
                </h1>
              </div>
              
              {series.description && (
                <p className='text-lg leading-relaxed text-zinc-300 md:text-xl'>
                  {series.description}
                </p>
              )}

              <div className='flex items-center gap-4 text-sm text-zinc-400'>
                <div className='flex items-center gap-2 rounded-full border border-zinc-800 bg-black/50 px-3 py-1 backdrop-blur-md'>
                  <span className='font-mono font-semibold text-white'>
                    {items.length}
                  </span>
                  <span>Videos</span>
                </div>
                <div className='hidden items-center gap-2 rounded-full border border-zinc-800 bg-black/50 px-3 py-1 backdrop-blur-md sm:flex'>
                  <span>Updated</span>
                  <span className='font-mono font-semibold text-white'>
                    {new Date(series.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ParallaxHeader>

      {/* Gallery Section - Cinema Mode */}
      <section className='relative z-20 mx-auto -mt-8 max-w-[1920px] px-4 md:px-8'>
        <Gallery25 items={galleryItems} showChrome={false} className="dark" />
      </section>
    </div>
  );
}
