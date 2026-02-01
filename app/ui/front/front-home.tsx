'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { featuredCollections } from '@/app/lib/front-data';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { SectionHeader } from '@/app/ui/front/section-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HeroTone = 'light' | 'dark';

const HERO_IMAGES = {
  desktop: [
    '/hero-desktop.png',
    '/hero1.jpg',
    '/hero2.jpg',
    '/hero3.jpg',
    '/hero4.jpg',
  ],
  mobile: [
    '/hero-mobile.png',
    '/hero1.jpg',
    '/hero2.jpg',
    '/hero3.jpg',
    '/hero4.jpg',
  ],
};

const resolveHeroTone = (
  image: HTMLImageElement,
  heroRect: DOMRect,
  textRect: DOMRect,
): HeroTone => {
  const canvas = document.createElement('canvas');
  const scaleFactor = Math.min(1, 1200 / Math.max(1, heroRect.width));
  const canvasWidth = Math.max(1, Math.round(heroRect.width * scaleFactor));
  const canvasHeight = Math.max(1, Math.round(heroRect.height * scaleFactor));
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'light';

  const coverScale = Math.max(
    canvasWidth / image.naturalWidth,
    canvasHeight / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * coverScale;
  const drawHeight = image.naturalHeight * coverScale;
  const offsetX = (canvasWidth - drawWidth) / 2;
  const offsetY = (canvasHeight - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const padding = 12 * scaleFactor;
  const regionX = Math.max(
    0,
    Math.round((textRect.left - heroRect.left) * scaleFactor - padding),
  );
  const regionY = Math.max(
    0,
    Math.round((textRect.top - heroRect.top) * scaleFactor - padding),
  );
  const regionWidth = Math.min(
    canvasWidth - regionX,
    Math.round(textRect.width * scaleFactor + padding * 2),
  );
  const regionHeight = Math.min(
    canvasHeight - regionY,
    Math.round(textRect.height * scaleFactor + padding * 2),
  );
  if (regionWidth <= 0 || regionHeight <= 0) return 'light';

  const step = Math.max(
    1,
    Math.floor(Math.min(regionWidth, regionHeight) / 30),
  );
  const sampleLuminance = (data: Uint8ClampedArray) => {
    let total = 0;
    let count = 0;
    for (let y = 0; y < regionHeight; y += step) {
      for (let x = 0; x < regionWidth; x += step) {
        const index = (y * regionWidth + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        total += luminance;
        count += 1;
      }
    }
    return total / Math.max(1, count);
  };

  const originalData = ctx.getImageData(
    regionX,
    regionY,
    regionWidth,
    regionHeight,
  ).data;
  const originalAverage = sampleLuminance(originalData);
  if (originalAverage > 210) return 'dark';

  const gradientToTop = ctx.createLinearGradient(0, canvasHeight, 0, 0);
  gradientToTop.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  gradientToTop.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
  gradientToTop.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
  ctx.fillStyle = gradientToTop;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const gradientToBottom = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradientToBottom.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  gradientToBottom.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  gradientToBottom.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradientToBottom;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const overlayData = ctx.getImageData(
    regionX,
    regionY,
    regionWidth,
    regionHeight,
  ).data;
  const overlayAverage = sampleLuminance(overlayData);
  const weightedAverage = originalAverage * 0.65 + overlayAverage * 0.35;
  return weightedAverage < 155 ? 'light' : 'dark';
};

export function FrontHome() {
  const t = useTranslations('front.home');
  const tData = useTranslations();
  const featured = featuredCollections.slice(0, 3);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroTextRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [heroTone, setHeroTone] = useState<HeroTone>('light');
  const [activeIndex, setActiveIndex] = useState(0);
  const heroImages = useMemo(() => {
    if (viewportSize.width > 0 && viewportSize.width < 640) {
      return HERO_IMAGES.mobile;
    }
    return HERO_IMAGES.desktop;
  }, [viewportSize.width]);
  const safeIndex = heroImages.length ? activeIndex % heroImages.length : 0;
  const heroImageSrc = heroImages[safeIndex] ?? heroImages[0];
  
  const scrollPrev = () => setActiveIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  const scrollNext = () => setActiveIndex((prev) => (prev + 1) % heroImages.length);
  const canScrollPrev = heroImages.length > 1;
  const canScrollNext = heroImages.length > 1;

  const isHeroLight = heroTone === 'light';
  const heroTitleClass = isHeroLight ? 'text-white/85' : 'text-zinc-900/80';
  const heroLabelClass = isHeroLight ? 'text-white/60' : 'text-zinc-700/80';
  const heroBodyClass = isHeroLight ? 'text-white/60' : 'text-zinc-800/85';
  const heroPrimaryButtonClass = cn(
    'h-11 rounded-full px-8 text-sm font-medium backdrop-blur-md transition-all hover:scale-105',
    isHeroLight
      ? 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
      : 'border border-black/10 bg-black/5 text-zinc-900 hover:bg-black/10'
  );
  const heroSecondaryButtonClass = cn(
    'h-11 rounded-full px-8 text-sm font-medium backdrop-blur-md transition-all hover:scale-105',
    isHeroLight
      ? 'border border-white/20 text-white hover:bg-white/10'
      : 'border border-black/10 text-zinc-900 hover:bg-black/5'
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateSize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!heroRef.current || !heroTextRef.current) return;
    if (!heroImageSrc) return;
    let cancelled = false;
    const image = new Image();
    image.src = heroImageSrc;
    image.onload = () => {
      if (cancelled) return;
      const heroRect = heroRef.current?.getBoundingClientRect();
      const textRect = heroTextRef.current?.getBoundingClientRect();
      if (!heroRect || !textRect) return;
      const nextTone = resolveHeroTone(image, heroRect, textRect);
      setHeroTone(nextTone);
    };
    return () => {
      cancelled = true;
    };
  }, [heroImageSrc, viewportSize]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroImages.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className='space-y-20 lg:space-y-24'>
      <section
        ref={heroRef}
        className='front-fade-up group relative -mt-24 min-h-[calc(100svh+6rem)] w-screen -ml-[calc(50vw-50%)] overflow-hidden bg-black'
      >
        {heroImages.map((src, index) => (
          <div
            key={src}
            className={cn(
              'absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] md:bg-fixed',
              index === safeIndex ? 'opacity-100' : 'opacity-0',
            )}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className='absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5' />
        <div className='absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-transparent' />
        <div className='pointer-events-none absolute inset-0 z-10'>
          <div className='group/edge-left pointer-events-auto absolute inset-y-0 left-0 flex w-[20%] min-w-[72px] items-center justify-start px-4'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className='h-12 w-12 rounded-full border border-white/30 bg-white/10 text-white opacity-0 backdrop-blur transition hover:bg-white/20 hover:text-white disabled:opacity-30 group-hover/edge-left:opacity-100'
              aria-label={t('carousel.prev')}
            >
              <ChevronLeft className='h-6 w-6' />
            </Button>
          </div>
          <div className='group/edge-right pointer-events-auto absolute inset-y-0 right-0 flex w-[20%] min-w-[72px] items-center justify-end px-4'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={scrollNext}
              disabled={!canScrollNext}
              className='h-12 w-12 rounded-full border border-white/30 bg-white/10 text-white opacity-0 backdrop-blur transition hover:bg-white/20 hover:text-white disabled:opacity-30 group-hover/edge-right:opacity-100'
              aria-label={t('carousel.next')}
            >
              <ChevronRight className='h-6 w-6' />
            </Button>
          </div>
        </div>
        <div
          ref={heroTextRef}
          className='relative z-20 flex h-full flex-col justify-end gap-6 px-8 pb-12 pt-28 md:px-16 md:pb-16'
        >
          <p className={cn('text-xs uppercase tracking-[0.4em]', heroLabelClass)}>
            {t('hero.eyebrow')}
          </p>
          <h1
            className={cn(
              'font-serif',
              'text-4xl font-semibold md:text-6xl lg:text-7xl',
              heroTitleClass,
            )}
          >
            {t('hero.title')}
          </h1>
          <p className={cn('max-w-xl text-sm md:text-base', heroBodyClass)}>
            {t('hero.description')}
          </p>
          <div className='flex flex-wrap gap-3'>
            <Button
              asChild
              variant='ghost'
              className={heroPrimaryButtonClass}
            >
              <Link href='/gallery'>{t('hero.primaryCta')}</Link>
            </Button>
            <Button
              asChild
              variant='ghost'
              className={heroSecondaryButtonClass}
            >
              <Link href='/collections'>{t('hero.secondaryCta')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className='front-fade-up space-y-8'>
        <SectionHeader
          title={t('sections.featuredCollections.title')}
          description={t('sections.featuredCollections.description')}
          actionLabel={t('sections.featuredCollections.action')}
          actionHref='/collections'
        />
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {featured.map((collection) => (
            <Link
              key={collection.id}
              href='/collections'
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
                    <span className='text-[11px] uppercase tracking-[0.3em] text-zinc-600/80 dark:text-white/60'>
                      {collection.type === 'photo'
                        ? t('sections.featuredCollections.badgePhoto')
                        : collection.type === 'video'
                          ? t('sections.featuredCollections.badgeVideo')
                          : t('sections.featuredCollections.badgeMixed')}
                    </span>
                    <h3 className='text-2xl font-semibold text-zinc-900 dark:text-white'>
                      {tData(collection.title)}
                    </h3>
                    <p className='text-sm text-zinc-600/80 dark:text-white/60'>
                      {tData(collection.description)}
                    </p>
                  </div>
                  <div className='relative z-10 flex items-center justify-between text-xs text-zinc-600/80 dark:text-white/60'>
                    <span>{t('itemCount', { count: collection.count })}</span>
                    <span className='text-indigo-600 dark:text-indigo-400'>
                      {(collection.tags ?? []).map(tag => tData(tag)).join(' / ')}
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
