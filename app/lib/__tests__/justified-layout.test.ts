import { describe, it, expect } from 'vitest';
import {
  computeJustifiedRows,
  resolveAspect,
  targetRowHeightForColumns,
  type JustifiableItem,
} from '@/app/lib/justified-layout';

const item = (id: string, width?: number, height?: number): JustifiableItem => ({
  id,
  width,
  height,
});

describe('resolveAspect', () => {
  it('uses real aspect ratio when dimensions are valid', () => {
    expect(resolveAspect(item('a', 4000, 2000))).toBe(2);
  });
  it('falls back to 4:3 on missing / invalid dimensions', () => {
    expect(resolveAspect(item('a'))).toBeCloseTo(4 / 3);
    expect(resolveAspect(item('a', 0, 100))).toBeCloseTo(4 / 3);
    expect(resolveAspect(item('a', 100, -1))).toBeCloseTo(4 / 3);
  });
});

describe('computeJustifiedRows', () => {
  it('returns nothing for empty / invalid inputs', () => {
    expect(computeJustifiedRows([], 1000, 200)).toEqual([]);
    expect(computeJustifiedRows([item('a')], 0, 200)).toEqual([]);
    expect(computeJustifiedRows([item('a')], 1000, 0)).toEqual([]);
  });

  it('keeps every item exactly once', () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      item(`id-${i}`, 1000 + (i % 5) * 100, 600 + (i % 3) * 50),
    );
    const rows = computeJustifiedRows(items, 1200, 240);
    const flat = rows.flatMap((r) => r.items.map((p) => p.item.id));
    expect(flat).toHaveLength(items.length);
    expect(new Set(flat).size).toBe(items.length);
  });

  it('fills rows close to container width (except last row)', () => {
    const items = Array.from({ length: 40 }, (_, i) => item(`id-${i}`, 1600, 1067));
    const rows = computeJustifiedRows(items, 1200, 220, 12);
    for (const row of rows.slice(0, -1)) {
      const rowWidth = row.items.reduce((sum, p) => sum + p.width, 0) + 12 * (row.items.length - 1);
      expect(rowWidth).toBeCloseTo(1200, 0);
    }
  });

  it('caps the last row height so it never becomes a giant image', () => {
    const rows = computeJustifiedRows([item('a', 1000, 1000)], 4000, 250);
    expect(rows).toHaveLength(1);
    expect(rows[0].height).toBeLessThanOrEqual(250);
  });

  it('gives every item in a row the same height', () => {
    const rows = computeJustifiedRows(
      [item('a', 2000, 1000), item('b', 1000, 1500), item('c', 1500, 1000)],
      1200,
      200,
    );
    for (const row of rows) {
      const heights = new Set(row.items.map((p) => Math.round(p.height)));
      expect(heights.size).toBe(1);
    }
  });

  it('produces stable row keys', () => {
    const items = [item('a', 1000, 800), item('b', 1000, 800)];
    const a = computeJustifiedRows(items, 1000, 200);
    const b = computeJustifiedRows(items, 1000, 200);
    expect(a.map((r) => r.key)).toEqual(b.map((r) => r.key));
  });
});

describe('targetRowHeightForColumns', () => {
  it('scales with container width and never goes below the floor', () => {
    expect(targetRowHeightForColumns(1200, 4)).toBeGreaterThan(
      targetRowHeightForColumns(1200, 6),
    );
    expect(targetRowHeightForColumns(100, 20)).toBeGreaterThanOrEqual(120);
  });
});
