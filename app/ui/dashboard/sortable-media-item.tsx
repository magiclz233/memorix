'use client';

import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SortableMediaItemProps = {
  id: number;
  imageUrl: string;
  title: string | null;
  onRemove: (id: number) => void;
};

export function SortableMediaItem({
  id,
  imageUrl,
  title,
  onRemove,
}: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800',
        isDragging && 'shadow-xl ring-2 ring-indigo-500'
      )}
    >
      <Image
        src={imageUrl}
        alt={title || 'Media'}
        fill
        sizes="(max-width: 640px) 50vw, 200px"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 dark:group-hover:bg-black/40" />

      {/* Drag Handle */}
      <div
        className="absolute left-2 top-2 cursor-grab rounded-md bg-white/80 p-1.5 text-zinc-700 backdrop-blur opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 dark:bg-black/50 dark:text-zinc-200 dark:hover:bg-black/80"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Remove Button */}
      <Button
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 rounded-md opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onRemove(id)}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Title Label */}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6">
          <p className="truncate text-xs font-medium text-white">{title}</p>
        </div>
      )}
    </div>
  );
}
