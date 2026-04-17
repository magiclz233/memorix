import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://example.com';

/**
 * 多语言 sitemap.xml
 * 为每个页面生成所有语言版本的 URL
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const locales = routing.locales;

  // 静态页面
  const staticPages = ['', '/gallery', '/collections', '/about'];

  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of locales) {
      const url = locale === routing.defaultLocale
        ? `${BASE_URL}${page}`
        : `${BASE_URL}/${locale}${page}`;

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              l === routing.defaultLocale
                ? `${BASE_URL}${page}`
                : `${BASE_URL}/${l}${page}`,
            ]),
          ),
        },
      });
    }
  }

  return entries;
}
