/**
 * 审计日志前翻页的纯函数（无 DB 依赖，便于单测）。
 *
 * 查询时多取一条（limit + 1）判断是否还有下一页；只有确实多出记录时才
 * 返回 nextBefore，避免“恰好一页”时客户端多发一次空请求。
 */
export function paginateAuditLogs<T extends { id: number }>(
  rows: T[],
  limit: number,
): { rows: T[]; nextBefore: number | null; hasMore: boolean } {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.trunc(limit)) : 1;
  const hasMore = rows.length > safeLimit;
  const pageRows = rows.slice(0, safeLimit);
  return {
    rows: pageRows,
    nextBefore: hasMore ? (pageRows[pageRows.length - 1]?.id ?? null) : null,
    hasMore,
  };
}
