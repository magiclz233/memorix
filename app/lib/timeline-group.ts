import type { GalleryItem } from './gallery';

export type TimelineGroupable = Pick<
  GalleryItem,
  'sortAt' | 'dateShot' | 'createdAt'
>;

export type TimelineMonthGroup<T extends TimelineGroupable = GalleryItem> = {
  key: string;
  year: number;
  month: number;
  items: T[];
};

/**
 * 时间轴按月分组（纯函数）。
 *
 * - 日期优先用 sortAt（与 DB 分桶/排序同源），再回退 dateShot/createdAt；
 * - 统一用 UTC getter：API 返回 ISO 时间，避免浏览器本地时区在月初/月末漂移；
 * - 无日期或非法日期直接跳过（正常 DB 记录一定有 sortAt）。
 */
export function groupTimelineByMonth<T extends TimelineGroupable>(
  items: T[],
): TimelineMonthGroup<T>[] {
  const map = new Map<string, TimelineMonthGroup<T>>();

  for (const item of items) {
    const raw = item.sortAt || item.dateShot || item.createdAt;
    if (!raw) continue;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) continue;

    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    let group = map.get(key);
    if (!group) {
      group = { key, year, month, items: [] };
      map.set(key, group);
    }
    group.items.push(item);
  }

  return Array.from(map.values());
}
