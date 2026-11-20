/**
 * ADR-0001: Private media must never be stored in a shared cache.
 *
 * Every media delivery route (original / thumbnail / stream) must call
 * `mediaCacheHeaders()` after resolving visibility. Public media keeps the
 * long-lived immutable policy; private media is explicitly private + no-store.
 */
export const PUBLIC_MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';
export const PRIVATE_MEDIA_CACHE_CONTROL = 'private, no-store, max-age=0';

export function mediaCacheHeaders(
  isPublished: boolean,
  extra: Record<string, string> = {},
): Headers {
  const headers = new Headers(extra);
  headers.set(
    'Cache-Control',
    isPublished ? PUBLIC_MEDIA_CACHE_CONTROL : PRIVATE_MEDIA_CACHE_CONTROL,
  );
  if (!isPublished) {
    headers.set('Vary', 'Cookie');
  }
  return headers;
}
