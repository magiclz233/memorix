'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSwipeable } from 'react-swipeable';
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
  Sparkles,
  Keyboard,
} from 'lucide-react';
import { Pencil, Save, Undo2 } from 'lucide-react';
import { BlurImage } from '@/app/ui/gallery/blur-image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Histogram } from './histogram';
import type { GalleryItem } from '@/app/lib/gallery';
import { updatePhotoDetails } from '@/app/lib/actions';
import { showError, showSuccess } from '@/app/lib/toast-utils';
import { authClient } from '@/lib/auth-client';

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

type PendingAction =
  | { type: 'close' }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'select'; id: string }
  | { type: 'cancel-edit' };

function toDateInputValue(dateShot?: string | null) {
  if (!dateShot) return '';
  const parsed = new Date(dateShot);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function InlineEditableText({
  value,
  onChange,
  onSave,
  editable,
  className,
  inputClassName,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  editable: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  type?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn("bg-transparent border-b border-indigo-400 outline-none", inputClassName)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={cn(
        className,
        editable ? 'cursor-text hover:underline decoration-dashed decoration-zinc-400/70 underline-offset-[6px]' : ''
      )}
      onClick={() => {
        if (editable) setIsEditing(true);
      }}
      title={editable ? "点击修改" : undefined}
    >
      {value || placeholder}
    </span>
  );
}

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
  const t = useTranslations('front.galleryGrid');

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
  const { data: session } = authClient.useSession();
  const isAdmin =
    (session?.user as { role?: string } | null | undefined)?.role === 'admin';

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLivePreviewing, setIsLivePreviewing] = useState(false);
  const [viewMode, setViewMode] = useState<'fit' | 'frame'>('fit');
  const [footTitle, setFootTitle] = useState(item.title ?? '');
  const [footAuthor, setFootAuthor] = useState(item.author ?? '');
  const [footDate, setFootDate] = useState(toDateInputValue(item.dateShot));
  const [isSaving, startSaving] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [[page, direction], setPage] = useState([item.id, 0]);

  if (page !== item.id) {
    const prevIndex = items.findIndex((i) => i.id === page);
    const currentIndex = items.findIndex((i) => i.id === item.id);
    let newDir = currentIndex > prevIndex ? 1 : -1;
    if (prevIndex === items.length - 1 && currentIndex === 0) newDir = 1;
    if (prevIndex === 0 && currentIndex === items.length - 1) newDir = -1;
    setPage([item.id, newDir]);
  }

  const previousItemIdRef = useRef(item.id);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const filmstripRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDraggingFilmstrip, setIsDraggingFilmstrip] = useState(false);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const isFrame = viewMode === 'frame';
  const isVideo = item.type === 'video';
  const isLive = item.liveType && item.liveType !== 'none';
  const isAnimated = Boolean(item.isAnimated && item.animatedUrl);
  const canPlayVideo = isVideo;
  const videoSrc = item.videoUrl ?? `/api/media/stream/${item.id}`;
  const liveLabel =
    item.liveType === 'embedded' ? tMedia('motionPhoto') : tMedia('livePhoto');

  const originalTitle = item.title ?? '';
  const originalAuthor = item.author ?? '';
  const originalDate = toDateInputValue(item.dateShot);
  const hasChanges =
    isEditing &&
    (footTitle !== originalTitle ||
      footAuthor !== originalAuthor ||
      footDate !== originalDate);

  const resetEditFields = useCallback(() => {
    setFootTitle(item.title ?? '');
    setFootAuthor(item.author ?? '');
    setFootDate(toDateInputValue(item.dateShot));
  }, [item.author, item.dateShot, item.title]);
  useEffect(() => {
    const previousId = previousItemIdRef.current;
    if (previousId === item.id) return;

    previousItemIdRef.current = item.id;
    
    // Defer state updates to avoid "cascading renders" warning
    // This happens when combined with synchronous setPage in render
    const timer = setTimeout(() => {
      setIsPlaying(false);
      setIsBuffering(false);
      setIsLivePreviewing(false);
      setIsEditing(false);
      setConfirmOpen(false);
      setPendingAction(null);
      resetEditFields();
    }, 0);

    return () => clearTimeout(timer);
  }, [item.id, resetEditFields]);

  const updateFilmstripEdgeState = useCallback(() => {
    const node = filmstripRef.current;
    if (!node) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(node.scrollLeft > 0);
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const node = filmstripRef.current;
    if (!node) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateFilmstripEdgeState();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    node.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      node.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [updateFilmstripEdgeState]);

  useEffect(() => {
    const active = thumbRefs.current[String(item.id)];
    if (!active) return;

    active.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [item.id]);

  const executePendingAction = useCallback(
    (action: PendingAction | null) => {
      if (!action) return;

      if (action.type === 'close') {
        onClose();
        return;
      }

      if (action.type === 'prev') {
        onPrev();
        return;
      }

      if (action.type === 'next') {
        onNext();
        return;
      }

      if (action.type === 'select') {
        onSelect?.(action.id);
        return;
      }

      if (action.type === 'cancel-edit') {
        resetEditFields();
        setIsEditing(false);
      }
    },
    [onClose, onNext, onPrev, onSelect, resetEditFields],
  );

  const persistChanges = useCallback(async () => {
    if (!isAdmin || !hasChanges || isSaving) return true;

    return new Promise<boolean>((resolve) => {
      startSaving(async () => {
        try {
          const fd = new FormData();
          fd.set('fileId', String(item.id));
          fd.set('title', footTitle.trim());
          fd.set('author', footAuthor.trim());
          fd.set('dateShot', footDate.trim());

          const res = await updatePhotoDetails(fd);

          if (!res?.success) {
            showError(res?.message || t('modal.saveFailed'));
            resolve(false);
            return;
          }

          item.title = footTitle.trim();
          item.author = footAuthor.trim() || null;
          item.dateShot = footDate.trim() ? new Date(footDate).toISOString() : null;

          showSuccess(res.message || t('modal.saved'));
          setIsEditing(false);
          resolve(true);
        } catch {
          showError(t('modal.saveFailed'));
          resolve(false);
        }
      });
    });
  }, [footAuthor, footDate, footTitle, hasChanges, isAdmin, isSaving, item, t]);

  const handleInlineSave = async () => {
    if (!isAdmin || isSaving) return;
    
    // Only check if changed compared to what is already on 'item'
    const oTitle = item.title ?? '';
    const oAuthor = item.author ?? '';
    const oDate = toDateInputValue(item.dateShot);

    if (footTitle === oTitle && footAuthor === oAuthor && footDate === oDate) {
      return;
    }

    startSaving(async () => {
      try {
        const fd = new FormData();
        fd.set('fileId', String(item.id));
        fd.set('title', footTitle.trim());
        fd.set('author', footAuthor.trim());
        fd.set('dateShot', footDate.trim());

        const res = await updatePhotoDetails(fd);

        if (!res?.success) {
          showError(res?.message || t('modal.saveFailed'));
          // Revert optionally: resetEditFields()
          return;
        }

        // Update local object
        item.title = footTitle.trim();
        item.author = footAuthor.trim() || null;
        item.dateShot = footDate.trim() ? new Date(footDate).toISOString() : null;

        showSuccess(res.message || t('modal.saved'));
      } catch {
        showError(t('modal.saveFailed'));
      }
    });
  };

  const requestAction = useCallback(
    (action: PendingAction) => {
      if (isAdmin && hasChanges) {
        setPendingAction(action);
        setConfirmOpen(true);
        return;
      }

      executePendingAction(action);
    },
    [executePendingAction, hasChanges, isAdmin],
  );

  const handleSaveAndContinue = async () => {
    const ok = await persistChanges();
    if (!ok) return;

    const action = pendingAction;
    setPendingAction(null);
    setConfirmOpen(false);
    executePendingAction(action);
  };

  const handleDiscardAndContinue = () => {
    resetEditFields();
    setIsEditing(false);
    const action = pendingAction;
    setPendingAction(null);
    setConfirmOpen(false);
    executePendingAction(action);
  };

  const handleDirectSave = useCallback(async () => {
    await persistChanges();
  }, [persistChanges]);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await modalRootRef.current?.requestFullscreen();
      }
    } catch {
      showError(t('modal.fullscreenFailed'));
    }
  }, [t]);

  const togglePlayStateByShortcut = useCallback(() => {
    if (isLive) {
      setIsLivePreviewing((prev) => !prev);
      return;
    }

    if (!canPlayVideo) return;

    if (!isPlaying) {
      setIsPlaying(true);
      return;
    }

    const node = videoRef.current;
    if (!node) {
      setIsPlaying(false);
      return;
    }

    if (node.paused) {
      void node.play();
    } else {
      node.pause();
    }
  }, [canPlayVideo, isLive, isPlaying]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      const lowered = key.toLowerCase();
      const typing = isTypingTarget(event.target);



      if (key === 'Escape') {
        event.preventDefault();
        if (isEditing) {
          if (hasChanges) {
            requestAction({ type: 'cancel-edit' });
          } else {
            setIsEditing(false);
          }
          return;
        }

        requestAction({ type: 'close' });
        return;
      }

      if (typing) return;

      if (key === 'ArrowLeft' && hasPrev) {
        event.preventDefault();
        requestAction({ type: 'prev' });
        return;
      }

      if (key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        requestAction({ type: 'next' });
        return;
      }

      if (key === 'Home' && items.length > 0 && onSelect) {
        event.preventDefault();
        requestAction({ type: 'select', id: String(items[0].id) });
        return;
      }

      if (key === 'End' && items.length > 0 && onSelect) {
        event.preventDefault();
        requestAction({
          type: 'select',
          id: String(items[items.length - 1].id),
        });
        return;
      }

      if (key === ' ' || key === 'Spacebar') {
        event.preventDefault();
        togglePlayStateByShortcut();
        return;
      }


    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleDirectSave,
    hasChanges,
    hasNext,
    hasPrev,
    isAdmin,
    isEditing,
    items,
    onSelect,
    requestAction,
    toggleFullscreen,
    togglePlayStateByShortcut,
  ]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (hasNext) requestAction({ type: 'next' });
    },
    onSwipedRight: () => {
      if (hasPrev) requestAction({ type: 'prev' });
    },
    onSwipedDown: () => {
      requestAction({ type: 'close' });
    },
    delta: 40,
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  const handleToggleEdit = () => {
    if (!isAdmin) return;

    if (isEditing) {
      if (hasChanges) {
        requestAction({ type: 'cancel-edit' });
      } else {
        setIsEditing(false);
      }
      return;
    }

    setIsEditing(true);
  };

  const startVideo = () => {
    setIsPlaying(true);
    setIsLivePreviewing(false);
  };

  const formatNumber = (val?: number | null, digits = 1) =>
    typeof val === 'number' && !Number.isNaN(val)
      ? val.toFixed(digits).replace(/\.0+$/, '')
      : null;

  const formatExposure = (val?: number | null) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return null;
    if (val >= 1) return `${formatNumber(val, 2)}s`;
    return `1/${Math.round(1 / val)}`;
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
    return t(`values.exposureProgram.${prog}` as never);
  };

  const getFlashState = (flash: number | null) => {
    if (flash === null) return null;
    const fired = (flash & 1) !== 0;
    return fired ? t('values.flash.fired') : t('values.flash.off');
  };

  const resolution = item.width && item.height ? `${item.width} x ${item.height}` : '-';
  const mp =
    item.width && item.height
      ? (item.width * item.height / 1000000).toFixed(2) + ' MP'
      : null;
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

  const locationParts = item.locationName
    ? item.locationName.split(',').map((s) => s.trim())
    : [];
  const city = locationParts[0];
  const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : null;

  return (
    <motion.div
      ref={modalRootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex bg-background text-foreground transition-colors duration-300 h-screen w-screen overflow-hidden"
    >
      <div className="flex-grow flex flex-col relative group h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => requestAction({ type: 'close' })}
              className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/80"
              aria-label={t('modal.closeAria')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-md hover:bg-white/80 dark:hover:bg-black/80"
                    aria-label={t('modal.keyboardShortcuts')}
                  >
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">←/→</span>
                      <span>{t('modal.shortcuts.prevNext')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">ESC</span>
                      <span>{t('modal.shortcuts.close')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">Space</span>
                      <span>{t('modal.shortcuts.playPause')}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-zinc-500 dark:text-zinc-400">Home/End</span>
                      <span>{t('modal.shortcuts.firstLast')}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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
              onClick={(e) => { e.stopPropagation(); requestAction({ type: 'prev' }); }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm backdrop-blur transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          
          <div
            {...swipeHandlers}
            className={cn(
              "relative w-full h-full flex items-center justify-center overflow-hidden transition-colors duration-500",
              isFrame && "bg-[#f0f0f0] dark:bg-zinc-950"
            )}
          >
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={item.id}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: dir >= 0 ? 80 : -80, opacity: 0, scale: 0.98 }),
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
                  exit: (dir: number) => ({ x: dir >= 0 ? -80 : 80, opacity: 0, scale: 0.98, transition: { duration: 0.2 } }),
                }}
                initial="enter"
                animate="center"
                exit="exit"

                className={cn(
                  "absolute inset-0 flex items-center justify-center w-full h-full",
                  isFrame ? "p-4 md:p-8" : "p-0"
                )}
              >
                {(() => {
                  const hasDimensions = !!(item.width && item.height);
                  const safeWidth = item.width || 1920;
                  const safeHeight = item.height || 1080;
                  const isFrame = viewMode === 'frame';
                  const useShrinkWrap = !isFrame && hasDimensions; // Only shrink-wrap in Fit mode

                  const containerClass = useShrinkWrap
                    ? 'relative flex max-w-full max-h-full shadow-2xl rounded-sm overflow-hidden transition-all duration-300'
                    : isFrame
                      ? 'relative max-w-full max-h-full flex items-center justify-center'
                      : 'relative w-full h-full overflow-hidden bg-zinc-950'; // Fallback

                  return (
                    <div className={containerClass}>
                      {isFrame ? (
                         // code.html structure implementation
                         <div className="bg-white dark:bg-[#1a1a1a] shadow-[0_10px_50px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center pt-[4%] pr-[6%] pb-[8%] pl-[6%] transition-all duration-700 min-w-[300px]">
                            {/* Image Container with Lift Shadow */}
                            <div className="relative shadow-[0_4px_20px_-2px_rgba(0,0,0,0.15)]">
                              {isAnimated ? (
                                <Image
                                  src={item.animatedUrl ?? ''}
                                  alt={isEditing ? footTitle || item.title : item.title}
                                  width={safeWidth}
                                  height={safeHeight}
                                  unoptimized
                                  className="max-h-[60vh] md:max-h-[70vh] w-auto object-contain block"
                                  sizes="100vw"
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
                                  className="max-h-[60vh] md:max-h-[70vh] w-auto object-contain block"
                                  sizes="100vw"
                                  priority
                                />
                              )}
                              
                              {/* Video/Live Elements layered on top */}
                              {canPlayVideo && isPlaying && (
                                <video
                                  ref={videoRef}
                                  src={videoSrc}
                                  autoPlay
                                  controls
                                  className="absolute inset-0 w-full h-full object-contain"
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
                                  className="absolute z-10 inset-0 w-full h-full object-contain"
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
                                  type="button"
                                  aria-label={liveLabel}
                                  onMouseEnter={() => setIsLivePreviewing(true)}
                                  onMouseLeave={() => setIsLivePreviewing(false)}
                                  onFocus={() => setIsLivePreviewing(true)}
                                  onBlur={() => setIsLivePreviewing(false)}
                                  onClick={(event) => event.stopPropagation()}
                                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                                >
                                  <Sparkles className="h-4 w-4" />
                                </button>
                              ) : isAnimated ? (
                                <div className="absolute right-3 top-3 z-10 flex h-5 items-center justify-center rounded-full bg-black/50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                                  {t('badges.animated')}
                                </div>
                              ) : null}
                            </div>

                            {/* Metadata Panel inside Mat */}
                            <div className="mt-8 md:mt-12 text-center w-full">
                                <div className="w-full text-center">
                                  <InlineEditableText
                                    value={footTitle}
                                    onChange={setFootTitle}
                                    onSave={handleInlineSave}
                                    editable={isAdmin}
                                    className="font-[family-name:var(--font-serif-sc)] text-sm md:text-base font-light tracking-[0.2em] text-slate-800 dark:text-slate-300 break-words"
                                    inputClassName="text-sm md:text-base font-light tracking-[0.2em] text-slate-800 dark:text-slate-300 w-full max-w-[300px]"
                                    placeholder={t('modal.untitled')}
                                  />
                                </div>

                              <div className="flex items-center justify-center gap-2 mt-2 opacity-60 hover:opacity-100 transition-opacity duration-300">
                                <span className="font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300">
                                  {t('modal.authorPrefix')}
                                </span>
                                  <div className="min-w-[72px] text-center">
                                    <InlineEditableText
                                      value={footAuthor}
                                      onChange={setFootAuthor}
                                      onSave={handleInlineSave}
                                      editable={isAdmin}
                                      className="font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 block w-full"
                                      inputClassName="text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 w-24"
                                      placeholder={t('modal.authorFallback')}
                                    />
                                  </div>
                                <span className="font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300">·</span>
                                  <div className="min-w-[92px] text-center">
                                    <InlineEditableText
                                      value={footDate}
                                      onChange={setFootDate}
                                      onSave={handleInlineSave}
                                      editable={isAdmin}
                                      type="date"
                                      className="font-[family-name:var(--font-serif-sc)] text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 block w-full"
                                      inputClassName="text-[10px] md:text-[11px] tracking-widest italic text-slate-800 dark:text-slate-300 w-32"
                                      placeholder={t('modal.dateFallback')}
                                    />
                                  </div>
                              </div>
                            </div>
                         </div>
                      ) : (
                        // Existing Fit Mode
                        <div
                          className={cn(
                            'relative flex',
                            useShrinkWrap ? 'w-auto h-auto' : 'w-full h-full'
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
                                  : 'object-contain'
                              )}
                              sizes="100vw"
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
                                  : 'object-contain'
                              )}
                              sizes="100vw"
                              priority
                            />
                          )}
                           {canPlayVideo && isPlaying && (
                            <video
                              ref={videoRef}
                              src={videoSrc}
                              autoPlay
                              controls
                              className="absolute inset-0 w-full h-full object-contain"
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
                              className="absolute z-10 inset-0 w-full h-full object-contain"
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
                              type="button"
                              aria-label={liveLabel}
                              onMouseEnter={() => setIsLivePreviewing(true)}
                              onMouseLeave={() => setIsLivePreviewing(false)}
                              onFocus={() => setIsLivePreviewing(true)}
                              onBlur={() => setIsLivePreviewing(false)}
                              onClick={(event) => event.stopPropagation()}
                              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          ) : isAnimated ? (
                            <div className="absolute right-3 top-3 z-10 flex h-5 items-center justify-center rounded-full bg-black/50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                              {t('badges.animated')}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Video/Live controls for Fit mode would go here if not already embedded above */}
                      
                      {canPlayVideo && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <button
                            onClick={startVideo}
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
              onClick={(e) => { e.stopPropagation(); requestAction({ type: 'next' }); }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm backdrop-blur transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
        {showFilmstrip && (
          <div className="relative h-24 px-6 md:px-8">
            {canScrollLeft ? (
              <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-10 bg-gradient-to-r from-zinc-50 to-transparent dark:from-zinc-950" />
            ) : null}
            {canScrollRight ? (
              <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-10 bg-gradient-to-l from-zinc-50 to-transparent dark:from-zinc-950" />
            ) : null}

            <div
              ref={filmstripRef}
              className={cn(
                'h-full flex items-center gap-3 overflow-x-auto custom-scrollbar pb-1',
                isDraggingFilmstrip ? 'cursor-grabbing select-none' : 'cursor-grab',
              )}
              onPointerDown={(event) => {
                if (!filmstripRef.current) return;
                setIsDraggingFilmstrip(true);
                dragPointerIdRef.current = event.pointerId;
                dragStartXRef.current = event.clientX;
                dragStartScrollLeftRef.current = filmstripRef.current.scrollLeft;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!isDraggingFilmstrip || !filmstripRef.current) return;
                if (dragPointerIdRef.current !== event.pointerId) return;
                const delta = event.clientX - dragStartXRef.current;
                filmstripRef.current.scrollLeft = dragStartScrollLeftRef.current - delta;
              }}
              onPointerUp={(event) => {
                if (dragPointerIdRef.current !== event.pointerId) return;
                setIsDraggingFilmstrip(false);
                dragPointerIdRef.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={(event) => {
                if (dragPointerIdRef.current !== event.pointerId) return;
                setIsDraggingFilmstrip(false);
                dragPointerIdRef.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
            >
              {items.map((thumb) => {
                const isActive = thumb.id === item.id;
                return (
                  <button
                    key={thumb.id}
                    type="button"
                    ref={(node) => {
                      thumbRefs.current[String(thumb.id)] = node;
                    }}
                    onClick={() => requestAction({ type: 'select', id: String(thumb.id) })}
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
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="w-[420px] flex-shrink-0 bg-white dark:bg-zinc-950/90 border-l border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-y-auto custom-scrollbar">
        <div className="p-6 space-y-8">
          <section className="flex justify-between items-start">
            <h2 className="text-lg font-bold tracking-tight text-primary dark:text-white leading-tight pr-4 break-words">
              {isEditing ? footTitle || item.title : item.title}
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
              <div className="relative h-40 w-full bg-zinc-50 dark:bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-100 dark:border-zinc-800 mb-2">
                 <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-900/70 text-zinc-400">
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
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-3">{t('details.camera')}</h3>
            <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="bg-white dark:bg-zinc-900/70 p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-zinc-400 mb-1">
                  <Ruler className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.focalLength')}</span>
                </div>
                <p className="text-[16px] font-bold">{focalLength ? `${focalLength} mm` : '-'}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900/70 p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Aperture className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.aperture')}</span>
                </div>
                <p className="text-[16px] font-bold">{apertureValue ? `f/${apertureValue}` : '-'}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900/70 p-4 flex flex-col">
                <div className="flex items-center space-x-2 text-gray-400 mb-1">
                  <Timer className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">{t('details.shutter')}</span>
                </div>
                <p className="text-[16px] font-bold">{exposureValue ?? '-'}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900/70 p-4 flex flex-col">
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
             <div className="h-24 w-full bg-zinc-50/50 dark:bg-zinc-900/50 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 p-2">
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

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setPendingAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('modal.unsavedTitle')}</DialogTitle>
            <DialogDescription>{t('modal.unsavedDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('modal.continueEditing')}
            </Button>
            <Button variant="outline" onClick={handleDiscardAndContinue}>
              {t('modal.discardAndContinue')}
            </Button>
            <Button onClick={() => void handleSaveAndContinue()} disabled={isSaving}>
              {isSaving ? t('modal.saving') : t('modal.saveAndContinue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
