# Requirements Document

## Introduction

本需求文档旨在完善 Next.js 图库项目的半成品功能，确保前台展示与后台管理的核心业务链路完整可用。项目采用 Next.js 16 + React 19 + TypeScript 技术栈，使用 Postgres + Drizzle ORM 作为数据层，支持多存储源（本地/NAS/S3），并提供中英文双语国际化支持。设计风格遵循 Lumina Pro（Light Mode 极简杂志风 + Dark Mode 流光黑洞风）。

核心业务链路为：存储配置 → 扫描文件 → 生成元数据 → 发布媒体 → 创建集合 → 前台展示。

本需求涵盖 8 个主要功能模块：前台 Hero 照片真实数据连接、前台精选集合真实数据连接、真实上传功能实现、批量删除媒体、批量下载、实况照片播放、UI/UX 优化以及数据一致性修复。

## Glossary

- **Frontend_Home**: 前台首页组件，展示 Hero 照片轮播和精选集合
- **Hero_Photo**: 首页 Hero 区域展示的轮播照片
- **Featured_Collection**: 首页展示的精选作品集
- **Upload_Center**: 后台上传中心页面组件
- **Media_Library**: 后台媒体库管理页面
- **Storage_Source**: 存储源配置（本地/NAS/S3）
- **Media_Item**: 媒体文件项（照片、视频或动图）
- **Live_Photo**: 实况照片（包含静态图片和短视频）
- **Collection**: 作品集（可包含多个媒体项）
- **EXIF_Metadata**: 照片的 EXIF 元数据信息
- **BlurHash**: 图片模糊哈希值，用于占位符显示
- **Scan_Process**: 存储源扫描过程，生成媒体元数据
- **Published_Status**: 媒体的发布状态（已发布/未发布）
- **Batch_Operation**: 批量操作（删除、下载等）
- **Filter_Bar**: 筛选器组件
- **Detail_Modal**: 详情模态框
- **Cascade_Cleanup**: 级联清理关联数据

## Requirements

### Requirement 1: 前台 Hero 照片连接真实数据

**User Story:** 作为网站访客，我希望在首页看到管理员设置的真实 Hero 照片轮播，而不是硬编码的静态图片，以便欣赏到最新的精选作品。

#### Acceptance Criteria

1. WHEN Frontend_Home 组件加载时，THE System SHALL 调用 `fetchHeroPhotosForHome()` 函数获取真实 Hero 照片数据
2. THE System SHALL 将获取到的照片数据转换为包含 `id`、`url`、`thumbUrl`、`blurHash` 的格式
3. IF `fetchHeroPhotosForHome()` 返回空数组，THEN THE System SHALL 使用预设的默认图片作为降级方案
4. THE System SHALL 保持现有的轮播交互逻辑（自动切换、手动切换、响应式适配）
5. THE System SHALL 保持现有的色调检测逻辑（根据图片亮度调整文字颜色）
6. WHEN Hero 照片数据更新时，THE System SHALL 在前台页面重新验证后显示最新照片

### Requirement 2: 前台精选集合连接真实数据

**User Story:** 作为网站访客，我希望在首页看到真实的精选作品集，而不是假数据，以便了解网站的实际内容。

#### Acceptance Criteria

1. WHEN Frontend_Home 组件加载时，THE System SHALL 调用 `fetchCollections()` 函数获取状态为 `published` 的作品集
2. THE System SHALL 限制返回最多 3 个精选集合用于首页展示
3. THE System SHALL 为每个集合显示封面图、标题、描述、类型标识和媒体数量
4. IF 集合未设置封面图，THEN THE System SHALL 使用集合中前 3 个媒体项作为默认封面
5. THE System SHALL 保持现有的 SpotlightCard 视觉效果和渐变背景
6. WHEN 用户点击集合卡片时，THE System SHALL 导航到对应的集合详情页

### Requirement 3: 实现真实的上传功能

**User Story:** 作为管理员，我希望能够通过上传中心真实上传文件到选定的存储源，并自动生成元数据，以便快速添加新的媒体内容。

#### Acceptance Criteria

1. WHEN 管理员选择文件并点击上传时，THE System SHALL 创建上传 API 端点接收文件数据
2. THE Upload_API SHALL 验证用户具有管理员权限
3. THE Upload_API SHALL 验证目标存储源存在且未被禁用
4. THE Upload_API SHALL 根据存储源类型（local/nas/s3）将文件保存到对应位置
5. WHEN 文件保存成功后，THE System SHALL 在 `files` 表中创建记录
6. THE System SHALL 触发元数据提取流程，生成缩略图、BlurHash 和 EXIF 信息
7. THE System SHALL 实时更新上传进度（0-100%）
8. IF 上传失败，THEN THE System SHALL 显示具体错误信息并标记该文件状态为 `error`
9. WHEN 所有文件上传完成后，THE System SHALL 重新验证媒体库页面
10. THE System SHALL 支持同时上传多个文件（并发处理）

### Requirement 4: 添加批量删除媒体功能

**User Story:** 作为管理员，我希望能够批量选择并删除不需要的媒体文件，以便高效管理媒体库。

#### Acceptance Criteria

1. THE Media_Library SHALL 提供批量选择 UI（复选框）
2. WHEN 管理员选中一个或多个媒体项时，THE System SHALL 显示批量操作工具栏
3. WHEN 管理员点击批量删除按钮时，THE System SHALL 显示确认对话框
4. THE Confirmation_Dialog SHALL 显示将要删除的文件数量
5. WHEN 管理员确认删除时，THE System SHALL 调用 Server Action 执行删除操作
6. THE Delete_Action SHALL 验证用户具有管理员权限
7. THE Delete_Action SHALL 执行级联删除：从 `collection_media` 表删除关联、从 `photo_metadata` 表删除元数据、从 `files` 表删除文件记录
8. THE Delete_Action SHALL 从物理存储中删除文件（本地/NAS）或标记删除（S3）
9. THE Delete_Action SHALL 清理 Hero 照片设置中对已删除文件的引用
10. THE Delete_Action SHALL 清理集合封面中对已删除文件的引用
11. WHEN 删除完成后，THE System SHALL 重新验证相关页面并显示成功消息
12. IF 删除失败，THEN THE System SHALL 显示错误信息并回滚事务

### Requirement 5: 添加批量下载功能

**User Story:** 作为管理员或访客，我希望能够批量下载选中的媒体文件，以便离线使用或备份。

#### Acceptance Criteria

1. THE Media_Library SHALL 在批量操作工具栏中提供下载按钮
2. WHEN 管理员选中一个或多个媒体项并点击下载时，THE System SHALL 创建下载任务
3. IF 选中文件数量为 1，THEN THE System SHALL 直接下载该文件
4. IF 选中文件数量大于 1，THEN THE System SHALL 生成 ZIP 压缩包
5. THE System SHALL 显示下载进度指示器
6. THE ZIP_Generator SHALL 包含所有选中文件的原始文件
7. THE ZIP_Generator SHALL 使用合理的文件命名（保留原始文件名或使用标题）
8. WHEN ZIP 生成完成后，THE System SHALL 触发浏览器下载
9. THE System SHALL 在服务器端清理临时 ZIP 文件（24 小时后或下载完成后）
10. IF 下载失败，THEN THE System SHALL 显示错误信息

### Requirement 6: 完善实况照片前台播放

**User Story:** 作为网站访客，我希望能够在前台画廊中识别并播放实况照片，以便体验完整的媒体内容。

#### Acceptance Criteria

1. WHEN Media_Item 的 `liveType` 字段不为 `none` 时，THE System SHALL 在缩略图上显示实况照片标识图标
2. THE Live_Photo_Icon SHALL 使用明显的视觉标识（如圆形播放图标）
3. WHEN 用户将鼠标悬停在实况照片上时，THE System SHALL 自动播放配对的视频
4. THE Video_Player SHALL 循环播放且无声音
5. WHEN 用户鼠标移开时，THE System SHALL 停止播放并恢复显示静态图片
6. THE System SHALL 预加载实况照片的视频部分以确保流畅播放
7. IF 实况照片的视频部分加载失败，THEN THE System SHALL 仅显示静态图片
8. THE System SHALL 在移动设备上禁用 Hover-to-Play，改为点击播放
9. WHEN 用户在详情模态框中查看实况照片时，THE System SHALL 提供播放控制按钮

### Requirement 7: 优化 UI/UX

**User Story:** 作为用户，我希望界面更加友好和高效，以便更好地浏览和管理媒体内容。

#### Acceptance Criteria - 媒体预览详情模态框

1. WHEN 用户点击媒体项时，THE System SHALL 打开详情模态框
2. THE Detail_Modal SHALL 显示大尺寸预览图（最大化利用视口空间）
3. THE Detail_Modal SHALL 显示完整的 EXIF 信息（相机、镜头、光圈、快门、ISO、焦距、拍摄时间、GPS 位置）
4. THE Detail_Modal SHALL 提供关闭按钮和键盘 ESC 快捷键
5. THE Detail_Modal SHALL 支持左右箭头键切换到上一张/下一张媒体
6. THE Detail_Modal SHALL 在 Dark Mode 下使用深色半透明背景
7. IF 媒体项为视频，THEN THE Detail_Modal SHALL 提供视频播放控件

#### Acceptance Criteria - 筛选器优化

8. THE Filter_Bar SHALL 分为基础筛选和高级筛选两个区域
9. THE Basic_Filter SHALL 包含：存储源、媒体类型、发布状态、关键词搜索
10. THE Advanced_Filter SHALL 包含：日期范围、文件大小、分辨率、相机参数（曝光、光圈、ISO、焦距）、方向、设备、GPS
11. THE Advanced_Filter SHALL 默认折叠，点击"高级筛选"按钮后展开
12. THE Filter_Bar SHALL 显示当前激活的筛选条件数量
13. THE Filter_Bar SHALL 提供"清除所有筛选"按钮

#### Acceptance Criteria - 前台画廊筛选和排序

14. THE Frontend_Gallery SHALL 提供简单的筛选选项（媒体类型：全部/照片/视频）
15. THE Frontend_Gallery SHALL 提供排序选项（最新优先/最旧优先）
16. THE Gallery_Filter SHALL 使用简洁的下拉菜单或标签页形式
17. WHEN 用户更改筛选或排序时，THE System SHALL 保持无限滚动状态并重新加载数据

### Requirement 8: 修复数据一致性问题

**User Story:** 作为系统管理员，我希望删除操作能够正确清理所有关联数据，以便保持数据库的一致性和完整性。

#### Acceptance Criteria

1. WHEN 删除媒体文件时，THE System SHALL 从 `user_settings` 表的 `hero_images` 配置中移除该文件 ID
2. WHEN 删除媒体文件时，THE System SHALL 从所有集合的 `coverImages` 数组中移除该文件 ID
3. WHEN 删除存储源时，THE System SHALL 执行完整的级联清理流程
4. THE Cascade_Cleanup SHALL 删除该存储源下的所有文件记录
5. THE Cascade_Cleanup SHALL 删除关联的 `photo_metadata` 和 `video_metadata` 记录
6. THE Cascade_Cleanup SHALL 删除 `collection_media` 中的关联记录
7. THE Cascade_Cleanup SHALL 从 Hero 照片设置中移除相关文件 ID
8. THE Cascade_Cleanup SHALL 从集合封面中移除相关文件 ID
9. THE Cascade_Cleanup SHALL 在事务中执行所有删除操作
10. IF 级联清理失败，THEN THE System SHALL 回滚所有更改并显示错误信息

## Parser and Serializer Requirements

本项目不涉及自定义解析器或序列化器的实现。文件上传使用标准的 multipart/form-data 解析，元数据提取使用现有的 Sharp、Exifr 和 FFmpeg 库。

## Round-Trip Properties

对于上传功能，应确保以下往返属性：

1. 上传文件 → 保存到存储 → 通过 API 读取 → 返回的文件内容与原始文件一致（文件哈希验证）
2. 设置 Hero 照片 → 保存到数据库 → 前台读取 → 显示的照片 ID 列表与设置的一致
3. 批量删除文件 → 级联清理 → 查询关联数据 → 不存在已删除文件的任何引用

## Invariants

1. 已发布的媒体文件必须属于未被禁用的存储源
2. Hero 照片列表中的所有文件 ID 必须对应已发布且存在的媒体文件
3. 集合封面中的所有文件 ID 必须对应存在的媒体文件
4. 批量操作只能作用于当前用户有权限访问的存储源下的文件
5. 实况照片的 `liveType` 为 `paired` 时，`pairedPath` 字段必须非空
6. 删除操作必须在事务中完成，确保要么全部成功要么全部回滚

## Idempotence Properties

1. 多次调用 `setHeroPhotos(fileIds, true)` 应产生相同的结果
2. 多次删除同一文件应安全失败（第二次返回"文件不存在"）
3. 多次扫描同一存储源应产生一致的文件列表（增量模式下）

## Metamorphic Properties

1. 批量删除 N 个文件后，媒体库总数应减少 N
2. 上传 M 个文件后，媒体库总数应增加 M（假设无重复）
3. 筛选后的结果数量应小于或等于总媒体数量
4. 集合中的媒体数量应等于 `collection_media` 表中该集合的记录数

## Error Conditions

1. WHEN 上传文件到不存在的存储源时，THE System SHALL 返回 "存储源不存在" 错误
2. WHEN 非管理员用户尝试批量删除时，THE System SHALL 返回 "权限不足" 错误
3. WHEN 上传文件超过大小限制时，THE System SHALL 返回 "文件过大" 错误
4. WHEN 网络中断导致上传失败时，THE System SHALL 标记文件状态为 `error` 并允许重试
5. WHEN 删除正在被其他操作使用的文件时，THE System SHALL 等待操作完成或返回 "文件正在使用" 错误
6. WHEN 生成 ZIP 压缩包时磁盘空间不足，THE System SHALL 返回 "磁盘空间不足" 错误
7. WHEN 实况照片的视频部分缺失时，THE System SHALL 降级为仅显示静态图片
