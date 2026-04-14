'use server';

import { saveSystemSettings as legacySaveSystemSettings } from '../actions-legacy';

export async function saveSystemSettings(formData: FormData) {
  return legacySaveSystemSettings(formData);
}