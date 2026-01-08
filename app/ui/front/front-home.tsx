import Link from 'next/link';
import { featuredCollections, galleryMedia, photoCollections, videoCollections } from '@/app/lib/front-data';
import { spaceGrotesk } from '@/app/ui/fonts';
import { CollectionCard } from '@/app/ui/front/collection-card';
import { HeroCarousel } from '@/app/ui/front/hero-carousel';
import { MediaCard } from '@/app/ui/front/media-card';
import { SectionHeader } from '@/app/ui/front/section-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FrontHome() {
  const featuredVideos = videoCollections.slice(0, 3);
  const featuredPhotos = photoCollections.slice(0, 3);
  const galleryHighlights = galleryMedia.slice(0, 6);

  return (
    <div className='space-y-20'>
      <section className='front-fade-up grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
        <div className='space-y-6'>
          <p className='text-xs uppercase tracking-[0.4em] text-muted-foreground'>
            Nebula Studio / Front
          </p>
          <h1
            className={cn(
              spaceGrotesk.className,
              'text-4xl font-semibold leading-tight text-foreground md:text-5xl'
            )}
          >
            宇宙质感的影像档案，将光线转译成故事。
          </h1>
          <p className='max-w-xl text-base text-muted-foreground'>
            汇集精选图集与视频作品集，以冷调玻璃质感构建统一视觉语言，让每个场景都成为可收藏的记忆片段。
          </p>
          <div className='flex flex-wrap gap-3'>
            <Button
              asChild
              className='rounded-full bg-foreground text-background hover:bg-foreground/90'
            >
              <Link href='/gallery'>进入画廊</Link>
            </Button>
            <Button asChild variant='secondary' className='rounded-full'>
              <Link href='/video-collections'>浏览视频集</Link>
            </Button>
          </div>
          <div className='flex flex-wrap gap-8 text-sm text-muted-foreground'>
            <div>
              <p className='text-xl font-semibold text-foreground'>32</p>
              <p>精选系列</p>
            </div>
            <div>
              <p className='text-xl font-semibold text-foreground'>120+</p>
              <p>影像片段</p>
            </div>
            <div>
              <p className='text-xl font-semibold text-foreground'>5</p>
              <p>主题航线</p>
            </div>
          </div>
        </div>
        <HeroCarousel items={featuredCollections} />
      </section>

      <section className='front-fade-up space-y-8'>
        <SectionHeader
          title='精选视频作品集'
          description='节奏剪辑与光影叙事并行，聚焦动态影像的情绪场域。'
          actionLabel='查看全部'
          actionHref='/video-collections'
        />
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {featuredVideos.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      <section className='front-fade-up space-y-8'>
        <SectionHeader
          title='精选照片作品集'
          description='以长曝光与叙事构图为主线，沉浸在静态影像的细节里。'
          actionLabel='查看全部'
          actionHref='/photo-collections'
        />
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {featuredPhotos.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      <section className='front-fade-up space-y-8'>
        <SectionHeader
          title='画廊亮点'
          description='选取最近更新的画面，预览完整画廊的视觉节奏。'
          actionLabel='查看全部'
          actionHref='/gallery'
        />
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {galleryHighlights.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
