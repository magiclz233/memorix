CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" integer,
	"user_id" integer NOT NULL,
	"changes" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"context" jsonb,
	"user_id" integer,
	"request_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "metadata_extraction_failures" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" integer NOT NULL,
	"error_message" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_name" varchar(50) NOT NULL,
	"metric_value" double precision NOT NULL,
	"rating" varchar(20),
	"page" varchar(255),
	"user_id" integer,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "file_hash" varchar(64);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "error_logs_level_idx" ON "error_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "error_logs_request_id_idx" ON "error_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metadata_extraction_failures_file_id_idx" ON "metadata_extraction_failures" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "metadata_extraction_failures_attempt_count_idx" ON "metadata_extraction_failures" USING btree ("attempt_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_metric_name_idx" ON "performance_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_created_at_idx" ON "performance_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_metrics_page_idx" ON "performance_metrics" USING btree ("page");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "upload_chunks_task_chunk_unique" ON "upload_chunks" USING btree ("upload_task_id","chunk_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upload_chunks_upload_task_idx" ON "upload_chunks" USING btree ("upload_task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upload_tasks_file_hash_idx" ON "upload_tasks" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "upload_tasks_status_expires_idx" ON "upload_tasks" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_file_hash_idx" ON "files" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_media_type_published_mtime_idx" ON "files" USING btree ("media_type","is_published","mtime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_storage_media_type_idx" ON "files" USING btree ("user_storage_id","media_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_created_at_idx" ON "files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_deleted_published_idx" ON "files" USING btree ("deleted_at","is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_camera_idx" ON "photo_metadata" USING btree ("camera");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_maker_idx" ON "photo_metadata" USING btree ("maker");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_lens_idx" ON "photo_metadata" USING btree ("lens");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_gps_idx" ON "photo_metadata" USING btree ("gps_latitude","gps_longitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_metadata_resolution_idx" ON "video_metadata" USING btree ("width","height");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_metadata_codec_idx" ON "video_metadata" USING btree ("codec_video");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_metadata_duration_idx" ON "video_metadata" USING btree ("duration");