'use client';

import { useState, useTransition } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SortableMediaItem } from './sortable-media-item';
import { MediaPicker } from './media-picker';
import {
  addMediaToCollection,
  removeMediaFromCollection,
  reorderMedia,
} from '@/app/lib/actions/unified-collections';
import { Plus, ArrowLeft, Images } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { Gallery25 } from '@/components/gallery25';
import type { GalleryItem } from '@/app/lib/gallery';

type CollectionItem = {
  file: {
    id: number;
    title: string | null;
    url: string | null;
    thumbUrl: string | null;
    mediaType?: string | null;
    width?: number | null;
    height?: number | null;
    blurHash?: string | null;
    videoDuration?: number | null;
  };
  sortOrder: number;
};

type CollectionManagerProps = {
  collection: {
    id: number;
    title: string;
    type: 'mixed' | 'photo' | 'video';
  };
  initialItems: CollectionItem[];
};

export function CollectionManager({
  collection,
  initialItems,
}: CollectionManagerProps) {
  const t = useTranslations('dashboard.collections');
  const tManager = useTranslations('dashboard.collections.manager');
  const [items, setItems] = useState(initialItems);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();


  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.file.id === active.id);
      const newIndex = items.findIndex((item) => item.file.id === over?.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = arrayMove(items, oldIndex, newIndex);

      // 更新排序权重
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }));

      // 乐观更新
      setItems(reorderedItems);

      // 同步服务端排序
      startTransition(async () => {
        const updates = reorderedItems.map((item) => ({
          fileId: item.file.id,
          sortOrder: item.sortOrder,
        }));
        await reorderMedia(collection.id, updates);
      });
    }
  };

  const handleRemove = (fileId: number) => {
    // 乐观更新
    setItems((prev) => prev.filter((item) => item.file.id !== fileId));
    
    startTransition(async () => {
      await removeMediaFromCollection(collection.id, [fileId]);
      router.refresh();
    });
  };

  const handleAddMedia = (selectedIds: number[]) => {
    startTransition(async () => {
      await addMediaToCollection(collection.id, selectedIds);
      setIsPickerOpen(false);
      router.refresh();
      // 依赖 router.refresh() 拉取最新详情，避免本地缺少完整文件信息
    });
  };

  const galleryItems: GalleryItem[] = items.map((item) => ({
    id: String(item.file.id),
    type: item.file.mediaType === 'video' ? 'video' : 'photo',
    src: item.file.url || '',
    title: item.file.title || '',
    description: null,
    width: item.file.width ?? null,
    height: item.file.height ?? null,
    blurHash: item.file.blurHash ?? null,
    videoUrl:
      item.file.mediaType === 'video'
        ? `/api/media/stream/${item.file.id}`
        : undefined,
    duration: item.file.videoDuration ?? null,
    animatedUrl: null,
    isAnimated: false,
    camera: null,
    maker: null,
    lens: null,
    exposure: null,
    aperture: null,
    iso: null,
    focalLength: null,
    flash: null,
    exposureProgram: null,
    whiteBalance: null,
    gpsLatitude: null,
    gpsLongitude: null,
    size: null,
    dateShot: null,
    createdAt: null,
    liveType: 'none',
  }));

  return (
    <div className="space-y-8">
      <Gallery25
        items={galleryItems}
        showGrid={false}
        showChrome={false}
        selectedId={selectedId}
        onSelectedIdChange={setSelectedId}
      />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/collections"
              className="group flex items-center text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              {t('title')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {collection.title}
             </h1>
             <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                {tManager('items', { count: items.length })}
             </span>
          </div>
        </div>
        <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-indigo-500/20">
              <Plus className="mr-2 h-4 w-4" />
              {tManager('addMedia')}
            </Button>
          </DialogTrigger>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0">
           <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <DialogTitle>{tManager('selectMedia')}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
                <MediaPicker
                onConfirm={handleAddMedia}
                onCancel={() => setIsPickerOpen(false)}
                disabledIds={items.map((item) => item.file.id)}
                allowedMediaTypes={
                  collection.type === 'photo'
                    ? ['image', 'animated']
                    : collection.type === 'video'
                      ? ['video']
                      : ['image', 'animated', 'video']
                }
                />
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.file.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <SortableMediaItem
                key={item.file.id}
                id={item.file.id}
                imageUrl={item.file.thumbUrl || item.file.url || ''}
                title={item.file.title}
                onRemove={handleRemove}
                onPreview={() => setSelectedId(String(item.file.id))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {items.length === 0 && (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <Images className="h-8 w-8 text-zinc-400" />
          </div>
          <p className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {tManager('emptyTitle')}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {tManager('emptyDescription')}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setIsPickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {tManager('addMedia')}
          </Button>
        </div>
      )}
    </div>
  );
}
