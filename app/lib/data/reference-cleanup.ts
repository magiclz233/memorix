import { and, eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { collections, userSettings } from '@/app/lib/schema';

/**
 * 彻底删除媒体前清理交叉引用（P2-2 从 actions-legacy 抽出，回收站与旧删除路径共用）。
 * 两个函数都必须在**数据库事务内**调用（接收 tx）。
 */

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const HERO_SETTING_KEY = 'hero_images';

/** 清理用户 Hero 图设置中被删文件的引用 */
export async function cleanHeroReferences(
  tx: Transaction,
  deletedFileIds: number[],
  userId: number,
) {
  // 读取用户的 hero_images 设置
  const heroSettings = await tx
    .select({ value: userSettings.value })
    .from(userSettings)
    .where(
      and(
        eq(userSettings.userId, userId),
        eq(userSettings.key, HERO_SETTING_KEY),
      ),
    )
    .limit(1);

  if (heroSettings.length === 0) return;

  const currentHeroIds = Array.isArray(heroSettings[0].value)
    ? heroSettings[0].value.filter((id: unknown) => typeof id === 'number')
    : [];

  // 过滤掉已删除的文件 ID
  const remainingHeroIds = currentHeroIds.filter(
    (id: number) => !deletedFileIds.includes(id),
  );

  if (remainingHeroIds.length === 0) {
    // 没有剩余的 Hero 照片，删除设置记录
    await tx
      .delete(userSettings)
      .where(
        and(
          eq(userSettings.userId, userId),
          eq(userSettings.key, HERO_SETTING_KEY),
        ),
      );
  } else if (remainingHeroIds.length !== currentHeroIds.length) {
    // 有剩余的 Hero 照片，更新设置记录
    await tx
      .update(userSettings)
      .set({
        value: remainingHeroIds,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userSettings.userId, userId),
          eq(userSettings.key, HERO_SETTING_KEY),
        ),
      );
  }
}

/** 清理集合封面引用（coverImages 中被删文件的 id） */
export async function cleanCollectionCoverReferences(
  tx: Transaction,
  deletedFileIds: number[],
) {
  // 查询所有包含已删除文件作为封面的集合
  const affectedCollections = await tx
    .select({
      id: collections.id,
      coverImages: collections.coverImages,
    })
    .from(collections);

  for (const collection of affectedCollections) {
    if (!Array.isArray(collection.coverImages)) continue;

    const currentCovers = collection.coverImages.filter(
      (id: unknown) => typeof id === 'number',
    );

    // 过滤掉已删除的文件 ID
    const remainingCovers = currentCovers.filter(
      (id: number) => !deletedFileIds.includes(id),
    );

    if (remainingCovers.length !== currentCovers.length) {
      // 更新集合的 coverImages 字段
      await tx
        .update(collections)
        .set({
          coverImages: remainingCovers,
          updatedAt: new Date(),
        })
        .where(eq(collections.id, collection.id));
    }
  }
}
