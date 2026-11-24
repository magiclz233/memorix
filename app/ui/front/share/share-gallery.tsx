'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { GalleryItem } from '@/app/lib/gallery';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  items: GalleryItem[];
  allowDownload: boolean;
  shareToken: string;
};

/**
 * 分享相册的只读画廊。
 * 与前台主画廊不同：这里不加载 PhotoDetailModal（它含 admin 编辑 hook 与 favorites），
 * 只提供轻量灯箱 + 可选下载，避免把管理端能力暴露给外部访客。
 */
export function ShareGallery({ items, allowDownload, shareToken }: Props) {
  const t = useTranslations('front.share.page');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selectedIndex = useMemo(
    () => items.findIndex((item) => item.id === selectedId),
    [items, selectedId],
  );
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const go = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const next =
        selectedIndex < 0
          ? 0
          : (selectedIndex + delta + items.length) % items.length;
      setSelectedId(items[next]?.id ?? null);
    },
    [items, selectedIndex],
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, go]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-10 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300">
        {t('unavailableDescription')}
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 md:columns-3 xl:columns-4 2xl:columns-5">
        {items.map((item) => {
          const ratio =
            item.width && item.height && item.height > 0
              ? item.width / item.height
              : 4 / 3;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className="group mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-100 text-left dark:border-zinc-800/70 dark:bg-zinc-900"
              aria-label={item.title}
            >
              <div className="relative w-full" style={{ aspectRatio: ratio }}>
                <BlurImage
                  src={item.src}
                  alt={item.title}
                  blurHash={item.blurHash}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
                {item.type === 'video' ? (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    ▶
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {mounted && selected
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
              onClick={() => setSelectedId(null)}
              role="dialog"
              aria-modal="true"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 z-10 text-white hover:bg-white/10"
                aria-label="Close"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              {items.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 z-10 text-white hover:bg-white/10 md:left-6"
                    aria-label="Previous"
                    onClick={(e) => {
                      e.stopPropagation();
                      go(-1);
                    }}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 z-10 text-white hover:bg-white/10 md:right-6"
                    aria-label="Next"
                    onClick={(e) => {
                      e.stopPropagation();
                      go(1);
                    }}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              ) : null}

              <div
                className="relative flex h-full w-full items-center justify-center p-4 md:p-12"
                onClick={(e) => e.stopPropagation()}
              >
                {selected.type === 'video' && selected.videoUrl ? (
                  <video
                    src={selected.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                ) : selected.isAnimated && selected.animatedUrl ? (
                  <img
                    src={selected.animatedUrl}
                    alt={selected.title}
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <div className="relative max-h-full max-w-full">
                    <Image
                      src={selected.fullSrc || selected.src}
                      alt={selected.title}
                      width={selected.width || 1600}
                      height={selected.height || 1067}
                      unoptimized
                      className={cn('max-h-[88vh] w-auto rounded-lg object-contain')}
                    />
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 py-5 text-white">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selected.title}</p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    {selectedIndex + 1} / {items.length}
                    <span className="ml-3 hidden md:inline">{t('lightboxHint')}</span>
                  </p>
                </div>
                {allowDownload ? (
                  <a
                    href={`/api/download?id=${selected.id}&share=${encodeURIComponent(shareToken)}`}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/30 px-4 text-xs transition hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                    {t('download')}
                  </a>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
