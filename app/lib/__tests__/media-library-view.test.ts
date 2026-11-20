import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MEDIA_PAGE_SIZE,
  MEDIA_PAGE_SIZE_OPTIONS,
  resolveMediaPageSize,
} from '../media-library-view';

describe('resolveMediaPageSize', () => {
  it('缺省时回退默认值', () => {
    expect(resolveMediaPageSize()).toBe(DEFAULT_MEDIA_PAGE_SIZE);
    expect(resolveMediaPageSize(null)).toBe(DEFAULT_MEDIA_PAGE_SIZE);
    expect(resolveMediaPageSize('')).toBe(DEFAULT_MEDIA_PAGE_SIZE);
  });

  it('只接受白名单内的值', () => {
    for (const size of MEDIA_PAGE_SIZE_OPTIONS) {
      expect(resolveMediaPageSize(String(size))).toBe(size);
    }
  });

  it('数组取第一个值', () => {
    expect(resolveMediaPageSize(['96', '24'])).toBe(96);
  });

  it('非法值/超大值回退默认值', () => {
    expect(resolveMediaPageSize('500')).toBe(DEFAULT_MEDIA_PAGE_SIZE);
    expect(resolveMediaPageSize('48abc')).toBe(DEFAULT_MEDIA_PAGE_SIZE);
    expect(resolveMediaPageSize('-24')).toBe(DEFAULT_MEDIA_PAGE_SIZE);
  });
});
