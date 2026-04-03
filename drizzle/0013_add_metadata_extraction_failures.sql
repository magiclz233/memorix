-- 创建元数据提取失败记录表
CREATE TABLE IF NOT EXISTS "metadata_extraction_failures" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"error_message" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "metadata_extraction_failures_file_id_idx" ON "metadata_extraction_failures" USING btree ("file_id");
CREATE INDEX IF NOT EXISTS "metadata_extraction_failures_attempt_count_idx" ON "metadata_extraction_failures" USING btree ("attempt_count");
