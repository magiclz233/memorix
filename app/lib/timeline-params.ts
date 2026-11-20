export type TimelineFilter = {
  year: number | null;
  month: number | null;
};

type SearchParamsLike = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function parseBoundedInt(
  value: string | undefined,
  min: number,
  max: number,
): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

/**
 * 解析时间轴 URL 的 year/month（纯函数，SSR 与测试共用）。
 * 月份必须跟年份一起出现；孤立 month 会被忽略，避免首屏与翻页过滤不一致。
 */
export function parseTimelineFilter(params?: SearchParamsLike): TimelineFilter {
  const year = parseBoundedInt(firstValue(params?.year), 1, 9999);
  const month = year
    ? parseBoundedInt(firstValue(params?.month), 1, 12)
    : null;
  return { year, month };
}
