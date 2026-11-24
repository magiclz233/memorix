'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Copy, Trash2, ShieldCheck, Fingerprint, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/app/lib/toast-utils';
import { moveMediaToTrash } from '@/app/lib/actions';

export type DedupGroupItem = {
  id: number;
  title: string | null;
  path: string;
  mediaType: string;
  size: number | null;
  storageId: number;
  storageType: string;
  mtime: string | null;
};

export type DedupGroup = {
  fileHash: string;
  count: number;
  totalSize: number;
  items: DedupGroupItem[];
};

type Props = {
  groups: DedupGroup[];
  summary: { groups: number; duplicateFiles: number; duplicateBytes: number };
};

const formatBytes = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export function DedupView({ groups, summary }: Props) {
  const t = useTranslations('dashboard.dedup');
  const router = useRouter();
  const [processingHash, setProcessingHash] = useState<string | null>(null);
  // 允许用户为每个重复组自由点选要保留的副本，默认保留 items[0]（最早项）
  const [selectedKeepByHash, setSelectedKeepByHash] = useState<Record<string, number>>({});
  const [confirmGroup, setConfirmGroup] = useState<DedupGroup | null>(null);
  const [, startTransition] = useTransition();

  const getKeepId = (group: DedupGroup) =>
    selectedKeepByHash[group.fileHash] ?? group.items[0]?.id;

  const confirmTrashRest = () => {
    if (!confirmGroup) return;
    const group = confirmGroup;
    const keepId = getKeepId(group);
    const trashIds = group.items
      .filter((item) => item.id !== keepId)
      .map((item) => item.id);
    setConfirmGroup(null);
    if (keepId == null || trashIds.length === 0) return;

    setProcessingHash(group.fileHash);
    startTransition(async () => {
      try {
        const result = await moveMediaToTrash(trashIds);
        if (result.success) {
          showSuccess(result.message);
          router.refresh();
        } else {
          showError(result.message);
        }
      } finally {
        setProcessingHash(null);
      }
    });
  };

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard?.writeText(hash).catch(() => {});
    showSuccess(t('hashCopied'));
  };

  if (groups.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-24 text-center dark:border-zinc-700'>
        <ShieldCheck className='mb-4 h-10 w-10 text-emerald-500' />
        <p className='text-sm font-medium text-zinc-500'>{t('noDuplicates')}</p>
        <p className='mt-1 text-xs text-zinc-400'>{t('noDuplicatesHint')}</p>
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {/* 摘要条 */}
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950'>
        <span className='font-mono text-muted-foreground tabular-nums'>
          {t('summaryGroups', { count: summary.groups })}
        </span>
        <span className='font-mono text-muted-foreground tabular-nums'>
          {t('summaryFiles', { count: summary.duplicateFiles })}
        </span>
        <span className='font-mono font-medium tabular-nums text-indigo-600 dark:text-indigo-400'>
          {t('summaryBytes', { size: formatBytes(summary.duplicateBytes) })}
        </span>
        <span className='text-xs text-amber-600 dark:text-amber-400'>{t('manualReviewNote')}</span>
      </div>

      {/* 分组列表 */}
      <div className='space-y-4'>
        {groups.map((group) => {
          const keepId = getKeepId(group);
          return (
            <div
              key={group.fileHash}
              className={cn(
                'rounded-2xl border bg-white p-4 dark:bg-zinc-950',
                processingHash === group.fileHash
                  ? 'border-zinc-300 opacity-60 dark:border-zinc-700'
                  : 'border-zinc-200 dark:border-zinc-800',
              )}
            >
              <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-xs text-zinc-500'>
                  <Fingerprint className='h-3.5 w-3.5' />
                  <code className='max-w-[24rem] truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-zinc-800'>
                    {group.fileHash}
                  </code>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    title={t('copyHash')}
                    onClick={() => void handleCopyHash(group.fileHash)}
                    className='h-6 w-6'
                  >
                    <Copy className='h-3 w-3' />
                  </Button>
                  <span>·</span>
                  <span>{t('groupCount', { count: group.count })}</span>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full'
                  disabled={processingHash === group.fileHash}
                  onClick={() => setConfirmGroup(group)}
                >
                  <Trash2 className='mr-2 h-3.5 w-3.5' />
                  {t('keepSelectedTrashRest')}
                </Button>
              </div>

              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6'>
                {group.items.map((item) => {
                  const isKept = item.id === keepId;
                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() =>
                        setSelectedKeepByHash((prev) => ({
                          ...prev,
                          [group.fileHash]: item.id,
                        }))
                      }
                      className={cn(
                        'overflow-hidden rounded-xl border text-left transition-all',
                        isKept
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600',
                      )}
                    >
                      <div className='relative aspect-square bg-zinc-100 dark:bg-zinc-900'>
                        <Image
                          src={`/api/media/thumb/${item.id}`}
                          alt={item.title ?? 'media'}
                          fill
                          unoptimized
                          sizes='(max-width: 640px) 50vw, 16vw'
                          className='object-cover'
                        />
                        {isKept ? (
                          <span className='absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white'>
                            <Check className='h-2.5 w-2.5' />
                            {t('keepBadge')}
                          </span>
                        ) : null}
                      </div>
                      <div className='space-y-0.5 p-2'>
                        <p className='truncate text-[11px] font-medium' title={item.path}>
                          {item.title ?? item.path}
                        </p>
                        <p className='truncate font-mono text-[10px] text-zinc-400' title={item.path}>
                          {item.storageType} · {formatBytes(item.size)}
                        </p>
                        {item.mtime ? (
                          <p className='truncate font-mono text-[10px] text-zinc-400'>
                            {item.mtime.slice(0, 10)}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog
        open={confirmGroup !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmGroup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDesc', { count: Math.max(0, (confirmGroup?.items.length ?? 1) - 1) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTrashRest}
              className='bg-rose-600 text-white hover:bg-rose-700'
            >
              {t('confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
