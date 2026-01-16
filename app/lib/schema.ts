import { pgTable, serial, text, bigint, varchar, timestamp, integer, jsonb, doublePrecision, boolean, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';

// 用户表
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  role: varchar('role', { length: 50 }).default('user'),
  imageUrl: varchar('image_url', { length: 255 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 用户数据源表，用于保存用户的存储配置（如 S3、七牛云、本地、NAS 的地址和凭证）
// 配置使用 JSONB 存储灵活的键值对（如 access_key, secret_key, bucket, path 等）
export const userStorages = pgTable('user_storages', {
  // 主键 ID，自增
  id: serial('id').primaryKey(),
  // 关联用户 ID（未设置外键约束）
  userId: integer('user_id').notNull(),
  // 数据源类型（s3, qiniu, local, nas）
  type: varchar('type', { length: 50 }).notNull(),
  // 配置信息，使用 JSONB 存储（如 { "bucket": "my-bucket", "access_key": "xxx" }）
  config: jsonb('config').notNull(),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // 软删除时间，可空
  deletedAt: timestamp('deleted_at'),
});

export const files = pgTable('files', {
  // 主键，自增
  id: serial('id').primaryKey(),
  // 创建时间，默认当前
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间，默认当前
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // 软删除时间，可空
  deletedAt: timestamp('deleted_at'),

  // 标题
  title: varchar('title', { length: 255 }),
  // 路径（相对 rootPath）
  path: text('path').notNull(),
  // 来源类型 (s3, qiniu, local, nas)
  sourceType: varchar('source_type', { length: 50 }),
  // 大小（字节）
  size: bigint('size', { mode: 'number' }),
  // MIME 类型
  mimeType: varchar('mime_type', { length: 100 }),
  // 文件修改时间
  mtime: timestamp('mtime'),
  // 原文件 URL
  url: text('url'),
  // 缩略图 URL
  thumbUrl: text('thumb_url'),

  // 关联存储配置 ID（未设置外键约束）
  userStorageId: integer('user_storage_id').notNull(),
  // 媒体类型：'image'、'audio'、'video' 等
  mediaType: varchar('media_type', { length: 50 }).notNull(),
  blurHash: varchar('blur_hash', { length: 64 }),
  // 是否在图库展示
  isPublished: boolean('is_published').notNull().default(false),
}, (table) => ({
  storagePathUnique: uniqueIndex('files_storage_path_unique').on(table.userStorageId, table.path),
}));

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  // 关联用户 ID（未设置外键约束）
  userId: integer('user_id').notNull(),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userKeyUnique: uniqueIndex('user_settings_user_key_unique').on(table.userId, table.key),
}));

// 图片元数据子表
export const photoMetadata = pgTable('photo_metadata', {
  // 关联 files.id（未设置外键约束）
  fileId: integer('file_id').primaryKey(),
  // 描述，可空
  description: text('description'),
  // 相机型号
  camera: varchar('camera', { length: 255 }),
  // 制造商
  maker: varchar('maker', { length: 255 }),
  // 镜头型号
  lens: varchar('lens', { length: 255 }),
  // 拍摄日期
  dateShot: timestamp('date_shot'),
  // 曝光时间
  exposure: doublePrecision('exposure'),
  // 光圈值
  aperture: doublePrecision('aperture'),
  // ISO 值
  iso: bigint('iso', { mode: 'number' }),
  // 焦距
  focalLength: doublePrecision('focal_length'),
  // 闪光灯状态
  flash: integer('flash'),
  // 方向
  orientation: integer('orientation'),
  // 曝光程序
  exposureProgram: integer('exposure_program'),
  // GPS 纬度
  gpsLatitude: doublePrecision('gps_latitude'),
  // GPS 经度
  gpsLongitude: doublePrecision('gps_longitude'),
  // 宽度
  resolutionWidth: integer('resolution_width'),
  // 高度
  resolutionHeight: integer('resolution_height'),
  // 白平衡
  whiteBalance: varchar('white_balance', { length: 255 }),
});

// 存储配置表（后台管理使用）
export const storageConfigs = pgTable('storage_configs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 16 }).notNull(),
  config: jsonb('config').notNull(),
  status: varchar('status', { length: 32 }).notNull(),
});

// 图集表
export const photoCollections = pgTable('photo_collections', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 图集关联表
export const collectionItems = pgTable(
  'collection_items',
  {
    // 关联 photo_collections.id（未设置外键约束）
    collectionId: integer('collection_id').notNull(),
    // 关联 files.id（未设置外键约束）
    fileId: integer('file_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.fileId] }),
  }),
);

// 视频集表
export const videoSeries = pgTable('video_series', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 视频集关联表
export const videoSeriesItems = pgTable(
  'video_series_items',
  {
    // 关联 video_series.id（未设置外键约束）
    seriesId: integer('series_id').notNull(),
    // 关联 files.id（未设置外键约束）
    fileId: integer('file_id').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.seriesId, table.fileId] }),
  }),
);

// Better Auth 核心表
export const authSessions = pgTable('session', {
  // 会话 ID
  id: serial('id').primaryKey(),
  // 关联用户 ID（未设置外键约束）
  userId: integer('user_id').notNull(),
  // 会话过期时间
  expiresAt: timestamp('expires_at').notNull(),
  // 会话令牌
  token: text('token').notNull().unique(),
  // 访问 IP
  ipAddress: text('ip_address'),
  // 用户代理
  userAgent: text('user_agent'),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const authAccounts = pgTable('account', {
  // 账号记录 ID
  id: serial('id').primaryKey(),
  // 关联用户 ID（未设置外键约束）
  userId: integer('user_id').notNull(),
  // 供应商账号 ID（如 GitHub 用户 ID）
  accountId: text('account_id').notNull(),
  // 供应商标识（如 github）
  providerId: text('provider_id').notNull(),
  // OAuth access_token
  accessToken: text('access_token'),
  // OAuth refresh_token
  refreshToken: text('refresh_token'),
  // access_token 过期时间
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  // refresh_token 过期时间
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  // OAuth scope
  scope: text('scope'),
  // OpenID id_token
  idToken: text('id_token'),
  // 邮箱密码登录的哈希密码
  password: text('password'),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const authVerifications = pgTable('verification', {
  // 验证记录 ID
  id: serial('id').primaryKey(),
  // 标识（如邮箱）
  identifier: text('identifier').notNull(),
  // 验证码/令牌
  value: text('value').notNull(),
  // 过期时间
  expiresAt: timestamp('expires_at').notNull(),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
