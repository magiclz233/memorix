import { describe, expect, it } from 'vitest';
import {
  buildListQuery,
  DEFAULT_LIST_PAGE_SIZE,
  generatePagination,
  getTotalPages,
  parsePageNumber,
  resolveListPageSize,
} from '../list-view';

describe('parsePageNumber', () => {
  it('缺省或非法值回退第 1 页', () => {
    expect(parsePageNumber()).toBe(1);
    expect(parsePageNumber(null)).toBe(1);
    expect(parsePageNumber('')).toBe(1);
    expect(parsePageNumber('0')).toBe(1);
    expect(parsePageNumber('-3')).toBe(1);
    expect(parsePageNumber('2.5')).toBe(1);
    expect(parsePageNumber('abc')).toBe(1);
    expect(parsePageNumber('999999999999999999999')).toBe(1);
  });

  it('接受安全正整数与数组首项', () => {
    expect(parsePageNumber('3')).toBe(3);
    expect(parsePageNumber(['7', '9'])).toBe(7);
  });
});

describe('resolveListPageSize', () => {
  it('只接受白名单内的每页数量', () => {
    expect(resolveListPageSize()).toBe(DEFAULT_LIST_PAGE_SIZE);
    expect(resolveListPageSize('48')).toBe(48);
    expect(resolveListPageSize(['96', '24'])).toBe(96);
    expect(resolveListPageSize('60')).toBe(DEFAULT_LIST_PAGE_SIZE);
    expect(resolveListPageSize('100000')).toBe(DEFAULT_LIST_PAGE_SIZE);
    expect(resolveListPageSize('48abc')).toBe(DEFAULT_LIST_PAGE_SIZE);
  });
});

describe('getTotalPages', () => {
  it('空数据至少 1 页', () => {
    expect(getTotalPages(0, 24)).toBe(1);
    expect(getTotalPages(-1, 24)).toBe(1);
  });

  it('按每页数量向上取整', () => {
    expect(getTotalPages(1, 24)).toBe(1);
    expect(getTotalPages(25, 24)).toBe(2);
    expect(getTotalPages(48, 24)).toBe(2);
    expect(getTotalPages(49, 24)).toBe(3);
  });
});

describe('generatePagination', () => {
  it('总页数较少时全部展示', () => {
    expect(generatePagination(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('当前页在前段', () => {
    expect(generatePagination(2, 20)).toEqual([1, 2, 3, '...', 19, 20]);
  });

  it('当前页在中段', () => {
    expect(generatePagination(10, 20)).toEqual([
      1,
      '...',
      9,
      10,
      11,
      '...',
      20,
    ]);
  });

  it('当前页在后段', () => {
    expect(generatePagination(19, 20)).toEqual([1, 2, '...', 18, 19, 20]);
  });
});

describe('buildListQuery', () => {
  it('保留筛选参数并写入分页参数', () => {
    const params = buildListQuery(new URLSearchParams('q=abc&page=2&limit=48'), {
      page: 3,
      pageSize: 96,
    });
    expect(params.get('q')).toBe('abc');
    expect(params.get('page')).toBe('3');
    expect(params.get('limit')).toBe('96');
  });

  it('默认值不写入 URL', () => {
    const params = buildListQuery(
      new URLSearchParams('q=abc&page=2&limit=48'),
      { page: 1, pageSize: DEFAULT_LIST_PAGE_SIZE },
    );
    expect(params.get('q')).toBe('abc');
    expect(params.has('page')).toBe(false);
    expect(params.has('limit')).toBe(false);
  });
});
