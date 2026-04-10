'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  deleteUserStorage,
  setUserStorageDisabled,
  checkStorageDependencies,
  setStoragePublished,
  clearStorageCache
} from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { StorageModal } from './storage-modal';
import { DependencyAlert } from './dependency-alert';
import { StatusIndicator } from '@/app/ui/dashboard/status-indicator';
import { Progress } from '@/components/ui/progress';
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
  Terminal,
  ChevronDown,
  PlusCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { showError, showSuccess, showWarning } from '@/app/lib/toast-utils';

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
type CacheMode = 'all' | 'lru';

type LogEntry = {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
};

type ScanningState = {
  active: boolean;
  progress: number;
  processed: number;
  total: number;
  logs: LogEntry[];
  done: boolean;
  error: string | null;
};

const STORAGE_ICONS = {
  local: HardDrive,
  nas: Server,
  s3: Cloud,
  qiniu: Server,
} as const;

export function StorageView({ storages }: { storages: StorageItem[] }) {
  const t = useTranslations('dashboard.storage');
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isPending, startTransition] = useTransition();
  const [isClearing, startClearing] = useTransition();
  
  // SSE Scanning States
  const [scanningStates, setScanningStates] = useState<Record<number, ScanningState>>({});
  const [showLogs, setShowLogs] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

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

  const [cacheOpen, setCacheOpen] = useState(false);
  const [cacheStorageId, setCacheStorageId] = useState<string>('');
  const [cacheMode, setCacheMode] = useState<CacheMode>('all');
  const [cacheDays, setCacheDays] = useState('30');

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [scanningStates, showLogs]);

  const updateScanState = useCallback((id: number, patch: Partial<ScanningState>) => {
    setScanningStates(prev => ({
        ...prev,
        [id]: { ...(prev[id] || { active: true, progress: 0, processed: 0, total: 0, logs: [], done: false, error: null }), ...patch }
    }));
  }, []);

  const addLog = useCallback((id: number, level: 'info' | 'warn' | 'error', message: string) => {
    setScanningStates(prev => {
        const state = prev[id] || { active: true, progress: 0, processed: 0, total: 0, logs: [], done: false, error: null };
        return {
            ...prev,
            [id]: {
                ...state,
                logs: [...state.logs.slice(-199), { level, message, timestamp: Date.now() }]
            }
        };
    });
  }, []);

  const handleScan = (storageId: number, mode: ScanMode = 'incremental') => {
    if (scanningStates[storageId]?.active) return;
    
    if (mode === 'full' && !window.confirm(t('view.alerts.confirmScanFull'))) {
      return;
    }

    // Initialize state
    updateScanState(storageId, { active: true, done: false, error: null, progress: 0, processed: 0, total: 0, logs: [] });
    setShowLogs(true);
    
    const eventSource = new EventSource(`/api/storage/scan?storageId=${storageId}&mode=${mode}`);

    eventSource.addEventListener('log', (e) => {
        try {
            const data = JSON.parse(e.data);
            addLog(storageId, data.level, data.message);
        } catch (err) {}
    });

    eventSource.addEventListener('progress', (e) => {
        try {
            const data = JSON.parse(e.data);
            const progress = data.total > 0 ? Math.round((data.processed / data.total) * 100) : 0;
            updateScanState(storageId, { 
                processed: data.processed, 
                total: data.total || 0,
                progress: progress
            });
        } catch (err) {}
    });

    eventSource.addEventListener('done', (e) => {
        try {
            const data = JSON.parse(e.data);
            updateScanState(storageId, { active: false, done: true, progress: 100 });
            showSuccess(data.message);
            eventSource.close();
            router.refresh();
        } catch (err) {
            eventSource.close();
        }
    });

    eventSource.addEventListener('error', (e) => {
        try {
            const data = JSON.parse(e.data);
            updateScanState(storageId, { active: false, error: data.message });
            showError(data.message);
            eventSource.close();
        } catch (err) {
            eventSource.close();
        }
    });

    eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
            updateScanState(storageId, { active: false });
        }
    };

    return () => eventSource.close();
  };

  const handleEdit = (storage: StorageItem) => {
    setEditingStorage(storage);
    setIsModalOpen(true);
  };

  const handleOpenCache = () => {
    if (storages.length === 0) {
      showWarning(t('view.cache.noStorage'));
      return;
    }
    if (!cacheStorageId) {
      setCacheStorageId(String(storages[0]?.id ?? ''));
    }
    setCacheOpen(true);
  };

  const handleClearCache = () => {
    const storageId = Number(cacheStorageId);
    if (!Number.isFinite(storageId) || storageId <= 0) {
      showWarning(t('view.cache.selectStorage'));
      return;
    }
    const days = Number(cacheDays);
    if (cacheMode === 'lru' && (!Number.isFinite(days) || days <= 0)) {
      showWarning(t('view.cache.invalidDays'));
      return;
    }
    startClearing(async () => {
      const result = await clearStorageCache(
        storageId,
        cacheMode,
        cacheMode === 'lru' ? days : undefined,
      );
      if (result.success) {
        showSuccess(result.message);
        setCacheOpen(false);
      } else {
        showError(result.message);
      }
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

  const confirmAlert = () => {
    if (pendingAction) {
      performAction(pendingAction.type, pendingAction.storageId);
    }
  };

  // Combine all active logs
  const activeLogs = Object.entries(scanningStates)
    .flatMap(([id, state]) => state.logs.map(log => ({ ...log, storageId: Number(id) })))
    .sort((a, b) => a.timestamp - b.timestamp);

  const storageOptions = storages.map((storage) => {
    const config = (storage.config ?? {}) as StorageConfig;
    const label = t(`view.types.${storage.type}`) || storage.type;
    const name = config.alias || config.rootPath || config.bucket || `${label} #${storage.id}`;
    return { id: storage.id, label: `${label} · ${name}` };
  });

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-1 rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full h-8 px-3"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              {t('view.modes.grid')}
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full h-8 px-3"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="mr-2 h-4 w-4" />
              {t('view.modes.list')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={handleOpenCache}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('view.cache.button')}
            </Button>
            <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700" onClick={() => { setEditingStorage(null); setIsModalOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('view.actions.add')}
            </Button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {storages.map((storage) => (
              <StorageCard
                key={storage.id}
                storage={storage}
                onEdit={() => handleEdit(storage)}
                onScan={(mode: ScanMode) => handleScan(storage.id, mode)}
                onDelete={() => checkAndProceed('delete', storage.id)}
                onToggleDisable={() => handleToggleDisable(storage)}
                onSetPublish={(pub: boolean) => setStoragePublished(storage.id, pub).then(() => router.refresh())}
                scanState={scanningStates[storage.id]}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="grid grid-cols-12 gap-4 border-b border-zinc-200 bg-zinc-50/50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
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
                onDelete={() => checkAndProceed('delete', storage.id)}
                onToggleDisable={() => handleToggleDisable(storage)}
                onSetPublish={(pub: boolean) => setStoragePublished(storage.id, pub).then(() => router.refresh())}
                scanState={scanningStates[storage.id]}
              />
            ))}
          </div>
        )}

        {/* Global Log Panel */}
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 transition-all duration-300 dark:bg-zinc-950 dark:border-zinc-800",
            showLogs ? "h-64" : "h-0 overflow-hidden"
        )}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-2 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{t('files.scan.logs')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowLogs(false)}>
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div ref={logContainerRef} className="h-full overflow-y-auto bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed custom-scrollbar">
                {activeLogs.length > 0 ? (
                    activeLogs.map((log, i) => (
                        <div key={i} className={cn(
                            "mb-1 flex gap-3",
                            log.level === 'error' ? "text-rose-400" : log.level === 'warn' ? "text-amber-400" : "text-emerald-400"
                        )}>
                            <span className="shrink-0 opacity-40">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                            <span className="shrink-0 font-bold opacity-60">SRV-{log.storageId}:</span>
                            <span className="break-all">{log.message}</span>
                        </div>
                    ))
                ) : (
                    <div className="flex h-32 items-center justify-center text-zinc-600 italic">
                        {t('files.scan.waitingLogs')}
                    </div>
                )}
            </div>
        </div>

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
        />

        <Dialog open={cacheOpen} onOpenChange={setCacheOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t('view.cache.title')}</DialogTitle>
              <DialogDescription>{t('view.cache.description')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase">{t('view.cache.storageLabel')}</Label>
                <Select value={cacheStorageId} onValueChange={setCacheStorageId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('view.cache.storagePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {storageOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase">{t('view.cache.modeLabel')}</Label>
                <Select value={cacheMode} onValueChange={(value) => setCacheMode(value as CacheMode)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('view.cache.modeAll')}</SelectItem>
                    <SelectItem value="lru">{t('view.cache.modeLru')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cacheMode === 'lru' ? (
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase">{t('view.cache.daysLabel')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cacheDays}
                    onChange={(event) => setCacheDays(event.target.value)}
                    placeholder={t('view.cache.daysPlaceholder')}
                    className="rounded-xl"
                  />
                </div>
              ) : null}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" className="rounded-full" onClick={() => setCacheOpen(false)}>
                {t('view.cache.cancel')}
              </Button>
              <Button 
                className="rounded-full bg-rose-600 hover:bg-rose-700" 
                onClick={handleClearCache} 
                disabled={isClearing}
              >
                {isClearing ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> {t('view.cache.clearing')}</>
                ) : (
                    t('view.cache.confirm')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function StorageCard({ storage, onEdit, onScan, onDelete, onToggleDisable, onSetPublish, scanState }: any) {
  const t = useTranslations('dashboard.storage');
  const config = (storage.config ?? {}) as StorageConfig;
  const Icon = STORAGE_ICONS[storage.type as keyof typeof STORAGE_ICONS] ?? HardDrive;
  const label = t(`view.types.${storage.type}`) || storage.type;
  const isDisabled = !!config.isDisabled;
  const isScanning = scanState?.active;

  return (
    <div className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:shadow-indigo-500/5",
        isScanning && "ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-500/10"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-500",
              isScanning ? "bg-indigo-500 text-white shadow-xl" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
          )}>
            <Icon className={cn("h-6 w-6", isScanning && "animate-pulse")} />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {config.alias || label}
            </h3>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
          </div>
        </div>
        <StatusIndicator 
          status={isScanning ? 'scanning' : (isDisabled ? 'disabled' : 'online')} 
          isScanning={isScanning}
        />
      </div>
      
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-hidden rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 shrink-0">{t('view.labels.path')}</span>
          <span className="truncate font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
            {config.rootPath || config.bucket || config.endpoint || '-'}
          </span>
        </div>

        {isScanning && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase text-indigo-500">
                    <span>{t('files.scan.scanning')}...</span>
                    <span>{scanState.progress}%</span>
                </div>
                <Progress value={scanState.progress} className="h-2" />
                <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>{scanState.processed} / {scanState.total || '?'} items</span>
                </div>
            </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-5 dark:border-zinc-800">
         <div className="flex -space-x-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onEdit} className="h-10 w-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Edit className="h-4 w-4 text-zinc-500" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t('view.actions.edit')}</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onScan('incremental')}
                        disabled={isScanning}
                        className={cn("h-10 w-10 rounded-full", isScanning ? "text-indigo-500 bg-indigo-50" : "hover:bg-zinc-100 text-zinc-500 dark:hover:bg-zinc-800")}
                    >
                        <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>{t('view.actions.scanIncremental')}</TooltipContent>
            </Tooltip>
         </div>
         
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-zinc-400">
                    <MoreHorizontal className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-400">{t('view.headers.actions')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onScan('incremental')} disabled={isScanning} className="rounded-lg m-1">
                    <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanIncremental')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onScan('full')} disabled={isScanning} className="rounded-lg m-1">
                    <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanFull')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleDisable} className="rounded-lg m-1">
                    {isDisabled ? (
                        <><PlusCircle className="mr-2 h-4 w-4" /> {t('view.actions.enable')}</>
                    ) : (
                        <><Power className="mr-2 h-4 w-4" /> {t('view.actions.disable')}</>
                    )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetPublish(true)} className="rounded-lg m-1">
                    <Eye className="mr-2 h-4 w-4" /> {t('view.actions.publishAll')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetPublish(false)} className="rounded-lg m-1">
                    <EyeOff className="mr-2 h-4 w-4" /> {t('view.actions.hideAll')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-rose-600 rounded-lg m-1">
                    <Trash2 className="mr-2 h-4 w-4" /> {t('view.actions.delete')}
                </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>
    </div>
  );
}

function StorageRow({ storage, onEdit, onScan, onDelete, onToggleDisable, onSetPublish, scanState }: any) {
    const t = useTranslations('dashboard.storage');
    const config = (storage.config ?? {}) as StorageConfig;
    const label = t(`view.types.${storage.type}`) || storage.type;
    const isDisabled = !!config.isDisabled;
    const isScanning = scanState?.active;

    return (
        <div className={cn(
            "grid grid-cols-12 gap-4 border-b border-zinc-100 px-6 py-4 text-sm transition-colors dark:border-zinc-800",
            isScanning ? "bg-indigo-50/30 dark:bg-indigo-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
        )}>
            <div className="col-span-3 flex items-center font-bold text-zinc-900 dark:text-zinc-100">
                <div className="flex items-center gap-3">
                    {isScanning && <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" />}
                    {config.alias || label}
                </div>
            </div>
            <div className="col-span-2 flex items-center text-xs font-bold uppercase tracking-widest text-zinc-400">
                {label}
            </div>
            <div className="col-span-4 flex flex-col justify-center">
                <span className="truncate font-mono text-[11px] text-zinc-500" title={config.rootPath || config.bucket || ''}>
                    {config.rootPath || config.bucket || config.endpoint || '-'}
                </span>
                {isScanning && (
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${scanState.progress}%` }} />
                    </div>
                )}
            </div>
            <div className="col-span-1 flex items-center">
                 <StatusIndicator 
                   status={isScanning ? 'scanning' : (isDisabled ? 'disabled' : 'online')} 
                   showLabel={true}
                   isScanning={isScanning}
                 />
            </div>
            <div className="col-span-2 flex items-center justify-end space-x-1">
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 rounded-full">
                    <Edit className="h-4 w-4 text-zinc-400" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => onScan('incremental')} disabled={isScanning}>
                            <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanIncremental')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScan('full')} disabled={isScanning}>
                            <RefreshCw className="mr-2 h-4 w-4" /> {t('view.actions.scanFull')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onToggleDisable}>
                            {isDisabled ? t('view.actions.enable') : t('view.actions.disable')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-rose-600 font-medium">
                            {t('view.actions.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
