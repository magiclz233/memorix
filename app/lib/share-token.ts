import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * P1-1 分享链接的纯逻辑层：不依赖 DB / Next，便于 Vitest 直接覆盖。
 *
 * 安全原则：
 * - token 是高熵随机串（192 bit），不编码任何文件/用户信息，绝不当密码用；
 * - 密码用 scrypt + 随机盐哈希，校验用 timingSafeEqual 防时序侧信道；
 * - 过期 / 吊销 / 权限判定集中在这里，所有入口（页面 + 投递路由）共用同一套判定，
 *   避免「页面挡住了但媒体端点没挡」的越权泄露。
 */

const TOKEN_BYTES = 24; // 24 bytes = 192 bit
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const SCRYPT_KEYLEN = 32;
const PASSWORD_PREFIX = 'scrypt';

/** 生成 192bit 高熵分享 token（base64url，无 = 填充，长度固定 32） */
export function generateShareToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** token 只接受我们生成的格式，杜绝乱七八糟的输入打到 DB / 路径 */
export function isValidShareToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

/** scrypt 哈希密码，输出 `scrypt$<saltHex>$<hashHex>` */
export function hashSharePassword(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('password must be a non-empty string');
  }
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${PASSWORD_PREFIX}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/** 校验密码；任何格式异常都返回 false，不抛错。 */
export function verifySharePassword(password: unknown, stored: string | null | undefined): boolean {
  if (!stored || typeof password !== 'string' || password.length === 0) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== PASSWORD_PREFIX) return false;
  const saltHex = parts[1];
  const hashHex = parts[2];
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** 分享是否过期（expiresAt 为 null 视为永不过期） */
export function isShareExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

/** 分享是否被吊销 */
export function isShareRevoked(revokedAt: Date | null | undefined): boolean {
  return Boolean(revokedAt);
}

export type ShareAccessState = {
  expiresAt: Date | null | undefined;
  revokedAt: Date | null | undefined;
};

/** 分享整体是否仍可用（未过期、未吊销），now 可注入便于测试 */
export function isShareUsable(share: ShareAccessState, now: Date = new Date()): boolean {
  return !isShareExpired(share.expiresAt, now) && !isShareRevoked(share.revokedAt);
}

/** 角色是否允许下载。editor 恒可下载；viewer 取决于 allowDownload 开关。 */
export function canDownload(role: string | null | undefined, allowDownload: boolean | null | undefined): boolean {
  if (role === 'editor') return true;
  return allowDownload === true;
}
