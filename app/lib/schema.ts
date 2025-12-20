import { pgTable, uuid, date, serial, text, bigint, varchar, timestamp, integer, jsonb, doublePrecision } from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

// 用户表
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).default('user'),
  imageUrl: varchar('image_url', { length: 255 }),
});

// 客户表
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  imageUrl: varchar('image_url', { length: 255 }).notNull(),
});

// 发票表
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  amount: integer('amount').notNull(),
  status: varchar('status', { length: 255 }).notNull(),
  date: date('date', { mode: 'string' }).notNull(), // 直接以字符串形式读写日期
});

// 营收表
export const revenue = pgTable('revenue', {
  month: varchar('month', { length: 4 }).notNull().unique(),
  revenue: integer('revenue').notNull(),
});

// 用户数据源表，用于保存用户的存储配置（如 S3、七牛云、本地、NAS 的地址和凭证）
// 配置使用 JSONB 存储灵活的键值对（如 access_key, secret_key, bucket, path 等）
export const userStorages = pgTable('user_storages', {
  // 主键 ID，自增
  id: serial('id').primaryKey(),
  // 关联用户 ID（假设 users 表存在）
  userId: integer('user_id').notNull(), // 可添加 references: () => users.id
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
  id: serial('id').primaryKey(),  // 主键，自增
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间，默认当前
  updatedAt: timestamp('updated_at').defaultNow().notNull(),  // 更新时间，默认当前
  deletedAt: timestamp('deleted_at'),  // 软删除时间，可空
  
  title: varchar('title', { length: 255 }),  // 标题
  path: text('path'),  // 路径
  sourceType: varchar('source_type', { length: 50 }),  // 来源类型 (s3, qiniu, local, nas)
  size: bigint('size', { mode: 'number' }),  // 大小（字节）
  url: text('url'),  // 原文件 URL
  thumbUrl: text('thumb_url'),  // 缩略图 URL
  
  mediaType: varchar('media_type', { length: 50 }).notNull(),  // 媒体类型：'image'、'audio'、'video' 等
});

// 图片元数据子表
export const photoMetadata = pgTable('photo_metadata', {
  fileId: integer('file_id').primaryKey().references(() => files.id, { onDelete: 'cascade' }),  // 外键到 files.id，级联删除
  description: text('description'),  // 描述，可空
  camera: varchar('camera', { length: 255 }),  // 相机型号
  maker: varchar('maker', { length: 255 }),  // 制造商
  lens: varchar('lens', { length: 255 }),  // 镜头型号
  dateShot: timestamp('date_shot'),  // 拍摄日期
  exposure: doublePrecision('exposure'),  // 曝光时间
  aperture: doublePrecision('aperture'),  // 光圈值
  iso: bigint('iso', { mode: 'number' }),  // ISO 值
  focalLength: doublePrecision('focal_length'),  // 焦距
  flash: integer('flash'),  // 闪光灯状态
  orientation: integer('orientation'),  // 方向
  exposureProgram: integer('exposure_program'),  // 曝光程序
  gpsLatitude: doublePrecision('gps_latitude'),  // GPS 纬度
  gpsLongitude: doublePrecision('gps_longitude'),  // GPS 经度
  resolutionWidth: integer('resolution_width'),  // 宽度
  resolutionHeight: integer('resolution_height'),  // 高度
  whiteBalance: varchar('white_balance', { length: 255 }),  // 白平衡
});

// 关系定义
export const invoicesRelations = relations(invoices, ({ one }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));
