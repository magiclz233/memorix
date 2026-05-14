'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Play, Sparkles } from 'lucide-react';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '@/app/lib/gallery';
import { InlineEditableText } from './inline-editable-text';

type PhotoMediaCanvasProps = {
  item: GalleryItem;
  direction: number;
  viewMode: 'fit' | 'frame';
  swipeHandlers: ReturnType<typeof import('react-swipeable').useSwipeable>;
  isAnimated: boolean;
  isLive: boolean;
  canPlayVideo: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  isLivePreviewing: boolean;
  videoSrc: string;
  liveLabel: string;
  isEditing: boolean;
  isAdmin: boolean;
  footTitle: string;
  footAuthor: string;
  footDate: string;
  setFootTitle: (value: string) => void;
  setFootAuthor: (value: string) => void;
  setFootDate: (value: string) => void;
  handleInlineSave: () => void;
  startVideo: () => void;
  setIsPlaying: (value: boolean) => void;
  setIsBuffering: (value: boolean) => void;
  setIsLivePreviewing: (value: boolean) => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  t: (key: string) => string;
};

export function PhotoMediaCanvas({
  item,
  direction,
  viewMode,
  swipeHandlers,
  isAnimated,
  isLive,
  canPlayVideo,
  isPlaying,
  isBuffering,
  isLivePreviewing,
  videoSrc,
  liveLabel,
  isEditing,
  isAdmin,
  footTitle,
  footAuthor,
  footDate,
  setFootTitle,
  setFootAuthor,
  setFootDate,
  handleInlineSave,
  startVideo,
  setIsPlaying,
  setIsBuffering,
  setIsLivePreviewing,
  videoRef,
  t,
}: PhotoMediaCanvasProps) {
  const isFrame = viewMode === 'frame';

  return (
    <div
      {...swipeHandlers}
      className={cn(
        'relative w-full h-full flex items-center justify-center overflow-hidden transition-colors duration-500',
        isFrame && 'bg-[#f0f0f0] dark:bg-zinc-950',
      )}
    >
      <AnimatePresence initial={false} custom={direction} mode='wait'>
        <motion.div
          key={item.id}
          custom={direction}
          variants={{
            enter: (dir: number) => ({
              x: dir >= 0 ? 80 : -80,
              opacity: 0,
              scale: 0.98,
            }),
            center: {
              x: 0,
              opacity: 1,
              scale: 1,
              transition: {
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              },
            },
            exit: (dir: number) => ({
              x: dir >= 0 ? -80 : 80,
              opacity: 0,
              scale: 0.98,
              transition: { duration: 0.2 },
            }),
          }}
          initial='enter'
          animate='center'
          exit='exit'
          className={cn(
            'absolute inset-0 flex items-center justify-center w-full h-full',
            isFrame ? 'p-4 md:p-8' : 'p-0',
          )}
        >
          {(() => {
            const hasDimensions = !!(item.width && item.height);
            const safeWidth = item.width || 1920;
            const safeHeight = item.height || 1080;
            const frameMode = viewMode === 'frame';
            const useShrinkWrap = !frameMode && hasDimensions;

            const containerClass = useShrinkWrap
              ? 'relative flex max-w-full max-h-full shadow-2xl rounded-sm overflow-hidden transition-all duration-300'
              : frameMode
                ? 'relative max-w-full max-h-full flex items-center justify-center'
                : 'relative w-full h-full overflow-hidden bg-zinc-950';

            return (
              <div className={containerClass}>
                {frameMode ? (
                  <div className='bg-white dark:bg-[#1a1a1a] shadow-[0_10px_50px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center pt-[4%] pr-[6%] pb-[8%] pl-[6%] transition-all duration-700 min-w-[300px]'>
                    <div className='relative shadow-[0_4px_20px_-2px_rgba(0,0,0,0.15)]'>
                      {isAnimated ? (
                        <Image
                          src={item.animatedUrl ?? ''}
                          alt={isEditing ? footTitle || item.title : item.title}
                          width={safeWidth}
                          height={safeHeight}
                          unoptimized
                          className='max-h-[60vh] md:max-h-[70vh] w-auto object-contain block'
                          sizes='100vw'
                          priority
                        />
                      ) : (
                        <BlurImage
                          src={item.src}
                          alt={isEditing ? footTitle || item.title : item.title}
                          blurHash={item.blurHash}
                          width={safeWidth}
                          height={safeHeight}
                          quality={90}
                          className='max-h-[60vh] md:max-h-[70vh] w-auto object-contain block'
                          sizes='100vw'
                          priority
                        />
                      )}

                      {canPlayVideo && isPlaying && (
                        <video
                          ref={videoRef}
                          src={videoSrc}
                          autoPlay
                          controls
                          className='absolute inset-0 w-full h-full object-contain'
                          onLoadStart={() => setIsBuffering(true)}
                          onWaiting={() => setIsBuffering(true)}
                          onCanPlay={() => setIsBuffering(false)}
                          onPlaying={() => setIsBuffering(false)}
                          onError={() => {
                            setIsPlaying(false);
                            setIsBuffering(false);
                          }}
                        />
                      )}

                      {isLive && isLivePreviewing && (
                        <video
                          ref={videoRef}
                          src={videoSrc}
                          autoPlay
                          muted
                          playsInline
                          className='absolute z-10 inset-0 w-full h-full object-contain'
                          onLoadStart={() => setIsBuffering(true)}
                          onWaiting={() => setIsBuffering(true)}
                          onCanPlay={() => setIsBuffering(false)}
                          onPlaying={() => setIsBuffering(false)}
                          onEnded={() => setIsLivePreviewing(false)}
                          onError={() => {
                            setIsLivePreviewing(false);
                            setIsBuffering(false);
                          }}
                        />
                      )}
                      {isLive ? (
                        <button
                          type='button'
                          aria-label={liveLabel}
                          onMouseEnter={() => setIsLivePreviewing(true)}
                          onMouseLeave={() => setIsLivePreviewing(false)}
                          onFocus={() => setIsLivePreviewing(true)}
                          onBlur={() => setIsLivePreviewing(false)}
                          onClick={(event) => event.stopPropagation()}
                          className='absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60'
                        >
                          <Sparkles className='h-4 w-4' />
                        </button>
                      ) : isAnimated ? (
                        <div className='absolute right-3 top-3 z-10 flex h-5 items-center justify-center rounded-full bg-black/50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md'>
                          {t('badges.animated')}
                        </div>
                      ) : null}
                    </div>

                    <div className='mt-8 md:mt-12 text-center w-full'>
                      <div className='w-full text-center'>
                        <InlineEditableText
                          value={footTitle}
                          onChange={setFootTitle}
                          onSave={handleInlineSave}
                          editable={isAdmin}
                          className='font-[family-name:var(--font-serif-sc)] text-sm md:text-base font-light tracking-[0.2em] text-slate-800 dark:text-slate-300 break-words'
                          inputClassName='text-sm md:text-base font-light tracking-[0.2em] text-slate-800 dark:text-slate-300 w-full max-w-[300px]'
                          placeholder={t('modal.untitled')}
                        />
                      </div>

                      <div className='flex items-center justify-center gap-2 mt-2 opacity-60 hover:opacity-100 transition-opacity duration-300'>
                        <span className='font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300'>
                          {t('modal.authorPrefix')}
                        </span>
                        <div className='min-w-[72px] text-center'>
                          <InlineEditableText
                            value={footAuthor}
                            onChange={setFootAuthor}
                            onSave={handleInlineSave}
                            editable={isAdmin}
                            className='font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 block w-full'
                            inputClassName='text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 w-24'
                            placeholder={t('modal.authorFallback')}
                          />
                        </div>
                        <span className='font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300'>
                          ·
                        </span>
                        <div className='min-w-[92px] text-center'>
                          <InlineEditableText
                            value={footDate}
                            onChange={setFootDate}
                            onSave={handleInlineSave}
                            editable={isAdmin}
                            type='date'
                            className='font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 block w-full'
                            inputClassName='text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 w-32'
                            placeholder={t('modal.dateFallback')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'relative flex',
                      useShrinkWrap ? 'w-auto h-auto' : 'w-full h-full',
                    )}
                  >
                    {isAnimated ? (
                      <Image
                        src={item.animatedUrl ?? ''}
                        alt={item.title}
                        unoptimized
                        fill={!useShrinkWrap}
                        width={useShrinkWrap ? (item.width || undefined) : undefined}
                        height={useShrinkWrap ? (item.height || undefined) : undefined}
                        className={cn(
                          useShrinkWrap
                            ? 'w-auto h-auto max-w-full max-h-[75vh] object-contain block'
                            : 'object-contain',
                        )}
                        sizes='100vw'
                        priority
                      />
                    ) : (
                      <BlurImage
                        src={item.src}
                        alt={item.title}
                        blurHash={item.blurHash}
                        fill={!useShrinkWrap}
                        width={useShrinkWrap ? (item.width || undefined) : undefined}
                        height={useShrinkWrap ? (item.height || undefined) : undefined}
                        className={cn(
                          useShrinkWrap
                            ? 'w-auto h-auto max-w-full max-h-[75vh] object-contain block'
                            : 'object-contain',
                        )}
                        sizes='100vw'
                        priority
                      />
                    )}
                    {canPlayVideo && isPlaying && (
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        autoPlay
                        controls
                        className='absolute inset-0 w-full h-full object-contain'
                        onLoadStart={() => setIsBuffering(true)}
                        onWaiting={() => setIsBuffering(true)}
                        onCanPlay={() => setIsBuffering(false)}
                        onPlaying={() => setIsBuffering(false)}
                        onError={() => {
                          setIsPlaying(false);
                          setIsBuffering(false);
                        }}
                      />
                    )}
                    {isLive && isLivePreviewing && (
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        autoPlay
                        muted
                        playsInline
                        className='absolute z-10 inset-0 w-full h-full object-contain'
                        onLoadStart={() => setIsBuffering(true)}
                        onWaiting={() => setIsBuffering(true)}
                        onCanPlay={() => setIsBuffering(false)}
                        onPlaying={() => setIsBuffering(false)}
                        onEnded={() => setIsLivePreviewing(false)}
                        onError={() => {
                          setIsLivePreviewing(false);
                          setIsBuffering(false);
                        }}
                      />
                    )}
                    {isLive ? (
                      <button
                        type='button'
                        aria-label={liveLabel}
                        onMouseEnter={() => setIsLivePreviewing(true)}
                        onMouseLeave={() => setIsLivePreviewing(false)}
                        onFocus={() => setIsLivePreviewing(true)}
                        onBlur={() => setIsLivePreviewing(false)}
                        onClick={(event) => event.stopPropagation()}
                        className='absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60'
                      >
                        <Sparkles className='h-4 w-4' />
                      </button>
                    ) : isAnimated ? (
                      <div className='absolute right-3 top-3 z-10 flex h-5 items-center justify-center rounded-full bg-black/50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md'>
                        {t('badges.animated')}
                      </div>
                    ) : null}
                  </div>
                )}

                {canPlayVideo && !isPlaying && (
                  <div className='absolute inset-0 flex items-center justify-center z-20'>
                    <button
                      onClick={startVideo}
                      className='h-20 w-20 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm transition hover:scale-110 hover:bg-black/50 group/play'
                    >
                      <Play className='h-10 w-10 fill-white text-white opacity-90 group-hover/play:opacity-100' />
                    </button>
                  </div>
                )}

                {isBuffering && (
                  <div className='absolute inset-0 flex items-center justify-center z-30 pointer-events-none'>
                    <Loader2 className='h-12 w-12 animate-spin text-white' />
                  </div>
                )}
              </div>
            );
          })()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
