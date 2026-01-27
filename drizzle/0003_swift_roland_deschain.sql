ALTER TABLE "photo_metadata" ADD COLUMN "live_type" varchar(20) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN "video_offset" integer;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN "paired_path" text;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN "video_duration" double precision;