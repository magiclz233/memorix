'use server';

import { z } from 'zod';
import { revalidatePathForAllLocales } from './revalidate';
import { headers } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { stripLocalePrefix } from '@/i18n/paths';
import { APIError } from 'better-auth/api';
import { auth } from '@/auth';
import { and, eq, inArray } from 'drizzle-orm';
import { getTranslations, getLocale } from 'next-intl/server';
import { db } from './drizzle'; // 引入 db
import {
  collectionMedia,
  collections,
  files,
  photoMetadata,
  userSettings,
  userStorages,
  users,
} from './schema'; // 引入表定义
import { runStorageScan, type StorageScanMode } from './storage-scan';
import { ApiError } from 'next/dist/server/api-utils';
import { buildSystemSettingsKey, type SystemSettings } from './data';

export type SignupState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string | null;
  success?: boolean;
};

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const t = await getTranslations('actions.login');
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = formData.get('redirectTo');
  const trimmedRedirectTo =
    typeof redirectTo === 'string' ? redirectTo.trim() : '';
  const rawRedirectTo = trimmedRedirectTo.startsWith('/')
    ? trimmedRedirectTo
    : '/gallery';
  const safeRedirectTo = stripLocalePrefix(rawRedirectTo);

  if (typeof email !== 'string' || typeof password !== 'string') {
    return t('invalidCredentials');
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.trim()),
    });

    if (existingUser?.banned) {
      return t('banned');
    }

    await auth.api.signInEmail({
      body: {
        email: email.trim(),
        password,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 401) {
        return t('invalidCredentials');
      }
      return error.message || t('error');
    }
    throw error;
  }

  const locale = await getLocale();
  redirect({ href: safeRedirectTo, locale });
}

export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const t = await getTranslations('actions.signup');
  const SignupSchema = z
    .object({
      name: z.string().trim().min(1, { message: t('nameRequired') }),
      email: z.string().trim().email({ message: t('emailInvalid') }),
      password: z.string().min(6, { message: t('passwordMin') }),
      confirmPassword: z.string().min(6, { message: t('confirmPasswordMin') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordMismatch'),
      path: ['confirmPassword'],
    });

  const validatedFields = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: t('checkForm'),
      success: false,
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return {
        errors: { email: [t('emailTaken')] },
        message: t('emailTaken'),
        success: false,
      };
    }

    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
      headers: await headers(),
    });
    return { success: true, message: null, errors: {} };
  } catch (error) {
    console.error('Registration failed:', error);
    return { success: false, message: t('failed') };
  }
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  const locale = await getLocale();
  redirect({ href: '/login', locale });
}

async function requireUser() {
  const t = await getTranslations('actions.common');
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email;
  if (!email) {
    throw new Error(t('notLoggedIn'));
  }
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) {
    throw new Error(t('userNotFound'));
  }
  if (user.banned) {
    throw new Error(t('banned'));
  }
  return user;
}

async function requireAdminUser() {
  const t = await getTranslations('actions.common');
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new Error(t('forbidden'));
  }
  return user;
}

const UserRoleSchema = z.object({
  userId: z.coerce.number().int().positive(),
  role: z.enum(['admin', 'user']),
});

export async function setUserRole(formData: FormData) {
  const t = await getTranslations('actions.role');
  const tCommon = await getTranslations('actions.common');
  const admin = await requireAdminUser();
  const parsed = UserRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { success: false, message: t('invalid') };
  }

  const { userId, role } = parsed.data;
  if (admin.id === userId && role !== 'admin') {
    return { success: false, message: t('selfDowngrade') };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!target) {
    return { success: false, message: tCommon('userNotFound') };
  }

  if (target.role === role) {
    return { success: true, message: t('unchanged') };
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePathForAllLocales('/dashboard/settings/users');
  return {
    success: true,
    message: role === 'admin' ? t('setAdmin') : t('setUser'),
  };
}

const StorageConfigSchema = z.object({
  id: z.number().optional(),
  type: z.enum(['local', 'nas', 'qiniu', 's3']),
  rootPath: z.string().optional(),
  alias: z.string().optional(),
  endpoint: z.string().optional(),
  bucket: z.string().optional(),
  region: z.string().optional(),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  prefix: z.string().optional(),
  isDisabled: z.boolean().optional(),
});

const HERO_SETTING_KEY = 'hero_images';
const SYSTEM_SETTINGS_CAPABILITY_COUNT = 4;
const SYSTEM_SETTINGS_EQUIPMENT_COUNT = 6;

export async function saveUserStorage(input: z.infer<typeof StorageConfigSchema>) {
  const t = await getTranslations('actions.storage');
  const parsed = StorageConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: t('incomplete') };
  }

  const user = await requireAdminUser();
  const data = parsed.data;
  const existingStorage = data.id
    ? await db.query.userStorages.findFirst({
        where: and(eq(userStorages.id, data.id), eq(userStorages.userId, user.id)),
      })
    : null;

  if (data.id && !existingStorage) {
    return { success: false, message: t('notFound') };
  }

  const rootPath = data.rootPath?.trim();
  const existingConfig = (existingStorage?.config ?? {}) as { isDisabled?: boolean };
  const isDisabled =
    typeof data.isDisabled === 'boolean'
      ? data.isDisabled
      : typeof existingConfig.isDisabled === 'boolean'
        ? existingConfig.isDisabled
        : false;

  if ((data.type === 'local' || data.type === 'nas') && !rootPath) {
    return { success: false, message: t('rootPathRequired') };
  }

  const configBase =
    data.type === 'local' || data.type === 'nas'
      ? {
          rootPath,
          alias: data.alias ?? null,
        }
      : {
          endpoint: data.endpoint ?? null,
          bucket: data.bucket ?? null,
          region: data.region ?? null,
          accessKey: data.accessKey ?? null,
          secretKey: data.secretKey ?? null,
          prefix: data.prefix ?? null,
        };
  const config = { ...configBase, isDisabled };

  try {
    if (data.id) {
      await db
        .update(userStorages)
        .set({
          type: data.type,
          config,
          updatedAt: new Date(),
        })
        .where(and(eq(userStorages.id, data.id), eq(userStorages.userId, user.id)));
      revalidatePathForAllLocales('/dashboard/storage');
      revalidatePathForAllLocales('/dashboard/media');
      return { success: true, message: t('updated'), storageId: data.id };
    }

    const inserted = await db
      .insert(userStorages)
      .values({
        userId: user.id,
        type: data.type,
        config,
      })
      .returning({ id: userStorages.id });

    revalidatePathForAllLocales('/dashboard/storage');
    revalidatePathForAllLocales('/dashboard/media');
    return {
      success: true,
      message: t('saved'),
      storageId: inserted[0]?.id,
    };
  } catch (error) {
    console.error('Failed to save storage config:', error);
    return { success: false, message: t('saveFailed') };
  }
}

export async function setUserStorageDisabled(storageId: number, isDisabled: boolean) {
  const t = await getTranslations('actions.storage');
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: t('notFound') };
  }

  const config = (storage.config ?? {}) as Record<string, unknown>;

  await db
    .update(userStorages)
    .set({
      config: { ...config, isDisabled },
      updatedAt: new Date(),
    })
    .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));

  revalidatePathForAllLocales('/dashboard/storage');
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return {
    success: true,
    message: isDisabled ? t('disabled') : t('enabled'),
  };
}

export async function checkStorageDependencies(storageId: number) {
  const user = await requireAdminUser();
  const t = await getTranslations('actions.storage.dependency');
  const tStorage = await getTranslations('actions.storage');
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: tStorage('notFound') };
  }

  const storageFiles = await db
    .select({ id: files.id })
    .from(files)
    .where(eq(files.userStorageId, storageId));

  const fileIds = storageFiles.map((f) => f.id);

  if (fileIds.length === 0) {
    return { success: true, dependencies: [] };
  }

  const relatedCollections = await db
    .select({ title: collections.title })
    .from(collections)
    .innerJoin(
      collectionMedia,
      eq(collections.id, collectionMedia.collectionId),
    )
    .where(inArray(collectionMedia.fileId, fileIds))
    .groupBy(collections.id, collections.title);

  const dependencies = relatedCollections.map((c) =>
    t('collection', { title: c.title }),
  );

  return { success: true, dependencies };
}

export async function deleteUserStorage(storageId: number) {
  const t = await getTranslations('actions.storage');
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: t('notFound') };
  }

  await db.transaction(async (tx) => {
    const fileList = await tx
      .select({ id: files.id })
      .from(files)
      .where(eq(files.userStorageId, storageId));

    const fileIds = fileList.map((f) => f.id);

    if (fileIds.length > 0) {
      await tx
        .delete(collectionMedia)
        .where(inArray(collectionMedia.fileId, fileIds));
      await tx
        .delete(photoMetadata)
        .where(inArray(photoMetadata.fileId, fileIds));
      await tx.delete(files).where(eq(files.userStorageId, storageId));
    }

    await tx
      .delete(userStorages)
      .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));
  });

  revalidatePathForAllLocales('/dashboard/storage');
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return { success: true, message: t('deleted') };
}

export async function setStoragePublished(storageId: number, isPublished: boolean) {
  const t = await getTranslations('actions.storage');
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: t('notFound') };
  }

  await db
    .update(files)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(files.userStorageId, storageId));

  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return {
    success: true,
    message: isPublished
      ? t('published')
      : t('hidden'),
  };
}

export async function scanStorage(
  storageId: number,
  mode: StorageScanMode = 'incremental',
) {
  const t = await getTranslations('actions.storage');
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: t('notFound') };
  }

  if (storage.type !== 'local' && storage.type !== 'nas') {
    return { success: false, message: t('scanUnsupported') };
  }

  const storageType = storage.type as 'local' | 'nas';
  const storageConfig = (storage.config ?? {}) as {
    rootPath?: string;
    isDisabled?: boolean;
  };

  if (storageConfig.isDisabled) {
    return { success: false, message: t('configDisabled') };
  }

  const rootPath = storageConfig.rootPath;
  if (!rootPath) {
    return { success: false, message: t('noRootPath') };
  }

  try {
    const { processed } = await runStorageScan({
      storageId: storage.id,
      storageType,
      rootPath,
      mode,
      onLog: (entry) => {
        const text = t('scanPrefix', { message: entry.message });
        if (entry.level === 'error') {
          console.error(text);
          return;
        }
        if (entry.level === 'warn') {
          console.warn(text);
          return;
        }
        console.info(text);
      },
    });
    revalidatePathForAllLocales('/dashboard/media');
    revalidatePathForAllLocales('/gallery');
    return { success: true, message: t('scanSuccess', { count: processed }) };
  } catch (error) {
    console.error('扫描目录失败：', error);
    return { success: false, message: t('scanFailed') };
  }
}

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  const t = await getTranslations('actions.files');
  const user = await requireAdminUser();

  const storageIds = await db
    .select({ id: userStorages.id })
    .from(userStorages)
    .where(eq(userStorages.userId, user.id));

  const allowedStorageIds = storageIds.map((item) => item.id);
  if (allowedStorageIds.length === 0) {
    return { success: false, message: t('noStorage') };
  }

  if (!fileIds.length) {
    return { success: false, message: t('noneSelected') };
  }

  await db
    .update(files)
    .set({ isPublished, updatedAt: new Date() })
    .where(
      and(
        inArray(files.id, fileIds),
        inArray(files.userStorageId, allowedStorageIds),
      ),
    );

  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return { success: true, message: t('statusUpdated') };
}

const normalizeIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return Math.trunc(item);
      if (typeof item === 'string') {
        const parsed = Number(item);
        if (Number.isFinite(parsed)) return Math.trunc(parsed);
      }
      return null;
    })
    .filter((item): item is number => typeof item === 'number' && item > 0);
  return Array.from(new Set(ids));
};

export async function setHeroPhotos(fileIds: number[], isHero: boolean) {
  const t = await getTranslations('actions.files');
  const user = await requireAdminUser();

  const storageIds = await db
    .select({ id: userStorages.id })
    .from(userStorages)
    .where(eq(userStorages.userId, user.id));

  const allowedStorageIds = storageIds.map((item) => item.id);
  if (allowedStorageIds.length === 0) {
    return { success: false, message: t('noStorage') };
  }

  if (!fileIds.length) {
    return { success: false, message: t('noneSelected') };
  }

  const allowedFiles = await db
    .select({ id: files.id })
    .from(files)
    .where(
      and(
        inArray(files.id, fileIds),
        inArray(files.userStorageId, allowedStorageIds),
        eq(files.isPublished, true),
      ),
    );

  const allowedFileIds = allowedFiles.map((item) => item.id);
  if (allowedFileIds.length === 0) {
    return { success: false, message: t('selectPublished') };
  }

  const existing = await db
    .select({
      id: userSettings.id,
      value: userSettings.value,
    })
    .from(userSettings)
    .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, HERO_SETTING_KEY)))
    .limit(1);

  const currentIds = normalizeIdList(existing[0]?.value);
  const nextIds = isHero
    ? Array.from(new Set([...currentIds, ...allowedFileIds]))
    : currentIds.filter((id) => !allowedFileIds.includes(id));

  if (nextIds.length === 0) {
    if (existing[0]?.id) {
      await db
        .delete(userSettings)
        .where(eq(userSettings.id, existing[0].id));
    }
  } else if (existing[0]?.id) {
    await db
      .update(userSettings)
      .set({ value: nextIds, updatedAt: new Date() })
      .where(eq(userSettings.id, existing[0].id));
  } else {
    await db.insert(userSettings).values({
      userId: user.id,
      key: HERO_SETTING_KEY,
      value: nextIds,
      updatedAt: new Date(),
    });
  }

  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/');
  return {
    success: true,
    message: isHero ? t('heroUpdated') : t('heroRemoved'),
  };
}

export async function saveSystemSettings(formData: FormData) {
  const user = await requireAdminUser();
  const locale = await getLocale();
  const key = buildSystemSettingsKey(locale);
  const readText = (field: string) => {
    const value = formData.get(field);
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const capabilities = Array.from(
    { length: SYSTEM_SETTINGS_CAPABILITY_COUNT },
    (_, index) => {
      const title = readText(`capabilityTitle${index}`);
      const description = readText(`capabilityDescription${index}`);
      return title || description ? { title, description } : null;
    },
  );
  const normalizedCapabilities = capabilities.filter(
    (item): item is { title: string | null; description: string | null } =>
      item !== null,
  );

  const equipmentItemsJson = readText('equipmentItemsJson');
  let normalizedEquipmentItems = [];
  if (equipmentItemsJson) {
    try {
      normalizedEquipmentItems = JSON.parse(equipmentItemsJson);
    } catch (e) {
      console.error('Failed to parse equipmentItemsJson:', e);
    }
  }

  const aboutContactsJson = readText('aboutContactsJson');
  let normalizedContacts: any[] = [];
  if (aboutContactsJson) {
    try {
      const parsed = JSON.parse(aboutContactsJson);
      if (Array.isArray(parsed)) {
        normalizedContacts = parsed;
      }
    } catch (e) {
      console.error('Failed to parse aboutContactsJson:', e);
    }
  }

  const payload: SystemSettings = {
    siteName: readText('siteName'),
    seoDescription: readText('seoDescription'),
    publicAccess: formData.get('publicAccess') === 'on',
    about: {
      // New fields
      avatar: readText('aboutAvatar'),
      name: readText('aboutName'),
      location: readText('aboutLocation'),
      bio: readText('aboutBio'),
      commonEquipment: readText('commonEquipment'),
      contacts: normalizedContacts.length > 0 ? normalizedContacts : null,
      
      // Legacy contact field (set to null as we are migrating to contacts array)
      contact: null,

      // Legacy fields (kept but not actively populated by new UI)
      eyebrow: readText('aboutEyebrow'),
      title: readText('aboutTitle'),
      description: readText('aboutDescription'),
      manifestoTitle: readText('manifestoTitle'),
      manifestoDescription: readText('manifestoDescription'),
      capabilities:
        normalizedCapabilities.length > 0 ? normalizedCapabilities : null,
      equipmentSection: {
        eyebrow: readText('equipmentEyebrow'),
        title: readText('equipmentTitle'),
        description: readText('equipmentDescription'),
      },
      equipmentItems:
        normalizedEquipmentItems.length > 0 ? normalizedEquipmentItems : null,
    },
  };

  const existing = await db
    .select({ id: userSettings.id })
    .from(userSettings)
    .where(and(eq(userSettings.userId, user.id), eq(userSettings.key, key)))
    .limit(1);

  if (existing[0]?.id) {
    await db
      .update(userSettings)
      .set({ value: payload, updatedAt: new Date() })
      .where(eq(userSettings.id, existing[0].id));
  } else {
    await db.insert(userSettings).values({
      userId: user.id,
      key,
      value: payload,
      updatedAt: new Date(),
    });
  }

  // Sync avatar to user profile
  const avatarUrl = readText('aboutAvatar');
  await db
    .update(users)
    .set({ imageUrl: avatarUrl, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePathForAllLocales('/about');
  revalidatePathForAllLocales('/dashboard/settings/system');
  return;
}

export async function toggleUserBan(formData: FormData) {
  const t = await getTranslations('actions.user');
  const tCommon = await getTranslations('actions.common');
  const admin = await requireAdminUser();
  const userId = Number(formData.get('userId'));
  const banned = formData.get('banned') === 'true'; // Target state

  if (!userId) {
    return { success: false, message: t('invalidId') };
  }

  if (admin.id === userId) {
    return { success: false, message: t('selfBan') };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!target) {
    return { success: false, message: tCommon('userNotFound') };
  }

  await db
    .update(users)
    .set({ banned, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePathForAllLocales('/dashboard/settings/users');
  return {
    success: true,
    message: banned ? t('banned') : t('enabled'),
  };
}

export async function deleteUser(formData: FormData) {
  const t = await getTranslations('actions.user');
  const admin = await requireAdminUser();
  const userId = Number(formData.get('userId'));

  if (!userId) {
    return { success: false, message: t('invalidId') };
  }

  if (admin.id === userId) {
    return { success: false, message: t('selfDelete') };
  }

  try {
    await db.delete(users).where(eq(users.id, userId));
    
    revalidatePathForAllLocales('/dashboard/settings/users');
    return { success: true, message: t('deleted') };
  } catch (error) {
    console.error('删除用户失败：', error);
    return { success: false, message: t('deleteFailed') };
  }
}

const UpdatePhotoSchema = z.object({
  fileId: z.coerce.number().int().positive(),
  title: z.string().trim().optional(),
  author: z.string().trim().optional().or(z.literal('')),
  dateShot: z.string().trim().optional(),
});

export async function updatePhotoDetails(formData: FormData) {
  const t = await getTranslations('actions.files');
  const admin = await requireAdminUser();

  const parsed = UpdatePhotoSchema.safeParse({
    fileId: formData.get('fileId'),
    title: formData.get('title'),
    author: formData.get('author'),
    dateShot: formData.get('dateShot'),
  });

  if (!parsed.success) {
    return { success: false, message: t('invalid') };
  }

  const { fileId, title, author, dateShot } = parsed.data;

  try {
    const updates: { title?: string; author?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (author !== undefined) {
      updates.author = author && author.length > 0 ? author : null;
    }

    if (Object.keys(updates).length > 1) {
      await db
        .update(files)
        .set(updates)
        .where(eq(files.id, fileId));
    }

    const nextDate =
      dateShot && dateShot.length > 0
        ? (() => {
            const d = new Date(dateShot);
            return Number.isNaN(d.getTime()) ? null : d;
          })()
        : null;

    // Ensure metadata row exists, then update fields
    const existing = await db
      .select({ fileId: photoMetadata.fileId })
      .from(photoMetadata)
      .where(eq(photoMetadata.fileId, fileId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(photoMetadata).values({
        fileId,
        dateShot: nextDate,
      });
    } else {
      await db
        .update(photoMetadata)
        .set({
          dateShot: nextDate ?? null,
        })
        .where(eq(photoMetadata.fileId, fileId));
    }

    revalidatePathForAllLocales('/gallery');
    revalidatePathForAllLocales('/dashboard/media');
    return { success: true, message: t('updated') };
  } catch (error) {
    console.error('Failed to update photo details:', error);
    return { success: false, message: t('updateFailed') };
  }
}

export async function updateProfile(prevState: any, formData: FormData) {
  const t = await getTranslations('actions.profile');
  const tSignup = await getTranslations('actions.signup');
  const user = await requireUser();
  
  const ProfileSchema = z.object({
    name: z.string().trim().min(1, { message: tSignup('nameRequired') }),
    email: z.string().trim().email({ message: tSignup('emailInvalid') }),
  });

  const validatedFields = ProfileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: tSignup('checkForm'),
    };
  }

  const { name, email } = validatedFields.data;

  try {
    if (email !== user.email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existing) {
        return {
          success: false,
          errors: { email: [t('emailTaken')] },
          message: t('emailTaken'),
        };
      }
    }

    await db
      .update(users)
      .set({ name, email, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePathForAllLocales('/dashboard/settings/profile');
    return { success: true, message: t('updated') };
  } catch (error) {
    console.error('Failed to update profile:', error);
    return { success: false, message: t('updateFailed') };
  }
}

export async function changePasswordAction(prevState: any, formData: FormData) {
  const t = await getTranslations('actions.password');
  const ChangePasswordSchema = z
    .object({
      currentPassword: z.string().min(1, { message: t('currentRequired') }),
      newPassword: z.string().min(6, { message: t('newMin') }),
      confirmPassword: z.string().min(6, { message: t('confirmMin') }),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('mismatch'),
      path: ['confirmPassword'],
    });

  const validatedFields = ChangePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: t('checkInput'),
    };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return { success: true, message: t('success') };
  } catch (error) {
    if (error instanceof APIError) {
       return { success: false, message: error.message || t('failed') };
    }
    return { success: false, message: t('verifyCurrent') };
  }
}


