'use server';

import {
  setFilesPublished as legacySetFilesPublished,
  setHeroPhotos as legacySetHeroPhotos,
  updatePhotoDetails as legacyUpdatePhotoDetails,
  deleteMediaFiles as legacyDeleteMediaFiles,
} from '../actions-legacy';
import { cache } from '../cache';
import { CacheKeys } from '../cache-keys';

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  const result = await legacySetFilesPublished(fileIds, isPublished);
  // 清除画廊列表缓存和各文件详情缓存
  await cache.delPattern('gallery:list:*');
  await cache.del(fileIds.map((id) => CacheKeys.mediaDetail(id)));
  return result;
}

export async function setHeroPhotos(fileIds: number[], isHero: boolean) {
  const result = await legacySetHeroPhotos(fileIds, isHero);
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