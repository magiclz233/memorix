import { and, desc, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { scanJobs } from '@/app/lib/schema';
import {
  appendJobError,
  appendJobLog,
  bootRecoveryDecision,
  canEnqueueScanJob,
  EMPTY_STATS,
  type ScanJobError,
  type ScanJobLog,
  type ScanJobStats,
} from '@/app/lib/scan-job-state';

export type ScanJobRecord = typeof scanJobs.$inferSelect;

type EnqueueInput = {
  userId: number;
  storageId: number;
  storageType: string;
  mode: 'incremental' | 'full';
};

/**
 * 入队一个扫描任务。
 * 防并发：该存储源已有 queued/running 任务时返回 null（调用方回 409）。
 */
export async function enqueueScanJob(input: EnqueueInput): Promise<ScanJobRecord | null> {
  const active = await db
    .select({ status: scanJobs.status })
    .from(scanJobs)
    .where(
      and(eq(scanJobs.storageId, input.storageId), inArray(scanJobs.status, ['queued', 'running'])),
    );

  if (!canEnqueueScanJob(active.map((row) => row.status))) {
    return null;
  }

  const [job] = await db
    .insert(scanJobs)
    .values({
      userId: input.userId,
      storageId: input.storageId,
      storageType: input.storageType,
      mode: input.mode,
      status: 'queued',
      logs: [],
      errors: [],
      stats: EMPTY_STATS,
    })
    .returning();

  return job ?? null;
}

/**
 * 原子认领下一个排队任务（FOR UPDATE SKIP LOCKED 语义由单条 UPDATE 保证）。
 * 返回 null 表示当前没有可执行任务。
 */
export async function claimNextScanJob(): Promise<ScanJobRecord | null> {
  const claimed = await db
    .update(scanJobs)
    .set({
      status: 'running',
      phase: 'walking',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      sql`"id" = (
        SELECT "id" FROM "scan_jobs"
        WHERE "status" = 'queued'
        ORDER BY "id" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )`,
    )
    .returning();

  return claimed[0] ?? null;
}

/** 读取取消标记（runner 批间轮询） */
export async function isScanJobCancelRequested(jobId: number): Promise<boolean> {
  const [row] = await db
    .select({ cancelRequested: scanJobs.cancelRequested })
    .from(scanJobs)
    .where(eq(scanJobs.id, jobId))
    .limit(1);
  return Boolean(row?.cancelRequested);
}

/** 请求取消（幂等；仅对活跃任务有意义） */
export async function requestScanJobCancel(jobId: number): Promise<boolean> {
  const updated = await db
    .update(scanJobs)
    .set({ cancelRequested: true, updatedAt: new Date() })
    .where(and(eq(scanJobs.id, jobId), inArray(scanJobs.status, ['queued', 'running'])))
    .returning({ id: scanJobs.id });
  return updated.length > 0;
}

/** 阶段切换（walking → processing → done），强制落库 */
export async function setScanJobPhase(jobId: number, phase: string): Promise<void> {
  await db
    .update(scanJobs)
    .set({ phase, updatedAt: new Date() })
    .where(eq(scanJobs.id, jobId));
}

/** 追加日志到环（节流由调用方控制；本函数每次都写） */
export async function appendScanJobLog(jobId: number, entry: Omit<ScanJobLog, 'at'>): Promise<void> {
  await db.transaction(async (tx) => {
    const [job] = await tx
      .select({ logs: scanJobs.logs })
      .from(scanJobs)
      .where(eq(scanJobs.id, jobId))
      .limit(1);
    const nextLogs = appendJobLog(
      job?.logs as ScanJobLog[] | null,
      entry,
      Date.now(),
    );
    await tx
      .update(scanJobs)
      .set({ logs: nextLogs, updatedAt: new Date() })
      .where(eq(scanJobs.id, jobId));
  });
}

/** 追加单文件失败记录到环 */
export async function appendScanJobError(
  jobId: number,
  entry: Omit<ScanJobError, 'at'>,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [job] = await tx
      .select({ errors: scanJobs.errors })
      .from(scanJobs)
      .where(eq(scanJobs.id, jobId))
      .limit(1);
    const nextErrors = appendJobError(
      job?.errors as ScanJobError[] | null,
      entry,
      Date.now(),
    );
    await tx
      .update(scanJobs)
      .set({ errors: nextErrors, updatedAt: new Date() })
      .where(eq(scanJobs.id, jobId));
  });
}

/** 更新进度（runner 按 1s 节流调用） */
export async function updateScanJobProgress(
  jobId: number,
  patch: {
    phase?: string;
    processedCount?: number;
    totalCount?: number | null;
    stats?: ScanJobStats;
  },
): Promise<void> {
  await db
    .update(scanJobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(scanJobs.id, jobId));
}

export type ScanJobFinishPatch = {
  status: 'succeeded' | 'failed' | 'cancelled';
  errorMessage?: string | null;
  stats?: ScanJobStats;
  processedCount?: number;
  phase?: string;
};

/** 写入终态 */
export async function finishScanJob(jobId: number, patch: ScanJobFinishPatch): Promise<void> {
  await db
    .update(scanJobs)
    .set({
      status: patch.status,
      errorMessage: patch.errorMessage ?? null,
      stats: patch.stats ?? EMPTY_STATS,
      processedCount: patch.processedCount,
      phase: patch.phase ?? 'done',
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(scanJobs.id, jobId));
}

/** 服务器启动恢复：running 任务判为中断（queued 保留继续排队） */
export async function recoverStaleScanJobs(): Promise<void> {
  const stale = await db
    .select({ id: scanJobs.id, status: scanJobs.status })
    .from(scanJobs)
    .where(eq(scanJobs.status, 'running'));

  for (const job of stale) {
    const decision = bootRecoveryDecision(job.status);
    if (decision.action !== 'interrupt') continue;
    await finishScanJob(job.id, {
      status: 'failed',
      errorMessage: decision.errorMessage,
    });
  }
}

/** 某存储源的任务历史（新 → 旧） */
export async function listScanJobs(storageId: number, limit = 20): Promise<ScanJobRecord[]> {
  return db
    .select()
    .from(scanJobs)
    .where(eq(scanJobs.storageId, storageId))
    .orderBy(desc(scanJobs.id))
    .limit(limit);
}

/** 单任务详情（鉴权由调用方负责） */
export async function getScanJobById(jobId: number): Promise<ScanJobRecord | null> {
  const [job] = await db.select().from(scanJobs).where(eq(scanJobs.id, jobId)).limit(1);
  return job ?? null;
}

/** API 响应序列化（Next route 文件只允许导出 HTTP 方法，序列化器放数据层） */
export function serializeScanJob(job: ScanJobRecord) {
  return {
    id: job.id,
    storageId: job.storageId,
    storageType: job.storageType,
    mode: job.mode,
    status: job.status,
    cancelRequested: job.cancelRequested,
    phase: job.phase,
    processedCount: job.processedCount,
    totalCount: job.totalCount,
    stats: job.stats ?? { added: 0, updated: 0, removed: 0, failed: 0 },
    errorMessage: job.errorMessage,
    createdAt: job.createdAt?.toISOString?.() ?? null,
    startedAt: job.startedAt?.toISOString?.() ?? null,
    finishedAt: job.finishedAt?.toISOString?.() ?? null,
  };
}
