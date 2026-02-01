import { fetchCollectionById, fetchCollectionMediaItems } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Gallery25 } from '@/components/gallery25';
import { ParallaxHeader } from '@/components/ui/parallax-header';
import { getTranslations } from 'next-intl/server';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('front.collections');
  const collection = await fetchCollectionById(Number(id));

  if (!collection) {
    notFound();
  }

  const items = await fetchCollectionMediaItems(collection.id);
  const hasItems = items.length > 0;
  const videoOnly =
    hasItems && items.every((item) => item.file.mediaType === 'video');
  const photoOnly =
    hasItems && items.every((item) => item.file.mediaType !== 'video');
  const isCinema = videoOnly;

  const galleryItems = items.map(({ file, photoMetadata, videoMetadata }) => {
    const isVideo = file.mediaType === 'video';
    const isHeic =
      !isVideo &&
      (file.path?.toLowerCase().endsWith('.heic') ||
        file.path?.toLowerCase().endsWith('.heif'));
    const src = isVideo
      ? file.thumbUrl || `/api/media/thumb/${file.id}`
      : file.thumbUrl ||
        (isHeic ? `/api/media/thumb/${file.id}` : file.url) ||
        `/api/media/thumb/${file.id}`;
    const width = isVideo
      ? videoMetadata?.width || 1920
      : photoMetadata?.resolutionWidth || 1920;
    const height = isVideo
      ? videoMetadata?.height || 1080
      : photoMetadata?.resolutionHeight || 1080;
    return {
      id: String(file.id),
      type: isVideo ? ('video' as const) : ('photo' as const),
      src,
      title: file.title || '',
      description: photoMetadata?.description,
      width,
      height,
      blurHash: file.blurHash,
      isPublished: true,
      createdAt: file.createdAt.toISOString(),
      resolution:
        width && height ? `${width}×${height}` : undefined,
      camera: photoMetadata?.camera,
      lens: photoMetadata?.lens,
      aperture: photoMetadata?.aperture,
      iso: photoMetadata?.iso,
      focalLength: photoMetadata?.focalLength,
      exposure: photoMetadata?.exposure,
      dateShot: photoMetadata?.dateShot?.toISOString(),
      size: file.size,
      videoUrl: isVideo ? file.url : undefined,
      liveType: (photoMetadata?.liveType as 'none' | 'embedded' | 'paired') || undefined,
      duration: isVideo ? videoMetadata?.duration : photoMetadata?.videoDuration,
    };
  });

  const badgeLabel = photoOnly
    ? t('detail.badgePhoto')
    : videoOnly
      ? t('detail.badgeVideo')
      : t('detail.badgeMixed');
  const countLabel = photoOnly
    ? t('detail.countPhoto', { count: items.length })
    : videoOnly
      ? t('detail.countVideo', { count: items.length })
      : t('detail.countMixed', { count: items.length });

  const heroSrc =
    collection.cover?.url ||
    collection.cover?.thumbUrl ||
    galleryItems[0]?.src ||
    '';

  return (
    <div
      className={
        isCinema
          ? 'min-h-screen bg-zinc-950 text-zinc-50 pb-20'
          : 'min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20'
      }
    >
      <ParallaxHeader
        src={heroSrc}
        className="h-[70vh]"
        overlayFrom={isCinema ? 'from-zinc-950' : undefined}
      >
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-12 pt-32 md:px-12">
          <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
            <div className="max-w-3xl space-y-6">
              <div className="space-y-2">
                <div
                  className={
                    isCinema
                      ? 'flex items-center gap-3 text-sm font-medium uppercase tracking-wider text-indigo-400'
                      : 'flex items-center gap-3 text-sm font-medium uppercase tracking-wider text-indigo-500 dark:text-indigo-400'
                  }
                >
                  <span className="h-px w-8 bg-current" />
                  <span>{badgeLabel}</span>
                </div>
                <h1
                  className={
                    isCinema
                      ? 'font-serif text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl'
                      : 'font-serif text-4xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-6xl lg:text-7xl'
                  }
                >
                  {collection.title}
                </h1>
              </div>

              {collection.description ? (
                <p
                  className={
                    isCinema
                      ? 'text-lg leading-relaxed text-zinc-300 md:text-xl'
                      : 'text-lg leading-relaxed text-zinc-600 dark:text-zinc-300 md:text-xl'
                  }
                >
                  {collection.description}
                </p>
              ) : null}

              <div
                className={
                  isCinema
                    ? 'flex flex-wrap items-center gap-4 text-sm text-zinc-400'
                    : 'flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400'
                }
              >
                <div
                  className={
                    isCinema
                      ? 'flex items-center gap-2 rounded-full border border-zinc-800 bg-black/50 px-3 py-1 backdrop-blur-md'
                      : 'flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 backdrop-blur-md dark:border-zinc-800 dark:bg-black/50'
                  }
                >
                  <span
                    className={
                      isCinema
                        ? 'font-mono font-semibold text-white'
                        : 'font-mono font-semibold text-zinc-900 dark:text-white'
                    }
                  >
                    {countLabel}
                  </span>
                </div>
                {collection.author ? (
                  <div
                    className={
                      isCinema
                        ? 'flex items-center gap-2 rounded-full border border-zinc-800 bg-black/50 px-3 py-1 backdrop-blur-md'
                        : 'flex items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 backdrop-blur-md dark:border-zinc-800 dark:bg-black/50'
                    }
                  >
                    <span>{t('detail.author')}</span>
                    <span
                      className={
                        isCinema
                          ? 'font-mono font-semibold text-white'
                          : 'font-mono font-semibold text-zinc-900 dark:text-white'
                      }
                    >
                      {collection.author}
                    </span>
                  </div>
                ) : null}
                <div
                  className={
                    isCinema
                      ? 'hidden items-center gap-2 rounded-full border border-zinc-800 bg-black/50 px-3 py-1 backdrop-blur-md sm:flex'
                      : 'hidden items-center gap-2 rounded-full border border-zinc-200 bg-white/50 px-3 py-1 backdrop-blur-md dark:border-zinc-800 dark:bg-black/50 sm:flex'
                  }
                >
                  <span>{t('detail.updated')}</span>
                  <span
                    className={
                      isCinema
                        ? 'font-mono font-semibold text-white'
                        : 'font-mono font-semibold text-zinc-900 dark:text-white'
                    }
                  >
                    {new Date(collection.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ParallaxHeader>

      <section className="relative z-20 mx-auto -mt-8 max-w-[1920px] px-4 md:px-8">
        <Gallery25 items={galleryItems} showChrome={false} className={isCinema ? 'dark' : undefined} />
      </section>
    </div>
  );
}
