/**
 * 资源库列表的纯视图参数。
 *
 * 具体实现已收敛到 app/lib/list-view.ts，供管理端所有列表共享同一套
 * 每页数量与页码规则；这里保留原有导出以兼容现有调用与测试。
 */

import {
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZE_OPTIONS,
  resolveListPageSize,
  type ListPageSize,
} from './list-view';

export const MEDIA_PAGE_SIZE_OPTIONS = LIST_PAGE_SIZE_OPTIONS;

export const DEFAULT_MEDIA_PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export type MediaPageSize = ListPageSize;

/**
 * 只接受下拉里真实提供的每页数量，其余值（包括超大值、负数、注入串）
 * 一律回退默认值。这样 `?limit=100000` 不会把服务端查询拖垮。
 */
export const resolveMediaPageSize = resolveListPageSize;
