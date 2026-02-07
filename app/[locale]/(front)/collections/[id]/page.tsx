import { fetchCollectionById, fetchCollectionMediaItems } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CollectionHero } from '@/app/ui/front/collection-hero';
import { CollectionMediaSection } from '@/app/ui/front/collection-media-section';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ filter?: string }>;
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

  const coverUrls = (collection.covers ?? [])
    .map((cover) => cover.thumbUrl || cover.url)
    .filter((cover): cover is string => Boolean(cover));
  const fallbackHero =
    collection.cover?.thumbUrl ||
    collection.cover?.url ||
    galleryItems[0]?.src ||
    '';
  const heroImages = coverUrls.length > 0 ? coverUrls : fallbackHero ? [fallbackHero] : [];
  const updatedAtValue = new Date(collection.updatedAt).toLocaleDateString();

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
