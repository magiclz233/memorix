/**
 * 回收站保留策略（P2-2）。
 *
 * 语义：软删（deletedAt）只是「移入回收站」，超过保留期才允许物理清除。
 * 纯函数、无副作用，便于单测；数据层与 runner 按此决策执行。
 */

/** 回收站保留天数（超过后允许被日清理任务物理删除） */
export const TRASH_RETENTION_DAYS = 30;

/** 回收站单次物理清理上限（防止一次清爆连接池 / S3 请求速率） */
export const TRASH_PURGE_BATCH = 200;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrashExpiryDecision =
  | { expired: true; ageDays: number }
  | { expired: false; ageDays: number; daysLeft: number };

/**
 * 判断一条软删记录是否超过保留期。
 * deletedAt 为 null/非法 → 未过期（不清理，防御式）。
 */
export function trashExpiryDecision(
  deletedAt: Date | string | null | undefined,
  now: number = Date.now(),
  retentionDays: number = TRASH_RETENTION_DAYS,
): TrashExpiryDecision {
  if (!deletedAt) {
    return { expired: false, ageDays: 0, daysLeft: retentionDays };
  }
  const deletedMs =
    deletedAt instanceof Date ? deletedAt.getTime() : new Date(deletedAt).getTime();
  if (!Number.isFinite(deletedMs)) {
    return { expired: false, ageDays: 0, daysLeft: retentionDays };
  }
  const ageDays = Math.floor((now - deletedMs) / MS_PER_DAY);
  const daysLeft = Math.max(0, retentionDays - ageDays);
  return ageDays >= retentionDays
    ? { expired: true, ageDays }
    : { expired: false, ageDays, daysLeft };
}

/** 便捷判断：是否到期可清理 */
export function isTrashExpired(
  deletedAt: Date | string | null | undefined,
  now: number = Date.now(),
  retentionDays: number = TRASH_RETENTION_DAYS,
): boolean {
  return trashExpiryDecision(deletedAt, now, retentionDays).expired;
}
