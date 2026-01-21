# Live Photo / Motion Photo 兼容需求与开发文档

版本: v1.0  
状态: 草案  
适用范围: 本项目图库系统（本地/NAS/S3 索引式存储）

## 0. 文档目标

在不改变原文件存储位置的前提下，为系统补全对 iOS Live Photo 与 Android Motion Photo 的统一识别、索引与播放能力，并给出与参考项目（Chronoframe、PhotoPrism）的实现对照与取舍依据。

## 1. 术语与格式定义

- **Live Photo（iOS）**：一张 HEIC/JPEG 照片 + 同名 MOV（QuickTime）短视频，通常位于同目录，文件名基干相同。
- **Motion Photo（Android）**：一张 JPEG/HEIC 照片内嵌 MP4 视频（通常追加在文件尾部），辅以 XMP/EXIF 标记。

## 2. 现有系统约束（本项目）

### 2.1 存储与索引

- 文件存在 **本地/NAS/S3** 原位置，仅做扫描与入库索引，不做搬迁。
- 当前扫描流程（`app/lib/storage.ts`、`app/lib/storage-scan.ts`）：
  - 递归扫描图片文件 → 写入 `files` 表 → 读取 EXIF → 写入 `photoMetadata` 表。
  - 使用 `exifr` 读取元信息，`sharp` 计算尺寸与 BlurHash。

### 2.2 当前能力缺口

- 未识别 Motion Photo 内嵌 MP4。
- 未识别 Live Photo 同名 MOV 配对。
- 缺少“短视频播放”API 与前端播放逻辑。

## 3. 需求定义

### 3.1 功能需求

1. **识别能力**
   - 支持 Android Motion Photo（内嵌 MP4）。
   - 支持 iOS Live Photo（同名 MOV 配对）。
2. **索引能力**
   - 扫描时写入标记与必要元数据（偏移、配对路径、时长等）。
3. **播放能力**
   - 统一视频流出接口，对前端透明。
   - 支持悬停/触控播放与静态回退。
4. **存储兼容**
   - 本地/NAS/S3 读取一致，支持 Range 读取。

### 3.2 非功能需求

- **KISS**：检测路径仅保留两条主干（内嵌偏移/同名配对）。
- **YAGNI**：不引入额外转码流程，除非播放能力确实需要。
- **DRY**：扫描、上传复用同一套检测与索引逻辑。
- **SOLID**：检测、索引、播放分层，彼此解耦。

## 4. 参考实现对照

### 4.1 Chronoframe（参考实现 A）
GitHub: https://github.com/HoshinoSuzumi/chronoframe

> 基于公开仓库源码的静态阅读结论，版本迭代可能导致细节变化。

**实现思路**
- 统一“处理管线”，将上传/扫描后的文件进入任务队列。
- **Motion Photo**：
  - 读取 EXIF/XMP 标记（MicroVideo/MotionPhoto）作为判断依据。
  - 从文件末尾扫描 MP4 `ftyp` 头，抽取内嵌视频到独立文件。
  - 以 `${photoId}.mp4` 形式存储并入库关联。
- **Live Photo**：
  - 通过同名 MOV 配对（基干一致），并设定尺寸/时长阈值。
  - 记录 `isLivePhoto` 与视频路径字段。
- **前端播放**：
  - 将 MOV 拉取为 `Blob` 并以 `video/mp4` 播放。
  - 组件层预加载，支持悬停/触控播放。

**关键实现细节（从源码观察）**
- Motion Photo 会先读 XMP（通常读取文件前 512KB 左右）以识别 MicroVideo/MotionPhoto 标记。
- 若 XMP 标记存在，则根据标记中的偏移/长度尝试抽取 MP4；失败时回退到尾部 `ftyp` 扫描。
- Live Photo 匹配时不仅看同名，还会加上文件大小或时长限制以降低误配。
- EXIF 解析依赖 exiftool 相关实现，保证 HEIC/JPEG 兼容性。

**优点**
- 全流程闭环，回退路径完整。
- 标记与数据结构较清晰，便于 UI 调用。

**缺点**
- 需要抽取并额外存储视频文件，增加磁盘占用。
- 处理链较长（预处理、提取、入库），对扫描耗时敏感。

### 4.2 PhotoPrism（参考实现 B）
GitHub: https://github.com/photoprism/photoprism

> 基于公开仓库源码的静态阅读结论，版本迭代可能导致细节变化。

**实现思路**
- **Motion Photo**：
  - 通过 MP4 `ftyp` 偏移探测内嵌视频。
  - 记录偏移位置并直接从原文件偏移流出视频片段。
- **Live Photo**：
  - 同名 MOV 配对（同目录 + 同 basename）。
  - 设置时长阈值（约 3.1s）以避免误配。
- **API**：
  - 视频流出使用 Range/偏移读取，不强制抽取文件。

**关键实现细节（从源码观察）**
- 会将 EXIF/XMP 中的 Motion Photo 相关字段统一映射为“内嵌视频”标记。
- 对内嵌视频的读取优先走“偏移流式读取”，必要时才落到缓存或转码路径。
- Live Photo 配对时倾向于同目录与相同基干名，减少跨目录误配。

**优点**
- 极低额外存储成本。
- API 更高效，支持大规模图库。

**缺点**
- 偏移读逻辑实现复杂，需要良好 Range 支持。
- 对存储源的随机读取能力依赖更强。

## 5. 本系统目标实现方案（结合两者优点）

### 5.1 总体策略

1. **主路径**：优先采用 PhotoPrism 的“偏移探测 + 偏移流式读取”方案，避免额外存储。
2. **兜底路径**：采用 Chronoframe 的 EXIF/XMP 标记辅助判定与同名 MOV 配对逻辑，确保兼容性。

### 5.2 数据结构（建议最小化）

建议在 `files` 或独立表中增加以下字段（保持最小必要）：

- `liveType`: `none | embedded | paired`
- `videoOffset`: number | null（内嵌视频的 MP4 偏移）
- `pairedPath`: string | null（同名 MOV 路径/Key）
- `videoDuration`: number | null（秒）
- `videoMimeType`: string | null
- `hasEmbeddedVideo`: boolean

> 仅存引用与索引信息，不存实际视频文件内容。

### 5.3 识别与索引流程

1. **扫描图片文件**
   - 保持现有 `scanImageFiles` 逻辑。
2. **Motion Photo 探测**
   - 读取文件末尾若干 KB，探测 `ftyp` 位置，计算偏移。
   - 结合 EXIF/XMP 标记作为辅助（非硬依赖）。
3. **Live Photo 配对**
   - 同目录同 basename 优先匹配 `.mov`。
   - 若存在多个候选，按时长阈值（≤3.1s）优先。
4. **入库**
   - 保存 `liveType`、`videoOffset`、`pairedPath`、`videoDuration`。

### 5.4 视频流出 API

统一对外为“视频流出接口”，内部按 `liveType` 分支：

- `embedded`：读取原图片文件，从 `videoOffset` 起返回 MP4 流。
- `paired`：直接读取 MOV 文件（或 S3 key）。
- `none`：返回 404 或静态占位。

### 5.5 存储适配（本地/NAS/S3）

- **本地/NAS**：采用文件系统随机读取，支持 Range 请求。
- **S3**：使用 Range 读取对象字节区间，避免整文件下载。
- **统一抽象**：提供 `list/stat/openRange` 能力即可，无需迁移文件。

## 6. 前端播放与交互策略

- **触发方式**：桌面端 hover 播放，移动端轻触或长按播放。
- **回退策略**：播放失败时回退静态图；不阻塞瀑布流布局。
- **资源加载**：仅在进入视口后拉取视频，避免首屏压力。
- **可访问性**：支持键盘 focus 播放与暂停。

## 7. 开发流程（理解/规划/执行/汇报）

### 7.1 理解阶段

- 梳理现有扫描流程与表结构（`files`、`photoMetadata`）。
- 识别新增字段与扫描入口的最小改动点，避免破坏现有索引逻辑。

### 7.2 规划阶段

- 明确两条主路径：内嵌偏移探测 + 同名 MOV 配对。
- 确定数据模型最小字段集，避免过度设计。
- 确定 API 范围：仅提供“视频流出接口”，前端不感知差异。

### 7.3 执行阶段

- 在扫描流程中补充 Live/Motion 识别逻辑与入库字段。
- 新增统一视频流出 API，支持 Range/偏移读取。
- 前端补充播放逻辑，保持与现有 UI 风格一致。

### 7.4 汇报阶段

- 输出验收结果与风险清单（详见第 8 节）。
- 汇总应用的 KISS/YAGNI/DRY/SOLID 原则与收益。

## 8. 测试与验收

### 8.1 测试用例

- **Android Motion Photo**：JPEG/HEIC 内嵌 MP4，确认可识别与播放。
- **iOS Live Photo**：HEIC/JPEG + 同名 MOV，确认可配对与播放。
- **混合目录**：同名 MOV 存在多份，确认时长阈值选择正确。
- **S3 Range**：在对象存储上验证偏移流出与断点续传。

### 8.2 验收标准

- 扫描完成后数据库中 `liveType`、`videoOffset`、`pairedPath` 字段正确。
- 前端播放体验稳定（桌面 hover / 移动端触控）。
- 性能稳定，未出现全量视频下载。

## 9. 本次文档迭代汇报

### 已完成的核心任务

- 输出完整需求与开发文档。
- 汇总 Chronoframe 与 PhotoPrism 的实现方式。
- 明确本系统“索引式存储”前提下的落地策略。

### 原则应用与收益

- **KISS**：两条主路径覆盖主流格式，逻辑简单清晰。
- **YAGNI**：避免默认引入转码与搬迁，降低成本。
- **DRY**：检测逻辑复用扫描入口，减少重复实现。
- **SOLID**：检测/索引/播放解耦，便于后续扩展。

### 挑战与应对

- **兼容差异**：使用“偏移探测 + 同名配对”双路径解决。
- **存储差异**：统一 `openRange` 读取能力屏蔽差异。

### 下一步计划与建议

- 建立最小样本集（iOS/Android）用于回归测试。
- 在 S3 上验证 Range 读取性能与缓存策略。
