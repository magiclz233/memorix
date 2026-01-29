import { fetchPhotoCollections, fetchVideoSeries } from '@/app/lib/data';
import { CollectionsClient } from './collections-client';

export default async function Page() {
  const photoCollections = await fetchPhotoCollections();
  const videoSeries = await fetchVideoSeries();

  return (
    <CollectionsClient
      photoCollections={photoCollections}
      videoSeries={videoSeries}
    />
  );
}
