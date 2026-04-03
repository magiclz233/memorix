CREATE INDEX IF NOT EXISTS "files_published_mtime_idx" ON "files" USING btree ("is_published","mtime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_storage_published_idx" ON "files" USING btree ("user_storage_id","is_published");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_date_shot_idx" ON "photo_metadata" USING btree ("date_shot");
