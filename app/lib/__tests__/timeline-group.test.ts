import { describe, expect, it } from 'vitest';
import type { GalleryItem } from '../gallery';
import { groupTimelineByMonth } from '../timeline-group';

const item = (overrides: Partial<GalleryItem>): GalleryItem => ({
  id: '1',
  type: 'photo',
  src: '/api/media/thumb/1',
  title: 'photo',
  ...overrides,
});

describe('groupTimelineByMonth', () => {
  it('优先按 sortAt 分组，并用 UTC 取月避免浏览器时区漂移', () => {
    const groups = groupTimelineByMonth([
      item({ id: '1', sortAt: '2024-12-31T23:30:00.000Z', dateShot: '2024-01-15T00:00:00.000Z' }),
      item({ id: '2', sortAt: '2024-12-01T00:00:00.000Z' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: '2024-12', year: 2024, month: 12 });
    expect(groups[0].items.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('sortAt 缺失时回退 dateShot，再回退 createdAt', () => {
    const groups = groupTimelineByMonth([
      item({ id: 'shot', sortAt: null, dateShot: '2023-06-02T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' }),
      item({ id: 'created', sortAt: null, dateShot: null, createdAt: '2023-06-20T00:00:00.000Z' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('2023-06');
    expect(groups[0].items.map((i) => i.id)).toEqual(['shot', 'created']);
  });

  it('跳过日期全空或非法的条目', () => {
    const groups = groupTimelineByMonth([
      item({ id: 'empty', sortAt: null, dateShot: null, createdAt: null }),
      item({ id: 'bad', sortAt: 'not-a-date' }),
      item({ id: 'ok', sortAt: '2024-02-01T00:00:00.000Z' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(['ok']);
  });

  it('跨年同月不合并', () => {
    const groups = groupTimelineByMonth([
      item({ sortAt: '2024-05-01T00:00:00.000Z' }),
      item({ sortAt: '2023-05-01T00:00:00.000Z' }),
    ]);

    expect(groups.map((g) => g.key)).toEqual(['2024-05', '2023-05']);
  });
});
