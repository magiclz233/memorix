/**
 * 应用配置
 * 集中管理可配置的常量，支持环境变量覆盖
 */

const parsePositiveIntEnv = (name: string, fallback: number) => {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  /** 上传相关配置 */
  upload: {
    /** 最大文件大小（字节），默认 500MB */
    maxFileSize: parsePositiveIntEnv('MAX_FILE_SIZE', 524288000),
  },

  /** 画廊分页配置 */
  gallery: {
    /** 默认每页数量 */
    defaultPageSize: parsePositiveIntEnv('GALLERY_DEFAULT_PAGE_SIZE', 12),
    /** 最大每页数量 */
    maxPageSize: parsePositiveIntEnv('GALLERY_MAX_PAGE_SIZE', 60),
    /** 搜索关键词最大长度 */
    maxQueryLength: parsePositiveIntEnv('GALLERY_MAX_QUERY_LENGTH', 80),
  },

  /** 认证相关配置 */
  auth: {
    /** 密码最小长度 */
    minPasswordLength: parsePositiveIntEnv('MIN_PASSWORD_LENGTH', 6),
  },

  /** 数据库连接池配置 */
  db: {
    /** 最大连接数 */
    poolMax: parsePositiveIntEnv('DB_POOL_MAX', 20),
    /** 空闲超时（秒） */
    idleTimeout: parsePositiveIntEnv('DB_IDLE_TIMEOUT', 20),
    /** 连接超时（秒） */
    connectTimeout: parsePositiveIntEnv('DB_CONNECT_TIMEOUT', 10),
  },
} as const;
