import path from 'path';

/**
 * 把相对路径安全地解析到 root 之下，并阻止 `../` 穿越与兄弟目录前缀混淆。
 * 返回 null 表示不安全（调用方应拒绝该路径）。
 *
 * 提取为独立纯函数，便于在媒体投递路径复用并做接口测试（ADR-0004）。
 */
export function resolveSafeLocalPath(root: string, relative: string): string | null {
  const normalizedRoot = path.resolve(root);
  const target = path.resolve(normalizedRoot, relative);
  if (target !== normalizedRoot && !target.startsWith(normalizedRoot + path.sep)) {
    return null;
  }
  return target;
}
