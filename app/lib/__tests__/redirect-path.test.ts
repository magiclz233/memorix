import { describe, expect, it } from 'vitest';
import { resolveSafeRedirectPath, stripLocalePrefix } from '@/i18n/paths';

describe('resolveSafeRedirectPath', () => {
  it('保留合法的站内路径与查询串', () => {
    expect(resolveSafeRedirectPath('/gallery')).toBe('/gallery');
    expect(resolveSafeRedirectPath('  /en/gallery?page=2#top  ')).toBe(
      '/en/gallery?page=2#top',
    );
  });

  it('拒绝协议相对地址（//evil.com）', () => {
    expect(resolveSafeRedirectPath('//evil.com')).toBe('/gallery');
    expect(resolveSafeRedirectPath('///evil.com/x')).toBe('/gallery');
  });

  it('拒绝绝对 URL 与反斜杠变体', () => {
    expect(resolveSafeRedirectPath('https://evil.com')).toBe('/gallery');
    expect(resolveSafeRedirectPath('/\\evil.com')).toBe('/gallery');
    expect(resolveSafeRedirectPath('\\\\evil.com')).toBe('/gallery');
  });

  it('拒绝控制字符与非字符串', () => {
    expect(resolveSafeRedirectPath('/gallery\u0000')).toBe('/gallery');
    expect(resolveSafeRedirectPath(undefined)).toBe('/gallery');
    expect(resolveSafeRedirectPath(123)).toBe('/gallery');
  });

  it('支持自定义兜底路径', () => {
    expect(resolveSafeRedirectPath('//evil.com', '/login')).toBe('/login');
  });
});

describe('stripLocalePrefix', () => {
  it('移除语言前缀并保留查询串与 hash', () => {
    expect(stripLocalePrefix('/en/gallery?page=2#top')).toBe(
      '/gallery?page=2#top',
    );
    expect(stripLocalePrefix('/zh-CN/gallery')).toBe('/gallery');
  });

  it('无语言前缀时原样返回', () => {
    expect(stripLocalePrefix('/gallery?page=2')).toBe('/gallery?page=2');
  });
});
