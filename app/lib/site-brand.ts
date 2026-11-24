/**
 * 全站站点品牌名与 SEO 描述解析纯函数：
 * 默认统一使用 Memorix，支持管理员在系统设置中自定义 siteName / seoDescription。
 */

export const DEFAULT_SITE_NAME = 'Memorix';
export const DEFAULT_SITE_DESCRIPTION_ZH = 'Memorix - 沉浸式光影与极简排版的私人视觉档案系统';
export const DEFAULT_SITE_DESCRIPTION_EN = 'Memorix - Minimalist visual archive for photography and video';

export function resolveSiteName(customName?: string | null): string {
  const trimmed = typeof customName === 'string' ? customName.trim() : '';
  return trimmed.length > 0 ? trimmed.slice(0, 80) : DEFAULT_SITE_NAME;
}

export function resolveSiteDescription(
  customDescription?: string | null,
  locale: string = 'zh-CN',
): string {
  const trimmed = typeof customDescription === 'string' ? customDescription.trim() : '';
  if (trimmed.length > 0) return trimmed.slice(0, 240);
  return locale === 'en' ? DEFAULT_SITE_DESCRIPTION_EN : DEFAULT_SITE_DESCRIPTION_ZH;
}
