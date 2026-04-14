'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSwipeable } from 'react-swipeable';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Keyboard, X } from 'lucide-react';
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
import type { GalleryItem } from '@/app/lib/gallery';
import { updatePhotoDetails } from '@/app/lib/actions';
import { showError, showSuccess } from '@/app/lib/toast-utils';
import { authClient } from '@/lib/auth-client';
import { PhotoMediaCanvas } from './photo-detail/photo-media-canvas';
import { PhotoFilmstrip } from './photo-detail/photo-filmstrip';
import { PhotoInfoSidebar } from './photo-detail/photo-info-sidebar';

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

function normalizeTagsInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .map((item) => item.slice(0, 32)),
    ),
  ).slice(0, 12);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
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
  const [footTags, setFootTags] = useState((item.tags ?? []).join(', '));
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
  const isLive = Boolean(item.liveType && item.liveType !== 'none');
  const isAnimated = Boolean(item.isAnimated && item.animatedUrl);
  const canPlayVideo = isVideo;
  const videoSrc = item.videoUrl ?? `/api/media/stream/${item.id}`;
  const liveLabel =
    item.liveType === 'embedded' ? tMedia('motionPhoto') : tMedia('livePhoto');

  const originalTitle = item.title ?? '';
  const originalAuthor = item.author ?? '';
  const originalDate = toDateInputValue(item.dateShot);
  const originalTags = (item.tags ?? []).join(', ');
  const hasChanges =
    isEditing &&
    (footTitle !== originalTitle ||
      footAuthor !== originalAuthor ||
      footDate !== originalDate ||
      footTags !== originalTags);

  const resetEditFields = useCallback(() => {
    setFootTitle(item.title ?? '');
    setFootAuthor(item.author ?? '');
    setFootDate(toDateInputValue(item.dateShot));
    setFootTags((item.tags ?? []).join(', '));
  }, [item.author, item.dateShot, item.tags, item.title]);
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
          fd.set('tags', footTags.trim());

          const res = await updatePhotoDetails(fd);

          if (!res?.success) {
            showError(res?.message || t('modal.saveFailed'));
            resolve(false);
            return;
          }

          item.title = footTitle.trim();
          item.author = footAuthor.trim() || null;
          item.dateShot = footDate.trim() ? new Date(footDate).toISOString() : null;
          item.tags = normalizeTagsInput(footTags);

          showSuccess(res.message || t('modal.saved'));
          setIsEditing(false);
          resolve(true);
        } catch {
          showError(t('modal.saveFailed'));
          resolve(false);
        }
      });
    });
  }, [footAuthor, footDate, footTags, footTitle, hasChanges, isAdmin, isSaving, item, t]);

  const handleInlineSave = async () => {
    if (!isAdmin || isSaving) return;
    
    // Only check if changed compared to what is already on 'item'
    const oTitle = item.title ?? '';
    const oAuthor = item.author ?? '';
    const oDate = toDateInputValue(item.dateShot);
    const oTags = (item.tags ?? []).join(', ');

    if (footTitle === oTitle && footAuthor === oAuthor && footDate === oDate && footTags === oTags) {
      return;
    }

    startSaving(async () => {
      try {
        const fd = new FormData();
        fd.set('fileId', String(item.id));
        fd.set('title', footTitle.trim());
        fd.set('author', footAuthor.trim());
        fd.set('dateShot', footDate.trim());
        fd.set('tags', footTags.trim());

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
        item.tags = normalizeTagsInput(footTags);

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
  const showFilmstrip = items.length > 1 && typeof onSelect === 'function';

  const handleFilmstripPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!filmstripRef.current) return;
    setIsDraggingFilmstrip(true);
    dragPointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = filmstripRef.current.scrollLeft;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleFilmstripPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingFilmstrip || !filmstripRef.current) return;
    if (dragPointerIdRef.current !== event.pointerId) return;
    const delta = event.clientX - dragStartXRef.current;
    filmstripRef.current.scrollLeft = dragStartScrollLeftRef.current - delta;
  };

  const handleFilmstripPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    setIsDraggingFilmstrip(false);
    dragPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleFilmstripPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    setIsDraggingFilmstrip(false);
    dragPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };
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
          
          <PhotoMediaCanvas
            item={item}
            direction={direction}
            viewMode={viewMode}
            swipeHandlers={swipeHandlers}
            isAnimated={isAnimated}
            isLive={isLive}
            canPlayVideo={canPlayVideo}
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            isLivePreviewing={isLivePreviewing}
            videoSrc={videoSrc}
            liveLabel={liveLabel}
            isEditing={isEditing}
            isAdmin={isAdmin}
            footTitle={footTitle}
            footAuthor={footAuthor}
            footDate={footDate}
            setFootTitle={setFootTitle}
            setFootAuthor={setFootAuthor}
            setFootDate={setFootDate}
            handleInlineSave={handleInlineSave}
            startVideo={startVideo}
            setIsPlaying={setIsPlaying}
            setIsBuffering={setIsBuffering}
            setIsLivePreviewing={setIsLivePreviewing}
            videoRef={videoRef}
            t={t}
          />

          {hasNext && (
            <button 
              onClick={(e) => { e.stopPropagation(); requestAction({ type: 'next' }); }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 shadow-sm backdrop-blur transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
        <PhotoFilmstrip
          show={showFilmstrip}
          items={items}
          currentItemId={item.id}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          isDraggingFilmstrip={isDraggingFilmstrip}
          filmstripRef={filmstripRef}
          thumbRefs={thumbRefs}
          onRequestAction={requestAction}
          onPointerDown={handleFilmstripPointerDown}
          onPointerMove={handleFilmstripPointerMove}
          onPointerUp={handleFilmstripPointerUp}
          onPointerCancel={handleFilmstripPointerCancel}
        />
      </div>

      <PhotoInfoSidebar
        item={item}
        isEditing={isEditing}
        isAdmin={isAdmin}
        footTitle={footTitle}
        footTags={footTags}
        setFootTags={setFootTags}
        onSaveTags={handleInlineSave}
        locale={locale}
        t={t}
      />

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







