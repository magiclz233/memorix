import { describe, expect, it } from 'vitest';
import { resolveMediaFullSrc } from '../media-preview';

describe('resolveMediaFullSrc', () => {
  it('始终使用同源原图流，不读取可能失效的绝对缩略图地址', () => {
    expect(resolveMediaFullSrc({ id: 42 })).toBe('/api/media/stream/42');
  });
});
