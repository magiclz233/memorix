import path from 'path';
import { describe, expect, it } from 'vitest';
import { isPathWithinMediaRoots, parseMediaRoots } from '@/app/lib/path-safety';

const ROOT = path.resolve('/srv/media');
const NESTED = path.join(ROOT, 'photos/2024');
const SIBLING = path.resolve('/srv/media2/photos');

describe('parseMediaRoots', () => {
  it('解析逗号分隔、去空白、忽略空项', () => {
    expect(parseMediaRoots(' /srv/media , /mnt/nas/photos ,, ')).toEqual([
      path.resolve('/srv/media'),
      path.resolve('/mnt/nas/photos'),
    ]);
  });

  it('未配置返回空数组', () => {
    expect(parseMediaRoots(undefined)).toEqual([]);
    expect(parseMediaRoots('')).toEqual([]);
  });
});

describe('isPathWithinMediaRoots', () => {
  it('未配置白名单时不限制（保持现状）', () => {
    expect(isPathWithinMediaRoots('/anywhere', [])).toBe(true);
  });

  it('root 本身与子路径允许', () => {
    expect(isPathWithinMediaRoots(ROOT, [ROOT])).toBe(true);
    expect(isPathWithinMediaRoots(NESTED, [ROOT])).toBe(true);
  });

  it('兄弟目录共享前缀时拒绝', () => {
    expect(isPathWithinMediaRoots(SIBLING, [ROOT])).toBe(false);
  });

  it('白名单外路径拒绝', () => {
    expect(isPathWithinMediaRoots('/etc/passwd', [ROOT])).toBe(false);
  });

  it('相对路径按进程 cwd 解析后再比较', () => {
    expect(isPathWithinMediaRoots('photos/2024', [ROOT])).toBe(false);
  });

  it('多个 root 命中任意一个即允许', () => {
    const other = path.resolve('/mnt/other');
    expect(isPathWithinMediaRoots(NESTED, [other, ROOT])).toBe(true);
  });
});
