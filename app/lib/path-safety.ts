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

let warnedMediaRootsUnset = false;

/** 解析 MEDIA_ROOTS（逗号分隔），返回绝对路径列表；未配置返回空数组。 */
export function parseMediaRoots(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => path.resolve(item));
}

export function getMediaRoots(): string[] {
  return parseMediaRoots(process.env.MEDIA_ROOTS);
}

/** 未配置白名单时保持现状，但每次进程只告警一次，提示运维收紧。 */
export function warnIfMediaRootsUnset(): void {
  if (warnedMediaRootsUnset || getMediaRoots().length > 0) return;
  warnedMediaRootsUnset = true;
  console.warn(
    '[media-roots] MEDIA_ROOTS 未配置：任何本地路径都可作为存储根目录，建议在生产环境配置白名单',
  );
}

/**
 * 判断目标路径是否落在 MEDIA_ROOTS 白名单内。
 * 空白名单视为未启用限制（保持旧行为）。
 *
 * ponytail: 仅做字面前缀比较，不解析符号链接；管理员可配置的目录本就是可信输入，
 * 若将来允许低权限用户配置路径，需改为 realpath 后再比较。
 */
export function isPathWithinMediaRoots(
  target: string,
  roots: string[] = getMediaRoots(),
): boolean {
  if (roots.length === 0) return true;
  const resolved = path.resolve(target);
  return roots.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );
}
