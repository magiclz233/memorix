'use server';

import { z } from 'zod';
import path from 'path';
import { isPathWithinMediaRoots, warnIfMediaRootsUnset } from './path-safety';
import { encryptSecret, isMaskedSecret } from './secret-box';
import { promises as fs } from 'fs';
import { revalidatePathForAllLocales, revalidateHomeCache } from './revalidate';
import { headers } from 'next/headers';
import { redirect } from '@/i18n/navigation';
import { stripLocalePrefix } from '@/i18n/paths';
import { APIError } from 'better-auth/api';
import { auth } from '@/auth';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getTranslations, getLocale } from 'next-intl/server';
import { db } from './drizzle'; // 引入 db
import {
  collectionMedia,
  collections,
  files,
  photoMetadata,
  videoMetadata,
  userSettings,
  userStorages,
  users,
} from './schema'; // 引入表定义
import { ApiError } from 'next/dist/server/api-utils';
import { buildSystemSettingsKey, fetchPublicSystemSettings, type SystemSettings } from './data';
import { cleanHeroReferences, cleanCollectionCoverReferences } from './data/reference-cleanup';
import type { ContactItem } from './data-legacy';
import { getStorageCacheRoot } from './storage';
import { resolveS3Client } from './s3-helper';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StorageConfigSchema } from './storage-config-schema';
import { recordAuditLog } from './audit-log';

export type ActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
} | undefined;

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
  const locale = await getLocale();
  const settings = await fetchPublicSystemSettings(locale);
  if (settings?.publicAccess === false) {
    return { success: false, message: t('disabled'), errors: {} };
  }
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

const StorageCacheClearSchema = z.object({
  storageId: z.number().int().positive(),
  mode: z.enum(['all', 'lru']),
  days: z.number().int().positive().optional(),
});

const HERO_SETTING_KEY = 'hero_images';const MEDIA_TAGS_KEY = 'media_tags';
const SYSTEM_SETTINGS_CAPABILITY_COUNT = 4;
const SYSTEM_SETTINGS_EQUIPMENT_COUNT = 6;

export async function saveUserStorage(input: z.infer<typeof StorageConfigSchema>) {
  const t = await getTranslations('actions.storage');
  const parsed = StorageConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: t('incomplete') };
  }

  const user = await requireAdminUser();
  const actorId = Number(user.id);
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
  const existingConfig = (existingStorage?.config ?? {}) as {
    isDisabled?: boolean;
    secretKey?: string | null;
  };
  const isDisabled =
    typeof data.isDisabled === 'boolean'
      ? data.isDisabled
      : typeof existingConfig.isDisabled === 'boolean'
        ? existingConfig.isDisabled
        : false;

  if ((data.type === 'local' || data.type === 'nas') && !rootPath) {
    return { success: false, message: t('rootPathRequired') };
  }

  if ((data.type === 'local' || data.type === 'nas') && rootPath) {
    warnIfMediaRootsUnset();
    if (!isPathWithinMediaRoots(rootPath)) {
      return { success: false, message: t('rootPathOutsideAllowed') };
    }
  }

  // 密钥：新值加密入库；脱敏值（****xxxx）或留空表示沿用旧密钥。
  // 旧数据是明文时顺手加密，避免明文长期留在库中。
  let secretKey: string | null =
    typeof existingConfig.secretKey === 'string' ? existingConfig.secretKey : null;
  const incomingSecret = data.secretKey?.trim() ?? '';
  try {
    if (incomingSecret && !isMaskedSecret(incomingSecret)) {
      secretKey = encryptSecret(incomingSecret);
    } else if (secretKey) {
      secretKey = encryptSecret(secretKey);
    }
  } catch (error) {
    console.error('Failed to encrypt storage secret:', error);
    return { success: false, message: t('saveFailed') };
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
          secretKey,
          prefix: data.prefix ?? null,
          alias: data.alias ?? null,
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
      if (Number.isInteger(actorId) && actorId > 0) {
        await recordAuditLog({
          userId: actorId,
          action: 'storage.update',
          resource: 'storage',
          resourceId: data.id,
          changes: { type: data.type, alias: data.alias ?? null, isDisabled },
        });
      }
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

    const createdId = inserted[0]?.id;
    if (createdId && Number.isInteger(actorId) && actorId > 0) {
      await recordAuditLog({
        userId: actorId,
        action: 'storage.create',
        resource: 'storage',
        resourceId: createdId,
        changes: { type: data.type, alias: data.alias ?? null },
      });
    }

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
  const actorId = Number(user.id);
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

  if (Number.isInteger(actorId) && actorId > 0) {
    await recordAuditLog({
      userId: actorId,
      action: isDisabled ? 'storage.disable' : 'storage.enable',
      resource: 'storage',
      resourceId: storageId,
      changes: { isDisabled },
    });
  }
  revalidatePathForAllLocales('/dashboard/storage');
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return {
    success: true,
    message: isDisabled ? t('disabled') : t('enabled'),
  };
}

export async function clearStorageCache(
  storageId: number,
  mode: 'all' | 'lru',
  days?: number,
) {
  const t = await getTranslations('actions.storage');
  const user = await requireAdminUser();
  const parsed = StorageCacheClearSchema.safeParse({ storageId, mode, days });
  if (!parsed.success) {
    return { success: false, message: t('cacheInvalid') };
  }

  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: t('notFound') };
  }

  const cacheRoot = getStorageCacheRoot(storageId);
  try {
    const stat = await fs.stat(cacheRoot).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return { success: true, message: t('cacheEmpty') };
    }

    if (mode === 'all') {
      await fs.rm(cacheRoot, { recursive: true, force: true });
      return { success: true, message: t('cacheCleared') };
    }

    const keepDays = parsed.data.days ?? 0;
    if (keepDays <= 0) {
      return { success: false, message: t('cacheInvalidDays') };
    }

    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    const entries = await fs.readdir(cacheRoot);
    let removed = 0;
    for (const entry of entries) {
      const entryPath = path.join(cacheRoot, entry);
      const entryStat = await fs.stat(entryPath).catch(() => null);
      if (!entryStat || !entryStat.isFile()) continue;
      if (entryStat.mtime.getTime() < cutoff) {
        await fs.rm(entryPath, { force: true });
        removed += 1;
      }
    }

    return { success: true, message: t('cacheClearedLru', { count: removed }) };
  } catch (error) {
    console.error('Failed to clear storage cache:', error);
    return { success: false, message: t('cacheClearFailed') };
  }
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
  const actorId = Number(user.id);
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
      await tx.delete(collectionMedia).where(inArray(collectionMedia.fileId, fileIds));
      await tx.delete(photoMetadata).where(inArray(photoMetadata.fileId, fileIds));
      await tx.delete(videoMetadata).where(inArray(videoMetadata.fileId, fileIds));
      await cleanHeroReferences(tx, fileIds, user.id);
      await cleanCollectionCoverReferences(tx, fileIds);
      await tx.delete(files).where(eq(files.userStorageId, storageId));
    }

    await tx
      .delete(userStorages)
      .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));
  });

  if (Number.isInteger(actorId) && actorId > 0) {
    await recordAuditLog({
      userId: actorId,
      action: 'storage.delete',
      resource: 'storage',
      resourceId: storageId,
      changes: { type: storage.type },
    });
  }
  revalidatePathForAllLocales('/dashboard/storage');
  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  revalidatePathForAllLocales('/');
  revalidateHomeCache();
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

/**
 * 全库发布/取消发布：只动当前管理员自己存储源下未软删的文件。
 * 与 setFilesPublished 的区别是不接收 fileIds，因此不受当前分页限制。
 */
export async function setAllFilesPublished(isPublished: boolean) {
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

  const updated = await db
    .update(files)
    .set({ isPublished, updatedAt: new Date() })
    .where(
      and(
        inArray(files.userStorageId, allowedStorageIds),
        isNull(files.deletedAt),
      ),
    )
    .returning({ id: files.id });

  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return {
    success: true,
    count: updated.length,
    message: isPublished
      ? t('bulkPublished', { count: updated.length })
      : t('bulkUnpublished', { count: updated.length }),
  };
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
        isNull(files.deletedAt),
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
  revalidateHomeCache();
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
  let normalizedEquipmentItems: { title: string; description: string }[] = [];
  if (equipmentItemsJson) {
    try {
      normalizedEquipmentItems = JSON.parse(equipmentItemsJson);
    } catch (e) {
      console.error('Failed to parse equipmentItemsJson:', e);
    }
  }

  const aboutContactsJson = readText('aboutContactsJson');
  let normalizedContacts: ContactItem[] = [];
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


const normalizeMediaTagInput = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  const tags = value
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => item.slice(0, 32));
  return Array.from(new Set(tags)).slice(0, 12);
};

const normalizeMediaTagsMapValue = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string[]> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, rawValue]) => {
    const tags = Array.isArray(rawValue)
      ? rawValue
          .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter((tag): tag is string => tag.length > 0)
          .slice(0, 12)
      : [];
    if (tags.length > 0) {
      result[key] = Array.from(new Set(tags));
    }
  });
  return result;
};

const saveMediaTagsForFile = async (userId: number, fileId: number, tags: string[]) => {
  const existing = await db
    .select({ id: userSettings.id, value: userSettings.value })
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.key, MEDIA_TAGS_KEY)))
    .limit(1);

  const currentMap = normalizeMediaTagsMapValue(existing[0]?.value);
  const key = String(fileId);

  if (tags.length > 0) {
    currentMap[key] = tags;
  } else {
    delete currentMap[key];
  }

  const entries = Object.entries(currentMap);

  if (entries.length === 0) {
    if (existing[0]?.id) {
      await db.delete(userSettings).where(eq(userSettings.id, existing[0].id));
    }
    return;
  }

  if (existing[0]?.id) {
    await db
      .update(userSettings)
      .set({ value: currentMap, updatedAt: new Date() })
      .where(eq(userSettings.id, existing[0].id));
    return;
  }

  await db.insert(userSettings).values({
    userId,
    key: MEDIA_TAGS_KEY,
    value: currentMap,
    updatedAt: new Date(),
  });
};
const UpdatePhotoSchema = z.object({
  fileId: z.coerce.number().int().positive(),
  title: z.string().trim().optional(),
  author: z.string().trim().optional().or(z.literal('')),
  dateShot: z.string().trim().optional(),
  tags: z.string().trim().optional(),
});

export async function updatePhotoDetails(formData: FormData) {
  const t = await getTranslations('actions.files');
  const admin = await requireAdminUser();

  const parsed = UpdatePhotoSchema.safeParse({
    fileId: formData.get('fileId'),
    title: formData.get('title'),
    author: formData.get('author'),
    dateShot: formData.get('dateShot'),
    tags: formData.get('tags'),
  });

  if (!parsed.success) {
    return { success: false, message: t('invalid') };
  }

  const { fileId, title, author, dateShot, tags } = parsed.data;
  const nextTags = normalizeMediaTagInput(tags);

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

    if (tags !== undefined) {
      await saveMediaTagsForFile(admin.id, fileId, nextTags);
    }

    revalidatePathForAllLocales('/gallery');
    revalidatePathForAllLocales('/dashboard/media');
    return { success: true, message: t('updated') };
  } catch (error) {
    console.error('Failed to update photo details:', error);
    return { success: false, message: t('updateFailed') };
  }
}

export async function updateProfile(prevState: ActionState, formData: FormData) {
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

export async function changePasswordAction(prevState: ActionState, formData: FormData) {
  const t = await getTranslations('actions.password');
  const { config: appConfig } = await import('./config');
  const ChangePasswordSchema = z
    .object({
      currentPassword: z.string().min(1, { message: t('currentRequired') }),
      newPassword: z.string().min(appConfig.auth.minPasswordLength, { message: t('newMin') }),
      confirmPassword: z.string().min(appConfig.auth.minPasswordLength, { message: t('confirmMin') }),
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




/**
 * 批量删除媒体文件
 * @param fileIds 文件 ID 数组
 */
export async function deleteMediaFiles(fileIds: number[]) {
  const t = await getTranslations('actions.files');
  const user = await requireAdminUser();

  if (!fileIds || fileIds.length === 0) {
    return { success: false, message: t('noneSelected') };
  }

  try {
    // 查询文件信息，验证所有权
    const filesToDelete = await db
      .select({
        id: files.id,
        path: files.path,
        storageId: files.userStorageId,
        storageType: userStorages.type,
        storageConfig: userStorages.config,
      })
      .from(files)
      .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
      .where(
        and(
          inArray(files.id, fileIds),
          eq(userStorages.userId, user.id)
        )
      );

    if (filesToDelete.length === 0) {
      return { success: false, message: t('noStorage') };
    }

    // 安全：只用「已确认属于当前用户」的 id 执行后续所有删除。
    // 原实现用原始 fileIds 删除，只要入参混入一个自己的 id 就能通过所有权校验，
    // 进而删除事务里混入的他人文件（IDOR）。
    const authorizedIds = filesToDelete.map((f) => f.id);

    // 开启数据库事务
    await db.transaction(async (tx) => {
      // 删除集合关联
      await tx
        .delete(collectionMedia)
        .where(inArray(collectionMedia.fileId, authorizedIds));

      // 删除照片元数据
      await tx
        .delete(photoMetadata)
        .where(inArray(photoMetadata.fileId, authorizedIds));

      // 删除视频元数据
      await tx
        .delete(videoMetadata)
        .where(inArray(videoMetadata.fileId, authorizedIds));

      // 清理 Hero 照片引用
      await cleanHeroReferences(tx, authorizedIds, user.id);

      // 清理集合封面引用
      await cleanCollectionCoverReferences(tx, authorizedIds);

      // 删除文件记录
      await tx.delete(files).where(inArray(files.id, authorizedIds));
    });

    // 删除物理文件（在事务外执行，避免阻塞）
    const deletePromises = filesToDelete.map(async (file) => {
      try {
        if (file.storageType === 'local' || file.storageType === 'nas') {
          const basePath = (file.storageConfig as { rootPath?: string } | null)?.rootPath || '';
          if (basePath) {
            const resolvedRoot = path.resolve(basePath);
            const absolutePath = path.resolve(resolvedRoot, file.path);
            // 防路径穿越：记录里的 path 必须仍位于 rootPath 内。
            if (absolutePath.startsWith(resolvedRoot + path.sep)) {
              await fs.unlink(absolutePath).catch(() => {
                // 忽略文件不存在的错误
              });
            }
          }
        } else if (file.storageType === 's3') {
          // S3 文件此前只删 DB 记录，桶对象残留会持续产生存储费用且可被重新扫回。
          const config = (file.storageConfig ?? {}) as Record<string, string | null | undefined>;
          if (config.bucket && config.accessKey && config.secretKey) {
            try {
              const client = resolveS3Client(config);
              await client.send(
                new DeleteObjectCommand({ Bucket: config.bucket, Key: file.path }),
              );
            } catch (error) {
              console.error(`Failed to delete S3 object for file ${file.id}:`, error);
            }
          }
        }

        // 删除缩略图
        const thumbRoot = getStorageCacheRoot(file.storageId);
        const thumbPath = path.join(thumbRoot, `${file.id}.webp`);
        await fs.unlink(thumbPath).catch(() => {
          // 忽略文件不存在的错误
        });
      } catch (error) {
        console.error(`Failed to delete physical file ${file.id}:`, error);
      }
    });

    await Promise.allSettled(deletePromises);

    await Promise.all(authorizedIds.map((fileId) => saveMediaTagsForFile(user.id, fileId, [])));

    // 重新验证相关页面
    revalidatePathForAllLocales('/dashboard/media');
    revalidatePathForAllLocales('/gallery');
    revalidatePathForAllLocales('/');
    revalidateHomeCache();

    return {
      success: true,
      message: t('statusUpdated'),
    };
  } catch (error) {
    console.error('Delete media files error:', error);
    return {
      success: false,
      message: t('updateFailed'),
    };
  }
}

/**
 * 清理 Hero 照片引用
 * @param tx 事务对象
 * @param deletedFileIds 已删除的文件 ID
 * @param userId 用户 ID
 */
// cleanHeroReferences / cleanCollectionCoverReferences 已抽到 app/lib/data/reference-cleanup.ts，
// 供回收站彻底删除（P2-2）与旧删除路径共用。

export async function setMediaTags(fileIds: number[], tags: string[]) {
  const t = await getTranslations('actions.files');
  const user = await requireAdminUser();

  if (!fileIds || fileIds.length === 0) {
    return { success: false, message: t('noneSelected') };
  }

  const normalizedTags = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.slice(0, 32)),
    ),
  ).slice(0, 12);

  await Promise.all(fileIds.map((fileId) => saveMediaTagsForFile(user.id, fileId, normalizedTags)));

  revalidatePathForAllLocales('/dashboard/media');
  revalidatePathForAllLocales('/gallery');
  return { success: true, message: t('updated') };
}

