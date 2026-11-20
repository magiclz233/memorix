import { describe, expect, it } from 'vitest';
import { resolveMediaFullSrc } from '../media-preview';

describe('resolveMediaFullSrc', () => {
  it('图片使用 local-files 原图路由', () => {
    expect(resolveMediaFullSrc({ id: 42, mediaType: 'image' })).toBe(
      '/api/local-files/42',
    );
    expect(resolveMediaFullSrc({ id: 42, mediaType: 'animated' })).toBe(
      '/api/local-files/42',
    );
  });

  it('视频使用 stream 路由', () => {
    expect(resolveMediaFullSrc({ id: 42, mediaType: 'video' })).toBe(
      '/api/media/stream/42',
    );
  });
});
