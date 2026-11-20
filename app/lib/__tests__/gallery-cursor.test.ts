import { describe, expect, it } from 'vitest';
import {
  decodeGalleryCursor,
  encodeGalleryCursor,
  galleryCursorFromRecord,
} from '../gallery-cursor';

const sortAt = new Date('2026-11-20T08:30:00.000Z');

describe('gallery-cursor', () => {
  it('编码后可原样解码', () => {
    const encoded = encodeGalleryCursor({ sortAt, id: 42 });
    expect(decodeGalleryCursor(encoded)).toEqual({ sortAt, id: 42 });
  });

  it('空值返回 null', () => {
    expect(decodeGalleryCursor(null)).toBeNull();
    expect(decodeGalleryCursor('')).toBeNull();
  });

  it('非法 base64/前缀返回 null', () => {
    expect(decodeGalleryCursor('not-a-cursor')).toBeNull();
    expect(decodeGalleryCursor(Buffer.from('v2.1.1').toString('base64url'))).toBeNull();
  });

  it('非法 id 与时间返回 null', () => {
    expect(decodeGalleryCursor(Buffer.from('v1.1.0').toString('base64url'))).toBeNull();
    expect(decodeGalleryCursor(Buffer.from('v1.1.-1').toString('base64url'))).toBeNull();
    expect(decodeGalleryCursor(Buffer.from('v1.1.abc').toString('base64url'))).toBeNull();
    expect(decodeGalleryCursor(Buffer.from('v1..1').toString('base64url'))).toBeNull();
    expect(decodeGalleryCursor(Buffer.from('v1.1.').toString('base64url'))).toBeNull();
    expect(
      decodeGalleryCursor(Buffer.from(`v1.${Number.MAX_SAFE_INTEGER + 1}.1`).toString('base64url')),
    ).toBeNull();
  });

  it('从记录构造游标，兼容字符串时间', () => {
    expect(galleryCursorFromRecord({ id: 7, sortAt })).toEqual({ sortAt, id: 7 });
    expect(galleryCursorFromRecord({ id: 7, sortAt: sortAt.toISOString() })).toEqual({
      sortAt,
      id: 7,
    });
    expect(galleryCursorFromRecord({ id: 7 })).toBeNull();
    expect(galleryCursorFromRecord({ id: 0, sortAt })).toBeNull();
    expect(galleryCursorFromRecord({ id: 7, sortAt: 'not-a-date' })).toBeNull();
  });
});
