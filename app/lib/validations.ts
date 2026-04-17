import { z } from 'zod';

// ============ 媒体上传验证 ============
export const uploadSchema = z.object({
  fileName: z.string().min(1, '文件名不能为空').max(255, '文件名过长'),
  fileSize: z
    .number()
    .positive('文件大小必须大于 0')
    .max(500 * 1024 * 1024, '文件大小不能超过 500MB'),
  mimeType: z.enum(
    [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/gif',
      'image/avif',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ],
    { errorMap: () => ({ message: '不支持的文件类型' }) },
  ),
  fileHash: z.string().length(32, '文件哈希格式不正确'),
  userStorageId: z.number().int().positive('存储源 ID 无效'),
});

// ============ 作品集创建/编辑验证 ============
export const collectionSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(255, '标题过长'),
  description: z.string().max(1000, '描述过长').optional(),
  author: z.string().max(255, '作者名过长').optional(),
  type: z.enum(['mixed', 'photo', 'video'], {
    errorMap: () => ({ message: '类型无效' }),
  }),
  status: z.enum(['draft', 'published'], {
    errorMap: () => ({ message: '状态无效' }),
  }),
  coverImages: z.array(z.number().int().positive()).max(3, '封面图最多 3 张'),
});

// ============ 用户设置验证 ============
export const userSettingsSchema = z.object({
  displayName: z.string().min(1, '显示名称不能为空').max(100, '显示名称过长'),
  email: z.string().email('邮箱格式不正确'),
  language: z.enum(['zh-CN', 'en'], {
    errorMap: () => ({ message: '不支持的语言' }),
  }),
  theme: z.enum(['light', 'dark', 'system'], {
    errorMap: () => ({ message: '主题无效' }),
  }),
});

// ============ 密码修改验证 ============
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '当前密码不能为空'),
    newPassword: z
      .string()
      .min(8, '密码至少 8 位')
      .max(128, '密码过长')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        '密码必须包含大小写字母和数字',
      ),
    confirmPassword: z.string().min(1, '确认密码不能为空'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次密码不一致',
    path: ['confirmPassword'],
  });

// ============ 存储配置验证 ============
export const storageConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('local'),
    name: z.string().min(1).max(255),
    config: z.object({
      rootPath: z.string().min(1, '根目录路径不能为空'),
      alias: z.string().max(255).optional(),
    }),
  }),
  z.object({
    type: z.literal('nas'),
    name: z.string().min(1).max(255),
    config: z.object({
      rootPath: z.string().min(1, '根目录路径不能为空'),
      alias: z.string().max(255).optional(),
    }),
  }),
  z.object({
    type: z.literal('s3'),
    name: z.string().min(1).max(255),
    config: z.object({
      endpoint: z.string().url('Endpoint 格式不正确'),
      bucket: z.string().min(1, 'Bucket 不能为空'),
      region: z.string().min(1, 'Region 不能为空'),
      accessKey: z.string().min(1, 'Access Key 不能为空'),
      secretKey: z.string().min(1, 'Secret Key 不能为空'),
      prefix: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('qiniu'),
    name: z.string().min(1).max(255),
    config: z.object({
      bucket: z.string().min(1, 'Bucket 不能为空'),
      accessKey: z.string().min(1, 'Access Key 不能为空'),
      secretKey: z.string().min(1, 'Secret Key 不能为空'),
      domain: z.string().url('域名格式不正确'),
      prefix: z.string().optional(),
    }),
  }),
]);

// ============ 通用验证辅助函数 ============
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * 格式化 Zod 错误为用户友好的消息
 */
export function formatValidationErrors(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join('；');
}

// 导出类型
export type UploadInput = z.infer<typeof uploadSchema>;
export type CollectionInput = z.infer<typeof collectionSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type StorageConfigInput = z.infer<typeof storageConfigSchema>;
