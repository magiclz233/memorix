/**
 * 扫描任务队列的纯状态逻辑（P1-6）。
 *
 * 刻意与 DB / 文件系统解耦，便于单元测试验证这些不变量：
 * - 同一存储源同时只允许一个活跃任务（防刷新后并发重扫）；
 * - 服务器重启后 running 任务判定为「被中断」（queued 可以继续跑）；
 * - 日志 / 错误环有上限，避免长扫描把 jsonb 无限撑大；
 * - 进度落库节流，避免 BATCH_SIZE=1 时每文件一次 UPDATE。
 */

export const SCAN_JOB_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;

export type ScanJobStatus = (typeof SCAN_JOB_STATUSES)[number];

export const SCAN_JOB_ACTIVE_STATUSES: readonly ScanJobStatus[] = [
  'queued',
  'running',
];

export const SCAN_JOB_TERMINAL_STATUSES: readonly ScanJobStatus[] = [
  'succeeded',
  'failed',
  'cancelled',
];

export type ScanJobPhase = 'walking' | 'processing' | 'deleting' | 'done';

export type ScanJobLog = {
  level: 'info' | 'warn' | 'error';
  message: string;
  at: number;
};

export type ScanJobError = {
  path: string;
  message: string;
  at: number;
};

export type ScanJobStats = {
  added: number;
  updated: number;
  removed: number;
  failed: number;
};

export const EMPTY_STATS: ScanJobStats = {
  added: 0,
  updated: 0,
  removed: 0,
  failed: 0,
};

/** 日志环上限：保留最新的 N 条 */
export const MAX_JOB_LOGS = 200;
/** 单文件失败记录上限 */
export const MAX_JOB_ERRORS = 100;
/** 进度落库最小间隔（毫秒） */
export const PROGRESS_PERSIST_INTERVAL_MS = 1000;

export function isActiveScanJobStatus(status: string): boolean {
  return (SCAN_JOB_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function isTerminalScanJobStatus(status: string): boolean {
  return (SCAN_JOB_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * 该存储源是否允许再入队一个新扫描任务。
 * 有 queued/running 任务时拒绝——这是「刷新页面不并发重扫」的关键。
 */
export function canEnqueueScanJob(existingStatuses: readonly string[]): boolean {
  return !existingStatuses.some((status) => isActiveScanJobStatus(status));
}

/**
 * 服务器重启后的任务恢复决策。
 * - queued：配置在执行时才读取，可以继续排队执行；
 * - running：执行上下文（内存进度、文件句柄）已丢失，判为中断失败。
 */
export function bootRecoveryDecision(status: string):
  | { action: 'keep' }
  | { action: 'interrupt'; errorMessage: string } {
  if (status === 'running') {
    return {
      action: 'interrupt',
      errorMessage: 'interrupted by server restart',
    };
  }
  return { action: 'keep' };
}

/** 追加一条日志到环（超出上限丢最旧的） */
export function appendJobLog(
  logs: ScanJobLog[] | null | undefined,
  entry: Omit<ScanJobLog, 'at'>,
  now: number = Date.now(),
): ScanJobLog[] {
  const next = [...(Array.isArray(logs) ? logs : []), { ...entry, at: now }];
  return next.length > MAX_JOB_LOGS ? next.slice(next.length - MAX_JOB_LOGS) : next;
}

/** 追加一条失败记录到环（超出上限丢最旧的） */
export function appendJobError(
  errors: ScanJobError[] | null | undefined,
  entry: Omit<ScanJobError, 'at'>,
  now: number = Date.now(),
): ScanJobError[] {
  const next = [...(Array.isArray(errors) ? errors : []), { ...entry, at: now }];
  return next.length > MAX_JOB_ERRORS ? next.slice(next.length - MAX_JOB_ERRORS) : next;
}

/**
 * 进度落库节流：距上次持久化不足间隔时跳过（终态/阶段切换调用方自行强制写）。
 */
export function shouldPersistProgress(
  lastPersistAt: number | null | undefined,
  now: number,
  intervalMs: number = PROGRESS_PERSIST_INTERVAL_MS,
): boolean {
  if (lastPersistAt == null) return true;
  return now - lastPersistAt >= intervalMs;
}

/**
 * 由进度推导展示百分比；总数未知时返回 null（UI 显示不定进度）。
 */
export function computeScanProgressPercent(
  processed: number,
  total: number | null | undefined,
): number | null {
  if (total == null || total <= 0) return null;
  return Math.min(100, Math.round((processed / total) * 100));
}
