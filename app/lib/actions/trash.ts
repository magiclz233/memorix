'use server';

import { revalidatePathForAllLocales } from '@/app/lib/revalidate';
import { getTranslations } from 'next-intl/server';
import { eq } from 'drizzle-orm';
import { db } from '@/app/lib/drizzle';
import { users } from '@/app/lib/schema';
import { requireAdminUser } from '@/app/lib/auth-utils';
import {
  purgeFromTrash,
  restoreFromTrash,
  softDeleteMedia,
} from '@/app/lib/data/trash';
import { recordAuditLog } from '@/app/lib/audit-log';

/**
 * 回收站 server actions（P2-2）。
 * 语义：媒体库「删除」= 移入回收站（软删）；彻底删除只在回收站内触发。
 */

/** 解析出数据库整型用户 id（session.user.id 的类型不保证是 number） */
async function resolveDbUserId(): Promise<number | null> {
  const sessionUser = await requireAdminUser();
  const email = sessionUser.email;
  if (!email) return null;
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  return user?.id ?? null;
}

function revalidateAll() {
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/dashboard/trash');
  revalidatePathForAllLocales('/gallery');
}

/** 移入回收站（软删）。返回实际处理的数量。 */
export async function moveMediaToTrash(fileIds: number[]) {
  const t = await getTranslations('actions.trash');
  const userId = await resolveDbUserId();
  if (userId == null) {
    return { success: false, message: 'forbidden' };
  }

  if (!fileIds || fileIds.length === 0) {
    return { success: false, message: t('noneSelected') };
  }

  const moved = await softDeleteMedia(fileIds, userId);
  if (moved.length === 0) {
    return { success: false, message: t('nothingMoved') };
  }

  await recordAuditLog({
    userId,
    action: 'media.trash',
    resource: 'media',
    changes: { fileIds: moved, count: moved.length },
  });
  revalidateAll();
  return { success: true, message: t('moved', { count: moved.length }) };
}

/** 从回收站恢复。 */
export async function restoreTrashedMedia(fileIds: number[]) {
  const t = await getTranslations('actions.trash');
  const userId = await resolveDbUserId();
  if (userId == null) {
    return { success: false, message: 'forbidden' };
  }

  if (!fileIds || fileIds.length === 0) {
    return { success: false, message: t('noneSelected') };
  }

  const restored = await restoreFromTrash(fileIds, userId);
  if (restored.length === 0) {
    return { success: false, message: t('nothingRestored') };
  }

  await recordAuditLog({
    userId,
    action: 'media.restore',
    resource: 'media',
    changes: { fileIds: restored, count: restored.length },
  });
  revalidateAll();
  return { success: true, message: t('restored', { count: restored.length }) };
}

/** 彻底删除（物理）。只允许作用于已在回收站内的文件。 */
export async function purgeTrashedMedia(fileIds: number[]) {
  const t = await getTranslations('actions.trash');
  const userId = await resolveDbUserId();
  if (userId == null) {
    return { success: false, message: 'forbidden' };
  }

  if (!fileIds || fileIds.length === 0) {
    return { success: false, message: t('noneSelected') };
  }

  const { purged } = await purgeFromTrash(fileIds, userId);
  if (purged.length === 0) {
    return { success: false, message: t('nothingPurged') };
  }

  await recordAuditLog({
    userId,
    action: 'media.purge',
    resource: 'media',
    changes: { fileIds: purged, count: purged.length },
  });
  revalidateAll();
  return { success: true, message: t('purged', { count: purged.length }) };
}
