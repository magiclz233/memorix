'use client';

import { useEffect, useState, useMemo } from 'react';
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
  User,
  Monitor,
  Globe,
  Flag,
  Building2,
  X,
  Play,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Histogram } from './histogram';
import type { GalleryItem } from '@/app/lib/gallery';

type PhotoDetailModalProps = {
  selectedItem: GalleryItem | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  locale: string;
};

export function PhotoDetailModal({
  selectedItem,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  locale
}: PhotoDetailModalProps) {
  const t = useTranslations('front.galleryGrid');
  const tDetail = useTranslations('front.gallery');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Reset video state when item changes
  useEffect(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackError(null);
  }, [selectedItem?.id]);

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

  const item = selectedItem;
  const isVideo = item.type === 'video';
  const isLive = item.liveType && item.liveType !== 'none';
  const canPlay = isVideo || isLive;
  const videoSrc = item.videoUrl ?? `/api/media/stream/${item.id}`;

  // Format helpers
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

  const resolution = item.resolution ?? (item.width && item.height ? `${item.width} × ${item.height}` : null);
  const mp = item.width && item.height ? (item.width * item.height / 1000000).toFixed(2) + ' MP' : null;
  
  // Parse location
  const locationParts = item.locationName ? item.locationName.split(',').map(s => s.trim()) : [];
  const city = locationParts[0];
  const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 transition-colors duration-300 h-screen w-screen overflow-hidden"
      >
        {/* Main Content Area */}
        <div className="flex-grow flex flex-col relative group h-full overflow-hidden bg-[#fafafa] dark:bg-[#050505]">
           {/* Header / Top Bar (Close Button) */}
           <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
             <div className="pointer-events-auto">
               <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/80">
                 <X className="h-5 w-5" />
               </Button>
             </div>
           </div>

          {/* Image Display */}
          <div className="flex-grow flex items-center justify-center p-4 md:p-12 relative h-full">
            {hasPrev && (
              <button 
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm backdrop-blur transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            
            <div className="relative w-full h-full flex items-center justify-center">
               <div className="relative max-w-full max-h-full aspect-[4/3] md:aspect-auto" style={{ aspectRatio: item.width && item.height ? `${item.width}/${item.height}` : undefined }}>
                <BlurImage
                    src={item.src}
                    alt={item.title}
                    blurHash={item.blurHash}
                    fill
                    className={cn("object-contain shadow-2xl rounded-sm", isPlaying && "hidden")}
                    sizes="100vw"
                    priority
                  />
                  
                  {canPlay && isPlaying && (
                    <video
                      src={videoSrc}
                      autoPlay
                      controls
                      className="max-w-full max-h-full object-contain shadow-2xl rounded-sm w-full h-full"
                      onLoadStart={() => setIsBuffering(true)}
                      onWaiting={() => setIsBuffering(true)}
                      onCanPlay={() => setIsBuffering(false)}
                      onPlaying={() => setIsBuffering(false)}
                      onError={() => {
                        setPlaybackError("Playback failed");
                        setIsPlaying(false);
                        setIsBuffering(false);
                      }}
                    />
                  )}

                  {/* Play Button Overlay */}
                  {canPlay && !isPlaying && (
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
        </div>

        {/* Sidebar Info */}
        <aside className="w-[420px] flex-shrink-0 bg-white dark:bg-background-dark border-l border-gray-100 dark:border-gray-800 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-8">
            {/* Title & Actions */}
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

            {/* Map / Location */}
            {(item.gpsLatitude || item.locationName) && (
              <section>
                <div className="relative h-40 w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 mb-2">
                   {/* Placeholder Map - In real app, use Map component */}
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

            {/* Shooting Params Grid */}
            <section>
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-3">{tDetail('details.camera')}</h3>
              <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Ruler className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{tDetail('details.focalLength')}</span>
                  </div>
                  <p className="text-[16px] font-bold">{formatNumber(item.focalLength)} mm</p>
                </div>
                <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Aperture className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{tDetail('details.aperture')}</span>
                  </div>
                  <p className="text-[16px] font-bold">f/{formatNumber(item.aperture)}</p>
                </div>
                <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Timer className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{tDetail('details.shutter')}</span>
                  </div>
                  <p className="text-[16px] font-bold">{formatExposure(item.exposure)}</p>
                </div>
                <div className="bg-white dark:bg-background-dark p-4 flex flex-col">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Gauge className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{tDetail('details.iso')}</span>
                  </div>
                  <p className="text-[16px] font-bold">{item.iso}</p>
                </div>
              </div>
            </section>

            {/* Histogram */}
            <section>
               <div className="flex justify-between items-center mb-3">
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">Histogram</h3>
                 <div className="flex space-x-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-400/80"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400/80"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-400/80"></div>
                 </div>
               </div>
               <div className="h-24 w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 p-2">
                  <Histogram src={item.thumbUrl || item.src} className="w-full h-full" />
               </div>
            </section>

            {/* Equipment Info */}
            <section className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">{tDetail('details.camera')}</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-start space-x-3">
                  <Camera className="w-5 h-5 text-gray-400" />
                  <div className="flex-grow">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Camera</p>
                    <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100">
                      {item.maker} {item.camera}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Aperture className="w-5 h-5 text-gray-400" />
                  <div className="flex-grow">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{tDetail('details.lens')}</p>
                    <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100">{item.lens || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                   <Maximize className="w-5 h-5 text-gray-400" />
                   <div className="flex-grow flex justify-between items-end">
                     <p className="text-[13px] text-gray-500">35mm Equiv.</p>
                     <p className="text-[13px] font-bold">{item.focalLengthIn35mmFormat ? `${item.focalLengthIn35mmFormat} mm` : '-'}</p>
                   </div>
                </div>
              </div>
            </section>

            {/* Basic Info */}
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-2">Basic Info</h3>
              <div className="space-y-2.5">
                <InfoRow icon={<FileText className="w-4 h-4" />} label="Filename" value={item.title} />
                <InfoRow icon={<HardDrive className="w-4 h-4" />} label="File Size" value={formatFileSize(item.size)} />
                <InfoRow icon={<Maximize className="w-4 h-4" />} label="Resolution" value={resolution} />
                <InfoRow icon={<Grid className="w-4 h-4" />} label="Megapixels" value={mp} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date Shot" value={formatDate(item.dateShot)} />
                <InfoRow icon={<Palette className="w-4 h-4" />} label="Color Space" value={item.colorSpace || 'sRGB'} />
                {city && <InfoRow icon={<Building2 className="w-4 h-4" />} label="City" value={city} />}
                {country && <InfoRow icon={<Flag className="w-4 h-4" />} label="Country" value={country} />}
              </div>
            </section>

          </div>
        </aside>
      </motion.div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
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
