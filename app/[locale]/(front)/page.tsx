import { FrontHome } from '@/app/ui/front/front-home';
import { fetchHeroPhotosForHome, fetchCollections } from '@/app/lib/data';

export default async function Page() {
  // 获取 Hero 照片数据
  const heroPhotos = await fetchHeroPhotosForHome({ limit: 12 });
  
  // 获取精选集合数据
  const featuredCollections = await fetchCollections({
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
