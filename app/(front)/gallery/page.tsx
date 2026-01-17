import { Suspense } from 'react';
import { GalleryContent } from '@/app/ui/front/gallery-content';
import { GallerySkeleton } from '@/app/ui/front/gallery-skeleton';

export default function Page() {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <GalleryContent />
    </Suspense>
  );
}
