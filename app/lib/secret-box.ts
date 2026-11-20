import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * 存储密钥加解密（P2-4）。
 *
 * - 主密钥优先取 `MEDIA_SECRET_KEY`（32 字节 base64）；未配置时回退从
 *   `BETTER_AUTH_SECRET` 派生，并打印一次告警。更换回退源会导致历史密文无法解密，
 *   因此生产环境应显式配置 MEDIA_SECRET_KEY。
 * - 密文格式：`enc:v1:<iv-b64>:<tag-b64>:<data-b64>`。
 * - 兼容历史上未加密的明文：`decryptSecret` 对无前缀的值原样返回，便于平滑升级。
 */

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

let warnedFallback = false;

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** 表单回传的脱敏值（****xxxx）表示“保持原密钥不变”。 */
export function isMaskedSecret(value: string): boolean {
  return /^\*{4}/.test(value);
}

function getMasterKey(): Buffer {
  const raw = process.env.MEDIA_SECRET_KEY?.trim();
  if (raw) {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
      throw new Error('MEDIA_SECRET_KEY 必须是 32 字节 base64');
    }
    return key;
  }

  const fallback = process.env.BETTER_AUTH_SECRET?.trim();
  if (!fallback) {
    throw new Error('缺少 MEDIA_SECRET_KEY 或 BETTER_AUTH_SECRET，无法加密存储密钥');
  }
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      '[secret-box] MEDIA_SECRET_KEY 未配置，回退从 BETTER_AUTH_SECRET 派生；更换 BETTER_AUTH_SECRET 会导致已存密钥无法解密',
    );
  }
  return createHash('sha256').update(`memorix:media-secret:v1:${fallback}`).digest();
}

/** 加密明文；空字符串保持为空。传入已加密值或脱敏值会原样返回，避免二次加密。 */
export function encryptSecret(plain: string): string {
  if (!plain) return '';
  if (isEncryptedSecret(plain) || isMaskedSecret(plain)) return plain;

  const key = getMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/** 解密；无前缀的历史明文原样返回。密文损坏或主密钥不匹配时抛错。 */
export function decryptSecret(value: string): string {
  if (!value) return '';
  if (!isEncryptedSecret(value)) return value;

  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 3) {
    throw new Error('存储密钥密文格式无效');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** 脱敏为 `****` + 末 4 位；无法解密时只返回 `****`。 */
export function maskSecret(value?: string | null): string {
  if (!value) return '';
  try {
    const plain = decryptSecret(value);
    return plain ? `****${plain.slice(-4)}` : '';
  } catch {
    return '****';
  }
}
