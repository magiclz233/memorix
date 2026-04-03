import { FrontHome } from '@/app/ui/front/front-home';
import { fetchHeroPhotosForHomeCached, fetchCollectionsCached } from '@/app/lib/data';

export default async function Page() {
  // 获取 Hero 照片数据（带 5 分钟缓存）
  const heroPhotos = await fetchHeroPhotosForHomeCached({ limit: 12 });

  // 获取精选集合数据（带 5 分钟缓存）
  const featuredCollections = await fetchCollectionsCached({
    status: 'published',
    limit: 3,
    orderBy: 'updatedAtDesc',
  });

  return (
    <FrontHome
      heroPhotos={heroPhotos}
      featuredCollections={featuredCollections}
    />
  );
}
