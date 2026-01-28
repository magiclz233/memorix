# 视频扫描解析与前台画廊展示开发文档（企业级方案）

版本：v1.1  
状态：已确认  
目标：为系统补全“视频扫描、解析、预览、前台画廊展示”能力，体验与图片一致，支持本地/ NAS 与 S3。

---

## 0. 文档目的

在不改变现有“索引式存储”前提下，为系统新增视频全流程能力：**扫描目录或 S3 前缀 → 解析视频元信息 → 生成预览缩略图 → 入库索引 → 前台画廊展示与播放**。  
实现方式对齐现有图片扫描流程、权限模型与 UI 风格，满足可维护、可扩展、企业级落地要求。

---

## 1. 范围与目标

### 1.1 功能目标
- 扫描本地/ NAS 目录与 S3 前缀，发现视频文件并入库。
- 解析视频元信息（时长、分辨率、码率、编解码等）。
- 生成视频预览缩略图（Poster），并可用于前台/后台展示。
- 前台画廊中与图片统一混排，具备视频角标与 Hover-to-Play 交互。
- 视频媒体流支持 Range 请求（可拖拽进度条、快速加载）。

### 1.2 非目标（本期不做）
- 不做视频转码、HLS/DASH 生成。
- 不做 AI 识别/自动标签。
- 不做分布式队列与异步任务平台（先在现有扫描流程内完成）。

---

## 2. 现状评估（与现有逻辑对齐）

- 扫描流程：`app/lib/storage-scan.ts` 仅扫描图片。
- 存储模型：`files` 表存媒体基础信息，`photo_metadata` 存图片 EXIF。
- 前台画廊：`/api/gallery` → `buildGalleryItems`，视频仅依赖 `thumbUrl` 展示。
- 文件访问：`/api/local-files/[id]` 无 Range 支持，无法高效播放视频。

结论：需要新增“视频元信息表 + 统一媒体流 API + 视频缩略图生成 + S3 扫描适配”。

---

## 3. 设计原则

- **KISS**：单一管线，视频与图片共用扫描框架。
- **DRY**：统一存储适配层，避免本地/S3 分叉重复。
- **YAGNI**：不引入转码与复杂 CDN 管道，先满足预览与播放。
- **安全一致**：沿用 `isPublished` 与会话权限校验。

---

## 4. 总体架构（模块分层）

1) **StorageAdapter（存储适配层）**
   - local/nas：fs + path
   - s3：AWS SDK list/get + Range

2) **MediaScanner（扫描层）**
   - 统一扫描图片/视频
   - 输出 `MediaFileInfo[]`

3) **MetadataExtractor（解析层）**
   - 图片：`exifr`（现有）
   - 视频：`ffprobe`（新增）

4) **PreviewGenerator（预览层）**
   - 图片：`sharp` + blurhash（现有）
   - 视频：`ffmpeg` 抽帧 → `sharp` 生成 poster + blurhash

5) **MediaStream API（流式访问）**
   - 支持 Range
   - 本地 + S3 统一接口

6) **前台 UI**
   - 画廊混排
   - Hover-to-Play
   - Light/Dark 双模态一致

---

## 5. 数据模型设计

### 5.1 files 表（保留）
- 继续使用 `mediaType` 区分 `image | video`
- `url`：媒体流访问地址
- `thumbUrl`：统一缩略图地址（图片/视频共用）
- `blurHash`：由缩略图生成

### 5.2 新增 video_metadata 表（已确认）

> 与 `photo_metadata` 拆分，避免字段污染，便于后续扩展。结构与 `photo_metadata` 一样：每个视频文件对应一行记录，`file_id` 为主键。

字段建议（结构化字段尽量完整，覆盖常见业务与筛选需求）：
- `file_id` (PK，关联 `files.id`)
- `duration` (秒，double)
- `width` (int)
- `height` (int)
- `bitrate` (int)
- `fps` (double)
- `frame_count` (int)
- `codec_video` (varchar)
- `codec_video_profile` (varchar)
- `pixel_format` (varchar)
- `color_space` (varchar)
- `color_range` (varchar)
- `color_primaries` (varchar)
- `color_transfer` (varchar)
- `bit_depth` (int)
- `codec_audio` (varchar)
- `audio_channels` (int)
- `audio_sample_rate` (int)
- `audio_bitrate` (int)
- `rotation` (int)
- `has_audio` (boolean)
- `container_format` (varchar)
- `container_long` (varchar)
- `poster_time` (double，可选，抽帧时间点)
- `raw` (jsonb，可选，存 ffprobe 原始结果，便于后续扩展字段)

索引建议：
- `video_metadata(file_id)` 主键即可
- 若需后台筛选视频时长可考虑 `duration` 索引（非必须）

---

## 6. 存储适配层设计（StorageAdapter）

统一接口（伪定义）：
- `list(prefix): AsyncIterable<StorageObject>`  
- `stat(key): { size, mtime, mimeType }`
- `openStream(key): Readable`
- `openRange(key, start, end): Readable`  
- `resolvePath(key): string`（本地使用）
- `getThumbKey(fileId, ext): string`（缩略图存储）

### 6.1 本地/NAS
- `rootPath` 为根目录
- `key` 使用相对路径
- 缩略图缓存目录：`{rootPath}/.memorix/thumbs/`

### 6.2 S3
- 依赖：`@aws-sdk/client-s3`
- `prefix` 作为“虚拟根目录”
- 缩略图路径：`${prefix}/.memorix/thumbs/{fileId}.webp`
- Range 请求：`GetObjectCommand({ Range: "bytes=start-end" })`

---

## 7. 扫描流程设计

### 7.1 统一扫描入口
新增 `scanMediaFiles`：
- 递归扫描图片与视频
- 支持本地/NAS 与 S3
- 按 `mediaType` 产出 `MediaFileInfo[]`

视频扩展名建议：`.mp4 .mov .m4v .webm .mkv .avi .m2ts .ts`

### 7.2 本地/NAS 扫描流程
1. 递归遍历目录，筛选图片/视频文件
2. 生成 `relativePath / size / mtime / mimeType`
3. 对比 DB（size + mtime）判断是否需要更新
4. 解析元信息（图片 EXIF / 视频 ffprobe）
5. 生成缩略图（图片：sharp；视频：ffmpeg 抽帧）
6. 写入 `files` 与 `photo_metadata / video_metadata`

### 7.3 S3 扫描流程
1. 列出 `prefix` 下对象（分页）
2. 过滤文件后缀
3. 读取 `size / LastModified`
4. 解析元信息（需临时下载或 Range 流）
5. 生成缩略图并写回 S3 缓存路径
6. 入库索引

---

## 8. 视频元信息解析（ffprobe）

### 8.1 依赖建议
- `fluent-ffmpeg`
- `ffmpeg-static`
- `ffprobe-static`

### 8.2 解析输出字段映射
- `duration` → `video_metadata.duration`
- `width/height` → `video_metadata.width/height`
- `bit_rate` → `video_metadata.bitrate`
- `nb_frames` → `video_metadata.frame_count`
- `codec_name` → `video_metadata.codec_video`
- `profile` → `video_metadata.codec_video_profile`
- `pix_fmt` → `video_metadata.pixel_format`
- `color_space/color_range/color_primaries/color_transfer` → 对应字段
- `bits_per_raw_sample/bits_per_sample` → `video_metadata.bit_depth`
- `avg_frame_rate` → `video_metadata.fps`
- audio stream → `codec_audio / audio_channels / audio_sample_rate / audio_bitrate / has_audio`
- `tags.rotate` → `rotation`
- `format_name` → `video_metadata.container_format`
- `format_long_name` → `video_metadata.container_long`
- `raw` → `video_metadata.raw`

### 8.3 异常策略
- ffprobe 失败：记录日志，跳过元信息但保留文件入库
- 解析失败不阻断整体扫描

---

## 9. 视频预览缩略图（Poster）

### 9.1 抽帧策略
- 默认取 `min(1s, duration * 0.1)` 作为 poster 时间点
- 无时长时默认 `1s`

### 9.2 生成流程
1. `ffmpeg -ss {posterTime} -i {source} -frames:v 1`
2. 使用 `sharp` 转为 `webp`（宽度 640~960）
3. 生成 `blurhash`
4. 写入缓存路径（本地/S3）
5. `files.thumbUrl` 指向 `/api/media/thumb/{id}`

---

## 10. 媒体流 API（Range 支持）

新增统一接口（建议）：
- `GET /api/media/stream/[id]`  
  - 校验 `isPublished`（未发布需登录且为属主）
  - 支持 `Range` 请求
  - 返回 `206 Partial Content` 或 `200`

新增缩略图接口（建议）：
- `GET /api/media/thumb/[id]`
  - 统一返回图片（jpg/webp）
  - 内部从缓存目录或 S3 缓存读取

注意：
- 响应头包含 `Accept-Ranges` / `Content-Range`
- 对视频播放体验必须支持 Range

---

## 11. 前台画廊展示与交互

### 11.1 数据结构调整
- `buildGalleryItems` 需要补充：
  - `videoUrl`（用于播放）
  - `posterUrl`（缩略图）
  - `duration`（可选，用于角标展示）

### 11.2 Gallery UI 交互
- 卡片右上角显示播放角标（已存在风格）
- Hover-to-Play：
  - 仅在进入视口后加载视频
  - `muted + playsInline + loop`
- 移动端：点击切换播放/暂停
- 弹窗详情：
  - `type=video` 时使用 `<video controls>` 替换 `<img>`
  - 其余逻辑保持一致

### 11.3 视觉与风格
- 保持 Lumina Pro 视觉，沿用 `SpotlightCard` / `Gallery25` 组件风格
- Light/Dark 双模态完整适配

---

## 12. 后台管理与媒体库

### 12.1 媒体库展示
- 视频项展示分辨率、时长
- 播放按钮或缩略图悬浮播放

### 12.2 扫描日志
- 增加 `foundVideos/scannedVideos` 统计
- i18n 日志信息同步补齐

---

## 13. i18n 文案新增范围（示例）

需要同步更新：
- `messages/zh-CN.json`
- `messages/en.json`

新增 key 示例：
- `dashboard.storage.files.scan.foundVideos`
- `dashboard.storage.files.scan.scannedVideos`
- `front.gallery.videoPreviewFailed`
- `front.gallery.videoDuration`
- `api.errors.videoRangeInvalid`

---

## 14. 开发步骤（可执行清单）

1. **数据模型**
   - 新增 `video_metadata` 表
   - 生成 Drizzle migration

2. **存储适配层**
   - 抽象 `StorageAdapter`
   - 实现 `LocalAdapter` + `S3Adapter`

3. **扫描能力**
   - 扩展 `scanImageFiles` → `scanMediaFiles`
   - 增加视频文件识别
   - 处理 S3 扫描与分页

4. **元信息解析**
   - 引入 ffprobe
   - 写入 `video_metadata`

5. **预览缩略图**
   - ffmpeg 抽帧生成 poster
   - sharp 压缩 + blurhash

6. **媒体流 API**
   - 新建 `/api/media/stream/[id]`
   - 新建 `/api/media/thumb/[id]`
   - Range + 权限检查

7. **查询与数据适配**
   - `fetchPublishedMediaForGallery` 加入 `video_metadata`
   - `buildGalleryItems` 输出 `videoUrl/posterUrl`

8. **前台 UI**
   - `Gallery25` 支持视频播放
   - 卡片角标 + Hover-to-Play

9. **后台 UI**
   - 媒体库展示视频信息
   - 扫描日志文案补齐

10. **测试与验收**
    - 本地目录视频
    - S3 前缀视频
    - Range 播放

---

## 15. 测试方案

### 15.1 功能测试
- 本地/NAS 扫描含视频目录
- S3 扫描含视频前缀
- 画廊视频缩略图展示
- Hover-to-Play 与移动端播放

### 15.2 性能测试
- 1000+ 视频目录扫描耗时
- S3 大文件 Range 播放稳定性

### 15.3 失败场景
- ffprobe/ffmpeg 失败
- S3 权限不足或断网
- 缩略图生成失败回退

---

## 16. 验收标准

- 视频文件可被扫描并入库，`mediaType=video`
- `video_metadata` 写入完整且准确
- 视频缩略图可访问且在画廊展示
- 前台画廊视频卡片支持 Hover-to-Play
- Range 播放无整文件下载

---

## 17. 确认结果（已确认）

1) 新增 `video_metadata` 表  
2) 视频缩略图统一存 `thumbUrl`  
3) 允许引入 `ffmpeg/ffprobe` 依赖  
4) 媒体流 API 统一 `/api/media/stream/[id]`
