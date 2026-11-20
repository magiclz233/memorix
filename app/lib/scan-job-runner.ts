import {
  claimNextScanJob,
  finishScanJob,
  isScanJobCancelRequested,
  recoverStaleScanJobs,
  updateScanJobProgress,
  appendScanJobError,
  appendScanJobLog,
  type ScanJobRecord,
} from '@/app/lib/data/scan-jobs';
import { EMPTY_STATS, shouldPersistProgress } from '@/app/lib/scan-job-state';
import {
  runStorageScan,
  runS3StorageScan,
  ScanCancelledError,
} from '@/app/lib/storage-scan';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { userStorages } from '@/app/lib/schema';
import { revalidatePathForAllLocales } from '@/app/lib/revalidate';

/**
 * 扫描任务 runner（P1-6）。
 *
 * 设计要点：
 * - 单例：跨 dev 热重载安全（globalThis 符号守卫）；
 * - 轮询 + 立即 kick：入队 API 调 kick() 让任务毫秒级启动；
 * - 同时只跑一个扫描任务（NAS 单实例语义，也让「防并发重扫」绝对成立）；
 * - 服务器重启恢复：running 判中断，queued 继续排队；
 * - 取消是协作式：扫描内部每批/每目录轮询 cancelRequested。
 */

const RUNNER_POLL_INTERVAL_MS = 2000;
/** 回收站日清理间隔（24h） */
const TRASH_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** 启动后首次回收站清理的延迟（避开启动高峰） */
const TRASH_PURGE_BOOT_DELAY_MS = 60 * 1000;

type ScanRunnerState = {
  started: boolean;
  wake: (() => void) | null;
};

// globalThis 守卫：dev 模式模块重载不会出现第二个 runner
const globalForRunner = globalThis as unknown as {
  __memorixScanRunner?: ScanRunnerState;
};

function getRunnerState(): ScanRunnerState {
  if (!globalForRunner.__memorixScanRunner) {
    globalForRunner.__memorixScanRunner = { started: false, wake: null };
  }
  return globalForRunner.__memorixScanRunner;
}

/** 外部（入队 API）触发立即轮询，避免等 2s */
export function kickScanRunner(): void {
  const state = getRunnerState();
  state.wake?.();
}

async function executeScanJob(job: ScanJobRecord): Promise<void> {
  const storage = await db.query.userStorages.findFirst({
    where: eq(userStorages.id, job.storageId),
  });

  if (!storage) {
    await finishScanJob(job.id, {
      status: 'failed',
      errorMessage: 'storage not found',
    });
    return;
  }

  const config = (storage.config ?? {}) as Record<string, unknown>;
  const disabled = config.isDisabled === true;
  if (disabled) {
    await finishScanJob(job.id, {
      status: 'failed',
      errorMessage: 'storage disabled',
    });
    return;
  }

  let lastPersistAt: number | null = null;
  let cancelled = false;

  const shouldCancel = async () => {
    try {
      return await isScanJobCancelRequested(job.id);
    } catch {
      // 取消标记读取失败不应中断扫描本身
      return false;
    }
  };

  const onLog = (entry: { level: 'info' | 'warn' | 'error'; message: string }) => {
    // 日志走异步投递不阻塞扫描主流程；失败静默（日志非关键路径）
    void appendScanJobLog(job.id, entry).catch(() => {});
  };

  const onProgress = (progress: { processed: number; total: number }) => {
    const now = Date.now();
    if (!shouldPersistProgress(lastPersistAt, now)) return;
    lastPersistAt = now;
    void updateScanJobProgress(job.id, {
      phase: 'processing',
      processedCount: progress.processed,
      totalCount: progress.total,
    }).catch(() => {});
  };

  const onError = (entry: { path: string; message: string }) => {
    void appendScanJobError(job.id, entry).catch(() => {});
  };

  try {
    if (storage.type === 's3') {
      await runS3StorageScan({
        storageId: storage.id,
        config: {
          endpoint: (config.endpoint as string | null) ?? null,
          region: (config.region as string | null) ?? null,
          bucket: (config.bucket as string | null) ?? null,
          accessKey: (config.accessKey as string | null) ?? null,
          secretKey: (config.secretKey as string | null) ?? null,
          prefix: (config.prefix as string | null) ?? null,
        },
        mode: job.mode === 'full' ? 'full' : 'incremental',
        onLog,
        onProgress,
        onError,
        shouldCancel: async () => {
          if (await shouldCancel()) {
            cancelled = true;
            return true;
          }
          return false;
        },
      });
    } else if (storage.type === 'local' || storage.type === 'nas') {
      const rootPath = config.rootPath as string | undefined;
      if (!rootPath) {
        await finishScanJob(job.id, {
          status: 'failed',
          errorMessage: 'storage has no rootPath',
        });
        return;
      }

      await runStorageScan({
        storageId: storage.id,
        storageType: storage.type as 'local' | 'nas',
        rootPath,
        mode: job.mode === 'full' ? 'full' : 'incremental',
        onLog,
        onProgress,
        onError,
        shouldCancel: async () => {
          if (await shouldCancel()) {
            cancelled = true;
            return true;
          }
          return false;
        },
      });
    } else {
      await finishScanJob(job.id, {
        status: 'failed',
        errorMessage: `unsupported storage type: ${storage.type}`,
      });
      return;
    }

    revalidatePathForAllLocales('/dashboard/media');
    revalidatePathForAllLocales('/gallery');

    if (cancelled) {
      await finishScanJob(job.id, {
        status: 'cancelled',
        errorMessage: 'cancelled by user',
      });
    } else {
      await finishScanJob(job.id, {
        status: 'succeeded',
        stats: EMPTY_STATS,
      });
    }
  } catch (error) {
    if (error instanceof ScanCancelledError) {
      cancelled = true;
      await finishScanJob(job.id, {
        status: 'cancelled',
        errorMessage: 'cancelled by user',
      });
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scan-job-runner] job ${job.id} failed:`, error);
    await finishScanJob(job.id, {
      status: 'failed',
      errorMessage: message.slice(0, 2000),
    }).catch(() => {});
  }
}

async function runnerLoop(state: ScanRunnerState): Promise<void> {
  // 启动恢复：被中断的 running 任务标记失败（queued 继续排队）
  try {
    await recoverStaleScanJobs();
  } catch (error) {
    console.warn('[scan-job-runner] boot recovery failed (will retry):', error);
  }

  let running = false;

  // 回收站日清理（P2-2）：启动 1 分钟后跑一次，之后每 24h 一次。
  // 失败只记日志，不影响扫描队列。
  const runTrashPurge = async (label: string) => {
    try {
      const { purgeExpiredTrashedMedia } = await import('@/app/lib/data/trash');
      const { purged } = await purgeExpiredTrashedMedia();
      if (purged > 0) {
        console.info(`[scan-job-runner] trash purge (${label}): removed ${purged} items`);
      }
    } catch (error) {
      console.warn('[scan-job-runner] trash purge failed:', error);
    }
  };
  void setTimeout(() => void runTrashPurge('boot+60s'), TRASH_PURGE_BOOT_DELAY_MS);
  const trashPurgeTimer = setInterval(() => void runTrashPurge('daily'), TRASH_PURGE_INTERVAL_MS);
  // runner 是进程级单例，timer 无需显式清理；保留 unref 避免阻碍进程退出
  trashPurgeTimer.unref?.();

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (;;) {
        const job = await claimNextScanJob();
        if (!job) break;
        console.info(`[scan-job-runner] running job #${job.id} (storage=${job.storageId}, mode=${job.mode})`);
        await executeScanJob(job);
        console.info(`[scan-job-runner] job #${job.id} finished`);
      }
    } catch (error) {
      console.error('[scan-job-runner] loop error:', error);
    } finally {
      running = false;
    }
  };

  for (;;) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, RUNNER_POLL_INTERVAL_MS);
      state.wake = () => {
        clearTimeout(timer);
        state.wake = null;
        resolve();
      };
    });
    await tick();
  }
}

/** 幂等启动 runner；instrumentation 与 API 路由都可安全调用 */
export function ensureScanJobRunner(): void {
  const state = getRunnerState();
  if (state.started) return;
  state.started = true;
  // 后台常驻循环；不 await（register 不能阻塞服务器启动）
  void runnerLoop(state).catch((error) => {
    console.error('[scan-job-runner] fatal:', error);
    state.started = false;
  });
}
