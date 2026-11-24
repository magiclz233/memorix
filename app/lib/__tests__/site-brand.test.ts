import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_DESCRIPTION_EN,
  DEFAULT_SITE_DESCRIPTION_ZH,
  DEFAULT_SITE_NAME,
  resolveSiteDescription,
  resolveSiteName,
} from '../site-brand';

describe('site-brand 品牌名与描述解析', () => {
  it('未配置或空白时默认回退 Memorix', () => {
    expect(resolveSiteName()).toBe(DEFAULT_SITE_NAME);
    expect(resolveSiteName(null)).toBe('Memorix');
    expect(resolveSiteName('   ')).toBe('Memorix');
  });

  it('支持自定义品牌名并裁剪空白与超长字符串', () => {
    expect(resolveSiteName('  My Photo Lab  ')).toBe('My Photo Lab');
    expect(resolveSiteName('X'.repeat(120))).toHaveLength(80);
  });

  it('根据语言回退默认 SEO 描述并支持自定义覆盖', () => {
    expect(resolveSiteDescription(undefined, 'zh-CN')).toBe(DEFAULT_SITE_DESCRIPTION_ZH);
    expect(resolveSiteDescription('', 'en')).toBe(DEFAULT_SITE_DESCRIPTION_EN);
    expect(resolveSiteDescription('  Custom Archive  ', 'en')).toBe('Custom Archive');
  });
});
