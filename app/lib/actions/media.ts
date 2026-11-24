'use server';

import {
  setFilesPublished as legacySetFilesPublished,
  setAllFilesPublished as legacySetAllFilesPublished,
  setFilteredFilesPublished as legacySetFilteredFilesPublished,
  setHeroPhotos as legacySetHeroPhotos,
  updatePhotoDetails as legacyUpdatePhotoDetails,
  deleteMediaFiles as legacyDeleteMediaFiles,
  type FilteredPublishInput,
} from '../actions-legacy';
import { cache } from '../cache';
import { CacheKeys } from '../cache-keys';
import { recordAuditLogForCurrentUser } from '../audit-log';
import type { MediaTagUpdateMode } from '../media-tags';

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  const result = await legacySetFilesPublished(fileIds, isPublished);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: isPublished ? 'media.publish' : 'media.unpublish',
      resource: 'media',
      changes: { fileIds, isPublished },
    });
  }
  // 清除画廊列表、详情与概览缓存
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.del(fileIds.map((id) => CacheKeys.mediaDetail(id))),
    cache.delPattern('dashboard:overview*'),
    cache.delPattern('front:hero*'),
  ]);
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
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.delPattern('media:detail:*'),
    cache.delPattern('dashboard:overview*'),
    cache.delPattern('front:hero*'),
  ]);
  return result;
}

export async function setFilteredFilesPublished(
  filters: FilteredPublishInput,
  isPublished: boolean,
) {
  const result = await legacySetFilteredFilesPublished(filters, isPublished);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: isPublished ? 'media.publish.filtered' : 'media.unpublish.filtered',
      resource: 'media',
      changes: { isPublished, count: result.count, filters },
    });
  }
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.delPattern('media:detail:*'),
    cache.delPattern('dashboard:overview*'),
    cache.delPattern('front:hero*'),
  ]);
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
  // 清除首页 Hero 缓存（含带 userId/limit 参数的所有变体）
  await cache.delPattern('front:hero*');
  return result;
}

export async function updatePhotoDetails(formData: FormData) {
  const result = await legacyUpdatePhotoDetails(formData);
  // 清除画廊列表与标签映射缓存
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.del(CacheKeys.mediaTagsMap()),
  ]);
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
    cache.del(CacheKeys.mediaTagsMap()),
    cache.delPattern('front:hero*'),
    cache.delPattern('front:featured-collections*'),
    cache.delPattern('dashboard:overview*'),
  ]);
  return result;
}

export async function setMediaTags(
  fileIds: number[],
  tags: string[],
  mode: MediaTagUpdateMode = 'replace',
) {
  const { setMediaTags: legacySetMediaTags } = await import('../actions-legacy');
  const result = await legacySetMediaTags(fileIds, tags, mode);
  if (result.success) {
    await recordAuditLogForCurrentUser({
      action: 'media.tags.update',
      resource: 'media',
      changes: { fileIds, tags, mode },
    });
  }
  // 标签影响列表展示、详情与全局标签映射缓存
  await Promise.all([
    cache.delPattern('gallery:list:*'),
    cache.del(fileIds.map((id) => CacheKeys.mediaDetail(id))),
    cache.del(CacheKeys.mediaTagsMap()),
  ]);
  return result;
}