-- schema.ts 中声明的查询索引此前没有对应迁移，导致全新部署不会创建这些索引。
-- IF NOT EXISTS 兼容已经手工建过索引的既有库。
CREATE INDEX IF NOT EXISTS "user_storages_user_id_idx" ON "user_storages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_storages_type_idx" ON "user_storages" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_configs_status_idx" ON "storage_configs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "storage_configs_type_idx" ON "storage_configs" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_status_idx" ON "collections" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_type_idx" ON "collections" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_created_at_idx" ON "collections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" USING btree ("user_id");
