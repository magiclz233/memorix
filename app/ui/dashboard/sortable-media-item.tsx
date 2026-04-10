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
  onPreview?: () => void;
};

export function SortableMediaItem({
  id,
  imageUrl,
  title,
  onRemove,
  onPreview,
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
        'group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-800',
        isDragging 
          ? 'z-50 scale-105 shadow-2xl ring-2 ring-indigo-500 border-indigo-500 opacity-80' 
          : 'hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
      )}
    >
      <Image
        src={imageUrl}
        alt={title || 'Media'}
        fill
        sizes="(max-width: 640px) 50vw, 200px"
        className={cn(
          "object-cover transition-transform duration-500",
          !isDragging && "group-hover:scale-105"
        )}
        onClick={onPreview}
      />

      <div 
        className={cn(
          "absolute inset-0 bg-black/0 transition-colors pointer-events-none",
          !isDragging && "group-hover:bg-black/10 dark:group-hover:bg-black/40"
        )}
      />

      {/* Drag Handle */}
      <div
        className={cn(
          "absolute left-2 top-2 cursor-grab rounded-md p-1.5 backdrop-blur transition-all duration-200",
          isDragging 
            ? "bg-indigo-500 text-white shadow-lg opacity-100" 
            : "bg-white/80 text-zinc-700 opacity-0 group-hover:opacity-100 hover:bg-white dark:bg-black/50 dark:text-zinc-200 dark:hover:bg-black/80"
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Remove Button */}
      {!isDragging && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 rounded-md opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onRemove(id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Title Label */}
      {title && (
        <div className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-6 transition-opacity duration-300",
          isDragging ? "opacity-0" : "opacity-100"
        )}>
          <p className="truncate text-xs font-medium text-white">{title}</p>
        </div>
      )}
    </div>
  );
}
