import type { Metadata } from 'next';
import { Suspense } from 'react';
import { fetchPublishedMediaById } from '@/app/lib/data';
import { GalleryContent } from '@/app/ui/front/gallery-content';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';

type GalleryPageProps = {
  searchParams: Promise<{
    q?: string;
    media?: string;
  }>;
};

const parseMediaId = (value?: string) => {
  if (!value) return null;
  const id = Number.parseInt(value, 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
};

export async function generateMetadata({ searchParams }: GalleryPageProps): Promise<Metadata> {
  const params = await searchParams;
  const mediaId = parseMediaId(params.media);

  if (!mediaId) {
    return {};
  }

  const media = await fetchPublishedMediaById(mediaId);
  if (!media) {
    return {};
  }

  const title = media.title || `Media #${mediaId}`;
  const description = media.description || media.locationName || title;
  const imageUrl = media.thumbUrl || `/api/media/thumb/${mediaId}`;

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ searchParams }: GalleryPageProps) {
  const params = await searchParams;
  const keyword = typeof params.q === 'string' ? params.q : '';
  const mediaId = parseMediaId(params.media);

  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryContent initialKeyword={keyword} initialMediaId={mediaId} />
    </Suspense>
  );
}
