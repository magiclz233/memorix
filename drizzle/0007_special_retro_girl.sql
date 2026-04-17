ALTER TABLE "photo_metadata" ADD COLUMN IF NOT EXISTS "focal_length_in_35mm_format" integer;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD COLUMN IF NOT EXISTS "color_space" varchar(32);