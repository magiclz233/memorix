-- 添加文件哈希字段到 files 表
ALTER TABLE "files" ADD COLUMN "file_hash" varchar(64);

-- 创建文件哈希索引
CREATE INDEX IF NOT EXISTS "files_file_hash_idx" ON "files" USING btree ("file_hash");

-- 创建上传任务表
CREATE TABLE IF NOT EXISTS "upload_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" varchar(64) NOT NULL,
	"user_storage_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" bigint NOT NULL,
	"file_hash" varchar(64) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"chunk_size" integer NOT NULL,
	"total_chunks" integer NOT NULL,
	"uploaded_chunks" integer DEFAULT 0 NOT NULL,
	"target_path" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "upload_tasks_upload_id_unique" UNIQUE("upload_id")
);

-- 创建上传任务索引
CREATE INDEX IF NOT EXISTS "upload_tasks_file_hash_idx" ON "upload_tasks" USING btree ("file_hash");
CREATE INDEX IF NOT EXISTS "upload_tasks_status_expires_idx" ON "upload_tasks" USING btree ("status","expires_at");

-- 创建上传分片表
CREATE TABLE IF NOT EXISTS "upload_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_task_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_hash" varchar(64) NOT NULL,
	"chunk_size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建上传分片索引
CREATE UNIQUE INDEX IF NOT EXISTS "upload_chunks_task_chunk_unique" ON "upload_chunks" USING btree ("upload_task_id","chunk_index");
CREATE INDEX IF NOT EXISTS "upload_chunks_upload_task_idx" ON "upload_chunks" USING btree ("upload_task_id");
