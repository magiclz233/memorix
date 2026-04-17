ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "cover_images" integer[];--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN IF EXISTS "cover_file_id";