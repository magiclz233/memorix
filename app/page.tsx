import { auth } from '@/auth';
import { fetchHeroPhotosForHome, fetchPublishedPhotosForHome, fetchUserByEmail } from '@/app/lib/data';
import { Hero234 } from '@/components/hero234';

const HERO_IMAGE_LIMIT = 12;

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const isAuthenticated = Boolean(email);
  const ctaHref = isAuthenticated ? '/gallery' : '/login?callbackUrl=/gallery';
  const ctaLabel = isAuthenticated ? 'View Projects' : '登录查看作品';
  const user = email ? await fetchUserByEmail(email) : null;
  const heroPhotos = await fetchHeroPhotosForHome({
    userId: user?.id ?? undefined,
    limit: HERO_IMAGE_LIMIT,
  });
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
      <Hero234
        galleryImages={galleryImages}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    </main>
  );
}
