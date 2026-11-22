import { routing } from './routing';

const normalizePath = (path: string) => {
  if (!path.startsWith('/')) return `/${path}`;
  return path;
};

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * 校验并归一化站内跳转路径，阻止 //evil.com、反斜杠与控制字符等开放重定向。
 */
export const resolveSafeRedirectPath = (
  value: unknown,
  fallback = '/gallery',
) => {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    CONTROL_CHARACTERS.test(trimmed)
  ) {
    return fallback;
  }

  try {
    const baseUrl = new URL('https://memorix.local');
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.origin !== baseUrl.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
};

export const stripLocalePrefix = (path: string) => {
  const normalized = normalizePath(path);
  const suffixIndex = normalized.search(/[?#]/);
  const pathname =
    suffixIndex === -1 ? normalized : normalized.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : normalized.slice(suffixIndex);
  const segments = pathname.split('/');
  const locale = segments[1];
  if (routing.locales.includes(locale as (typeof routing.locales)[number])) {
    const rest = `/${segments.slice(2).join('/')}`.replace(/\/+$/, '');
    return `${rest === '' ? '/' : rest}${suffix}`;
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
