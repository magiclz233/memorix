import { describe, it, expect } from 'vitest';
import { parseSearchDSL, hasStructuredFields } from '@/app/lib/search-dsl';

describe('parseSearchDSL', () => {
  it('returns empty result for empty input', () => {
    expect(parseSearchDSL('')).toEqual({ freeText: '', fields: {} });
    expect(parseSearchDSL(null)).toEqual({ freeText: '', fields: {} });
    expect(parseSearchDSL(undefined)).toEqual({ freeText: '', fields: {} });
  });

  it('treats plain text as free text', () => {
    const parsed = parseSearchDSL('海边 日落');
    expect(parsed.freeText).toBe('海边 日落');
    expect(parsed.fields).toEqual({});
    expect(hasStructuredFields(parsed)).toBe(false);
  });

  it('parses field:value pairs', () => {
    const parsed = parseSearchDSL('type:video camera:sony 海边');
    expect(parsed.fields.type).toBe('video');
    expect(parsed.fields.camera).toBe('sony');
    expect(parsed.freeText).toBe('海边');
    expect(hasStructuredFields(parsed)).toBe(true);
  });

  it('supports quoted multi-word values', () => {
    const parsed = parseSearchDSL('camera:"Sony A7 IV" title:假期');
    expect(parsed.fields.camera).toBe('Sony A7 IV');
    expect(parsed.fields.title).toBe('假期');
  });

  it('normalizes type aliases', () => {
    expect(parseSearchDSL('type:photo').fields.type).toBe('image');
    expect(parseSearchDSL('type:image').fields.type).toBe('image');
    expect(parseSearchDSL('type:gif').fields.type).toBe('animated');
    expect(parseSearchDSL('type:视频').fields.type).toBe('video');
  });

  it('maps desc/place aliases to canonical fields', () => {
    const parsed = parseSearchDSL('desc:Blur place:东京');
    expect(parsed.fields.description).toBe('Blur');
    expect(parsed.fields.location).toBe('东京');
    expect((parsed.fields as Record<string, unknown>).desc).toBeUndefined();
    expect((parsed.fields as Record<string, unknown>).place).toBeUndefined();
  });

  it('parses a valid year and rejects invalid ones into free text', () => {
    expect(parseSearchDSL('year:2019').fields.year).toBe(2019);
    const bad = parseSearchDSL('year:abcd');
    expect(bad.fields.year).toBeUndefined();
    expect(bad.freeText).toContain('year:abcd');
  });

  it('keeps unknown fields as free text (nothing lost)', () => {
    const parsed = parseSearchDSL('foo:bar hello');
    expect((parsed.fields as Record<string, unknown>).foo).toBeUndefined();
    expect(parsed.freeText).toContain('foo:bar');
    expect(parsed.freeText).toContain('hello');
  });

  it('caps overly long field values', () => {
    const long = 'a'.repeat(200);
    const parsed = parseSearchDSL(`title:${long}`);
    expect(parsed.fields.title).toHaveLength(80);
  });

  it('handles a mix of all features together', () => {
    const parsed = parseSearchDSL(
      'type:video maker:"Apple Inc." desc:慢动作 2024 旅行',
    );
    expect(parsed.fields.type).toBe('video');
    expect(parsed.fields.maker).toBe('Apple Inc.');
    expect(parsed.fields.description).toBe('慢动作');
    expect(parsed.freeText).toBe('2024 旅行');
  });
});
