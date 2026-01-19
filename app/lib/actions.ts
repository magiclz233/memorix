'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { APIError } from 'better-auth/api';
import { auth } from '@/auth';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from './drizzle'; // 引入 db
import {
  collectionItems,
  files,
  photoCollections,
  photoMetadata,
  userSettings,
  userStorages,
  users,
  videoSeries,
  videoSeriesItems,
} from './schema'; // 引入表定义
import { runStorageScan } from './storage-scan';
import { ApiError } from 'next/dist/server/api-utils';

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

const SignupSchema = z
  .object({
    name: z.string().trim().min(1, { message: '请输入姓名。' }),
    email: z.string().trim().email({ message: '请输入有效邮箱。' }),
    password: z.string().min(6, { message: '密码至少需要 6 位。' }),
    confirmPassword: z.string().min(6, { message: '请再次输入至少 6 位密码。' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致。',
    path: ['confirmPassword'],
  });

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  const email = formData.get('email');
  const password = formData.get('password');
  const redirectTo = formData.get('redirectTo');
  const trimmedRedirectTo =
    typeof redirectTo === 'string' ? redirectTo.trim() : '';
  const safeRedirectTo =
    trimmedRedirectTo.startsWith('/') ? trimmedRedirectTo : '/gallery';

  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Invalid credentials.';
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.trim()),
    });

    if (existingUser?.banned) {
      return '该账户已被禁用，请联系管理员。';
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
        return 'Invalid credentials.';
      }
      return error.message || 'Something went wrong.';
    }
    throw error;
  }

  redirect(safeRedirectTo);
}

export async function signup(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '请检查表单信息。',
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
        errors: { email: ['该邮箱已注册。'] },
        message: '该邮箱已注册。',
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
    console.error('注册失败：', error);
    return { success: false, message: '注册失败，请稍后重试。' };
  }
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect('/login');
}

async function requireUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const email = session?.user?.email;
  if (!email) {
    throw new Error('未登录或缺少用户信息。');
  }
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) {
    throw new Error('用户不存在。');
  }
  if (user.banned) {
    throw new Error('账户已禁用。');
  }
  return user;
}

async function requireAdminUser() {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

const UserRoleSchema = z.object({
  userId: z.coerce.number().int().positive(),
  role: z.enum(['admin', 'user']),
});

export async function setUserRole(formData: FormData) {
  const admin = await requireAdminUser();
  const parsed = UserRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { success: false, message: '无效的用户角色参数。' };
  }

  const { userId, role } = parsed.data;
  if (admin.id === userId && role !== 'admin') {
    return { success: false, message: '不能将自己设置为普通用户。' };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!target) {
    return { success: false, message: '用户不存在。' };
  }

  if (target.role === role) {
    return { success: true, message: '用户角色未改变。' };
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath('/dashboard/settings/users');
  return {
    success: true,
    message: role === 'admin' ? '用户角色已设置为管理员。' : '用户角色已设置为普通用户。',
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

export async function saveUserStorage(input: z.infer<typeof StorageConfigSchema>) {
  const parsed = StorageConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: '配置参数不完整。' };
  }

  const user = await requireAdminUser();
  const data = parsed.data;
  const existingStorage = data.id
    ? await db.query.userStorages.findFirst({
        where: and(eq(userStorages.id, data.id), eq(userStorages.userId, user.id)),
      })
    : null;

  if (data.id && !existingStorage) {
    return { success: false, message: '存储配置不存在。' };
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
    return { success: false, message: '请填写根目录路径。' };
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
      revalidatePath('/dashboard/photos');
      return { success: true, message: '存储配置已更新。', storageId: data.id };
    }

    const inserted = await db
      .insert(userStorages)
      .values({
        userId: user.id,
        type: data.type,
        config,
      })
      .returning({ id: userStorages.id });

    revalidatePath('/dashboard/photos');
    return {
      success: true,
      message: '存储配置已保存。',
      storageId: inserted[0]?.id,
    };
  } catch (error) {
    console.error('保存存储配置失败：', error);
    return { success: false, message: '保存存储配置失败。' };
  }
}

export async function setUserStorageDisabled(storageId: number, isDisabled: boolean) {
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: '存储配置不存在。' };
  }

  const config = (storage.config ?? {}) as Record<string, unknown>;

  await db
    .update(userStorages)
    .set({
      config: { ...config, isDisabled },
      updatedAt: new Date(),
    })
    .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));

  revalidatePath('/dashboard/photos');
  revalidatePath('/gallery');
  return {
    success: true,
    message: isDisabled ? '已禁用存储配置。' : '已启用存储配置。',
  };
}

export async function checkStorageDependencies(storageId: number) {
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: '存储配置不存在。' };
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
    .select({ title: photoCollections.title })
    .from(photoCollections)
    .innerJoin(
      collectionItems,
      eq(photoCollections.id, collectionItems.collectionId),
    )
    .where(inArray(collectionItems.fileId, fileIds))
    .groupBy(photoCollections.id, photoCollections.title);

  const relatedSeries = await db
    .select({ title: videoSeries.title })
    .from(videoSeries)
    .innerJoin(
      videoSeriesItems,
      eq(videoSeries.id, videoSeriesItems.seriesId),
    )
    .where(inArray(videoSeriesItems.fileId, fileIds))
    .groupBy(videoSeries.id, videoSeries.title);

  const dependencies = [
    ...relatedCollections.map((c) => `图片集: ${c.title}`),
    ...relatedSeries.map((s) => `视频集: ${s.title}`),
  ];

  return { success: true, dependencies };
}

export async function deleteUserStorage(storageId: number) {
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: '存储配置不存在。' };
  }

  await db.transaction(async (tx) => {
    const fileList = await tx
      .select({ id: files.id })
      .from(files)
      .where(eq(files.userStorageId, storageId));

    const fileIds = fileList.map((f) => f.id);

    if (fileIds.length > 0) {
      await tx
        .delete(collectionItems)
        .where(inArray(collectionItems.fileId, fileIds));
      await tx
        .delete(videoSeriesItems)
        .where(inArray(videoSeriesItems.fileId, fileIds));
      await tx
        .delete(photoMetadata)
        .where(inArray(photoMetadata.fileId, fileIds));
      await tx.delete(files).where(eq(files.userStorageId, storageId));
    }

    await tx
      .delete(userStorages)
      .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));
  });

  revalidatePath('/dashboard/photos');
  revalidatePath('/gallery');
  return { success: true, message: '存储配置及相关文件已删除。' };
}

export async function setStoragePublished(storageId: number, isPublished: boolean) {
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: '存储配置不存在。' };
  }

  await db
    .update(files)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(files.userStorageId, storageId));

  revalidatePath('/dashboard/photos');
  revalidatePath('/gallery');
  return {
    success: true,
    message: isPublished
      ? '已发布该数据源下的所有图片。'
      : '已隐藏该数据源下的所有图片。',
  };
}

export async function scanStorage(storageId: number) {
  const user = await requireAdminUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: '存储配置不存在。' };
  }

  if (storage.type !== 'local' && storage.type !== 'nas') {
    return { success: false, message: '当前存储类型暂不支持扫描。' };
  }

  const storageType = storage.type as 'local' | 'nas';
  const storageConfig = (storage.config ?? {}) as {
    rootPath?: string;
    isDisabled?: boolean;
  };

  if (storageConfig.isDisabled) {
    return { success: false, message: '当前配置已禁用，请先启用。' };
  }

  const rootPath = storageConfig.rootPath;
  if (!rootPath) {
    return { success: false, message: '根目录路径未配置。' };
  }

  try {
    const { processed } = await runStorageScan({
      storageId: storage.id,
      storageType,
      rootPath,
      onLog: (entry) => {
        const text = `[扫描] ${entry.message}`;
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
    revalidatePath('/dashboard/photos');
    revalidatePath('/gallery');
    return { success: true, message: `扫描完成，共处理 ${processed} 张图片，旧记录已清空。` };
  } catch (error) {
    console.error('扫描目录失败：', error);
    return { success: false, message: '扫描目录失败，请检查路径是否可访问。' };
  }
}

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  const user = await requireAdminUser();

  const storageIds = await db
    .select({ id: userStorages.id })
    .from(userStorages)
    .where(eq(userStorages.userId, user.id));

  const allowedStorageIds = storageIds.map((item) => item.id);
  if (allowedStorageIds.length === 0) {
    return { success: false, message: '未找到可用的存储配置。' };
  }

  if (!fileIds.length) {
    return { success: false, message: '未选择任何图片。' };
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

  revalidatePath('/dashboard/photos');
  revalidatePath('/gallery');
  return { success: true, message: '图库展示状态已更新。' };
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
  const user = await requireAdminUser();

  const storageIds = await db
    .select({ id: userStorages.id })
    .from(userStorages)
    .where(eq(userStorages.userId, user.id));

  const allowedStorageIds = storageIds.map((item) => item.id);
  if (allowedStorageIds.length === 0) {
    return { success: false, message: '未找到可用的存储配置。' };
  }

  if (!fileIds.length) {
    return { success: false, message: '未选择任何图片。' };
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
    return { success: false, message: '请选择已发布的图片。' };
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

  revalidatePath('/dashboard/photos');
  revalidatePath('/');
  return {
    success: true,
    message: isHero ? '首页展示状态已更新。' : '已取消首页展示。',
  };
}

export async function toggleUserBan(formData: FormData) {
  const admin = await requireAdminUser();
  const userId = Number(formData.get('userId'));
  const banned = formData.get('banned') === 'true'; // Target state

  if (!userId) {
    return { success: false, message: '无效的用户 ID。' };
  }

  if (admin.id === userId) {
    return { success: false, message: '不能禁用自己。' };
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!target) {
    return { success: false, message: '用户不存在。' };
  }

  await db
    .update(users)
    .set({ banned, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath('/dashboard/settings/users');
  return {
    success: true,
    message: banned ? '用户已禁用。' : '用户已启用。',
  };
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdminUser();
  const userId = Number(formData.get('userId'));

  if (!userId) {
    return { success: false, message: '无效的用户 ID。' };
  }

  if (admin.id === userId) {
    return { success: false, message: '不能删除自己。' };
  }

  try {
    await db.delete(users).where(eq(users.id, userId));
    
    revalidatePath('/dashboard/settings/users');
    return { success: true, message: '用户已删除。' };
  } catch (error) {
    console.error('删除用户失败：', error);
    return { success: false, message: '删除用户失败。' };
  }
}

const ProfileSchema = z.object({
  name: z.string().trim().min(1, { message: '请输入姓名。' }),
  email: z.string().trim().email({ message: '请输入有效邮箱。' }),
});

export async function updateProfile(prevState: any, formData: FormData) {
  const user = await requireUser();
  
  const validatedFields = ProfileSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '请检查表单信息。',
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
          errors: { email: ['该邮箱已被使用。'] },
          message: '邮箱已被使用。',
        };
      }
    }

    await db
      .update(users)
      .set({ name, email, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath('/dashboard/settings/profile');
    return { success: true, message: '个人资料已更新。' };
  } catch (error) {
    console.error('更新资料失败：', error);
    return { success: false, message: '更新失败，请稍后重试。' };
  }
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: '请输入当前密码。' }),
    newPassword: z.string().min(6, { message: '新密码至少需要 6 位。' }),
    confirmPassword: z.string().min(6, { message: '请再次输入新密码。' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致。',
    path: ['confirmPassword'],
  });

export async function changePasswordAction(prevState: any, formData: FormData) {
  const validatedFields = ChangePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '请检查输入。',
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

    return { success: true, message: '密码已修改，请使用新密码登录。' };
  } catch (error) {
    if (error instanceof APIError) {
       return { success: false, message: error.message || '密码修改失败。' };
    }
    return { success: false, message: '密码修改失败，请确认当前密码是否正确。' };
  }
}


