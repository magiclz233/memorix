'use client';

import { useState, useTransition } from 'react';
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

const STORAGE_ICONS = {
  local: HardDrive,
  nas: HardDrive,
  s3: Cloud,
  qiniu: Server,
} as const;

const STORAGE_LABELS = {
  local: '本地存储',
  nas: 'NAS 存储',
  s3: 'S3 兼容',
  qiniu: '七牛云',
} as const;

export function StorageView({ storages }: { storages: StorageItem[] }) {
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

  const handleScan = (storageId: number) => {
    if (scanningId) return;
    setScanningId(storageId);
    startTransition(async () => {
      try {
        const result = await scanStorage(storageId);
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
          ? '确定要发布该数据源下的所有图片吗？'
          : '确定要隐藏该数据源下的所有图片吗？',
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
          <Button onClick={handleAdd}>新增数据源</Button>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storages.map((storage) => (
              <StorageCard
                key={storage.id}
                storage={storage}
                onEdit={() => handleEdit(storage)}
              onScan={() => handleScan(storage.id)}
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
              <div className="col-span-3">名称/别名</div>
              <div className="col-span-2">类型</div>
              <div className="col-span-4">路径/配置</div>
              <div className="col-span-1">状态</div>
              <div className="col-span-2 text-right">操作</div>
            </div>
            {storages.map((storage) => (
              <StorageRow
                key={storage.id}
                storage={storage}
                onEdit={() => handleEdit(storage)}
              onScan={() => handleScan(storage.id)}
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
          title={pendingAction?.type === 'delete' ? '确认删除' : '确认停用'}
          description={
            pendingAction?.type === 'delete'
              ? '删除该数据源将永久删除其下的所有文件，并从以下集合中移除相关引用。'
              : '停用该数据源将导致以下集合中的相关图片不再显示。'
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
  const config = (storage.config ?? {}) as StorageConfig;
  const Icon = STORAGE_ICONS[storage.type as keyof typeof STORAGE_ICONS] ?? HardDrive;
  const label = STORAGE_LABELS[storage.type as keyof typeof STORAGE_LABELS] ?? storage.type;
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
              <TooltipContent>编辑配置</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onScan} disabled={isScanning} className="h-8 px-2">
                    <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>扫描目录获取图片</TooltipContent>
            </Tooltip>
         </div>
         
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleDisable}>
                    {isDisabled ? (
                        <><Power className="mr-2 h-4 w-4" /> 启用</>
                    ) : (
                        <><Power className="mr-2 h-4 w-4" /> 停用</>
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetPublish(true)}>
                    <Eye className="mr-2 h-4 w-4" /> 全部发布
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetPublish(false)}>
                    <EyeOff className="mr-2 h-4 w-4" /> 全部隐藏
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600 dark:text-red-400">
                    <Trash2 className="mr-2 h-4 w-4" /> 删除
                </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
    </div>
  );
}

function StorageRow({ storage, onEdit, onScan, onDelete, onToggleDisable, onSetPublish, isScanning }: any) {
    const config = (storage.config ?? {}) as StorageConfig;
    const label = STORAGE_LABELS[storage.type as keyof typeof STORAGE_LABELS] ?? storage.type;
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
                  <TooltipContent>编辑配置</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={onScan} disabled={isScanning} className="h-8 w-8 p-0">
                        <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>扫描目录获取图片</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onToggleDisable}>
                            {isDisabled ? (
                                <><Power className="mr-2 h-4 w-4" /> 启用</>
                            ) : (
                                <><Power className="mr-2 h-4 w-4" /> 停用</>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetPublish(true)}>
                            <Eye className="mr-2 h-4 w-4" /> 全部发布
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetPublish(false)}>
                            <EyeOff className="mr-2 h-4 w-4" /> 全部隐藏
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" /> 编辑配置
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> 删除
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
