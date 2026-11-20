import { createHmac, timingSafeEqual, createHash } from 'crypto';
import { cookies, headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { files, shares, userStorages, users } from '@/app/lib/schema';
import { auth } from '@/auth';
import { isShareUsable, isValidShareToken } from '@/app/lib/share-token';
import type { ShareRecord as ShareRow } from '@/app/lib/data/shares';

/**
 * P1-1 分享访问授权中心。
 *
 * 所有入口（分享页 + 原图/缩略图/视频流/下载端点）共用这里的判定，避免
 * 「页面挡住了、媒体端点没挡」这类越权泄露。
 *
 * 模型：分享 = 显式能力白名单（fileIds 快照）。
 * - token 是 192bit 随机能力串，不编码文件/用户信息；
 * - 密码是与 token 独立的第二道门（不学 PhotoPrism 把 token 当密码）；
 * - 过期 / 吊销即时失效；
 * - 私有图可以被「显式选入」某个分享，但绝不会从分享里泄露白名单之外的任何文件。
 */

const UNLOCK_COOKIE_PREFIX = 'mxs_';

function unlockSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  // 生产环境 instrumentation 已强制校验 secret 存在；这里给开发兜底常量。
  return secret && secret.length >= 8 ? secret : 'memorix-share-dev-secret';
}

/** cookie 名由 token 派生，避免把原始 token 直接暴露在 Set-Cookie 名里 */
export function shareUnlockCookieName(token: string): string {
  return UNLOCK_COOKIE_PREFIX + createHash('sha256').update(token).digest('hex').slice(0, 20);
}

/** 密码校验通过后写入的解锁值（带签名的能力凭证，服务端可无状态校验） */
export function createShareUnlockValue(token: string): string {
  return createHmac('sha256', unlockSecret()).update(`unlock:${token}`).digest('hex');
}

export function isValidShareUnlockValue(token: string, value: string | undefined): boolean {
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) return false;
  const expected = createShareUnlockValue(token);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(value, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** 从原始 Cookie 头判断某个分享是否已解锁（供 Route Handler 使用） */
export function isShareUnlockedFromHeader(token: string, cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  const name = shareUnlockCookieName(token);
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      return isValidShareUnlockValue(token, decodeURIComponent(part.slice(idx + 1).trim()));
    }
  }
  return false;
}

/** 从 Next 的 cookie store 判断（供 Server Component / page 使用） */
export async function isShareUnlockedFromStore(token: string): Promise<boolean> {
  const store = await cookies();
  return isValidShareUnlockValue(token, store.get(shareUnlockCookieName(token))?.value);
}

export type ShareFileAccessResult =
  | { granted: true; share: ShareRow }
  | { granted: false };

/**
 * 判断某个 token 是否有权访问某个具体文件（媒体投递端点用）。
 * 只有「分享可用 + token 格式合法 + 文件在白名单内 + 文件仍属于创建者且未软删
 * + 存储源未禁用 +（如有密码）已解锁」全部满足才放行。
 */
export async function authorizeShareFileAccess(params: {
  fileId: number;
  token: string | null;
  cookieHeader: string | null;
}): Promise<ShareFileAccessResult> {
  const { fileId, token, cookieHeader } = params;
  if (!token || !isValidShareToken(token) || !Number.isInteger(fileId)) {
    return { granted: false };
  }

  const share = await db.select().from(shares).where(eq(shares.token, token)).limit(1).then(
    (rows) => rows[0] as ShareRow | undefined,
  );
  if (!share || !isShareUsable(share)) return { granted: false };

  if (!Array.isArray(share.fileIds) || !share.fileIds.includes(fileId)) {
    return { granted: false };
  }

  if (share.passwordHash && !isShareUnlockedFromHeader(token, cookieHeader)) {
    return { granted: false };
  }

  // 文件必须仍属于创建者、未软删、存储源有效
  const [file] = await db
    .select({ id: files.id, config: userStorages.config })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        eq(files.id, fileId),
        eq(userStorages.userId, share.userId),
        isNull(files.deletedAt),
      ),
    )
    .limit(1);
  if (!file) return { granted: false };
  if ((file.config as { isDisabled?: boolean })?.isDisabled) return { granted: false };

  return { granted: true, share };
}

/** 批量：给定分享 + 已解锁状态，返回可访问的文件 id 集合（分享页服务端渲染用） */
export function allowedFileIdsForShare(share: ShareRow): number[] {
  return Array.isArray(share.fileIds) ? share.fileIds : [];
}

/**
 * 媒体投递端点的统一「私有文件」门禁：owner 本人 session 或有效分享二者居其一即可。
 * 返回 true 表示放行。所有私有媒体路由都必须用它，避免各写一套漏判分享。
 */
export async function canAccessPrivateMedia(params: {
  fileId: number;
  ownerUserId: number;
  shareToken: string | null;
  cookieHeader: string | null;
}): Promise<boolean> {
  const { fileId, ownerUserId, shareToken, cookieHeader } = params;

  // 路径一：有效分享（只要文件在白名单内、未过期/吊销、密码已解锁）
  const shareAccess = await authorizeShareFileAccess({ fileId, token: shareToken, cookieHeader });
  if (shareAccess.granted) return true;

  // 路径二：owner 本人登录
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) return false;
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  return Boolean(user && user.id === ownerUserId);
}
