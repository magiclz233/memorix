import { fetchHeroPhotos, fetchPublishedPhotosForHome } from '@/app/lib/data';
import { Hero234 } from '@/components/hero234';

const HERO_IMAGE_LIMIT = 12;

export default async function Page() {
  const heroPhotos = await fetchHeroPhotos(HERO_IMAGE_LIMIT);
  const fallbackPhotos =
    heroPhotos.length > 0
      ? heroPhotos
      : await fetchPublishedPhotosForHome(HERO_IMAGE_LIMIT);
  const galleryImages =
    fallbackPhotos.length > 0
      ? fallbackPhotos.map((photo) => ({
          src: `/api/local-files/${photo.id}`,
          alt: photo.title ?? photo.path,
        }))
      : undefined;

  return (
    <main className='min-h-screen bg-background'>
      <Hero234 galleryImages={galleryImages} />
    </main>
  );
}
