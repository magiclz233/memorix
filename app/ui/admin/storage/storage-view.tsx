'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  deleteUserStorage,
  setUserStorageDisabled,
  scanStorage,
  checkStorageDependencies,
  setStoragePublished
} from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { StorageModal } from './storage-modal';
import { DependencyAlert } from './dependency-alert';
import { StatusIndicator } from '@/app/ui/dashboard/status-indicator';
import {
  HardDrive,
  Cloud,
  Server,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  Trash2,
  Power,
  Eye,
  EyeOff,
  Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type StorageItem = {
  id: number;
  type: string;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  isDisabled?: boolean;
};

type ScanMode = 'incremental' | 'full';

const STORAGE_ICONS = {
  local: HardDrive,
  nas: HardDrive,
  s3: Cloud,
  qiniu: Server,
} as const;

export function StorageView({ storages }: { storages: StorageItem[] }) {
  const t = useTranslations('dashboard.storage');
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPending, startTransition] = useTransition();
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStorage, setEditingStorage] = useState<StorageItem | null>(null);
  
  // Alert states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertDependencies, setAlertDependencies] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<{
    type: 'disable' | 'delete';
    storageId: number;
  } | null>(null);

  const [scanningId, setScanningId] = useState<number | null>(null);

  const handleAdd = () => {
    setEditingStorage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (storage: StorageItem) => {
    setEditingStorage(storage);
    setIsModalOpen(true);
  };

  const handleScan = (storageId: number, mode: ScanMode = 'incremental') => {
    if (scanningId) return;
    if (mode === 'full' && !confirm(t('view.alerts.confirmScanFull'))) {
      return;
    }
    setScanningId(storageId);
    startTransition(async () => {
      try {
        const result = await scanStorage(storageId, mode);
        if (!result.success) {
          alert(result.message);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setScanningId(null);
        router.refresh();
      }
    });
  };

  const handleSetPublish = (storageId: number, publish: boolean) => {
    if (
      !confirm(
        publish
          ? t('view.alerts.confirmPublish')
          : t('view.alerts.confirmHide'),
      )
    ) {
      return;
    }
    startTransition(async () => {
      await setStoragePublished(storageId, publish);
      router.refresh();
    });
  };

  const checkAndProceed = async (type: 'disable' | 'delete', storageId: number) => {
    const result = await checkStorageDependencies(storageId);
    if (result.success && result.dependencies && result.dependencies.length > 0) {
      setAlertDependencies(result.dependencies);
      setPendingAction({ type, storageId });
      setAlertOpen(true);
    } else {
      performAction(type, storageId);
    }
  };

  const performAction = (type: 'disable' | 'delete', storageId: number) => {
    startTransition(async () => {
      if (type === 'disable') {
        await setUserStorageDisabled(storageId, true);
      } else {
        await deleteUserStorage(storageId);
      }
      setAlertOpen(false);
      setPendingAction(null);
      router.refresh();
    });
  };

  const handleToggleDisable = (storage: StorageItem) => {
    const config = (storage.config ?? {}) as StorageConfig;
    const isDisabled = !!config.isDisabled;

    if (isDisabled) {
      startTransition(async () => {
        await setUserStorageDisabled(storage.id, false);
        router.refresh();
      });
    } else {
      checkAndProceed('disable', storage.id);
    }
  };

  const handleDelete = (storageId: number) => {
    checkAndProceed('delete', storageId);
  };

  const confirmAlert = () => {
    if (pendingAction) {
      performAction(pendingAction.type, pendingAction.storageId);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleAdd}>{t('view.actions.add')}</Button>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storages.map((storage) => (
              <StorageCard
                key={storage.id}
                storage={storage}
                onEdit={() => handleEdit(storage)}
                onScan={(mode: ScanMode) => handleScan(storage.id, mode)}
                onDelete={() => handleDelete(storage.id)}
                onToggleDisable={() => handleToggleDisable(storage)}
                onSetPublish={(pub: boolean) => handleSetPublish(storage.id, pub)}
                isScanning={scanningId === storage.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <div className="col-span-3">{t('view.headers.name')}</div>
              <div className="col-span-2">{t('view.headers.type')}</div>
              <div className="col-span-4">{t('view.headers.path')}</div>
              <div className="col-span-1">{t('view.headers.status')}</div>
              <div className="col-span-2 text-right">{t('view.headers.actions')}</div>
            </div>
            {storages.map((storage) => (
              <StorageRow
                key={storage.id}
                storage={storage}
                onEdit={() => handleEdit(storage)}
                onScan={(mode: ScanMode) => handleScan(storage.id, mode)}
                onDelete={() => handleDelete(storage.id)}
                onToggleDisable={() => handleToggleDisable(storage)}
                onSetPublish={(pub: boolean) => handleSetPublish(storage.id, pub)}
                isScanning={scanningId === storage.id}
              />
            ))}
          </div>
        )}

        <StorageModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          storage={editingStorage}
        />

        <DependencyAlert
          open={alertOpen}
          onOpenChange={setAlertOpen}
          dependencies={alertDependencies}
          onConfirm={confirmAlert}
          isConfirming={isPending}
          title={pendingAction?.type === 'delete' ? t('view.alerts.deleteTitle') : t('view.alerts.disableTitle')}
          description={
            pendingAction?.type === 'delete'
              ? t('view.alerts.deleteDesc')
              : t('view.alerts.disableDesc')
          }
        />
      </div>
    </TooltipProvider>
  );
}

function StorageCard({
  storage,
  onEdit,
  onScan,
  onDelete,
  onToggleDisable,
  onSetPublish,
  isScanning,
}: any) {
  const t = useTranslations('dashboard.storage');
  const config = (storage.config ?? {}) as StorageConfig;
  const Icon = STORAGE_ICONS[storage.type as keyof typeof STORAGE_ICONS] ?? HardDrive;
  const label = t(`view.types.${storage.type}`) || storage.type;
  const isDisabled = !!config.isDisabled;

  return (
    <div className="relative flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
            <Icon className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {config.alias || label}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
          </div>
        </div>
        <StatusIndicator 
          status={isScanning ? 'scanning' : (isDisabled ? 'disabled' : 'online')} 
        />
      </div>
      
      <div className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="truncate" title={config.rootPath || config.bucket || ''}>
          <span className="font-medium text-zinc-900 dark:text-zinc-200">Path: </span>
          <span className="font-mono text-xs">{config.rootPath || config.bucket || config.endpoint || '-'}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800/50">
         <div className="flex space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2">
                    <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('view.actions.edit')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onScan('incremental')}
                  disabled={isScanning}
                  className="h-8 px-2"
                >
                    <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('view.actions.scanIncremental')}</TooltipContent>
            </Tooltip>
         </div>
         
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('view.headers.actions')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onScan('incremental')} disabled={isScanning}>
                    <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanIncremental')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onScan('full')} disabled={isScanning}>
                    <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanFull')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleDisable}>
                    {isDisabled ? (
                        <><Power className="mr-2 h-4 w-4" /> {t('view.actions.enable')}</>
                    ) : (
                        <><Power className="mr-2 h-4 w-4" /> {t('view.actions.disable')}</>
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetPublish(true)}>
                    <Eye className="mr-2 h-4 w-4" /> {t('view.actions.publishAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetPublish(false)}>
                    <EyeOff className="mr-2 h-4 w-4" /> {t('view.actions.hideAll')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" /> {t('view.actions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
    </div>
  );
}

function StorageRow({ storage, onEdit, onScan, onDelete, onToggleDisable, onSetPublish, isScanning }: any) {
    const t = useTranslations('dashboard.storage');
    const config = (storage.config ?? {}) as StorageConfig;
    const label = t(`view.types.${storage.type}`) || storage.type;
    const isDisabled = !!config.isDisabled;

    return (
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-100 px-4 py-3 text-sm last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50">
            <div className="col-span-3 flex items-center font-medium text-zinc-900 dark:text-zinc-100">
                {config.alias || label}
            </div>
            <div className="col-span-2 flex items-center text-zinc-500">
                {label}
            </div>
            <div className="col-span-4 flex items-center truncate text-zinc-500 font-mono text-xs" title={config.rootPath || config.bucket || ''}>
                {config.rootPath || config.bucket || config.endpoint || '-'}
            </div>
            <div className="col-span-1 flex items-center">
                 <StatusIndicator 
                   status={isScanning ? 'scanning' : (isDisabled ? 'disabled' : 'online')} 
                   showLabel={true}
                 />
            </div>
            <div className="col-span-2 flex items-center justify-end space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('view.actions.edit')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onScan('incremental')}
                      disabled={isScanning}
                      className="h-8 w-8 p-0"
                    >
                        <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('view.actions.scanIncremental')}</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onScan('incremental')} disabled={isScanning}>
                            <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanIncremental')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScan('full')} disabled={isScanning}>
                            <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanFull')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onToggleDisable}>
                            {isDisabled ? (
                                <><Power className="mr-2 h-4 w-4" /> {t('view.actions.enable')}</>
                            ) : (
                                <><Power className="mr-2 h-4 w-4" /> {t('view.actions.disable')}</>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetPublish(true)}>
                            <Eye className="mr-2 h-4 w-4" /> {t('view.actions.publishAll')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetPublish(false)}>
                            <EyeOff className="mr-2 h-4 w-4" /> {t('view.actions.hideAll')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" /> {t('view.actions.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> {t('view.actions.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
