import { z } from 'zod';

/**
 * 必需环境变量 Schema
 */
const configSchema = z.object({
  // 数据库
  POSTGRES_URL: z.string().min(1, 'POSTGRES_URL 不能为空').optional(),
  POSTGRES_URL_NON_POOLING: z.string().min(1).optional(),

  // Redis（可选）
  REDIS_URL: z.string().optional(),

  // 认证
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET 至少需要 32 位字符')
    .optional(),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL 必须是有效的 URL').optional(),

  // 应用
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
}).refine(
  (data) => data.POSTGRES_URL || data.POSTGRES_URL_NON_POOLING,
  {
    message: '必须配置 POSTGRES_URL 或 POSTGRES_URL_NON_POOLING',
    path: ['POSTGRES_URL'],
  },
);

/**
 * 验证应用配置
 * 在生产环境启动时调用，配置不合法则记录错误
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `${e.path.join('.')}: ${e.message}`,
    );
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

/**
 * 在生产环境启动时验证配置
 * 配置无效时打印警告（不阻止启动，避免影响开发体验）
 */
export function validateConfigOnStartup(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const { valid, errors } = validateConfig();

  if (!valid) {
    console.error('⚠️  配置验证失败:');
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error('请检查环境变量配置后重启服务。');
  }
}

// 在模块加载时自动验证
validateConfigOnStartup();
