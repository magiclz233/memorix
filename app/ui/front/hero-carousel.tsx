'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Collection } from '@/app/lib/definitions';
import { Button } from '@/components/ui/button';
import { spaceGrotesk } from '@/app/ui/fonts';
import { cn } from '@/lib/utils';

type HeroCarouselProps = {
  items: Collection[];
};

export function HeroCarousel({ items }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className='relative h-[420px] overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/40 backdrop-blur dark:bg-white/5'>
      {items.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            'absolute inset-0 flex flex-col justify-between p-8 transition-opacity duration-700',
            index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br opacity-80',
              item.cover
            )}
          />
          <div className='relative z-10 space-y-4 text-white'>
            <span className='inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em]'>
              {item.type === 'photo' ? '精选图集' : '精选视频集'}
            </span>
            <h3 className={cn(spaceGrotesk.className, 'text-3xl font-semibold')}>
              {item.title}
            </h3>
            <p className='max-w-sm text-sm text-white/75'>{item.description}</p>
          </div>
          <div className='relative z-10 flex flex-wrap items-center justify-between gap-4'>
            <div className='text-sm text-white/70'>
              {item.count} 项内容 · {item.tags?.join(' / ')}
            </div>
            <Button
              asChild
              className='rounded-full bg-white text-slate-950 hover:bg-white/90'
            >
              <Link
                href={
                  item.type === 'photo' ? '/photo-collections' : '/video-collections'
                }
              >
                查看系列
              </Link>
            </Button>
          </div>
        </div>
      ))}
      <div className='absolute bottom-6 left-6 z-20 flex gap-2'>
        {items.map((item, index) => (
          <button
            key={item.id}
            type='button'
            onClick={() => setActiveIndex(index)}
            className={cn(
              'h-1.5 w-8 rounded-full transition',
              index === activeIndex ? 'bg-white' : 'bg-white/40'
            )}
            aria-label={`切换到${item.title}`}
          />
        ))}
      </div>
      <div className='absolute bottom-6 right-6 z-20 flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20'
          onClick={() =>
            setActiveIndex((prev) => (prev - 1 + items.length) % items.length)
          }
          aria-label='上一张'
        >
          ‹
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20'
          onClick={() => setActiveIndex((prev) => (prev + 1) % items.length)}
          aria-label='下一张'
        >
          ›
        </Button>
      </div>
    </div>
  );
}
