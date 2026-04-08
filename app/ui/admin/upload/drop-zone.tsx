'use client';

import { FolderUp, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { formatBytes } from '@/app/lib/upload-task-utils';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DropZoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  accept: string;
};

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  file?: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
  createReader?: () => {
    readEntries: (
      successCallback: (entries: FileSystemEntryLike[]) => void,
      errorCallback?: (error: DOMException) => void,
    ) => void;
  };
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
};

function isAcceptedFile(file: File, accept: string) {
  const rules = accept
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (rules.length === 0) {
    return true;
  }

  return rules.some((rule) => {
    if (rule.endsWith('/*')) {
      const prefix = rule.slice(0, -1);
      return file.type.startsWith(prefix);
    }

    if (rule.startsWith('.')) {
      return file.name.toLowerCase().endsWith(rule.toLowerCase());
    }

    return file.type === rule;
  });
}

async function readDirectoryEntries(entry: FileSystemEntryLike) {
  if (!entry.createReader) {
    return [] as FileSystemEntryLike[];
  }

  const reader = entry.createReader();
  const output: FileSystemEntryLike[] = [];

  while (true) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve) => {
      reader.readEntries(
        (entries) => resolve(entries),
        () => resolve([]),
      );
    });

    if (batch.length === 0) {
      break;
    }

    output.push(...batch);
  }

  return output;
}

async function traverseFileTree(entry: FileSystemEntryLike): Promise<File[]> {
  const readFile = entry.file;
  if (entry.isFile && readFile) {
    return new Promise<File[]>((resolve) => {
      readFile(
        (file) => resolve([file]),
        () => resolve([]),
      );
    });
  }

  if (entry.isDirectory) {
    const entries = await readDirectoryEntries(entry);
    const nested = await Promise.all(entries.map((item) => traverseFileTree(item)));
    return nested.flat();
  }

  return [];
}

export function DropZone({ files, onChange, disabled, accept }: DropZoneProps) {
  const t = useTranslations('dashboard.upload');
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!folderInputRef.current) {
      return;
    }

    folderInputRef.current.setAttribute('webkitdirectory', 'true');
    folderInputRef.current.setAttribute('directory', 'true');
  }, []);

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );

  const mergeFiles = (incoming: File[]) => {
    const accepted = incoming.filter((file) => isAcceptedFile(file, accept));
    if (accepted.length === 0) {
      return;
    }

    const map = new Map<string, File>();
    [...files, ...accepted].forEach((file) => {
      map.set(`${file.name}:${file.size}:${file.lastModified}`, file);
    });

    onChange(Array.from(map.values()));
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    if (disabled) {
      return;
    }

    const items = Array.from(event.dataTransfer.items || []);
    const withEntries = items.filter(
      (item): item is DataTransferItemWithEntry =>
        typeof (item as DataTransferItemWithEntry).webkitGetAsEntry === 'function',
    );

    if (withEntries.length > 0) {
      const fileGroups = await Promise.all(
        withEntries.map(async (item) => {
          const entry = item.webkitGetAsEntry?.();
          if (!entry) {
            return [] as File[];
          }
          return traverseFileTree(entry);
        }),
      );

      mergeFiles(fileGroups.flat());
      return;
    }

    mergeFiles(Array.from(event.dataTransfer.files || []));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-center transition dark:border-zinc-700 dark:bg-zinc-900/40',
          dragging
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10'
            : null,
          disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        )}
      >
        <UploadCloud className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {t('dragHere')}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t('dragDescription')}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            {t('selectFiles')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => folderInputRef.current?.click()}
            disabled={disabled}
          >
            <FolderUp className="h-3.5 w-3.5" />
            {t('selectFolder')}
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(event) => {
          mergeFiles(Array.from(event.target.files || []));
          event.currentTarget.value = '';
        }}
        disabled={disabled}
      />

      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          mergeFiles(Array.from(event.target.files || []));
          event.currentTarget.value = '';
        }}
        disabled={disabled}
      />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t('selectedFiles', {
          count: files.length,
          size: formatBytes(totalSize),
        })}
      </p>
    </div>
  );
}