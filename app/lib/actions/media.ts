'use server';

import {
  setFilesPublished as legacySetFilesPublished,
  setAllFilesPublished as legacySetAllFilesPublished,
  setHeroPhotos as legacySetHeroPhotos,
  updatePhotoDetails as legacyUpdatePhotoDetails,
  deleteMediaFiles as legacyDeleteMediaFiles,
} from '../actions-legacy';
import { cache } from '../cache';
import { CacheKeys } from '../cache-keys';
import { recordAuditLogForCurrentUser } from '../audit-log';

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  const result = await legacySetFilesPublished(fileIds, isPublished);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: isPublished ? 'media.publish' : 'media.unpublish',
      resource: 'media',
      changes: { fileIds, isPublished },
    });
  }
  // 清除画廊列表缓存和各文件详情缓存
  await cache.delPattern('gallery:list:*');
  await cache.del(fileIds.map((id) => CacheKeys.mediaDetail(id)));
  return result;
}

export async function setAllFilesPublished(isPublished: boolean) {
  const result = await legacySetAllFilesPublished(isPublished);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: isPublished ? 'media.publish.all' : 'media.unpublish.all',
      resource: 'media',
      changes: { isPublished, count: result.count },
    });
  }
  // 全库操作无法预先知道受影响的 id，按 pattern 清理列表与详情缓存。
  await cache.delPattern('gallery:list:*');
  await cache.delPattern('media:detail:*');
  await cache.del(CacheKeys.dashboardOverview());
  return result;
}

export async function setHeroPhotos(fileIds: number[], isHero: boolean) {
  const result = await legacySetHeroPhotos(fileIds, isHero);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: isHero ? 'media.hero.add' : 'media.hero.remove',
      resource: 'media',
      changes: { fileIds, isHero },
    });
  }
  // 清除首页 Hero 缓存
  await cache.del(CacheKeys.frontHero());
  return result;
}

export async function updatePhotoDetails(formData: FormData) {
  const result = await legacyUpdatePhotoDetails(formData);
  // 清除画廊列表缓存
  await cache.delPattern('gallery:list:*');
  return result;
}

export async function deleteMediaFiles(fileIds: number[]) {
  const result = await legacyDeleteMediaFiles(fileIds);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: 'media.delete',
      resource: 'media',
      changes: { fileIds, permanent: true },
    });
  }
  // 清除相关缓存
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.del(fileIds.map((id) => CacheKeys.mediaDetail(id))),
    cache.del(CacheKeys.frontHero()),
    cache.del(CacheKeys.frontFeaturedCollections()),
    cache.del(CacheKeys.dashboardOverview()),
  ]);
  return result;
}

export async function setMediaTags(fileIds: number[], tags: string[]) {
  const { setMediaTags: legacySetMediaTags } = await import('../actions-legacy');
  const result = await legacySetMediaTags(fileIds, tags);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: 'media.tags.update',
      resource: 'media',
      changes: { fileIds, tags },
    });
  }
  // 标签影响列表展示与搜索
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.del(fileIds.map((id) => CacheKeys.mediaDetail(id))),
  ]);
  return result;
}