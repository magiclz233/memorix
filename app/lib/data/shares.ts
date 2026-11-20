import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { files, photoMetadata, shares, userStorages, videoMetadata } from '@/app/lib/schema';
import { isShareUsable } from '@/app/lib/share-token';

export type ShareRecord = typeof shares.$inferSelect;

/** 管理端可见的分享字段（含 token，仅 owner 本人可见） */
export async function listSharesForUser(userId: number): Promise<ShareRecord[]> {
  return db
    .select()
    .from(shares)
    .where(and(eq(shares.userId, userId), isNull(shares.revokedAt)))
    .orderBy(desc(shares.createdAt));
}

export async function getShareById(id: number): Promise<ShareRecord | null> {
  const rows = await db.select().from(shares).where(eq(shares.id, id)).limit(1);
  return rows[0] ?? null;
}

/** 按 token 取分享；调用方必须再做 usable + 密码校验 */
export async function getShareByToken(token: string): Promise<ShareRecord | null> {
  const rows = await db.select().from(shares).where(eq(shares.token, token)).limit(1);
  return rows[0] ?? null;
}

/** 取可用（未过期/未吊销）的分享，页面入口用 */
export async function getUsableShareByToken(token: string): Promise<ShareRecord | null> {
  const share = await getShareByToken(token);
  if (!share || !isShareUsable(share)) return null;
  return share;
}

export type CreateShareInput = {
  userId: number;
  fileIds: number[];
  name?: string | null;
  passwordHash?: string | null;
  expiresAt?: Date | null;
  role?: 'viewer' | 'editor';
  allowDownload?: boolean;
};

/** 校验待分享的文件确实属于该用户且未软删；返回合法 id 集合（去除越权/失效项） */
export async function filterOwnedFileIds(fileIds: number[], userId: number): Promise<number[]> {
  const unique = Array.from(new Set(fileIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (unique.length === 0) return [];
  const rows = await db
    .select({ id: files.id })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        inArray(files.id, unique),
        eq(userStorages.userId, userId),
        isNull(files.deletedAt),
      ),
    );
  const owned = new Set(rows.map((r) => r.id));
  return unique.filter((id) => owned.has(id));
}

export async function createShare(token: string, input: CreateShareInput): Promise<ShareRecord> {
  const [row] = await db
    .insert(shares)
    .values({
      token,
      userId: input.userId,
      fileIds: input.fileIds,
      name: input.name ?? null,
      passwordHash: input.passwordHash ?? null,
      expiresAt: input.expiresAt ?? null,
      role: input.role ?? 'viewer',
      allowDownload: input.allowDownload ?? true,
    })
    .returning();
  return row;
}

export async function revokeShare(id: number, userId: number): Promise<boolean> {
  const rows = await db
    .update(shares)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(shares.id, id), eq(shares.userId, userId), isNull(shares.revokedAt)))
    .returning({ id: shares.id });
  return rows.length > 0;
}

export async function incrementShareViewCount(id: number): Promise<void> {
  await db
    .update(shares)
    .set({ viewCount: sqlIncrement(), updatedAt: new Date() })
    .where(eq(shares.id, id));
}

// 用原生 SQL 做原子自增，避免读-改-写竞态
function sqlIncrement() {
  return sql`${shares.viewCount} + 1`;
}

/**
 * 取分享内的媒体记录。
 *
 * 分享的价值就是「把选定的图片（可以是私有图）单独分享出去」，因此这里不按
 * isPublished 过滤。真正的越权防线是下面三条 + 投递端点的 authorizeShareFileAccess：
 * 1. id 必须落在创建时的 fileIds 快照内（白名单之外的一律查不到）；
 * 2. 必须仍属于创建者自己的存储源；
 * 3. 未软删、存储源未禁用。
 * => 结果：白名单之外的任何私密图都不会从分享页/媒体端点泄露。
 */
export async function fetchSharedMedia(share: ShareRecord) {
  if (!Array.isArray(share.fileIds) || share.fileIds.length === 0) return [];

  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      size: files.size,
      mimeType: files.mimeType,
      mediaType: files.mediaType,
      url: files.url,
      thumbUrl: files.thumbUrl,
      mtime: files.mtime,
      blurHash: files.blurHash,
      resolutionWidth: photoMetadata.resolutionWidth,
      resolutionHeight: photoMetadata.resolutionHeight,
      videoWidth: videoMetadata.width,
      videoHeight: videoMetadata.height,
      videoDuration: videoMetadata.duration,
      description: photoMetadata.description,
      author: files.author,
      camera: photoMetadata.camera,
      maker: photoMetadata.maker,
      lens: photoMetadata.lens,
      dateShot: photoMetadata.dateShot,
      exposure: photoMetadata.exposure,
      aperture: photoMetadata.aperture,
      iso: photoMetadata.iso,
      focalLength: photoMetadata.focalLength,
      focalLengthIn35mmFormat: photoMetadata.focalLengthIn35mmFormat,
      flash: photoMetadata.flash,
      exposureProgram: photoMetadata.exposureProgram,
      colorSpace: photoMetadata.colorSpace,
      locationName: photoMetadata.locationName,
      whiteBalance: photoMetadata.whiteBalance,
      gpsLatitude: photoMetadata.gpsLatitude,
      gpsLongitude: photoMetadata.gpsLongitude,
      liveType: photoMetadata.liveType,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .leftJoin(videoMetadata, eq(files.id, videoMetadata.fileId))
    .where(
      and(
        inArray(files.id, share.fileIds),
        eq(userStorages.userId, share.userId),
        isNull(files.deletedAt),
      ),
    );

  return records
    .filter(
      (record) => !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig: _storageConfig, ...rest }) => ({
      ...rest,
      tags: [] as string[],
    }));
}

/** 供管理端挑选：当前用户拥有、未软删的媒体（含私有图，私有图正是分享的主要用途） */
export async function fetchSelectableMediaForUser(userId: number) {
  return db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mediaType: files.mediaType,
      thumbUrl: files.thumbUrl,
      isPublished: files.isPublished,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        eq(userStorages.userId, userId),
        isNull(files.deletedAt),
      ),
    )
    .orderBy(desc(files.mtime))
    .limit(500);
}
