import { describe, expect, it } from 'vitest';
import { paginateAuditLogs } from '../audit-log-page';

const rows = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: 100 - index }));

describe('paginateAuditLogs', () => {
  it('空结果没有下一页', () => {
    expect(paginateAuditLogs([], 50)).toEqual({
      rows: [],
      nextBefore: null,
      hasMore: false,
    });
  });

  it('不足一页时原样返回', () => {
    expect(paginateAuditLogs(rows(3), 50)).toEqual({
      rows: rows(3),
      nextBefore: null,
      hasMore: false,
    });
  });

  it('恰好一页时不返回 nextBefore，避免多请求一次空页', () => {
    expect(paginateAuditLogs(rows(50), 50)).toEqual({
      rows: rows(50),
      nextBefore: null,
      hasMore: false,
    });
  });

  it('多取一条时截断并用最后一条 id 作为 before', () => {
    const result = paginateAuditLogs(rows(51), 50);
    expect(result.rows).toHaveLength(50);
    expect(result.rows[49]?.id).toBe(51);
    expect(result.nextBefore).toBe(51);
    expect(result.hasMore).toBe(true);
  });
});
