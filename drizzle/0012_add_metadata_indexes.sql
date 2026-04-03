-- 为 photo_metadata 表添加查询索引

-- 按相机型号过滤
CREATE INDEX IF NOT EXISTS "photo_metadata_camera_idx" ON "photo_metadata" USING btree ("camera");

-- 按制造商过滤
CREATE INDEX IF NOT EXISTS "photo_metadata_maker_idx" ON "photo_metadata" USING btree ("maker");

-- 按镜头过滤
CREATE INDEX IF NOT EXISTS "photo_metadata_lens_idx" ON "photo_metadata" USING btree ("lens");

-- GPS 查询（仅对有 GPS 数据的记录建索引）
CREATE INDEX IF NOT EXISTS "photo_metadata_gps_idx" ON "photo_metadata" USING btree ("gps_latitude", "gps_longitude")
WHERE "gps_latitude" IS NOT NULL AND "gps_longitude" IS NOT NULL;

-- 为 video_metadata 表添加查询索引

-- 视频分辨率过滤
CREATE INDEX IF NOT EXISTS "video_metadata_resolution_idx" ON "video_metadata" USING btree ("width", "height");

-- 视频编码过滤
CREATE INDEX IF NOT EXISTS "video_metadata_codec_idx" ON "video_metadata" USING btree ("codec_video");

-- 视频时长过滤
CREATE INDEX IF NOT EXISTS "video_metadata_duration_idx" ON "video_metadata" USING btree ("duration");
