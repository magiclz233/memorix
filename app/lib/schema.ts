import {
  pgTable,
  serial,
  text,
  bigint,
  varchar,
  timestamp,
  integer,
  jsonb,
  doublePrecision,
  boolean,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

// 用户表：基础身份信息与状态
export const users = pgTable('users', {
  // 主键 ID
  id: serial('id').primaryKey(),
  // 显示名称
  name: varchar('name', { length: 255 }).notNull(),
  // 登录邮箱（唯一）
  email: text('email').notNull().unique(),
  // 角色（user/admin）
  role: varchar('role', { length: 50 }).default('user'),
  // 是否被禁用
  banned: boolean('banned').notNull().default(false),
  // 头像 URL
  imageUrl: varchar('image_url', { length: 255 }),
  // 邮箱是否已验证
  emailVerified: boolean('email_verified').notNull().default(false),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 用户存储配置表：保存每个用户的存储源与凭证信息
export const userStorages = pgTable('user_storages', {
  // 主键 ID
  id: serial('id').primaryKey(),
  // 关联用户 ID（未设置外键约束）
  userId: integer('user_id').notNull(),
  // 存储类型（s3、qiniu、local、nas）
  type: varchar('type', { length: 50 }).notNull(),
  // 存储配置（JSONB，如 bucket、access_key、secret_key 等）
  config: jsonb('config').notNull(),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // 软删除时间（可为空）
  deletedAt: timestamp('deleted_at'),
});

// 文件表：媒体文件基础信息
export const files = pgTable(
  'files',
  {
    // 主键 ID
    id: serial('id').primaryKey(),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // 软删除时间（可为空）
    deletedAt: timestamp('deleted_at'),
    // 标题
    title: varchar('title', { length: 255 }),
    // 相对存储根路径
    path: text('path').notNull(),
    // 来源类型（s3、qiniu、local、nas）
    sourceType: varchar('source_type', { length: 50 }),
    // 文件大小（字节）
    size: bigint('size', { mode: 'number' }),
    // MIME 类型
    mimeType: varchar('mime_type', { length: 100 }),
    // 文件修改时间
    mtime: timestamp('mtime'),
    // 原图 URL
    url: text('url'),
    // 缩略图 URL
    thumbUrl: text('thumb_url'),
    // 关联存储配置 ID（未设置外键约束）
    userStorageId: integer('user_storage_id').notNull(),
    // 媒体类型（image、audio、video）
    mediaType: varchar('media_type', { length: 50 }).notNull(),
    // BlurHash 值
    blurHash: varchar('blur_hash', { length: 64 }),
    // 是否在画廊展示
    isPublished: boolean('is_published').notNull().default(false),
  },
  (table) => ({
    storagePathUnique: uniqueIndex('files_storage_path_unique').on(
      table.userStorageId,
      table.path,
    ),
  }),
);

// 用户设置表：键值对形式的个性化配置
export const userSettings = pgTable(
  'user_settings',
  {
    // 主键 ID
    id: serial('id').primaryKey(),
    // 关联用户 ID（未设置外键约束）
    userId: integer('user_id').notNull(),
    // 设置项名称
    key: varchar('key', { length: 100 }).notNull(),
    // 设置值（JSONB）
    value: jsonb('value').notNull(),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userKeyUnique: uniqueIndex('user_settings_user_key_unique').on(
      table.userId,
      table.key,
    ),
  }),
);

// 图片元数据表：用于保存 EXIF 等信息
export const photoMetadata = pgTable('photo_metadata', {
  // 关联 files.id（未设置外键约束）
  fileId: integer('file_id').primaryKey(),
  // 描述（可为空）
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
  // 分辨率宽度
  resolutionWidth: integer('resolution_width'),
  // 分辨率高度
  resolutionHeight: integer('resolution_height'),
  // 白平衡
  whiteBalance: varchar('white_balance', { length: 255 }),
  // Live Photo 类型: none | embedded | paired
  liveType: varchar('live_type', { length: 20 }).default('none'),
  // 内嵌视频偏移量
  videoOffset: integer('video_offset'),
  // 配对视频路径
  pairedPath: text('paired_path'),
  // 视频时长
  videoDuration: doublePrecision('video_duration'),
});

// 存储配置表：后台管理员可配置的存储源
export const storageConfigs = pgTable('storage_configs', {
  // 主键 ID
  id: serial('id').primaryKey(),
  // 配置名称
  name: varchar('name', { length: 255 }).notNull(),
  // 存储类型
  type: varchar('type', { length: 16 }).notNull(),
  // 具体配置（JSONB）
  config: jsonb('config').notNull(),
  // 状态标记（如 enabled/disabled）
  status: varchar('status', { length: 32 }).notNull(),
});

// 图集表
export const photoCollections = pgTable('photo_collections', {
  // 主键 ID
  id: serial('id').primaryKey(),
  // 图集标题
  title: varchar('title', { length: 255 }).notNull(),
  // 图集描述
  description: text('description'),
  // 封面图 URL
  coverImage: text('cover_image'),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 图集关联表：图集与文件的多对多关系
export const collectionItems = pgTable(
  'collection_items',
  {
    // 关联 photo_collections.id（未设置外键约束）
    collectionId: integer('collection_id').notNull(),
    // 关联 files.id（未设置外键约束）
    fileId: integer('file_id').notNull(),
    // 排序权重
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.fileId] }),
  }),
);

// 视频集表
export const videoSeries = pgTable('video_series', {
  // 主键 ID
  id: serial('id').primaryKey(),
  // 视频集标题
  title: varchar('title', { length: 255 }).notNull(),
  // 视频集描述
  description: text('description'),
  // 封面图 URL
  coverImage: text('cover_image'),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 视频集关联表：视频集与文件的多对多关系
export const videoSeriesItems = pgTable(
  'video_series_items',
  {
    // 关联 video_series.id（未设置外键约束）
    seriesId: integer('series_id').notNull(),
    // 关联 files.id（未设置外键约束）
    fileId: integer('file_id').notNull(),
    // 排序权重
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.seriesId, table.fileId] }),
  }),
);

// Better Auth 核心表：会话
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

// Better Auth 核心表：第三方账号
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

// Better Auth 核心表：验证记录
export const authVerifications = pgTable('verification', {
  // 验证记录 ID
  id: serial('id').primaryKey(),
  // 标识（如邮箱）
  identifier: text('identifier').notNull(),
  // 验证值（验证码/令牌）
  value: text('value').notNull(),
  // 过期时间
  expiresAt: timestamp('expires_at').notNull(),
  // 创建时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // 更新时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
