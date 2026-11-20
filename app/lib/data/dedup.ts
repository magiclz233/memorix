import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { files, userStorages } from '@/app/lib/schema';

/**
 * 内容级去重检测（P2-3）。
 *
 * 原则：**只检测，不自动删**。重复项进入回收站的动作永远由人在 UI 里确认
 * （复用 P2-2 的 moveMediaToTrash），避免任何误判造成不可逆损失。
 */

export type DuplicateGroupItem = {
  id: number;
  title: string | null;
  path: string;
  mediaType: string;
  size: number | null;
  mtime: Date | null;
  storageId: number;
  storageType: string;
};

export type DuplicateGroup = {
  fileHash: string;
  count: number;
  totalSize: number;
  items: DuplicateGroupItem[];
};

/**
 * 当前用户的重复文件分组（同 fileHash、未软删、组内 > 1 个）。
 * 组内按 mtime 升序 —— 最旧的排前面，作为「建议保留」项。
 */
export async function fetchDuplicateGroups(
  userId: number,
  options: { maxGroups?: number; maxItemsPerGroup?: number } = {},
): Promise<DuplicateGroup[]> {
  const maxGroups = Math.min(Math.max(options.maxGroups ?? 100, 1), 500);
  const maxItemsPerGroup = Math.min(Math.max(options.maxItemsPerGroup ?? 20, 2), 100);

  const groups = await db
    .select({
      fileHash: files.fileHash,
      count: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(${files.size}), 0)::bigint`,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        eq(userStorages.userId, userId),
        isNotNull(files.fileHash),
        isNull(files.deletedAt),
      ),
    )
    .groupBy(files.fileHash)
    .having(sql`count(*) > 1`)
    .orderBy(sql`count(*) desc`)
    .limit(maxGroups);

  const hashes = groups
    .map((group) => group.fileHash)
    .filter((hash): hash is string => Boolean(hash));
  if (hashes.length === 0) return [];

  const items = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mediaType: files.mediaType,
      size: files.size,
      mtime: files.mtime,
      fileHash: files.fileHash,
      storageId: userStorages.id,
      storageType: userStorages.type,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        eq(userStorages.userId, userId),
        isNotNull(files.fileHash),
        isNull(files.deletedAt),
        inArray(files.fileHash, hashes),
      ),
    )
    .orderBy(sql`${files.mtime} asc nulls last`);

  const byHash = new Map<string, DuplicateGroup>();
  for (const group of groups) {
    if (!group.fileHash) continue;
    byHash.set(group.fileHash, {
      fileHash: group.fileHash,
      count: Number(group.count),
      totalSize: Number(group.totalSize),
      items: [],
    });
  }
  for (const item of items) {
    if (!item.fileHash) continue;
    const group = byHash.get(item.fileHash);
    if (!group) continue;
    if (group.items.length >= maxItemsPerGroup) continue;
    group.items.push({
      id: item.id,
      title: item.title,
      path: item.path,
      mediaType: item.mediaType,
      size: item.size,
      mtime: item.mtime,
      storageId: item.storageId,
      storageType: item.storageType,
    });
  }

  return Array.from(byHash.values()).filter((group) => group.items.length > 1);
}

/** 去重摘要：可节省的重复体积（不含每组保留的第一份）。 */
export async function fetchDedupSummary(userId: number) {
  const rows = await db
    .select({
      fileHash: files.fileHash,
      count: sql<number>`count(*)::int`,
      totalSize: sql<number>`coalesce(sum(${files.size}), 0)::bigint`,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(
      and(
        eq(userStorages.userId, userId),
        isNotNull(files.fileHash),
        isNull(files.deletedAt),
      ),
    )
    .groupBy(files.fileHash)
    .having(sql`count(*) > 1`);

  let duplicateFiles = 0;
  let duplicateBytes = 0;
  for (const row of rows) {
    const count = Number(row.count);
    const totalSize = Number(row.totalSize);
    duplicateFiles += count - 1;
    // 每组可删 (count-1) 份；按均摊体积估算可节省空间
    duplicateBytes += count > 1 ? Math.round((totalSize / count) * (count - 1)) : 0;
  }

  return { groups: rows.length, duplicateFiles, duplicateBytes };
}
