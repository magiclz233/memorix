import { revalidatePath } from 'next/cache';
import { routing } from '@/i18n/routing';

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
