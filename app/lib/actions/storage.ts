'use server';

import {
  saveUserStorage as legacySaveUserStorage,
  setUserStorageDisabled as legacySetUserStorageDisabled,
  clearStorageCache as legacyClearStorageCache,
  checkStorageDependencies as legacyCheckStorageDependencies,
  deleteUserStorage as legacyDeleteUserStorage,
  setStoragePublished as legacySetStoragePublished,
  scanStorage as legacyScanStorage,
} from '../actions-legacy';
import type { StorageScanMode } from '../storage-scan';

export async function saveUserStorage(input: any) {
  return legacySaveUserStorage(input);
}

export async function setUserStorageDisabled(storageId: number, isDisabled: boolean) {
  return legacySetUserStorageDisabled(storageId, isDisabled);
}

export async function clearStorageCache(
  storageId: number,
  mode: 'all' | 'lru',
  days?: number,
) {
  return legacyClearStorageCache(storageId, mode, days);
}

export async function checkStorageDependencies(storageId: number) {
  return legacyCheckStorageDependencies(storageId);
}

export async function deleteUserStorage(storageId: number) {
  return legacyDeleteUserStorage(storageId);
}

export async function setStoragePublished(storageId: number, isPublished: boolean) {
  return legacySetStoragePublished(storageId, isPublished);
}

export async function scanStorage(storageId: number, mode: StorageScanMode = 'incremental') {
  return legacyScanStorage(storageId, mode);
}