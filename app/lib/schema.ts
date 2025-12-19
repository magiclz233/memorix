import { pgTable, uuid, date, serial, text, bigint, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

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
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
  
  title: varchar('title', { length: 255 }),
  path: text('path'),
  sourceType: varchar('source_type', { length: 50 }),
  size: bigint('size', { mode: 'number' }),
  url: text('url'),
  thumbUrl: text('thumb_url'),
  
  // 新增媒体类型字段
  mediaType: varchar('media_type', { length: 50 }).notNull().default('image'),  // 默认图片，可选 'audio'、'video' 等
  
  // 使用 jsonb 存储类型特定元数据，灵活扩展
  metadata: jsonb('metadata'),  // e.g., 对于图片: { "camera": "Canon", "lens": "50mm" }; 对于音频: { "duration": 120, "bitrate": 128 }
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
