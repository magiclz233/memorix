/**
 * 扫描"待清理"安全网：判断本次扫描的缺失文件是否异常，保护 NAS 子目录
 * 断连/权限错误时误删索引。纯函数，便于接口测试（ADR-0004）。
 *
 * 保护规则：
 * 1. 扫描结果为空但库里有文件 —— 几乎总是挂载故障，一律中止清理。
 * 2. 比例异常（>30%）且绝对数量达到下限 —— 才判定为批量误删。
 *
 * 为什么需要绝对数量下限：小集合上比例会被放大（3 个删 1 个 = 33%），
 * 只看比例会拦下用户合法的单文件删除，导致 DB 记录永不软删、前台出现
 * 点开就 404 的"幽灵文件"。
 */
export const MIN_DELETE_COUNT_FOR_RATIO_GUARD = 5;
export const MAX_MISSING_RATIO = 0.3;

export function isSuspiciousDeletion(
  scannedCount: number,
  existingCount: number,
  deleteCount: number,
): boolean {
  if (scannedCount === 0 && existingCount > 0) return true;
  if (existingCount === 0 || deleteCount === 0) return false;
  const missingRatio = deleteCount / existingCount;
  return deleteCount >= MIN_DELETE_COUNT_FOR_RATIO_GUARD && missingRatio > MAX_MISSING_RATIO;
}
