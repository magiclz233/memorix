import { fetchCollectionById, fetchCollectionMediaItems } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CollectionHero } from '@/app/ui/front/collection-hero';
import { CollectionMediaSection } from '@/app/ui/front/collection-media-section';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations('front.collections'),
  ]);
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
    const isAnimated = file.mediaType === 'animated';
    const src = `/api/media/thumb/${file.id}`;
    const fullSrc = isVideo ? undefined : `/api/local-files/${file.id}`;
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
      fullSrc,
      isAnimated,
      animatedUrl: isAnimated ? `/api/local-files/${file.id}` : undefined,
      title: file.title || '',
      description: photoMetadata?.description,
      author: file.author,
      width,
      height,
      blurHash: file.blurHash,
      isPublished: true,
      createdAt: file.createdAt.toISOString(),
      resolution:
        width && height ? `${width}×${height}` : undefined,
      camera: photoMetadata?.camera,
      maker: photoMetadata?.maker,
      lens: photoMetadata?.lens,
      aperture: photoMetadata?.aperture,
      iso: photoMetadata?.iso,
      focalLength: photoMetadata?.focalLength,
      exposure: photoMetadata?.exposure,
      whiteBalance: photoMetadata?.whiteBalance,
      gpsLatitude: photoMetadata?.gpsLatitude,
      gpsLongitude: photoMetadata?.gpsLongitude,
      locationName: photoMetadata?.locationName,
      dateShot: photoMetadata?.dateShot?.toISOString(),
      size: file.size,
      videoUrl: isVideo ? `/api/media/stream/${file.id}` : undefined,
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

  const coverUrls = (collection.covers ?? [])
    .map((cover) => cover.thumbUrl || cover.url)
    .filter((cover): cover is string => Boolean(cover));
  const fallbackHero =
    collection.cover?.thumbUrl ||
    collection.cover?.url ||
    galleryItems[0]?.src ||
    '';
  const heroImages = coverUrls.length > 0 ? coverUrls : fallbackHero ? [fallbackHero] : [];
  const updatedAtValue = new Date(collection.updatedAt).toLocaleDateString(locale);

  return (
    <div className="relative min-h-screen pb-20">
      <CollectionHero
        title={collection.title}
        description={collection.description}
        badgeLabel={badgeLabel}
        countLabel={countLabel}
        author={collection.author ?? undefined}
        authorLabel={t('detail.author')}
        updatedAtLabel={t('detail.updated')}
        updatedAtValue={updatedAtValue}
        coverUrls={heroImages}
        backLabel={t('detail.actions.back')}
        backHref="/collections"
        actions={{
          like: t('detail.actions.like'),
          favorite: t('detail.actions.favorite'),
        }}
      />

      <CollectionMediaSection
        items={galleryItems}
        isCinema={isCinema}
      />
    </div>
  );
}
