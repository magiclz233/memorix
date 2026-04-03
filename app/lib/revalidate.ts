import { revalidatePath, revalidateTag } from 'next/cache';
import { routing } from '@/i18n/routing';
import { deleteCached } from './redis';

const normalizePath = (path: string) => {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
};

const withLocale = (locale: string, path: string) => {
  const normalized = normalizePath(path);
  if (normalized === '/') return `/${locale}`;
  return `/${locale}${normalized}`;
};

export const revalidatePathForAllLocales = (path: string) => {
  const normalized = normalizePath(path);
  revalidatePath(normalized);
  routing.locales.forEach((locale) => {
    revalidatePath(withLocale(locale, normalized));
  });
};

/** 失效首页相关缓存（Hero 照片 + 集合） */
export const revalidateHomeCache = () => {
  revalidateTag('hero-photos', 'max');
  revalidateTag('collections', 'max');

  // 同时清除 Redis 缓存
  deleteCached('hero-photos:*');
  deleteCached('collections:*');
};
