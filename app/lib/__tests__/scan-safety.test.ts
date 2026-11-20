import { describe, it, expect } from 'vitest';
import { isSuspiciousDeletion } from '@/app/lib/scan-safety';

describe('isSuspiciousDeletion (scan safety net)', () => {
  it('never flags a first scan or empty library', () => {
    expect(isSuspiciousDeletion(100, 0, 0)).toBe(false);
  });

  it('flags a completely empty scan result when files exist (mount failure)', () => {
    expect(isSuspiciousDeletion(0, 100, 100)).toBe(true);
    expect(isSuspiciousDeletion(0, 1, 1)).toBe(true);
  });

  it('does NOT flag small libraries where one deletion skews the ratio (regression)', () => {
    // 3 个文件删 1 个 = 33%，旧实现会误判为异常并跳过合法清理，产生幽灵文件
    expect(isSuspiciousDeletion(2, 3, 1)).toBe(false);
    expect(isSuspiciousDeletion(1, 2, 1)).toBe(false);
    expect(isSuspiciousDeletion(4, 5, 1)).toBe(false);
  });

  it('flags mass deletion above 30% once the absolute floor is reached', () => {
    expect(isSuspiciousDeletion(6, 10, 5)).toBe(true); // 50%, 5 >= floor
    expect(isSuspiciousDeletion(60, 100, 35)).toBe(true); // 35%
  });

  it('does not flag a high ratio below the absolute floor', () => {
    expect(isSuspiciousDeletion(9, 10, 2)).toBe(false); // 20%
  });

  it('does not flag zero deletions', () => {
    expect(isSuspiciousDeletion(10, 10, 0)).toBe(false);
  });
});
