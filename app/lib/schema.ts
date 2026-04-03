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
  index,
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
    // 作者（自由字符串，通用字段）
    author: varchar('author', { length: 255 }),
    // 文件哈希值（用于秒传和去重）
    fileHash: varchar('file_hash', { length: 64 }),
  },
  (table) => ({
    storagePathUnique: uniqueIndex('files_storage_path_unique').on(
      table.userStorageId,
      table.path,
    ),
    // 文件哈希索引（用于秒传查询）
    fileHashIndex: index('files_file_hash_idx').on(table.fileHash),
    // 画廊查询：按发布状态 + 修改时间排序
    publishedMtimeIndex: index('files_published_mtime_idx').on(
      table.isPublished,
      table.mtime,
    ),
    // 存储源下的已发布文件
    storagePublishedIndex: index('files_storage_published_idx').on(
      table.userStorageId,
      table.isPublished,
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
export const photoMetadata = pgTable(
  'photo_metadata',
  {
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
    // 35mm 等效焦距
    focalLengthIn35mmFormat: integer('focal_length_in_35mm_format'),
    // 闪光灯状态
    flash: integer('flash'),
    // 方向
    orientation: integer('orientation'),
    // 曝光程序
    exposureProgram: integer('exposure_program'),
    // 色彩空间
    colorSpace: varchar('color_space', { length: 32 }),
    // 拍摄地点名称 (城市, 国家)
    locationName: varchar('location_name', { length: 255 }),
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
  },
  (table) => ({
    // 按拍摄时间排序的索引
    dateShotIndex: index('photo_metadata_date_shot_idx').on(table.dateShot),
    // 按相机型号过滤
    cameraIndex: index('photo_metadata_camera_idx').on(table.camera),
    // 按制造商过滤
    makerIndex: index('photo_metadata_maker_idx').on(table.maker),
    // 按镜头过滤
    lensIndex: index('photo_metadata_lens_idx').on(table.lens),
    // GPS 查询索引
    gpsIndex: index('photo_metadata_gps_idx').on(table.gpsLatitude, table.gpsLongitude),
  }),
);

// 视频元数据表
export const videoMetadata = pgTable(
  'video_metadata',
  {
    // 关联 files.id（未设置外键约束）
    fileId: integer('file_id').primaryKey(),
    // 时长（秒）
    duration: doublePrecision('duration'),
    // 分辨率
    width: integer('width'),
    height: integer('height'),
    // 码率（bps）
    bitrate: integer('bitrate'),
    // 帧率
    fps: doublePrecision('fps'),
    // 帧数
    frameCount: integer('frame_count'),
    // 视频编码
    codecVideo: varchar('codec_video', { length: 64 }),
    codecVideoProfile: varchar('codec_video_profile', { length: 64 }),
    // 像素格式与色彩信息
    pixelFormat: varchar('pixel_format', { length: 64 }),
    colorSpace: varchar('color_space', { length: 64 }),
    colorRange: varchar('color_range', { length: 64 }),
    colorPrimaries: varchar('color_primaries', { length: 64 }),
    colorTransfer: varchar('color_transfer', { length: 64 }),
    bitDepth: integer('bit_depth'),
    // 音频信息
    codecAudio: varchar('codec_audio', { length: 64 }),
    audioChannels: integer('audio_channels'),
    audioSampleRate: integer('audio_sample_rate'),
    audioBitrate: integer('audio_bitrate'),
    hasAudio: boolean('has_audio'),
    // 旋转
    rotation: integer('rotation'),
    // 容器
    containerFormat: varchar('container_format', { length: 64 }),
    containerLong: varchar('container_long', { length: 255 }),
    // Poster 抽帧时间
    posterTime: doublePrecision('poster_time'),
    // 原始 ffprobe 数据
    raw: jsonb('raw'),
  },
  (table) => ({
    // 视频分辨率过滤
    resolutionIndex: index('video_metadata_resolution_idx').on(table.width, table.height),
    // 视频编码过滤
    codecIndex: index('video_metadata_codec_idx').on(table.codecVideo),
    // 视频时长过滤
    durationIndex: index('video_metadata_duration_idx').on(table.duration),
  }),
);

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

// 作品集表（统一集合）
export const collections = pgTable('collections', {
  // 主键 ID
  id: serial('id').primaryKey(),
  // 作品集标题
  title: varchar('title', { length: 255 }).notNull(),
  // 作品集描述
  description: text('description'),
  // 作者（自由字符串）
  author: varchar('author', { length: 255 }),
  // 封面图片集（存储 file IDs 数组，最多 3 张）
  coverImages: integer('cover_images').array(),
  // 类型（mixed / photo / video）
  type: varchar('type', { length: 16 }).notNull().default('mixed'),
  // 发布状态（draft / published）
  status: varchar('status', { length: 16 }).notNull().default('draft'),
  // 创建/更新人（可空）
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
  // 创建/更新时间
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 作品集关联表：作品集与文件的多对多关系
export const collectionMedia = pgTable(
  'collection_media',
  {
    // 关联 collections.id（未设置外键约束）
    collectionId: integer('collection_id').notNull(),
    // 关联 files.id（未设置外键约束）
    fileId: integer('file_id').notNull(),
    // 排序权重
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.fileId] }),
    collectionSortIndex: index('collection_media_collection_sort_index').on(
      table.collectionId,
      table.sortOrder,
    ),
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

// 元数据提取失败记录表
export const metadataExtractionFailures = pgTable(
  'metadata_extraction_failures',
  {
    // 主键 ID
    id: serial('id').primaryKey(),
    // 关联文件 ID（未设置外键约束）
    fileId: integer('file_id').notNull(),
    // 错误信息
    errorMessage: text('error_message').notNull(),
    // 尝试次数
    attemptCount: integer('attempt_count').notNull().default(0),
    // 最后尝试时间
    lastAttemptAt: timestamp('last_attempt_at').defaultNow().notNull(),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    fileIdIndex: index('metadata_extraction_failures_file_id_idx').on(table.fileId),
    attemptCountIndex: index('metadata_extraction_failures_attempt_count_idx').on(
      table.attemptCount,
    ),
  }),
);

// 上传任务表：记录分片上传任务
export const uploadTasks = pgTable(
  'upload_tasks',
  {
    // 主键 ID
    id: serial('id').primaryKey(),
    // 上传任务唯一标识（UUID）
    uploadId: varchar('upload_id', { length: 64 }).notNull().unique(),
    // 关联用户存储 ID（未设置外键约束）
    userStorageId: integer('user_storage_id').notNull(),
    // 文件名
    fileName: varchar('file_name', { length: 255 }).notNull(),
    // 文件大小（字节）
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    // 文件哈希值（MD5）
    fileHash: varchar('file_hash', { length: 64 }).notNull(),
    // MIME 类型
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    // 分片大小（字节）
    chunkSize: integer('chunk_size').notNull(),
    // 总分片数
    totalChunks: integer('total_chunks').notNull(),
    // 已上传分片数
    uploadedChunks: integer('uploaded_chunks').notNull().default(0),
    // 目标存储路径
    targetPath: text('target_path').notNull(),
    // 任务状态（pending / uploading / completed / failed）
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // 过期时间（24小时后自动清理）
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => ({
    // 按哈希查询索引（用于秒传）
    fileHashIndex: index('upload_tasks_file_hash_idx').on(table.fileHash),
    // 按状态和过期时间查询索引（用于清理）
    statusExpiresIndex: index('upload_tasks_status_expires_idx').on(
      table.status,
      table.expiresAt,
    ),
  }),
);

// 上传分片表：记录每个分片的上传状态
export const uploadChunks = pgTable(
  'upload_chunks',
  {
    // 主键 ID
    id: serial('id').primaryKey(),
    // 关联上传任务 ID（未设置外键约束）
    uploadTaskId: integer('upload_task_id').notNull(),
    // 分片序号（从 0 开始）
    chunkIndex: integer('chunk_index').notNull(),
    // 分片哈希值（MD5）
    chunkHash: varchar('chunk_hash', { length: 64 }).notNull(),
    // 分片大小（字节）
    chunkSize: integer('chunk_size').notNull(),
    // 分片存储路径
    storagePath: text('storage_path').notNull(),
    // 上传状态（pending / uploaded）
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 创建时间
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // 更新时间
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // 联合主键：任务 ID + 分片序号
    taskChunkUnique: uniqueIndex('upload_chunks_task_chunk_unique').on(
      table.uploadTaskId,
      table.chunkIndex,
    ),
    // 按任务 ID 查询索引
    uploadTaskIndex: index('upload_chunks_upload_task_idx').on(table.uploadTaskId),
  }),
);
