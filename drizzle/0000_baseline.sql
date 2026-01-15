DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skip creating extension pgcrypto due to insufficient privilege';
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" text NOT NULL,
	"role" varchar(50) DEFAULT 'user',
	"image_url" varchar(255),
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_storages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"title" varchar(255),
	"path" text NOT NULL,
	"source_type" varchar(50),
	"size" bigint,
	"mime_type" varchar(100),
	"mtime" timestamp,
	"url" text,
	"thumb_url" text,
	"user_storage_id" integer NOT NULL,
	"media_type" varchar(50) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photo_metadata" (
	"file_id" integer PRIMARY KEY NOT NULL,
	"description" text,
	"camera" varchar(255),
	"maker" varchar(255),
	"lens" varchar(255),
	"date_shot" timestamp,
	"exposure" double precision,
	"aperture" double precision,
	"iso" bigint,
	"focal_length" double precision,
	"flash" integer,
	"orientation" integer,
	"exposure_program" integer,
	"gps_latitude" double precision,
	"gps_longitude" double precision,
	"resolution_width" integer,
	"resolution_height" integer,
	"white_balance" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(16) NOT NULL,
	"config" jsonb NOT NULL,
	"status" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photo_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collection_items" (
	"collection_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "collection_items_collection_id_file_id_pk" PRIMARY KEY("collection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_series_items" (
	"series_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "video_series_items_series_id_file_id_pk" PRIMARY KEY("series_id","file_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
COMMENT ON TABLE "session" IS 'Better Auth 会话表';
--> statement-breakpoint
COMMENT ON COLUMN "session"."id" IS '会话 ID';
--> statement-breakpoint
COMMENT ON COLUMN "session"."user_id" IS '关联用户 ID';
--> statement-breakpoint
COMMENT ON COLUMN "session"."expires_at" IS '会话过期时间';
COMMENT ON COLUMN "session"."token" IS '会话令牌';
--> statement-breakpoint
COMMENT ON COLUMN "session"."ip_address" IS '访问 IP';
--> statement-breakpoint
COMMENT ON COLUMN "session"."user_agent" IS '用户代理';
--> statement-breakpoint
COMMENT ON COLUMN "session"."created_at" IS '创建时间';
--> statement-breakpoint
COMMENT ON COLUMN "session"."updated_at" IS '更新时间';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
COMMENT ON TABLE "account" IS 'Better Auth 账号表';
--> statement-breakpoint
COMMENT ON COLUMN "account"."id" IS '账号记录 ID';
--> statement-breakpoint
COMMENT ON COLUMN "account"."user_id" IS '关联用户 ID';
--> statement-breakpoint
COMMENT ON COLUMN "account"."account_id" IS '供应商账号 ID';
--> statement-breakpoint
COMMENT ON COLUMN "account"."provider_id" IS '供应商标识';
--> statement-breakpoint
COMMENT ON COLUMN "account"."access_token" IS 'OAuth access_token';
--> statement-breakpoint
COMMENT ON COLUMN "account"."refresh_token" IS 'OAuth refresh_token';
--> statement-breakpoint
COMMENT ON COLUMN "account"."access_token_expires_at" IS 'access_token 过期时间';
--> statement-breakpoint
COMMENT ON COLUMN "account"."refresh_token_expires_at" IS 'refresh_token 过期时间';
--> statement-breakpoint
COMMENT ON COLUMN "account"."scope" IS 'OAuth scope';
--> statement-breakpoint
COMMENT ON COLUMN "account"."id_token" IS 'OpenID id_token';
--> statement-breakpoint
COMMENT ON COLUMN "account"."password" IS '邮箱密码登录的哈希密码';
--> statement-breakpoint
COMMENT ON COLUMN "account"."created_at" IS '创建时间';
--> statement-breakpoint
COMMENT ON COLUMN "account"."updated_at" IS '更新时间';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
COMMENT ON TABLE "verification" IS 'Better Auth 验证表';
--> statement-breakpoint
COMMENT ON COLUMN "verification"."id" IS '验证记录 ID';
--> statement-breakpoint
COMMENT ON COLUMN "verification"."identifier" IS '标识（如邮箱）';
--> statement-breakpoint
COMMENT ON COLUMN "verification"."value" IS '验证码/令牌';
--> statement-breakpoint
COMMENT ON COLUMN "verification"."expires_at" IS '过期时间';
--> statement-breakpoint
COMMENT ON COLUMN "verification"."created_at" IS '创建时间';
--> statement-breakpoint
COMMENT ON COLUMN "verification"."updated_at" IS '更新时间';
--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_path_unique" ON "files" USING btree ("user_storage_id","path");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_key_unique" ON "user_settings" USING btree ("user_id","key");