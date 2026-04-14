'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '@/app/lib/gallery';

type PendingAction =
  | { type: 'close' }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'select'; id: string }
  | { type: 'cancel-edit' };

type PhotoFilmstripProps = {
  show: boolean;
  items: GalleryItem[];
  currentItemId: string;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isDraggingFilmstrip: boolean;
  filmstripRef: React.MutableRefObject<HTMLDivElement | null>;
  thumbRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onRequestAction: (action: PendingAction) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export function PhotoFilmstrip({
  show,
  items,
  currentItemId,
  canScrollLeft,
  canScrollRight,
  isDraggingFilmstrip,
  filmstripRef,
  thumbRefs,
  onRequestAction,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PhotoFilmstripProps) {
  if (!show) return null;

  return (
    <div className='relative h-24 px-6 md:px-8'>
      {canScrollLeft ? (
        <div className='pointer-events-none absolute left-0 top-0 z-20 h-full w-10 bg-gradient-to-r from-zinc-50 to-transparent dark:from-zinc-950' />
      ) : null}
      {canScrollRight ? (
        <div className='pointer-events-none absolute right-0 top-0 z-20 h-full w-10 bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-950' />
      ) : null}

      <div
        ref={filmstripRef}
        className={cn(
          'h-full flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1',
          isDraggingFilmstrip ? 'cursor-grabbing select-none' : 'cursor-grab',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {items.map((thumb) => {
          const isActive = thumb.id === currentItemId;
          return (
            <button
              key={thumb.id}
              type='button'
              ref={(node) => {
                thumbRefs.current[String(thumb.id)] = node;
              }}
              onClick={() => onRequestAction({ type: 'select', id: String(thumb.id) })}
              className={cn(
                'flex-shrink-0 w-14 h-14 rounded-sm overflow-hidden transition-opacity',
                isActive
                  ? 'border-2 border-primary dark:border-white shadow-lg ring-2 ring-white/20'
                  : 'opacity-50 hover:opacity-100',
              )}
            >
              <Image
                src={thumb.src}
                alt={thumb.title}
                width={56}
                height={56}
                quality={70}
                unoptimized={thumb.src.startsWith('/api/')}
                className='w-full h-full object-cover'
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}