-- P1-6 扫描任务队列：扫描从 HTTP SSE 同步执行改为服务端持久化任务。
-- 行为目标：刷新页面不丢扫描、同存储源防并发重扫、可取消、失败可重试有记录。
CREATE TABLE IF NOT EXISTS "scan_jobs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "storage_id" integer NOT NULL,
  "storage_type" varchar(16) NOT NULL,
  "mode" varchar(16) DEFAULT 'incremental' NOT NULL,
  "status" varchar(16) DEFAULT 'queued' NOT NULL,
  "cancel_requested" boolean DEFAULT false NOT NULL,
  "phase" varchar(16),
  "processed_count" integer DEFAULT 0 NOT NULL,
  "total_count" integer,
  "stats" jsonb,
  "logs" jsonb,
  "errors" jsonb,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp,
  "finished_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "scan_jobs"
    ADD CONSTRAINT "scan_jobs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "scan_jobs"
    ADD CONSTRAINT "scan_jobs_storage_id_user_storages_id_fk"
    FOREIGN KEY ("storage_id") REFERENCES "user_storages"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "scan_jobs_storage_id_idx" ON "scan_jobs" ("storage_id", "created_at");
CREATE INDEX IF NOT EXISTS "scan_jobs_status_idx" ON "scan_jobs" ("status");
CREATE INDEX IF NOT EXISTS "scan_jobs_user_id_idx" ON "scan_jobs" ("user_id");
