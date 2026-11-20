-- P1-4：pg_trgm + GIN 索引，让 ILIKE '%kw%' 走索引而非全表扫描（万张图场景）。
-- CREATE EXTENSION 需要超级用户；若数据库已开启或权限不足，drizzle-kit migrate 会报错。
-- NAS 自建 Postgres 通常为超 user；如部署在受限托管库，请手动在库上执行 ^ 并删除本行。
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_title_trgm_idx" ON "files" USING gin ("title" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_path_trgm_idx" ON "files" USING gin ("path" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "files_author_trgm_idx" ON "files" USING gin ("author" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_description_trgm_idx" ON "photo_metadata" USING gin ("description" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_location_trgm_idx" ON "photo_metadata" USING gin ("location_name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_camera_trgm_idx" ON "photo_metadata" USING gin ("camera" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_maker_trgm_idx" ON "photo_metadata" USING gin ("maker" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "photo_metadata_lens_trgm_idx" ON "photo_metadata" USING gin ("lens" gin_trgm_ops);
