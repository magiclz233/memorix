# 视频扫描解析与前台画廊展示开发文档（企业级方案）

版本：v2.0  
状态：已重构（待评审）  
最后更新：2026-01-28  
适用范围：本项目（Next.js App Router / Drizzle / 多存储）

---

## 0. 参考实现与借鉴点（PhotoPrism）

**PhotoPrism：**
- FFmpeg 集成通过“命令构建器 + 统一选项”封装，避免散落调用；支持硬件编码但不强制。
- 预览帧抽取使用 `-ss` 双阶段 seek、`-err_detect ignore_err`、禁用 hwaccel、强制偶数尺寸和色彩空间，保障稳定与一致。
- 元数据管线强调“可容错+可追踪”：Exif → XMP → JSON → 文件名/mtime，失败不阻断索引。
- 媒体类型细分为 video/animated 等，前台有明显播放/动图标识。

**本方案融合原则：** 保留现有架构的简洁性（KISS），不引入转码与分布式任务平台（YAGNI），统一扫描与存储适配层（DRY），明确单一职责与可扩展点（SOLID）。

---

## 1. 目标与非目标

### 1.1 目标
- 支持本地/NAS/S3 扫描视频与动图文件，统一入库与检索。
- 解析视频元信息并生成 Poster + BlurHash，和图片体验一致。
- 前台画廊与后台媒体库支持视频/动图展示、Hover-to-Play 与播放入口。
- 流媒体 API 支持 Range 请求（本地 + S3）。

### 1.2 非目标（本期不做）
- HLS/DASH、复杂转码和多码率分发。
- AI 识别/自动标签/多媒体检索。
- 分布式队列与任务平台（先复用现有扫描流程）。

---

## 2. 现状与差距（本项目）

已存在能力：
- `files` 表已包含 `mediaType`、`thumbUrl`、`blurHash`。

缺口：
- 扫描只覆盖图片，缺少视频文件的扫描、解析与入库。
- 无 `video_metadata`，视频元信息无法独立管理。
- 缩略图仅面向图片，缺少视频 Poster 生成和缓存路径。
- Gallery/UI 未区分视频/动图及播放路径，无法统一 UX。

---

## 3. 总体架构（统一媒体管线）

```
StorageAdapter → MediaScanner → MetadataExtractor → PreviewGenerator → Index/DB → MediaStream API → UI
```

- **StorageAdapter**：本地/NAS/S3 统一接口。
- **MediaScanner**：扫描并输出 `MediaFileInfo`（image/video/animated）。
- **MetadataExtractor**：图片用 exifr；视频用 ffprobe。
- **PreviewGenerator**：图片用 sharp；视频用 ffmpeg 抽帧 + sharp + blurhash。
- **MediaStream API**：统一 Range/权限/内容类型。
- **UI**：Gallery/Media Library 同步呈现。

---

## 4. 媒体类型与兼容策略

### 4.1 类型定义（建议）
- `image`：静态图片（jpg/png/heic/avif）
- `video`：视频（mp4/mov/webm/mkv/...）
- `animated`：动图（gif/animated webp）

> 说明：本文档中的“动图”特指 GIF/Animated WebP，不包含 LivePhoto/Motion Photo。如不改动 DB，可用 `mediaType=image` + `isAnimated` 标记替代。推荐扩展 `mediaType` 更清晰（PhotoPrism 做法）。

---

## 5. 数据模型（推荐）

### 5.1 `files`（增强）
- `mediaType`: `image | video | animated`
- `thumbUrl`, `blurHash`: 统一用于图片/视频/动图

### 5.2 新增 `video_metadata`（与 `photo_metadata` 平行）
字段建议（保留可扩展 raw）：
- `file_id` (PK, FK -> files.id)
- `duration` (double, seconds)
- `width`, `height` (int)
- `bitrate` (int, bps)
- `fps` (double)
- `frame_count` (int)
- `codec_video`, `codec_video_profile`
- `codec_audio`, `audio_channels`, `audio_sample_rate`, `audio_bitrate`
- `pixel_format`, `color_space`, `color_range`, `color_primaries`, `color_transfer`
- `bit_depth`
- `rotation`
- `container_format`, `container_long`
- `has_audio` (boolean)
- `poster_time` (double, seconds)
- `raw` (jsonb)

索引建议：
- `video_metadata(file_id)` 主键即可
- 如需筛选时长可加 `duration` 索引

---

## 6. StorageAdapter 设计（DRY）

统一接口（建议）：
- `list(prefix): AsyncIterable<StorageObject>`
- `stat(key): { size, mtime, mimeType }`
- `get(key): Buffer | stream`
- `openRange(key, start, end): Readable`
- `create(key, buffer, mimeType)`（用于 Poster）
- `getPublicUrl(key): string`

本地/NAS：
- `rootPath` 为根目录
- 缩略图缓存：`{rootPath}/.memorix/thumbs/`

S3：
- `prefix` 为虚拟根目录
- 缩略图缓存：`${prefix}/.memorix/thumbs/{fileId}.webp`
- Range：`GetObjectCommand({ Range: "bytes=start-end" })`

---

## 7. 扫描与索引流程

### 7.1 文件类型识别
- **图片**：沿用 `IMAGE_MIME_BY_EXT`
- **视频**：扩展名白名单 + MIME（`video/*`）
- **动图**：`.gif` / `.webp` 且 animated flag（可用 sharp 判断）

### 7.2 本地/NAS
1) 遍历目录 → 过滤可识别媒体  
2) 对比 `size + mtime + mimeType` 实现增量  
3) 解析元数据（图片：exifr；视频：ffprobe）  
4) 生成缩略图（图片：sharp；视频：ffmpeg 抽帧）  
5) 写入 `files` + `photo_metadata` / `video_metadata`  

### 7.3 S3
1) ListObjectsV2 分页  
2) 过滤媒体类型  
3) `headObject` 获取 size/mtime  
4) 元信息解析：  
   - 小文件直接下载临时文件  
   - 大文件使用 `ffprobe` + `-probesize/-analyzeduration` + Range/流式读取  
5) 生成 Poster 并回写到 S3 缓存目录  
6) 入库索引  

---

## 8. 视频元信息解析（ffprobe）

### 8.1 依赖
- `ffprobe-static`（默认）
- 允许 `FFPROBE_PATH` 覆盖

### 8.2 映射策略（容错）
- `format.duration` → `duration`
- `streams.video.width/height` → `width/height`
- `streams.video.bit_rate` → `bitrate`
- `streams.video.nb_frames` → `frame_count`
- `streams.video.codec_name/profile` → `codec_video/profile`
- `streams.video.pix_fmt` → `pixel_format`
- `color_*` 字段映射至对应列
- `streams.audio.*` → 音频字段
- `tags.rotate` → `rotation`
- `format.format_name/format_long_name` → container
- 保留 `raw` 以便未来扩展

### 8.3 异常策略（PhotoPrism 经验）
- ffprobe 失败只记录日志，不阻断入库
- 元信息不全仍允许生成 Poster + 入库

---

## 9. 视频 Poster 生成（ffmpeg + sharp）

### 9.1 Poster 时间策略
- `poster_time = min(1s, duration * 0.1)`  
- 无时长时 fallback 1s  
- 可将 `poster_time` 写入 `video_metadata`

### 9.2 ffmpeg 抽帧建议（参考 PhotoPrism）
- `-ss` 预先 seek（快），再精确 seek  
- `-err_detect ignore_err`  
- `-hwaccel none`（稳定优先）  
- 强制偶数尺寸 + BT.709 颜色空间  
- 输出单帧（jpg/png），再由 sharp 转 webp

### 9.3 缩略图输出
- 目标宽度 640~960（兼顾清晰与性能）
- 生成 `blurHash`（前台骨架）
- 缓存路径同 StorageAdapter 约定

---

## 10. Media Stream API（统一）

### 10.1 API 设计
- `GET /api/media/stream/[id]`
- 支持 `Range`，返回 `206 Partial Content`
- 权限：未发布需校验登录与所有权

### 10.2 视频通用支持（新增）
- `mediaType=video` 直接读取原文件
- 内容类型规范化：
  - `.mp4/.mov` → `video/mp4`（兼容优先）
  - `.webm` → `video/webm`
- Header 必须包含 `Accept-Ranges` / `Content-Range`

---

## 11. 前台画廊展示

### 11.1 数据结构
`buildGalleryItems` 增加：
- `videoUrl`（/api/media/stream/[id]）
- `posterUrl`（thumbUrl）
- `duration`（video_metadata.duration）
- `isAnimated`（gif/webp）

### 11.2 UI 交互
- 卡片右上角区分 **视频 / 动图** 图标
- Hover-to-Play（IntersectionObserver 控制加载）
- 移动端点击切换播放/暂停
- Lightbox：视频使用 `<video controls>`，图片保持 `<img>`

### 11.3 动图体验
- 动图：默认静态 Poster，Hover 时切换为 GIF/Animated WebP

---

## 12. 后台媒体库

- 展示视频/动图基础信息：时长、分辨率、编码、是否含音频
- 扫描日志增加 `foundVideos / scannedVideos / foundAnimated`
- 批量操作支持按类型过滤（image/video/animated）

---

## 13. i18n 文案新增（示例）

- `dashboard.storage.files.scan.foundVideos`
- `dashboard.storage.files.scan.foundAnimated`
- `dashboard.storage.files.scan.scannedVideos`
- `front.gallery.videoPreviewFailed`
- `front.gallery.videoDuration`
- `front.gallery.animated`
- `api.errors.videoRangeInvalid`

---

## 14. 实施步骤（建议顺序）

1) **数据层**  
   - 新增 `video_metadata` 表  
   - `files.mediaType` 支持 `animated`（或新增 `isAnimated`）  

2) **扫描能力**  
   - `scanImageFiles` → `scanMediaFiles`  
   - 视频/动图识别与入库  

3) **元信息解析**  
   - `ffprobe` 集成  
   - 写入 `video_metadata`  

4) **Poster 生成**  
   - `ffmpeg` 抽帧 → `sharp` → `blurHash`  

5) **Stream API 扩展**  
   - 让 `/api/media/stream/[id]` 支持普通视频 + S3  

6) **Gallery/UI**  
   - `buildGalleryItems` 输出 `videoUrl/posterUrl`  
   - Gallery25 支持 hover-to-play  

7) **后台管理**  
   - 视频元信息展示与筛选  

---

## 15. 测试计划

- 本地/NAS：多格式视频、动图（GIF/Animated WebP）
- S3：Range 播放、Poster 生成回写
- 前台：Hover-to-Play、移动端点击播放
- 失败场景：ffprobe/ffmpeg 失败、Range 无效、权限不足

---

## 16. 风险与取舍

- MOV/HEVC 浏览器兼容有限：优先 `video/mp4` 内容类型，并提供失败提示
- S3 探测大文件：设置 `probesize/analyzeduration` 限制，失败容忍

---

## 17. 验收标准

- 视频/动图可扫描并入库（`mediaType` 正确）
- `video_metadata` 写入完整且可查询
- Poster 可访问，画廊中展示一致
- Range 播放稳定（本地 + S3）
- GIF/Animated WebP 可正常播放与切换

---

## 18. 下一步建议

- 增加“视频/动图缩略图批处理任务”以降低首扫压力
- 动图播放策略优化：按视口分段加载与帧率限制
- 引入轻量异步队列（如 BullMQ）作为性能扩展点（非本期）
