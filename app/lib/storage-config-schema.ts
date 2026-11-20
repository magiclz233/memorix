import { z } from 'zod';

/**
 * 存储配置校验规则。
 *
 * 注意：不能放在 `'use server'` 文件里导出 —— Next.js 要求 use server 模块
 * 只能导出 async 函数，导出 zod 对象会让整个 action 模块在运行时抛
 * `A "use server" file can only export async functions, found object`，
 * 表现为登录/注册表单提交 500。
 */
export const StorageConfigSchema = z.object({
  id: z.number().optional(),
  type: z.enum(['local', 'nas', 'qiniu', 's3']),
  rootPath: z.string().optional(),
  alias: z.string().optional(),
  endpoint: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          // 只允许 http/https，挡掉 file:// / gopher:// / dict:// 等 SSRF 协议。
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'endpoint 必须是有效的 http(s) URL' },
    ),
  bucket: z.string().optional(),
  region: z.string().optional(),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  prefix: z.string().optional(),
  isDisabled: z.boolean().optional(),
});

export type StorageConfigInput = z.infer<typeof StorageConfigSchema>;
