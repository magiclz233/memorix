import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/app/lib/drizzle';
import {
  collectionMedia,
  files,
  photoMetadata,
  userStorages,
  videoMetadata,
} from '@/app/lib/schema';
import { isTrashExpired, TRASH_PURGE_BATCH, TRASH_RETENTION_DAYS } from '@/app/lib/trash-policy';
import { cleanHeroReferences, cleanCollectionCoverReferences } from './reference-cleanup';
import { resolveS3Client } from '@/app/lib/s3-helper';
import { getStorageCacheRoot } from '@/app/lib/storage';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export type TrashedMediaRecord = typeof files.$inferSelect & {
  storageType: string;
  storageConfig: unknown;
};

/**
 * 回收站列表：当前用户软删的媒体（分页，新删的在前）。
 * 只读；缩略图通过 /api/media/thumb/{id}（owner 放行软删文件）。
 */
export async function fetchTrashedMedia(
  userId: number,
  options: { limit?: number; offset?: number } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 60, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);

  const rowsQuery = db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mediaType: files.mediaType,
      mimeType: files.mimeType,
      size: files.size,
      isPublished: files.isPublished,
      deletedAt: files.deletedAt,
      mtime: files.mtime,
      storageId: userStorages.id,
      storageType: userStorages.type,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(eq(userStorages.userId, userId), isNotNull(files.deletedAt)))
    .orderBy(desc(files.deletedAt))
    .limit(limit)
    .offset(offset);

  const totalQuery = db
    .select({ total: count() })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(eq(userStorages.userId, userId), isNotNull(files.deletedAt)));

  // 当前页数据与总数互不依赖，并行查询省一次往返。
  const [rows, [totalRow]] = await Promise.all([rowsQuery, totalQuery]);

  return { rows, total: Number(totalRow?.total ?? 0) };
}

/** 移入回收站（软删）。所有权校验：只允许操作属于自己的文件。 */
export async function softDeleteMedia(fileIds: number[], userId: number): Promise<number[]> {
  if (fileIds.length === 0) return [];

  const owned = await db
    .select({ id: files.id })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        inArray(files.id, fileIds),
        eq(userStorages.userId, userId),
        isNull(files.deletedAt),
      ),
    );

  const ids = owned.map((row) => row.id);
  if (ids.length === 0) return [];

  const deletedAt = new Date();
  // 分批更新，避免超长 IN 列表
  for (let i = 0; i < ids.length; i += 500) {
    await db
      .update(files)
      .set({ deletedAt, isPublished: false, updatedAt: new Date() })
      .where(inArray(files.id, ids.slice(i, i + 500)));
  }
  return ids;
}

/** 从回收站恢复（清 deletedAt 并恢复下架状态为未发布，避免恢复即公开）。 */
export async function restoreFromTrash(fileIds: number[], userId: number): Promise<number[]> {
  if (fileIds.length === 0) return [];

  const owned = await db
    .select({ id: files.id })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        inArray(files.id, fileIds),
        eq(userStorages.userId, userId),
        isNotNull(files.deletedAt),
      ),
    );

  const ids = owned.map((row) => row.id);
  if (ids.length === 0) return [];

  for (let i = 0; i < ids.length; i += 500) {
    await db
      .update(files)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(inArray(files.id, ids.slice(i, i + 500)));
  }
  return ids;
}

/** 取出待物理删除的完整记录（含存储配置），供 purge 使用。 */
async function loadOwnedFilesForPurge(fileIds: number[], userId: number) {
  return db
    .select({
      id: files.id,
      path: files.path,
      userStorageId: files.userStorageId,
      deletedAt: files.deletedAt,
      storageType: userStorages.type,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        inArray(files.id, fileIds),
        eq(userStorages.userId, userId),
        isNotNull(files.deletedAt),
      ),
    );
}

/**
 * 彻底删除（物理）：只允许作用于「已在回收站」的文件。
 * 清理顺序：DB 引用与记录（事务）→ 缩略图 → 原始对象（local/NAS unlink、S3 DeleteObject）。
 * 物理清理在事务外逐个进行，失败只记日志不回滚（记录已删，残留对象由下次重试/清理兜底）。
 */
export async function purgeFromTrash(
  fileIds: number[],
  userId: number,
): Promise<{ purged: number[] }> {
  if (fileIds.length === 0) return { purged: [] };

  const rows = await loadOwnedFilesForPurge(fileIds, userId);
  const authorizedIds = rows.map((row) => row.id);
  if (authorizedIds.length === 0) return { purged: [] };

  await db.transaction(async (tx) => {
    await tx
      .delete(collectionMedia)
      .where(inArray(collectionMedia.fileId, authorizedIds));
    await tx
      .delete(photoMetadata)
      .where(inArray(photoMetadata.fileId, authorizedIds));
    await tx
      .delete(videoMetadata)
      .where(inArray(videoMetadata.fileId, authorizedIds));
    await cleanHeroReferences(tx, authorizedIds, userId);
    await cleanCollectionCoverReferences(tx, authorizedIds);
    await tx.delete(files).where(inArray(files.id, authorizedIds));
  });

  // 物理清理（事务外）
  for (const row of rows) {
    try {
      const config = (row.storageConfig ?? {}) as Record<string, string | null | undefined>;
      if (row.storageType === 'local' || row.storageType === 'nas') {
        const rootPath = config.rootPath;
        if (rootPath) {
          const resolvedRoot = path.resolve(rootPath);
          const absolutePath = path.resolve(resolvedRoot, row.path);
          if (absolutePath.startsWith(resolvedRoot + path.sep) || absolutePath === resolvedRoot) {
            await fs.unlink(absolutePath).catch(() => {});
          }
        }
      } else if (row.storageType === 's3' || row.storageType === 'qiniu') {
        if (config.bucket && config.accessKey && config.secretKey) {
          const client = resolveS3Client({
            endpoint: config.endpoint ?? null,
            region: config.region ?? null,
            bucket: config.bucket,
            accessKey: config.accessKey,
            secretKey: config.secretKey,
            prefix: config.prefix ?? null,
          });
          await client
            .send(new DeleteObjectCommand({ Bucket: config.bucket, Key: row.path }))
            .catch((error: unknown) => {
              console.error(`[trash] failed to delete S3 object for file ${row.id}:`, error);
            });
        }
      }

      // 缩略图缓存
      const thumbPath = path.join(getStorageCacheRoot(row.userStorageId), `${row.id}.webp`);
      await fs.unlink(thumbPath).catch(() => {});
    } catch (error) {
      console.error(`[trash] physical cleanup failed for file ${row.id}:`, error);
    }
  }

  return { purged: authorizedIds };
}

/**
 * 日清理：物理删除超过保留期的回收站文件（全部用户）。
 * 由扫描 runner 每日触发；单批上限 TRASH_PURGE_BATCH。
 */
export async function purgeExpiredTrashedMedia(
  now: number = Date.now(),
): Promise<{ purged: number }> {
  const expiredRows = await db
    .select({ id: files.id, userId: userStorages.userId, deletedAt: files.deletedAt })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(isNotNull(files.deletedAt))
    .orderBy(asc(files.deletedAt))
    .limit(TRASH_PURGE_BATCH * 4);

  const expired = expiredRows
    .filter((row) => isTrashExpired(row.deletedAt, now, TRASH_RETENTION_DAYS))
    .slice(0, TRASH_PURGE_BATCH);

  if (expired.length === 0) return { purged: 0 };

  // 按用户分组调用 purgeFromTrash（其内部有 per-user 所有权校验）
  const byUser = new Map<number, number[]>();
  for (const row of expired) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row.id);
    byUser.set(row.userId, list);
  }

  let purged = 0;
  for (const [userId, ids] of byUser) {
    const result = await purgeFromTrash(ids, userId);
    purged += result.purged.length;
  }
  return { purged };
}
