import { describe, expect, it } from 'vitest';
import { parseTimelineFilter } from '../timeline-params';

describe('parseTimelineFilter', () => {
  it('解析合法的年/月', () => {
    expect(parseTimelineFilter({ year: '2024', month: '5' })).toEqual({
      year: 2024,
      month: 5,
    });
  });

  it('数组参数取第一个值', () => {
    expect(parseTimelineFilter({ year: ['2024', '2023'], month: ['7'] })).toEqual({
      year: 2024,
      month: 7,
    });
  });

  it('只有月份时忽略月份，避免缺少年份的过滤错位', () => {
    expect(parseTimelineFilter({ month: '5' })).toEqual({ year: null, month: null });
  });

  it('非法月份归 null，保留合法年份', () => {
    expect(parseTimelineFilter({ year: '2024', month: '13' })).toEqual({
      year: 2024,
      month: null,
    });
    expect(parseTimelineFilter({ year: '2024', month: '0' })).toEqual({
      year: 2024,
      month: null,
    });
  });

  it('非整数/负数/空值归 null', () => {
    expect(parseTimelineFilter({ year: 'abc', month: '5' })).toEqual({
      year: null,
      month: null,
    });
    expect(parseTimelineFilter({ year: '2024.5' })).toEqual({ year: null, month: null });
    expect(parseTimelineFilter({ year: '-2024' })).toEqual({ year: null, month: null });
    expect(parseTimelineFilter({ year: '', month: '' })).toEqual({
      year: null,
      month: null,
    });
  });

  it('缺省参数返回空过滤', () => {
    expect(parseTimelineFilter(undefined)).toEqual({ year: null, month: null });
    expect(parseTimelineFilter({})).toEqual({ year: null, month: null });
  });
});
