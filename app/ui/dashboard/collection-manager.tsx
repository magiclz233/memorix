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
  addItemsToCollection,
  removeItemsFromCollection,
  reorderCollectionItems,
  addItemsToVideoSeries,
  removeItemsFromVideoSeries,
  reorderVideoSeriesItems,
} from '@/app/lib/actions/collections';
import { Plus, ArrowLeft, Loader2, Images } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';

type CollectionItem = {
  file: {
    id: number;
    title: string | null;
    url: string | null;
    thumbUrl: string | null;
  };
  sortOrder: number;
};

type CollectionManagerProps = {
  collection: {
    id: number;
    title: string;
  };
  initialItems: CollectionItem[];
  type: 'photo' | 'video';
};

export function CollectionManager({
  collection,
  initialItems,
  type,
}: CollectionManagerProps) {
  const t = useTranslations('dashboard.collections');
  const [items, setItems] = useState(initialItems);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
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
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.file.id === active.id);
        const newIndex = items.findIndex((item) => item.file.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update sort orders
        const reorderedItems = newItems.map((item, index) => ({
          ...item,
          sortOrder: index + 1,
        }));

        // Call server action
        startTransition(async () => {
          const updates = reorderedItems.map((item) => ({
            fileId: item.file.id,
            sortOrder: item.sortOrder,
          }));
          if (type === 'photo') {
            await reorderCollectionItems(collection.id, updates);
          } else {
            await reorderVideoSeriesItems(collection.id, updates);
          }
        });

        return reorderedItems;
      });
    }
  };

  const handleRemove = (fileId: number) => {
    // Optimistic update
    setItems((prev) => prev.filter((item) => item.file.id !== fileId));
    
    startTransition(async () => {
      if (type === 'photo') {
        await removeItemsFromCollection(collection.id, [fileId]);
      } else {
        await removeItemsFromVideoSeries(collection.id, [fileId]);
      }
      router.refresh();
    });
  };

  const handleAddMedia = (selectedIds: number[]) => {
    startTransition(async () => {
      if (type === 'photo') {
        await addItemsToCollection(collection.id, selectedIds);
      } else {
        await addItemsToVideoSeries(collection.id, selectedIds);
      }
      setIsPickerOpen(false);
      router.refresh();
      // Note: We depend on router.refresh() to get new items because we don't have full file details here
      // unless we pass them back from MediaPicker, but MediaPicker items structure might differ slightly.
      // For simplicity, refresh is safer.
    });
  };

  return (
    <div className="space-y-8">
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
                {items.length} items
             </span>
          </div>
        </div>
        <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-indigo-500/20">
              <Plus className="mr-2 h-4 w-4" />
              Add Media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0">
             <DialogHeader className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <DialogTitle>Select Media to Add</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
                <MediaPicker
                onConfirm={handleAddMedia}
                onCancel={() => setIsPickerOpen(false)}
                disabledIds={items.map((item) => item.file.id)}
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
          <p className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">No items in this collection</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Start by adding some photos or videos</p>
          <Button variant="outline" className="mt-6" onClick={() => setIsPickerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Media
          </Button>
        </div>
      )}
    </div>
  );
}
