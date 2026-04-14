'use server';

import {
  setFilesPublished as legacySetFilesPublished,
  setHeroPhotos as legacySetHeroPhotos,
  updatePhotoDetails as legacyUpdatePhotoDetails,
  deleteMediaFiles as legacyDeleteMediaFiles,
} from '../actions-legacy';

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  return legacySetFilesPublished(fileIds, isPublished);
}

export async function setHeroPhotos(fileIds: number[], isHero: boolean) {
  return legacySetHeroPhotos(fileIds, isHero);
}

export async function updatePhotoDetails(formData: FormData) {
  return legacyUpdatePhotoDetails(formData);
}

export async function deleteMediaFiles(fileIds: number[]) {
  return legacyDeleteMediaFiles(fileIds);
}