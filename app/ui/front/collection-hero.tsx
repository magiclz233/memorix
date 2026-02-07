'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

type CollectionHeroProps = {
  title: string;
  description?: string | null;
  badgeLabel: string;
  countLabel: string;
  author?: string | null;
  authorLabel: string;
  updatedAtLabel: string;
  updatedAtValue: string;
  coverUrls: string[];
  backLabel: string;
  backHref: string;
  actions: {
    like: string;
    favorite: string;
  };
};

export function CollectionHero({
  title,
  description,
  badgeLabel,
  countLabel,
  author,
  authorLabel,
  updatedAtLabel,
  updatedAtValue,
  coverUrls,
  backLabel,
  backHref,
  actions,
}: CollectionHeroProps) {
  const images = useMemo(
    () => coverUrls.filter((url) => url && url.length > 0),
    [coverUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const total = images.length;
  const safeIndex = total > 0 ? activeIndex % total : 0;
  const canNavigate = total > 1;

  const scrollPrev = () => {
    if (!canNavigate) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const scrollNext = () => {
    if (!canNavigate) return;
    setActiveIndex((prev) => (prev + 1) % total);
  };

  return (
    <section className="relative mx-auto -mt-16 h-[78vh] min-h-[560px] max-h-[900px] w-[88vw] max-w-none overflow-hidden rounded-[32px] bg-zinc-100 shadow-2xl shadow-black/10">
      <div className="absolute left-6 top-6 z-20">
        <Button
          asChild
          variant="ghost"
          className="h-10 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white"
        >
          <Link href={backHref} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
      {images.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className={cn(
            'absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms]',
            index === safeIndex ? 'opacity-100' : 'opacity-0',
          )}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent" />
      {canNavigate ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-6 md:px-10">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={scrollPrev}
            className="pointer-events-auto h-12 w-12 rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
            aria-label="prev"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={scrollNext}
            className="pointer-events-auto h-12 w-12 rounded-full border border-white/10 bg-white/5 text-white/60 backdrop-blur transition hover:bg-white/15 hover:text-white"
            aria-label="next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
      {canNavigate ? (
        <div className="absolute bottom-10 right-10 flex gap-2">
          {images.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'h-0.5 transition-all',
                index === safeIndex ? 'w-8 bg-white' : 'w-4 bg-white/30',
              )}
              aria-label={`go-${index}`}
            />
          ))}
        </div>
      ) : null}
      <div className="absolute inset-0 flex items-end px-6 pb-10 pt-24 md:px-12 md:pb-14">
        <TooltipProvider>
          <div className="absolute right-6 top-6 z-20 flex items-center gap-3 md:right-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white hover:text-black">
                  <ThumbsUp className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{actions.like}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-12 w-12 rounded-full border-white/40 bg-white/10 text-white hover:bg-white hover:text-black"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{actions.favorite}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        <div className="mx-auto w-full max-w-[1600px] space-y-8 text-white">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
              {badgeLabel}
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
              {countLabel}
            </span>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-sm font-light leading-relaxed text-white/70 md:text-lg">
                  {description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-6 text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                {author ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">{authorLabel}</span>
                    <span className="text-white">{author}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <span className="text-white/40">{updatedAtLabel}</span>
                  <span className="text-white">{updatedAtValue}</span>
                </div>
              </div>
            </div>
            <div />
          </div>
        </div>
      </div>
    </section>
  );
}
