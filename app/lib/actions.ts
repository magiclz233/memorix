'use server';

import { z } from "zod";
import { revalidatePath } from 'next/cache';
import { auth, signIn, signOut } from '@/auth';
import { AuthError } from "next-auth";
import { and, eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './drizzle'; // 引入 db
import { files, invoices, userSettings, userStorages, users } from './schema'; // 引入表定义
import { runStorageScan } from './storage-scan';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: "Please select a customer.",
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: "Please enter an amount greater than $0." }),
  status: z.enum(["pending", "paid"], {
    invalid_type_error: "Please select an invoice status.",
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ date: true, id: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
  success?: boolean;
};

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

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Invoice.",
      success: false,
    };
  }

  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split("T")[0];

  // Insert data into the database
  try {
    await db.insert(invoices).values({
      customerId: customerId,
      amount: amountInCents,
      status: status,
      date: date,
    });
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: "Database Error: Failed to Create Invoice.",
      success: false,
    };
  }

  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath("/dashboard/invoices");
  // 返回成功状态给客户端，由客户端决定跳转（在拦截路由中更稳定）
  return { success: true, message: null, errors: {} };
}

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
): Promise<State> {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get("customerId"),
    amount: formData.get("amount"),
    status: formData.get("status"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Invoice.",
      success: false,
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await db
      .update(invoices)
      .set({
        customerId: customerId,
        amount: amountInCents,
        status: status,
      })
      .where(eq(invoices.id, id));
  } catch (error) {
    return {
      message: "Database Error: Failed to Update Invoice.",
      success: false,
    };
  }

  revalidatePath("/dashboard/invoices");
  // 返回成功状态给客户端，由客户端决定跳转（在拦截路由中更稳定）
  return { success: true, message: null, errors: {} };
}

export async function deleteInvoice(id: string) {
  await db.delete(invoices).where(eq(invoices.id, id));
  revalidatePath("/dashboard/invoices");
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
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

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.insert(users).values({ name, email, password: hashedPassword });
    return { success: true, message: null, errors: {} };
  } catch (error) {
    console.error('注册失败：', error);
    return { success: false, message: '注册失败，请稍后重试。' };
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}

async function requireUser() {
  const session = await auth();
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
  return user;
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

  const user = await requireUser();
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
  const user = await requireUser();
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

export async function deleteUserStorage(storageId: number) {
  const user = await requireUser();
  const storage = await db.query.userStorages.findFirst({
    where: and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)),
  });

  if (!storage) {
    return { success: false, message: '存储配置不存在。' };
  }

  await db
    .delete(userStorages)
    .where(and(eq(userStorages.id, storageId), eq(userStorages.userId, user.id)));

  revalidatePath('/dashboard/photos');
  revalidatePath('/gallery');
  return { success: true, message: '存储配置已删除。' };
}

export async function scanStorage(storageId: number) {
  const user = await requireUser();
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

export async function signInWithGitHub(formData: FormData) {
  const redirectTo = formData.get('redirectTo');
  const trimmedRedirectTo =
    typeof redirectTo === 'string' ? redirectTo.trim() : '';
  const safeRedirectTo = trimmedRedirectTo.length > 0 ? trimmedRedirectTo : '/gallery';
  await signIn('github', { redirectTo: safeRedirectTo });
}

export async function setFilesPublished(fileIds: number[], isPublished: boolean) {
  const user = await requireUser();

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
  const user = await requireUser();

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

export async function setStoragePublished(storageId: number, isPublished: boolean) {
  const user = await requireUser();
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
  return { success: true, message: '已批量更新图库展示状态。' };
}
