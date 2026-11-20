/**
 * 资源库列表的纯视图参数。
 *
 * 这里只放客户端/服务端都能安全导入的常量与解析函数，避免把数据库逻辑
 * 带进客户端 bundle。
 */

export const MEDIA_PAGE_SIZE_OPTIONS = [12, 24, 48, 96, 200] as const;

export const DEFAULT_MEDIA_PAGE_SIZE = 24;

export type MediaPageSize = (typeof MEDIA_PAGE_SIZE_OPTIONS)[number];

/**
 * 只接受下拉里真实提供的每页数量，其余值（包括超大值、负数、注入串）
 * 一律回退默认值。这样 `?limit=100000` 不会把服务端查询拖垮。
 */
export function resolveMediaPageSize(value?: string | string[] | null): MediaPageSize {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) {
    return DEFAULT_MEDIA_PAGE_SIZE;
  }

  const parsed = Number(raw);
  return (MEDIA_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as MediaPageSize)
    : DEFAULT_MEDIA_PAGE_SIZE;
}
