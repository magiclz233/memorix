'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  MapPin,
  Ruler,
  Aperture,
  Timer,
  Gauge,
  Camera,
  FileText,
  HardDrive,
  Maximize,
  Grid,
  Calendar,
  Palette,
  Flag,
  Building2,
  X,
  Play,
  Loader2,
  Sparkles
} from 'lucide-react';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Histogram } from './histogram';
import type { GalleryItem } from '@/app/lib/gallery';

type PhotoDetailModalProps = {
  selectedItem: GalleryItem | null;
  items?: GalleryItem[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  locale: string;
};

export function PhotoDetailModal({
  selectedItem,
  items = [],
  onSelect,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  locale
}: PhotoDetailModalProps) {
  const t = useTranslations('front');

  // Lock body scroll
  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedItem]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedItem, onClose, onPrev, onNext]);

  if (!selectedItem) return null;

  const modalContent = (
    <AnimatePresence>
      {selectedItem && (
        <PhotoDetailContent
          item={selectedItem}
          items={items}
          onSelect={onSelect}
          onClose={onClose}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          locale={locale}
          t={t}
        />
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

function PhotoDetailContent({
  item,
  items,
  onSelect,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  locale,
  t,
}: {
  item: GalleryItem;
  items: GalleryItem[];
  onSelect?: (id: string) => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const tMedia = useTranslations('front.media');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLivePreviewing, setIsLivePreviewing] = useState(false);
  const [viewMode, setViewMode] = useState<'fit' | 'frame'>('fit');
  
  // Track direction for animation
  const [direction, setDirection] = useState(0);
  const [lastItemId, setLastItemId] = useState(item.id);

  const isFrame = viewMode === 'frame';
  
  if (item.id !== lastItemId) {
    const prevIdx = items.findIndex((i) => i.id === lastItemId);
    const currIdx = items.findIndex((i) => i.id === item.id);
    // Handle edge case where index might not be found or wrap around logic if needed
    // Simple logic: if moving forward (curr > prev) or wrapping from end to start (prev is last, curr is 0)
    // For now, simple index comparison is sufficient for linear navigation
    const dir = currIdx > prevIdx ? 1 : -1;
    setDirection(dir);
    
    // Reset states
    setIsPlaying(false);
    setIsBuffering(false);
    setIsLivePreviewing(false);
    
    setLastItemId(item.id);
  }

  // Reset states on item change
  // Removed useEffect to avoid cascading renders, handled in render phase above
  
  const isVideo = item.type === 'video';
  const isLive = item.liveType && item.liveType !== 'none';
  const canPlayVideo = isVideo;
  const videoSrc = item.videoUrl ?? `/api/media/stream/${item.id}`;

  const formatNumber = (val?: number | null, digits = 1) => 
    typeof val === 'number' && !Number.isNaN(val) ? val.toFixed(digits).replace(/\.0+$/, '') : null;

  const formatExposure = (val?: number | null) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return null;
    if (val >= 1) return `${formatNumber(val, 2)}s`;
    return `1/${Math.round(1 / val)}s`;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (typeof bytes !== 'number') return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString(locale, { hour12: false });
  };

  const getExposureProgram = (prog: number | null) => {
    if (prog === null) return null;
    return t(`galleryGrid.values.exposureProgram.${prog}` as any);
  };

  const getFlashState = (flash: number | null) => {
    if (flash === null) return null;
    const fired = (flash & 1) !== 0;
    return fired ? t('galleryGrid.values.flash.fired') : t('galleryGrid.values.flash.off');
  };

  const resolution = item.width && item.height 
    ? `${item.width} × ${item.height}`
    : '-';
  const mp = item.width && item.height ? (item.width * item.height / 1000000).toFixed(2) + ' MP' : null;
  const focalLength = formatNumber(item.focalLength);
  const apertureValue = formatNumber(item.aperture);
  const exposureValue = formatExposure(item.exposure);
  const isoValue = typeof item.iso === 'number' ? String(item.iso) : null;
  const exposureProgramValue =
    typeof item.exposureProgram === 'number'
      ? getExposureProgram(item.exposureProgram)
      : null;
  const flashValue =
    typeof item.flash === 'number' ? getFlashState(item.flash) : null;
  const hasShootingInfo =
    Boolean(item.whiteBalance) ||
    Boolean(exposureProgramValue) ||
    Boolean(flashValue);
  const showFilmstrip = items.length > 1 && typeof onSelect === 'function';

  const locationParts = item.locationName ? item.locationName.split(',').map(s => s.trim()) : [];
  const city = locationParts[0];
  const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 transition-colors duration-300 h-screen w-screen overflow-hidden"
    >
      <div className="flex-grow flex flex-col relative group h-full overflow-hidden bg-[#fafafa] dark:bg-[#050505]">
        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/80">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {isLive && (
              <Button
                variant="ghost"
                size="icon"
                onMouseEnter={() => setIsLivePreviewing(true)}
                onMouseLeave={() => {
                  setIsLivePreviewing(false);
                  setIsBuffering(false);
                }}
                onFocus={() => setIsLivePreviewing(true)}
                onBlur={() => {
                  setIsLivePreviewing(false);
                  setIsBuffering(false);
                }}
                aria-label={item.liveType === 'embedded' ? tMedia('motionPhoto') : tMedia('livePhoto')}
                className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/80"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode((prev) => (prev === 'fit' ? 'frame' : 'fit'))}
              className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/80"
            >
              {viewMode === 'fit' ? t('modal.viewFrame') : t('modal.viewOriginal')}
            </Button>
          </div>
        </div>

        <div className="flex-grow flex items-center justify-center relative h-full">
          {hasPrev && (
            <button 
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm backdrop-blur transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={item.id}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: dir * 50, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: number) => ({ x: dir * -50, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={cn(
                  "absolute inset-0 flex items-center justify-center w-full h-full",
                  isFrame ? "p-0" : "p-0"
                )}
              >
                {(() => {
                  const hasDimensions = !!(item.width && item.height);
                  const isFrame = viewMode === 'frame';
                  const useShrinkWrap = !isFrame && hasDimensions; // Only shrink-wrap in Fit mode

                  // Mode 1 (Fit): Image itself has shadow/rounded, no extra border.
                  // Mode 2 (Frame): Large white container (fills screen area), image centered inside with padding (matting).
                  
                  const containerClass = useShrinkWrap
                    ? 'relative flex max-w-full max-h-full shadow-2xl rounded-sm overflow-hidden transition-all duration-300'
                    : isFrame
                      ? 'relative w-full h-full bg-white dark:bg-zinc-100 shadow-none overflow-hidden transition-all duration-300'
                      : 'relative w-full h-full overflow-hidden bg-black'; // Fallback

                  return (
                    <div className={containerClass}>
                      <BlurImage
                        src={item.src}
                        alt={item.title}
                        blurHash={item.blurHash}
                        fill={!useShrinkWrap}
                        width={useShrinkWrap ? (item.width || undefined) : undefined}
                        height={useShrinkWrap ? (item.height || undefined) : undefined}
                        className={cn(
                          useShrinkWrap
                            ? 'w-auto h-auto max-w-full max-h-[85vh] object-contain block'
                            : 'object-contain',
                          isFrame && 'p-8 md:p-16' // Add padding to image in Frame mode to create "matting" effect
                        )}
                        sizes="100vw"
                        priority
                      />

                      {canPlayVideo && isPlaying && (
                        <video
                          src={videoSrc}
                          autoPlay
                          controls
                          className={cn(
                            'absolute inset-0 w-full h-full z-10',
                            isFrame ? 'object-contain p-8 md:p-16' : 'object-contain bg-black'
                          )}
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
                          src={videoSrc}
                          autoPlay
                          muted
                          playsInline
                          className={cn(
                            'absolute z-10 inset-0 w-full h-full',
                            isFrame ? 'object-contain p-6 md:p-12' : 'object-contain'
                          )}
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

                      {canPlayVideo && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <button
                            onClick={() => setIsPlaying(true)}
                            className="h-20 w-20 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm transition hover:scale-110 hover:bg-black/50 group/play"
                          >
                            <Play className="h-10 w-10 fill-white text-white opacity-90 group-hover/play:opacity-100" />
                          </button>
                        </div>
                      )}

                      {isBuffering && (
                        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                          <Loader2 className="h-12 w-12 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>

          {hasNext && (
            <button 
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm backdrop-blur transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
        {showFilmstrip && (
          <div className="h-24 px-6 md:px-8 flex items-center justify-center gap-3 overflow-x-auto custom-scrollbar">
            {items.map((thumb) => {
              const isActive = thumb.id === item.id;
              return (
                <button
                  key={thumb.id}
                  type="button"
                  onClick={() => onSelect?.(thumb.id)}
                  className={cn(
                    'flex-shrink-0 w-14 h-14 rounded-sm overflow-hidden transition-opacity',
                    isActive
                      ? 'border-2 border-primary dark:border-white shadow-lg ring-2 ring-white/20'
                      : 'opacity-50 hover:opacity-100'
                  )}
                >
                  <Image
                    src={thumb.src}
                    alt={thumb.title}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <aside className="w-[420px] flex-shrink-0 bg-white dark:bg-background-dark border-l border-gray-100 dark:border-gray-800 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-8">
          <section className="flex justify-between items-start">
            <h2 className="text-lg font-bold tracking-tight text-primary dark:text-white leading-tight pr-4 break-words">
              {item.title}
            </h2>
            <div className="flex items-center space-x-3 mt-1 flex-shrink-0">
              <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors" title="Like">
                <Heart className="w-5 h-5" />
              </button>
              <a 
                 href={`/api/media/stream/${item.id}?download=true`}
                 download
                 className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary dark:hover:text-white transition-colors" 
                 title="Download"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </section>

          {(item.gpsLatitude || item.locationName) && (
            <section>
              <div className="relative h-40 w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 mb-2">
                 <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                    <MapPin className="w-10 h-10 opacity-20" />
                 </div>
                 {item.gpsLatitude && item.gpsLongitude && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
                        <div className="absolute -inset-2 bg-red-500/30 rounded-full animate-ping"></div>
                      </div>
                    </div>
                 )}
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {item.locationName || `${formatNumber(item.gpsLatitude, 4)}, ${formatNumber(item.gpsLongitude, 4)}`}
                </span>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-3">{t('details.camera')}</h3>
            <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Ruler className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.focalLength')}</span>
                </div>
                <p className="text-[16px] font-bold">{focalLength ? `${focalLength} mm` : '-'}</p>
              </div>
              <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Aperture className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.aperture')}</span>
                </div>
                <p className="text-[16px] font-bold">{apertureValue ? `f/${apertureValue}` : '-'}</p>
              </div>
              <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Timer className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.shutter')}</span>
                </div>
                <p className="text-[16px] font-bold">{exposureValue ?? '-'}</p>
              </div>
              <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Gauge className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.iso')}</span>
                </div>
                <p className="text-[16px] font-bold">{isoValue ?? '-'}</p>
              </div>
            </div>
          </section>

          <section>
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">{t('sections.histogram')}</h3>
               <div className="flex space-x-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-400/80"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-green-400/80"></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80"></div>
               </div>
             </div>
             <div className="h-24 w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 p-2">
                <Histogram src={item.src} className="w-full h-full" />
             </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">{t('sections.equipment')}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start space-x-3">
                <Camera className="w-5 h-5 text-gray-400" />
                <div className="flex-grow">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">{t('details.camera')}</p>
                  <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100">
                    {item.maker} {item.camera}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Aperture className="w-5 h-5 text-gray-400" />
                <div className="flex-grow">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">{t('details.lens')}</p>
                  <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100">{item.lens || '-'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                 <Maximize className="w-5 h-5 text-gray-400" />
                 <div className="flex-grow flex justify-between items-end">
                   <p className="text-[13px] text-gray-500">{t('details.focalLength35mm')}</p>
                   <p className="text-[13px] font-bold">{item.focalLengthIn35mmFormat ? `${item.focalLengthIn35mmFormat} mm` : '-'}</p>
                 </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">{t('sections.basic')}</h3>
            <div className="space-y-2.5">
              <InfoRow icon={<FileText className="w-4 h-4" />} label={t('details.filename')} value={item.title} />
              <InfoRow icon={<HardDrive className="w-4 h-4" />} label={t('details.fileSize')} value={formatFileSize(item.size)} />
              <InfoRow icon={<Maximize className="w-4 h-4" />} label={t('details.resolution')} value={resolution} />
              <InfoRow icon={<Grid className="w-4 h-4" />} label={t('details.megapixels')} value={mp} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label={t('details.dateShot')} value={formatDate(item.dateShot)} />
              <InfoRow icon={<Palette className="w-4 h-4" />} label={t('details.colorSpace')} value={item.colorSpace || 'sRGB'} />
              {city && <InfoRow icon={<Building2 className="w-4 h-4" />} label={t('details.city')} value={city} />}
              {country && <InfoRow icon={<Flag className="w-4 h-4" />} label={t('details.country')} value={country} />}
            </div>
          </section>
          {hasShootingInfo && (
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">{t('sections.shooting')}</h3>
              <div className="space-y-2.5">
                {item.whiteBalance && (
                  <SimpleRow label={t('details.whiteBalance')} value={item.whiteBalance} />
                )}
                {exposureProgramValue && (
                  <SimpleRow label={t('details.exposureProgram')} value={exposureProgramValue} />
                )}
                {flashValue && (
                  <SimpleRow label={t('details.flash')} value={flashValue} />
                )}
              </div>
            </section>
          )}

        </div>
      </aside>
    </motion.div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-[12px]">
      <div className="flex items-center space-x-2 text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-semibold text-gray-900 dark:text-gray-100">{value || '-'}</span>
    </div>
  );
}

function SimpleRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-[12px]">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 dark:text-gray-100">{value || '-'}</span>
    </div>
  );
}
