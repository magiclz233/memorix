import Link from 'next/link';
import { featuredCollections } from '@/app/lib/front-data';
import { spaceGrotesk } from '@/app/ui/fonts';
import { SpotlightCard } from '@/app/ui/front/spotlight-card';
import { SectionHeader } from '@/app/ui/front/section-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FrontHome() {
  const featured = featuredCollections.slice(0, 3);

  return (
    <div className='space-y-20 lg:space-y-24'>
      <section className='front-fade-up relative h-[85vh] overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white/60 shadow-lg shadow-zinc-200/50 dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-black/50'>
        <div className="absolute inset-0 bg-[url('/hero-mobile.png')] bg-cover bg-center sm:bg-[url('/hero-desktop.png')] md:bg-fixed" />
        <div className='absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-transparent dark:from-black/90 dark:via-black/40' />
        <div className='relative z-10 flex h-full flex-col justify-end gap-6 p-8 md:p-12'>
          <p className='text-xs uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400'>
            Lumina / Vision
          </p>
          <h1
            className={cn(
              spaceGrotesk.className,
              'text-4xl font-semibold text-zinc-900 dark:mix-blend-overlay dark:text-white md:text-6xl lg:text-7xl'
            )}
          >
            LUMINA VISION
          </h1>
          <p className='max-w-xl text-sm text-zinc-500 dark:text-zinc-400 md:text-base'>
            将沉浸式光影与极简排版融合成统一视觉语言，让每一帧影像都成为可收藏的光之记忆。
          </p>
          <div className='flex flex-wrap gap-3'>
            <Button
              asChild
              className='rounded-full bg-zinc-900 text-white hover:bg-zinc-900/90 dark:bg-white dark:text-zinc-900'
            >
              <Link href='/gallery'>进入画廊</Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='rounded-full border-zinc-200 bg-white/80 text-zinc-700 hover:bg-white dark:border-white/10 dark:bg-black/60 dark:text-white'
            >
              <Link href='/photo-collections'>浏览图集</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className='front-fade-up space-y-8'>
        <SectionHeader
          title='精选图集'
          description='三组代表性的系列，展示光影与节奏的两种叙事方式。'
          actionLabel='查看全部'
          actionHref='/gallery'
        />
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {featured.map((collection) => (
            <Link
              key={collection.id}
              href={
                collection.type === 'photo'
                  ? '/photo-collections'
                  : '/video-collections'
              }
              className='block'
            >
              <SpotlightCard className='h-full min-h-[280px]'>
                <div className='relative flex h-full flex-col justify-between gap-6 p-6'>
                  <div
                    className={cn(
                      'absolute inset-0 bg-gradient-to-br opacity-30 dark:opacity-70',
                      collection.cover
                    )}
                  />
                  <div className='relative z-10 space-y-4'>
                    <span className='text-[11px] uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400'>
                      {collection.type === 'photo' ? '精选图集' : '精选视频集'}
                    </span>
                    <h3 className='text-2xl font-semibold text-zinc-900 dark:text-white'>
                      {collection.title}
                    </h3>
                    <p className='text-sm text-zinc-500 dark:text-zinc-400'>
                      {collection.description}
                    </p>
                  </div>
                  <div className='relative z-10 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400'>
                    <span>{collection.count} 项内容</span>
                    <span className='text-indigo-600 dark:text-indigo-400'>
                      {(collection.tags ?? []).join(' / ')}
                    </span>
                  </div>
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
