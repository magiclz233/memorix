/**
 * 管理端列表的统一分页参数与工具。
 *
 * 只放客户端/服务端都能安全导入的纯函数，不依赖数据库或 React。
 */

export const LIST_PAGE_SIZE_OPTIONS = [12, 24, 48, 96, 200] as const;

export const DEFAULT_LIST_PAGE_SIZE = 24;

export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number];

/**
 * 解析页码：只接受安全正整数，其余一律回退第 1 页。
 */
export function parsePageNumber(value?: string | string[] | null): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return 1;

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * 解析每页数量：只接受下拉里真实提供的选项，
 * 其余值（超大值、负数、注入串）一律回退默认值。
 */
export function resolveListPageSize(
  value?: string | string[] | null,
): ListPageSize {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) {
    return DEFAULT_LIST_PAGE_SIZE;
  }

  const parsed = Number(raw);
  return (LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? (parsed as ListPageSize)
    : DEFAULT_LIST_PAGE_SIZE;
}

export function getTotalPages(total: number, pageSize: number): number {
  if (!Number.isSafeInteger(total) || total <= 0) return 1;
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export type PaginationItem = number | '...';

/**
 * 生成页码列表：总页数不超过 7 时全部展示，否则用省略号折叠。
 */
export function generatePagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  const total = Math.max(1, Math.floor(totalPages) || 1);
  const current = Math.min(
    Math.max(Number.isSafeInteger(currentPage) ? currentPage : 1, 1),
    total,
  );

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, '...', total - 1, total];
  }

  if (current >= total - 2) {
    return [1, 2, '...', total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}

/**
 * 把分页参数写回查询串，同时保留其他筛选条件。
 * 默认值不写入 URL，保持链接干净。
 */
export function buildListQuery(
  searchParams: URLSearchParams,
  options: { page?: number; pageSize?: number } = {},
): URLSearchParams {
  const params = new URLSearchParams(searchParams.toString());
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_LIST_PAGE_SIZE;

  if (page > 1) {
    params.set('page', String(page));
  } else {
    params.delete('page');
  }

  if (pageSize !== DEFAULT_LIST_PAGE_SIZE) {
    params.set('limit', String(pageSize));
  } else {
    params.delete('limit');
  }

  return params;
}
