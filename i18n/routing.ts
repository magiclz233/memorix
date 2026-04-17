import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['zh-CN', 'en'],
  defaultLocale: 'zh-CN',
  // 默认语言不显示前缀，其他语言显示前缀（如 /en/gallery）
  localePrefix: 'as-needed',
  // 从 Cookie 中读取语言偏好
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 365 * 24 * 60 * 60, // 1 年
  },
  // 根据 Accept-Language 请求头自动检测语言
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
