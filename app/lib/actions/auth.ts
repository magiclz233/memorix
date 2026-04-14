'use server';

import {
  authenticate as legacyAuthenticate,
  signup as legacySignup,
  signOutAction as legacySignOutAction,
  type SignupState,
} from '../actions-legacy';

export type { SignupState };

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  return legacyAuthenticate(prevState, formData);
}

export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  return legacySignup(prevState, formData);
}

export async function signOutAction() {
  return legacySignOutAction();
}