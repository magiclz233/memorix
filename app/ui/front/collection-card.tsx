'use client';

import Image from 'next/image';
import type { Collection } from '@/app/lib/definitions';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

type CollectionCardProps = {
  collection: Collection;
  labels: {
    photo: string;
    video: string;
    mixed: string;
    itemCount: string;
  };
};

const getPhotoTransform = (index: number, isHover: boolean) => {
  if (index === 0) {
    return {
      x: 0,
      y: 0,
      rotate: 0,
    };
  } else if (index === 1) {
    return isHover
      ? { x: -20, y: -16, rotate: -8 }
      : { x: -6, y: -4, rotate: -4 };
  } else {
    return isHover ? { x: 28, y: -20, rotate: 10 } : { x: 8, y: -6, rotate: 5 };
  }
};

export function CollectionCard({ collection, labels }: CollectionCardProps) {
  const [isHover, setIsHover] = useState(false);
  const validCovers = (collection.covers || []).filter((c) => isCoverUrl(c));
  const displayCovers =
    validCovers.length > 0
      ? validCovers
      : isCoverUrl(collection.cover)
        ? [collection.cover]
        : [];

  const TypeIcon = ImageIcon; 

  return (
    <div
      className="group relative block mt-2"
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
    >
      {/* Stacked Photos Card */}
      <div className="relative mb-4 aspect-video w-full">
        {/* Photo Stack (3 layers) */}
        {displayCovers.length > 0 ? (
          displayCovers.slice(0, 3).map((url, index) => (
            <motion.div
              key={`${url}-${index}`}
              className="absolute inset-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-800"
              initial={{
                x: getPhotoTransform(index, false).x,
                y: getPhotoTransform(index, false).y,
                rotate: getPhotoTransform(index, false).rotate,
                opacity: 1 - index * 0.12,
              }}
              animate={{
                x: getPhotoTransform(index, isHover).x,
                y: getPhotoTransform(index, isHover).y,
                rotate: getPhotoTransform(index, isHover).rotate,
                opacity: isHover ? 1 : 1 - index * 0.12,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
              style={{
                zIndex: 3 - index,
              }}
            >
              <Image
                src={url}
                alt={collection.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover"
              />
              {/* Overlay for stacked cards */}
              {index > 0 && (
                <motion.div
                  className="absolute inset-0 bg-black/10 dark:bg-black/30"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: isHover ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </motion.div>
          ))
        ) : (
          /* Empty state */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white shadow-lg transition-shadow group-hover:shadow-xl dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900 dark:group-hover:shadow-black/50">
            <TypeIcon className="h-10 w-10 text-zinc-400 dark:text-zinc-500" />
          </div>
        )}
      </div>

      {/* Album Info */}
      <div className="px-2">
        <div className="flex flex-col gap-0">
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                'truncate text-lg font-semibold text-zinc-800 transition-colors dark:text-zinc-200',
                isHover && 'text-indigo-600 dark:text-indigo-400'
              )}
            >
              {collection.title}
            </h2>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
             <span>{labels.itemCount}</span>
             <span className='rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] uppercase tracking-wider dark:border-zinc-700'>
               {collection.type === 'mixed' ? labels.mixed : collection.type === 'video' ? labels.video : labels.photo}
             </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const isCoverUrl = (cover?: string | null) => {
  if (!cover) return false;
  const value = cover.trim();
  if (!value) return false;
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('data:')
  );
};
