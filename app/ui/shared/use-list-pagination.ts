'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  buildListQuery,
  DEFAULT_LIST_PAGE_SIZE,
  getTotalPages,
  parsePageNumber,
  resolveListPageSize,
} from '@/app/lib/list-view';

type UseListPaginationOptions = {
  defaultPageSize?: number;
};

/**
 * 已全量加载的列表的前端分页状态。
 *
 * - 初始化时从 URL 读取 page/limit，刷新或分享链接可保留位置
 * - 页码变化用 history.replaceState 同步 URL，不触发服务端重新取数
 * - 数据量变小（筛选/搜索）时自动收敛到最后一页
 */
export function useListPagination(
  totalItems: number,
  options: UseListPaginationOptions = {},
) {
  const searchParams = useSearchParams();
  const fallbackPageSize = options.defaultPageSize ?? DEFAULT_LIST_PAGE_SIZE;

  const [pageSize, setPageSizeState] = useState<number>(() => {
    const fromUrl = searchParams.get('limit');
    return fromUrl ? resolveListPageSize(fromUrl) : fallbackPageSize;
  });
  const [page, setPageState] = useState<number>(() =>
    parsePageNumber(searchParams.get('page')),
  );

  const totalPages = getTotalPages(totalItems, pageSize);

  const syncUrl = useCallback((nextPage: number, nextPageSize: number) => {
    if (typeof window === 'undefined') return;

    const params = buildListQuery(
      new URLSearchParams(window.location.search),
      { page: nextPage, pageSize: nextPageSize },
    );
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }, []);

  // 筛选后总数变少时，返回的 page 会自动收敛到最后一页；
  // 用户下一次翻页/改每页数量时再把 URL 同步为收敛后的值。
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const setPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(
        Math.max(Number.isSafeInteger(nextPage) ? nextPage : 1, 1),
        totalPages,
      );
      setPageState(clamped);
      syncUrl(clamped, pageSize);
    },
    [pageSize, syncUrl, totalPages],
  );

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      setPageSizeState(nextPageSize);
      setPageState(1);
      syncUrl(1, nextPageSize);
    },
    [syncUrl],
  );

  const slice = useCallback(
    <T,>(items: T[]): T[] => {
      const start = (safePage - 1) * pageSize;
      return items.slice(start, start + pageSize);
    },
    [pageSize, safePage],
  );

  return {
    page: safePage,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    slice,
  };
}
