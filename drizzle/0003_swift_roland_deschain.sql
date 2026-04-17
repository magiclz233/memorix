ALTER TABLE "photo_metadata" ADD COLUMN IF NOT EXISTS "live_type" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN IF NOT EXISTS "video_offset" integer;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN IF NOT EXISTS "paired_path" text;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN IF NOT EXISTS "video_duration" double precision;