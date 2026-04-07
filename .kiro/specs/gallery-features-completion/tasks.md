# Implementation Plan: Gallery Features Completion

## Overview

本实施计划将 Gallery Features Completion 项目的功能完善工作分解为可执行的具体任务。项目采用 TypeScript + Next.js 16 + React 19 技术栈，使用 Postgres + Drizzle ORM 作为数据层，支持多存储源（本地/NAS/S3），并提供中英文双语国际化支持。

实施计划分为 7 个阶段，按照依赖关系和优先级组织，预计总工期 4-6 周。

## Tasks

- [x] 1. Phase 1: 数据连接与基础功能
  - [x] 1.1 Hero 照片真实数据连接
    - 修改 `app/[locale]/(front)/page.tsx`，调用 `fetchHeroPhotosForHome()` 获取真实 Hero 照片数据
    - 将获取的照片数据通过 props 传递给 `FrontHome` 组件
    - 修改 `app/ui/front/front-home.tsx`，接收并使用真实照片数据
    - 实现照片 URL 转换逻辑（使用 `/api/media/thumb/[id]` 生成缩略图 URL）
    - 实现降级方案：当 `fetchHeroPhotosForHome()` 返回空数组时，使用预设的 `HERO_IMAGES` 作为默认图片
    - 保持现有的轮播逻辑（自动切换、手动切换、响应式适配）
    - 保持现有的色调检测逻辑（根据图片亮度调整文字颜色）
    - 测试 Hero 照片轮播功能和色调检测在不同场景下的表现
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 1.2 编写 Hero 照片功能的属性测试
    - **Property 1: Hero 照片数据获取正确性**
    - **Property 2: Hero 照片降级方案**
    - **Property 3: 轮播状态一致性**
    - **Property 4: 色调检测幂等性**
    - **Property 5: 数据更新后的缓存失效**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

  - [x] 1.3 精选集合真实数据连接
    - 修改 `app/[locale]/(front)/page.tsx`，调用 `fetchCollections({ status: 'published', limit: 3, orderBy: 'updatedAtDesc' })` 获取精选集合
    - 将获取的集合数据通过 props 传递给 `FrontHome` 组件
    - 修改 `app/ui/front/front-home.tsx`，渲染真实集合数据
    - 实现集合封面显示逻辑（使用 `covers` 数组，如果为空则使用默认封面）
    - 保持现有的 `SpotlightCard` 视觉效果和渐变背景
    - 测试集合卡片点击导航功能（导航到 `/collections/[id]`）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 1.4 编写精选集合功能的属性测试
    - **Property 6: 精选集合筛选正确性**
    - **Property 7: 精选集合数量限制**
    - **Property 8: 集合信息完整性**
    - **Property 9: 集合默认封面生成**
    - **Property 10: 集合导航正确性**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

- [x] 2. Checkpoint - 验证数据连接功能
  - 确保前台首页能正确显示真实的 Hero 照片和精选集合
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 3. Phase 2: 上传功能实现
  - [x] 3.1 创建上传 API 端点
    - 创建 `app/api/upload/route.ts` 文件
    - 实现 POST 方法，验证用户权限（使用 `requireAdminUser()`）
    - 实现 multipart/form-data 解析（从 FormData 中提取 `storageId` 和 `files`）
    - 验证存储源 ID 的有效性（存储源存在且未被禁用）
    - 实现文件验证逻辑（文件类型、文件大小限制）
    - 根据存储源类型（local/nas/s3）保存文件到对应位置
    - 在 `files` 表中创建文件记录
    - 实现错误处理和详细的错误信息返回
    - 返回上传结果（成功的文件列表和失败的文件列表）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8_

  - [x] 3.2 创建元数据提取模块
    - 创建 `app/lib/metadata-extractor.ts` 文件
    - 实现 `extractPhotoMetadata()` 函数：使用 Sharp 生成缩略图、生成 BlurHash、使用 Exifr 提取 EXIF 信息
    - 实现 `extractVideoMetadata()` 函数：使用 FFmpeg 提取视频信息、生成视频缩略图（poster frame）、生成 BlurHash
    - 实现异步元数据提取逻辑（不阻塞上传响应）
    - 更新 `photo_metadata` 和 `video_metadata` 表
    - 添加错误处理和日志记录
    - _Requirements: 3.6_

  - [x] 3.3 修改上传中心组件
    - 修改 `app/ui/admin/upload-center.tsx` 文件
    - 移除 FileReader 模拟上传逻辑
    - 实现真实上传逻辑：创建 FormData，添加 `storageId` 和文件
    - 使用 XMLHttpRequest 或 fetch 上传文件到 `/api/upload`
    - 实现上传进度监听（使用 XMLHttpRequest 的 `upload.onprogress` 事件）
    - 更新 UI 状态（进度条、上传状态、错误信息）
    - 实现并发上传控制（限制同时上传的文件数量）
    - 添加上传失败后的重试机制
    - 上传完成后重新验证媒体库页面
    - _Requirements: 3.7, 3.9, 3.10_

  - [ ]* 3.4 编写上传功能的单元测试
    - 测试非管理员用户上传被拒绝
    - 测试文件大小超限被拒绝
    - 测试不支持的文件类型被拒绝
    - 测试存储源不存在或被禁用时上传失败
    - 测试成功上传后数据库记录创建
    - _Requirements: 3.2, 3.3, 3.5_

  - [ ]* 3.5 编写上传功能的属性测试
    - **Property 11: 上传权限验证**
    - **Property 12: 存储源有效性验证**
    - **Property 13: 文件保存位置正确性**
    - **Property 14: 上传后数据库记录创建**
    - **Property 15: 元数据提取完整性**
    - **Property 16: 上传进度单调递增**
    - **Property 17: 并发上传独立性**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.10**

- [x] 4. Checkpoint - 验证上传功能
  - 确保管理员可以成功上传文件到各种存储源
  - 确保元数据自动提取和缩略图生成正常工作
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 5. Phase 3: 批量操作功能
  - [x] 5.1 实现批量删除 Server Action
    - 在 `app/lib/actions.ts` 中添加 `deleteMediaFiles(fileIds: number[])` 函数
    - 验证用户权限（使用 `requireAdminUser()`）
    - 验证文件所有权（确保文件属于用户的存储源）
    - 开启数据库事务
    - 删除 `collection_media` 表中的关联记录
    - 删除 `photo_metadata` 和 `video_metadata` 表中的元数据记录
    - 删除 `files` 表中的文件记录
    - 调用 `cleanHeroReferences()` 清理 Hero 照片引用
    - 调用 `cleanCollectionCoverReferences()` 清理集合封面引用
    - 提交事务
    - 删除物理文件（在事务外执行，避免阻塞）
    - 重新验证相关页面（`/dashboard/media`、`/gallery`、`/`）
    - 返回删除结果和消息
    - _Requirements: 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [x] 5.2 实现 Hero 引用清理函数
    - 在 `app/lib/actions.ts` 中添加 `cleanHeroReferences(tx, deletedFileIds, userId)` 函数
    - 读取用户的 `hero_images` 设置（从 `user_settings` 表）
    - 过滤掉已删除的文件 ID
    - 如果没有剩余的 Hero 照片，删除设置记录
    - 如果有剩余的 Hero 照片，更新设置记录
    - _Requirements: 4.9, 8.1_

  - [x] 5.3 实现集合封面引用清理函数
    - 在 `app/lib/actions.ts` 中添加 `cleanCollectionCoverReferences(tx, deletedFileIds)` 函数
    - 查询所有包含已删除文件作为封面的集合
    - 对每个受影响的集合，过滤掉已删除的文件 ID
    - 更新集合的 `coverImages` 字段
    - _Requirements: 4.10, 8.2_

  - [x] 5.4 创建批量下载 API 端点
    - 创建 `app/api/download/route.ts` 文件
    - 实现 POST 方法，验证用户权限
    - 解析请求中的文件 ID 列表
    - 查询文件信息（路径、名称、存储源）
    - 如果只有一个文件，直接返回文件流（设置 Content-Disposition: attachment）
    - 如果有多个文件，调用 ZIP 生成模块创建压缩包
    - 返回 ZIP 文件流
    - 记录临时文件路径用于后续清理
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.8_

  - [x] 5.5 创建 ZIP 生成模块
    - 创建 `app/lib/zip-generator.ts` 文件
    - 实现 `createZipFromFiles(files, outputPath)` 函数：使用 archiver 创建 ZIP，添加所有文件，返回 ZIP 路径
    - 实现 `cleanupTempFiles(olderThan)` 函数：清理超过指定时间的临时 ZIP 文件
    - 使用流式 ZIP 生成，避免内存溢出
    - 实现合理的文件命名（保留原始文件名或使用标题）
    - _Requirements: 5.5, 5.6, 5.7, 5.9_

  - [x] 5.6 修改媒体库组件添加批量操作 UI
    - 修改 `app/ui/admin/media/media-library.tsx` 文件
    - 添加批量选择状态：`const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())`
    - 为每个媒体项添加复选框
    - 添加批量操作工具栏（当 `selectedIds.size > 0` 时显示）
    - 在工具栏中添加"删除"和"下载"按钮，显示选中数量
    - 实现批量删除逻辑：显示确认对话框，确认后调用 `deleteMediaFiles()`
    - 实现批量下载逻辑：调用 `/api/download` API，处理响应并触发浏览器下载
    - 添加加载状态和错误处理
    - 操作完成后清空选中状态
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.8, 5.10_

  - [ ]* 5.7 编写批量操作的单元测试
    - 测试批量删除的级联删除逻辑
    - 测试事务回滚机制
    - 测试 Hero 引用清理
    - 测试集合封面引用清理
    - 测试 ZIP 内容完整性
    - _Requirements: 4.7, 4.12, 8.1, 8.2, 5.6_

  - [ ]* 5.8 编写批量操作的属性测试
    - **Property 18: 批量选择状态一致性**
    - **Property 19: 删除确认对话框数量显示**
    - **Property 20: 删除权限验证**
    - **Property 21: 级联删除完整性**
    - **Property 22: 物理文件删除一致性**
    - **Property 23: Hero 引用清理正确性**
    - **Property 24: 集合封面引用清理正确性**
    - **Property 25: ZIP 内容完整性**
    - **Property 26: ZIP 文件命名合理性**
    - **Property 27: 临时文件清理及时性**
    - **Validates: Requirements 4.2, 4.4, 4.6, 4.7, 4.8, 4.9, 4.10, 5.6, 5.7, 5.9**

- [x] 6. Checkpoint - 验证批量操作功能
  - 确保批量删除功能正常工作且数据一致性得到保证
  - 确保批量下载功能正常工作
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 7. Phase 4: UI/UX 优化
  - [x] 7.1 创建媒体详情模态框组件
    - 创建 `app/ui/front/media-detail-modal.tsx` 文件
    - 使用 Shadcn UI 的 Dialog 组件作为基础
    - 实现大尺寸预览图显示（最大化利用视口空间，使用 `max-w-7xl h-[90vh]`）
    - 根据媒体类型显示图片或视频（视频提供播放控件）
    - 添加关闭按钮
    - 实现键盘事件处理：ESC 关闭、左右箭头切换上一张/下一张
    - 添加导航按钮（上一张/下一张）
    - 在 Dark Mode 下使用深色半透明背景
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7_

  - [x] 7.2 创建 EXIF 信息面板组件
    - 在 `app/ui/front/media-detail-modal.tsx` 中创建 `ExifInfoPanel` 组件
    - 显示基础信息：标题、拍摄时间、文件大小、分辨率
    - 显示相机参数：相机、镜头、光圈、快门、ISO、焦距
    - 显示 GPS 位置信息：地点、坐标、"在地图中查看"按钮
    - 使用分组布局（Section）组织信息
    - 实现信息格式化函数（日期、文件大小、快门速度等）
    - _Requirements: 7.3_

  - [x] 7.3 优化后台媒体筛选器
    - 修改 `app/ui/admin/media/media-filter-bar.tsx` 文件
    - 将筛选器分为基础筛选和高级筛选两个区域
    - 基础筛选包含：存储源、媒体类型、发布状态、关键词搜索
    - 高级筛选包含：日期范围、文件大小、分辨率、相机参数（光圈、ISO）、方向、设备、GPS
    - 实现高级筛选的折叠/展开功能（使用 `showAdvanced` 状态）
    - 计算并显示激活的筛选条件数量
    - 添加"清除所有筛选"按钮
    - 使用 Shadcn UI 的 Select、Input、Label 组件
    - _Requirements: 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_

  - [x] 7.4 创建前台画廊筛选组件
    - 创建 `app/ui/front/gallery-filter.tsx` 文件
    - 实现媒体类型筛选（使用 Tabs 组件：全部/照片/视频）
    - 实现排序选项（使用 Select 组件：最新优先/最旧优先）
    - 使用简洁的布局（筛选和排序在同一行）
    - _Requirements: 7.14, 7.15, 7.16_

  - [x] 7.5 集成前台画廊筛选功能
    - 修改 `app/[locale]/(front)/gallery/page.tsx` 文件
    - 添加筛选状态：`mediaType` 和 `sortOrder`
    - 集成 `GalleryFilter` 组件
    - 实现筛选条件变化时的数据重新加载逻辑
    - 确保筛选后保持无限滚动功能
    - 将筛选参数传递给 `GalleryInfinite` 组件
    - _Requirements: 7.17_

  - [ ]* 7.6 编写 UI/UX 优化的单元测试
    - 测试详情模态框的键盘导航
    - 测试 EXIF 信息显示完整性
    - 测试筛选条件计数正确性
    - 测试画廊筛选后数据重新加载
    - _Requirements: 7.5, 7.3, 7.12, 7.17_

  - [ ]* 7.7 编写 UI/UX 优化的属性测试
    - **Property 33: 详情模态框 EXIF 信息完整性**
    - **Property 34: 详情模态框键盘导航**
    - **Property 35: 筛选条件计数正确性**
    - **Property 36: 画廊筛选后数据重新加载**
    - **Validates: Requirements 7.3, 7.5, 7.12, 7.17**

- [x] 8. Checkpoint - 验证 UI/UX 优化
  - 确保媒体详情模态框正常工作
  - 确保筛选器功能完善且易用
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 9. Phase 5: 实况照片支持
  - [x] 9.1 创建或修改媒体卡片组件
    - 创建或修改 `app/ui/front/media-card.tsx` 文件
    - 检测实况照片：`isLivePhoto = item.liveType && item.liveType !== 'none'`
    - 显示实况照片图标（在缩略图右上角）
    - 添加视频层（绝对定位，覆盖在图片上）
    - 实现 Hover-to-Play 功能：鼠标悬停时播放视频，移开时停止并重置
    - 配置视频属性：`loop`、`muted`、`playsInline`、`preload="auto"`
    - 实现播放状态控制（使用 `isPlaying` 状态和 `videoRef`）
    - 根据播放状态切换视频层的透明度
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.2 实现移动端适配
    - 在 `app/ui/front/media-card.tsx` 中检测触摸设备：`const isTouchDevice = 'ontouchstart' in window`
    - 在移动端使用点击切换播放（而不是 Hover）
    - 实现点击事件处理：切换 `isPlaying` 状态，控制视频播放/暂停
    - 测试移动端交互体验
    - _Requirements: 6.8_

  - [x] 9.3 实现实况照片降级方案
    - 添加视频加载失败的错误处理
    - 当视频加载失败时，仅显示静态图片
    - 隐藏实况照片图标（如果视频不可用）
    - _Requirements: 6.7_

  - [x] 9.4 在详情模态框中集成实况照片播放
    - 修改 `app/ui/front/media-detail-modal.tsx` 文件
    - 检测实况照片类型
    - 提供播放控制按钮（播放/暂停）
    - 显示实况照片标识
    - _Requirements: 6.9_

  - [ ]* 9.5 编写实况照片功能的单元测试
    - 测试实况照片图标显示条件
    - 测试 Hover 播放行为
    - 测试视频循环播放和静音
    - 测试移动端点击交互
    - _Requirements: 6.1, 6.3, 6.4, 6.8_

  - [ ]* 9.6 编写实况照片功能的属性测试
    - **Property 28: 实况照片图标显示条件**
    - **Property 29: 实况照片 Hover 播放行为**
    - **Property 30: 实况照片视频循环播放**
    - **Property 31: 实况照片视频预加载**
    - **Property 32: 移动端交互方式适配**
    - **Validates: Requirements 6.1, 6.3, 6.4, 6.5, 6.6, 6.8**

- [x] 10. Checkpoint - 验证实况照片功能
  - 确保实况照片在桌面端和移动端都能正常播放
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 11. Phase 6: 数据一致性修复
  - [x] 11.1 完善存储源级联删除函数
    - 修改 `app/lib/actions.ts` 中的 `deleteUserStorage(storageId)` 函数
    - 验证用户权限和存储源所有权
    - 开启数据库事务
    - 获取该存储源下的所有文件 ID
    - 删除 `collection_media` 表中的关联记录
    - 删除 `photo_metadata` 和 `video_metadata` 表中的元数据记录
    - 调用 `cleanHeroReferences()` 清理 Hero 照片引用
    - 调用 `cleanCollectionCoverReferences()` 清理集合封面引用
    - 删除 `files` 表中的文件记录
    - 删除 `user_storages` 表中的存储源记录
    - 提交事务
    - 重新验证相关页面
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [ ]* 11.2 编写数据一致性的单元测试
    - 测试存储源级联删除的完整性
    - 测试事务回滚机制
    - 测试 Hero 引用清理
    - 测试集合封面引用清理
    - _Requirements: 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [ ]* 11.3 编写数据一致性的属性测试
    - **Property 37: 存储源级联删除完整性**
    - **Property 38: 删除操作事务完整性**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9**

- [x] 12. Checkpoint - 验证数据一致性
  - 确保删除操作能正确清理所有关联数据
  - 确保所有测试通过，如有问题请向用户反馈

- [x] 13. Phase 7: 测试和优化
  - [x] 13.1 添加数据库索引优化
    - 为 `files` 表添加索引：`is_published`、`user_storage_id + is_published`、`mtime DESC`
    - 为 `photo_metadata` 表添加索引：`date_shot DESC`
    - 为 `collection_media` 表添加索引：`collection_id + sort_order`
    - 执行数据库迁移
    - _Performance Optimization_

  - [x] 13.2 实现查询结果缓存
    - 使用 Next.js 的 `unstable_cache` 为 `fetchHeroPhotosForHome()` 添加缓存（5 分钟）
    - 为其他频繁查询的函数添加缓存
    - 配置缓存标签以便精确失效
    - _Performance Optimization_

  - [x] 13.3 优化图片加载策略
    - 确保所有图片使用 BlurHash 占位符
    - 确保图片使用 `loading="lazy"` 懒加载
    - 实现渐进式加载（先加载缩略图，再加载原图）
    - _Performance Optimization_

  - [x] 13.4 优化无限滚动性能
    - 调整每页加载数量（24 个项目）
    - 确保分页加载逻辑正确
    - 测试滚动性能（目标 > 60 FPS）
    - _Performance Optimization_

  - [x] 13.5 添加国际化文案
    - 在 `messages/zh-CN.json` 中添加所有新增功能的中文文案
    - 在 `messages/en.json` 中添加所有新增功能的英文文案
    - 确保所有用户可见的文本都使用 `useTranslations()` 或 `getTranslations()`
    - _Internationalization_

  - [x] 13.6 运行完整的测试套件
    - 运行所有单元测试：`pnpm test:unit`
    - 运行所有属性测试：`pnpm test:property`
    - 运行集成测试（如果有）
    - 生成测试覆盖率报告：`pnpm test:coverage`
    - 确保测试覆盖率 > 80%
    - _Testing_

  - [x] 13.7 性能测试和优化
    - 测试首页加载时间（目标 < 2 秒 LCP）
    - 测试画廊滚动帧率（目标 > 60 FPS）
    - 测试上传响应时间（目标 < 100ms 开始上传）
    - 测试缩略图加载时间（目标 < 500ms）
    - 测试批量操作响应时间（目标 < 3 秒处理 100 个文件）
    - 根据测试结果进行针对性优化
    - _Performance Testing_

  - [x] 13.8 安全审查
    - 确保所有上传和删除操作都有权限验证
    - 确保所有用户输入都经过验证和清理
    - 确保文件路径验证防止路径遍历攻击
    - 确保敏感信息不在日志中泄露
    - 确保临时文件被及时清理
    - _Security Review_

  - [x] 13.9 用户体验测试
    - 测试 Light Mode 和 Dark Mode 下的视觉效果
    - 测试响应式布局（桌面、平板、手机）
    - 测试键盘导航和无障碍功能
    - 测试错误提示的友好性
    - 测试加载状态的可见性
    - _UX Testing_

- [x] 14. Final Checkpoint - 完整功能验证
  - 验证所有 8 个主要功能模块都已完成且正常工作
  - 验证所有测试通过且覆盖率达标
  - 验证性能指标达到目标
  - 验证安全性和用户体验
  - 准备生产部署，如有问题请向用户反馈

## Notes

- 任务标记 `*` 的为可选测试任务，可根据项目进度和资源情况决定是否执行
- 每个 Checkpoint 任务用于验证阶段性成果，确保质量
- 所有任务都引用了对应的需求编号，便于追溯
- 属性测试任务明确标注了对应的设计文档属性编号
- 建议按照任务顺序执行，因为存在依赖关系
- 预计总工期 4-6 周，可根据实际情况调整
