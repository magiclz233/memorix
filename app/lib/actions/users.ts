'use server';

import {
  setUserRole as legacySetUserRole,
  toggleUserBan as legacyToggleUserBan,
  deleteUser as legacyDeleteUser,
  updateProfile as legacyUpdateProfile,
  changePasswordAction as legacyChangePasswordAction,
  type ActionState,
} from '../actions-legacy';

export type { ActionState };

export async function setUserRole(formData: FormData) {
  return legacySetUserRole(formData);
}

export async function toggleUserBan(formData: FormData) {
  return legacyToggleUserBan(formData);
}

export async function deleteUser(formData: FormData) {
  return legacyDeleteUser(formData);
}

export async function updateProfile(prevState: ActionState, formData: FormData) {
  return legacyUpdateProfile(prevState, formData);
}

export async function changePasswordAction(prevState: ActionState, formData: FormData) {
  return legacyChangePasswordAction(prevState, formData);
}