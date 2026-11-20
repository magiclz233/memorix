import { describe, it, expect } from 'vitest';
import {
  mediaCacheHeaders,
  PUBLIC_MEDIA_CACHE_CONTROL,
  PRIVATE_MEDIA_CACHE_CONTROL,
} from '@/app/lib/media-cache';

describe('mediaCacheHeaders (ADR-0001)', () => {
  it('public media uses long-lived immutable cache', () => {
    const headers = mediaCacheHeaders(true);
    expect(headers.get('cache-control')).toBe(PUBLIC_MEDIA_CACHE_CONTROL);
    expect(headers.get('cache-control')).toContain('public');
    expect(headers.get('cache-control')).toContain('immutable');
  });

  it('private media is never stored in a shared cache', () => {
    const headers = mediaCacheHeaders(false);
    const cacheControl = headers.get('cache-control') ?? '';
    expect(cacheControl).toBe(PRIVATE_MEDIA_CACHE_CONTROL);
    expect(cacheControl).toContain('private');
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).not.toContain('public');
    expect(cacheControl).not.toContain('immutable');
  });

  it('private media varies on Cookie', () => {
    expect(mediaCacheHeaders(false).get('vary')).toBe('Cookie');
  });

  it('preserves extra headers while overriding cache-control', () => {
    const headers = mediaCacheHeaders(false, {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, immutable', // 试图覆盖，必须被策略改写
    });
    expect(headers.get('content-type')).toBe('image/webp');
    expect(headers.get('cache-control')).toBe(PRIVATE_MEDIA_CACHE_CONTROL);
  });
});
