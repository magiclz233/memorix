import path from 'path';
import { describe, it, expect } from 'vitest';
import { resolveSafeLocalPath } from '@/app/lib/path-safety';

describe('resolveSafeLocalPath', () => {
  const root = path.resolve('/data/photos');

  it('resolves a normal relative path inside root', () => {
    expect(resolveSafeLocalPath(root, '2024/img_001.jpg')).toBe(
      path.join(root, '2024/img_001.jpg'),
    );
  });

  it('resolves root itself', () => {
    expect(resolveSafeLocalPath(root, '.')).toBe(root);
  });

  it('rejects parent traversal', () => {
    expect(resolveSafeLocalPath(root, '../secret.txt')).toBeNull();
    expect(resolveSafeLocalPath(root, 'a/../../secret.txt')).toBeNull();
  });

  it('rejects absolute paths outside root', () => {
    expect(resolveSafeLocalPath(root, '/etc/passwd')).toBeNull();
  });

  it('rejects sibling directory with shared prefix', () => {
    // /data/photos2 与 /data/photos 共享前缀，但不能算在 root 内
    expect(resolveSafeLocalPath(root, '../photos2/secret.jpg')).toBeNull();
  });
});
