import { describe, expect, it } from 'vitest';
import {
  applyMediaTagsBatch,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_FILE,
  normalizeMediaTags,
} from '../media-tags';
import { CacheKeys } from '../cache-keys';

describe('media-tags 批量更新与规范化', () => {
  it('规范化去重、裁剪空白与长度/数量上限', () => {
    const longTag = 'a'.repeat(MAX_TAG_LENGTH + 10);
    const input = ['  旅行 ', '', '旅行', 123, longTag, ...Array.from({ length: 20 }, (_, i) => `t${i}`)];
    const result = normalizeMediaTags(input);

    expect(result).toHaveLength(MAX_TAGS_PER_FILE);
    expect(result[0]).toBe('旅行');
    expect(result[1]).toBe('a'.repeat(MAX_TAG_LENGTH));
  });

  it('replace 模式一次原子更新多个文件，互不覆盖', () => {
    const current = {
      '1': ['旧标签'],
      '2': ['保留'],
      '99': ['未选中文件'],
    };

    const next = applyMediaTagsBatch(current, [1, 2, 3], ['夜景', '胶片'], 'replace');

    expect(next['1']).toEqual(['夜景', '胶片']);
    expect(next['2']).toEqual(['夜景', '胶片']);
    expect(next['3']).toEqual(['夜景', '胶片']);
    expect(next['99']).toEqual(['未选中文件']);
  });

  it('add 模式在保留原有标签基础上追加并去重', () => {
    const current = { '10': ['人像', '黑白'] };
    const next = applyMediaTagsBatch(current, [10, 11], ['黑白', '街头'], 'add');

    expect(next['10']).toEqual(['人像', '黑白', '街头']);
    expect(next['11']).toEqual(['黑白', '街头']);
  });

  it('remove 模式移除指定标签，清空后删除对应 key', () => {
    const current = { '10': ['人像', '黑白'], '11': ['黑白'] };
    const next = applyMediaTagsBatch(current, [10, 11], ['黑白'], 'remove');

    expect(next['10']).toEqual(['人像']);
    expect(next['11']).toBeUndefined();
  });

  it('忽略非正整数文件 ID', () => {
    const next = applyMediaTagsBatch({}, [0, -1, 1.5, NaN, 5], ['测试'], 'replace');
    expect(Object.keys(next)).toEqual(['5']);
  });
});

describe('CacheKeys 统一命名空间', () => {
  it('生成与 data-legacy / actions 一致的缓存键', () => {
    expect(CacheKeys.mediaTagsMap()).toBe('media:tags:map');
    expect(CacheKeys.frontHero('default', 12)).toBe('front:hero:default:12');
    expect(CacheKeys.frontFeaturedCollections('published', 'all')).toBe(
      'front:featured-collections:published:all',
    );
    expect(CacheKeys.dashboardOverview(42)).toBe('dashboard:overview:42');
    expect(CacheKeys.dashboardOverview()).toBe('dashboard:overview');
  });
});
