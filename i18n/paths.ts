import { routing } from './routing';

const normalizePath = (path: string) => {
  if (!path.startsWith('/')) return `/${path}`;
  return path;
};

export const stripLocalePrefix = (path: string) => {
  const normalized = normalizePath(path);
  const segments = normalized.split('/');
  const locale = segments[1];
  if (routing.locales.includes(locale as (typeof routing.locales)[number])) {
    const rest = `/${segments.slice(2).join('/')}`.replace(/\/+$/, '');
    return rest === '' ? '/' : rest;
  }
  return normalized;
};

export const withLocalePrefix = (path: string, locale: string) => {
  const normalized = normalizePath(path);
  if (routing.localePrefix === 'as-needed' && locale === routing.defaultLocale) {
    return normalized;
  }
  if (normalized === '/') return `/${locale}`;
  return `/${locale}${normalized}`;
};
