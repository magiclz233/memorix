-- P2-10 排序键可索引化：避免画廊/时间轴对 coalesce(photo_metadata.date_shot, files.mtime, files.created_at)
-- 做表达式排序导致的全表 Sort。
--
-- 偏差说明：路线图原计划用 GENERATED ALWAYS AS ... STORED 生成列，但拍摄时间在 photo_metadata 表，
-- Postgres 生成列不能跨表引用；这里改为普通列 + 触发器维护，语义与旧表达式一致。
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "sort_at" timestamp;

-- 回填：优先拍摄时间，其次文件修改时间，最后入库时间。
UPDATE "files" f
SET "sort_at" = COALESCE(pm."date_shot", f."mtime", f."created_at")
FROM "photo_metadata" pm
WHERE pm."file_id" = f."id";

UPDATE "files"
SET "sort_at" = COALESCE("mtime", "created_at")
WHERE "sort_at" IS NULL;

ALTER TABLE "files" ALTER COLUMN "sort_at" SET NOT NULL;
ALTER TABLE "files" ALTER COLUMN "sort_at" SET DEFAULT now();

-- 文件行插入/时间变更时同步排序键。
CREATE OR REPLACE FUNCTION "memorix_files_sync_sort_at"() RETURNS trigger AS $$
BEGIN
  NEW."sort_at" := COALESCE(
    (SELECT pm."date_shot" FROM "photo_metadata" pm WHERE pm."file_id" = NEW."id" LIMIT 1),
    NEW."mtime",
    NEW."created_at"
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "memorix_files_sync_sort_at_trigger" ON "files";
CREATE TRIGGER "memorix_files_sync_sort_at_trigger"
  BEFORE INSERT OR UPDATE OF "mtime", "created_at" ON "files"
  FOR EACH ROW EXECUTE FUNCTION "memorix_files_sync_sort_at"();

-- EXIF 拍摄时间新增/修改/删除时回写对应文件的排序键。
CREATE OR REPLACE FUNCTION "memorix_photo_metadata_sync_sort_at"() RETURNS trigger AS $$
BEGIN
  -- UPDATE 改 file_id 时两边都要重算，避免旧文件残留过期排序键。
  UPDATE "files" f
  SET "sort_at" = COALESCE(
    (SELECT pm."date_shot" FROM "photo_metadata" pm WHERE pm."file_id" = f."id" LIMIT 1),
    f."mtime",
    f."created_at"
  )
  WHERE f."id" = ANY (
    CASE
      WHEN TG_OP = 'DELETE' THEN ARRAY[OLD."file_id"]
      WHEN TG_OP = 'UPDATE' AND OLD."file_id" IS DISTINCT FROM NEW."file_id"
        THEN ARRAY[OLD."file_id", NEW."file_id"]
      ELSE ARRAY[NEW."file_id"]
    END
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "memorix_photo_metadata_sync_sort_at_trigger" ON "photo_metadata";
CREATE TRIGGER "memorix_photo_metadata_sync_sort_at_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "photo_metadata"
  FOR EACH ROW EXECUTE FUNCTION "memorix_photo_metadata_sync_sort_at"();

CREATE INDEX IF NOT EXISTS "files_sort_at_id_idx" ON "files" ("sort_at" DESC, "id" DESC);
