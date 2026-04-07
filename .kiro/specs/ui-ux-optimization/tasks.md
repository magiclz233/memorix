# UI/UX 全面优化 - 实施任务列表

## 概述

本任务列表将 UI/UX 全面优化设计转化为可执行的编码任务。任务按照依赖关系和优先级排序，分为 6 个阶段实施。

**技术栈**：Next.js 16 + React 19 + TypeScript + Shadcn UI + Framer Motion  
**国际化**：中英文双语支持（zh-CN / en）  
**设计风格**：Lumina Pro（Light/Dark 双模态）

---

## 阶段 1：基础设施与通用组件（核心优化）

### 1. Toast 通知系统

- [x] 1.1 集成 Sonner Toast 库并配置全局 Toaster
  - 在 `app/[locale]/layout.tsx` 中添加 `<Toaster />` 组件
  - 配置 Toast 样式以匹配 Lumina Pro 设计风格（zinc 色系 + indigo 主色）
  - 支持 Light/Dark 双模态
  - 配置位置为 `top-right`，圆角 `rounded-xl`
  - _需求: FR-4.1_

- [x] 1.2 创建 Toast 工具函数封装
  - 在 `app/lib/toast-utils.ts` 中封装常用 Toast 方法
  - 实现 `showSuccess()`, `showError()`, `showWarning()`, `showInfo()` 方法
  - 支持自定义持续时间和操作按钮
  - 添加国际化支持（使用 `useTranslations`）
  - _需求: FR-4.1_

- [ ]* 1.3 编写 Toast 工具函数单元测试
  - 测试各种 Toast 类型的显示
  - 测试自定义配置参数
  - 测试国际化文案
  - _需求: FR-4.1_

### 2. 错误处理基础设施

- [x] 2.1 创建全局错误边界组件
  - 在 `app/ui/components/error-boundary.tsx` 创建 `GlobalErrorBoundary` 类组件
  - 实现友好的错误页面 UI（显示错误信息和重新加载按钮）
  - 支持 Light/Dark 双模态样式
  - 在 `app/[locale]/layout.tsx` 中包裹根组件
  - _需求: FR-4.2_

- [x] 2.2 创建局部错误边界组件
  - 在 `app/ui/components/error-boundary.tsx` 创建 `ErrorBoundary` 组件
  - 支持自定义 fallback UI
  - 支持错误回调函数
  - _需求: FR-4.2_

- [x] 2.3 实现统一的 API 请求封装
  - 在 `app/lib/api-client.ts` 创建 `ApiClient` 类
  - 实现自动重试机制（最多 3 次，指数退避）
  - 实现统一的 HTTP 错误处理（401/403/404/500）
  - 集成 Toast 通知显示错误信息
  - _需求: FR-4.3_


- [ ]* 2.4 编写 API 客户端单元测试
  - 测试重试机制
  - 测试各种 HTTP 错误处理
  - 测试超时处理
  - _需求: FR-4.3_

### 3. 加载状态组件

- [x] 3.1 集成全局加载进度条
  - 安装 `next-nprogress-bar` 库
  - 在 `app/[locale]/layout.tsx` 中添加 `<ProgressBar />` 组件
  - 配置颜色为 indigo (`#6366f1`)，高度 2px
  - 禁用 spinner，启用浅层路由
  - _需求: FR-5.1_

- [x] 3.2 创建 Spinner 加载组件
  - 在 `app/ui/components/spinner.tsx` 创建 `Spinner` 组件
  - 支持 3 种尺寸：sm (16px) / md (24px) / lg (32px)
  - 使用 Lucide 的 `Loader2` 图标 + `animate-spin`
  - 支持自定义颜色和 className
  - _需求: FR-5.1_

- [x] 3.3 创建骨架屏组件
  - 在 `app/ui/components/skeletons.tsx` 创建 `GallerySkeleton` 组件
  - 创建 `MediaLibrarySkeleton` 组件（网格布局，24 个占位符）
  - 创建 `UploadQueueSkeleton` 组件
  - 使用 Shadcn UI 的 `Skeleton` 组件，添加脉冲动画
  - 支持 Light/Dark 双模态
  - _需求: FR-5.2_

### 4. 通用工具 Hooks

- [x] 4.1 创建防抖和节流 Hooks
  - 在 `app/ui/hooks/use-debounce.ts` 创建 `useDebounce` hook
  - 在 `app/ui/hooks/use-throttle.ts` 创建 `useThrottle` hook
  - 支持可配置的延迟时间
  - 添加 TypeScript 类型定义
  - _需求: FR-1.2, FR-2.3_

- [x] 4.2 创建焦点管理 Hooks
  - 在 `app/ui/hooks/use-focus-trap.ts` 创建 `useFocusTrap` hook
  - 实现焦点陷阱逻辑（模态框内循环 Tab）
  - 在 `app/ui/hooks/use-keyboard.ts` 创建 `useKeyboard` hook（快捷键监听）
  - _需求: FR-7.1_


- [ ]* 4.3 编写 Hooks 单元测试
  - 测试 useDebounce 防抖效果
  - 测试 useThrottle 节流效果
  - 测试 useFocusTrap 焦点循环
  - 测试 useKeyboard 快捷键监听
  - _需求: FR-1.2, FR-7.1_

### 5. 国际化文案准备

- [x] 5.1 添加 UI/UX 优化相关的国际化文案
  - 在 `messages/zh-CN.json` 添加所有新增文案的中文翻译
  - 在 `messages/en.json` 添加所有新增文案的英文翻译
  - 包含：Toast 提示、错误信息、加载状态、筛选标签、上传中心文案等
  - 保持 key 结构一致，使用嵌套对象组织
  - _需求: 所有功能需求_

- [ ] 6. Checkpoint - 基础设施验证
  - 确保所有基础组件和工具函数正常工作
  - 验证 Toast 通知在各种场景下正常显示
  - 验证错误边界能正确捕获和显示错误
  - 验证加载状态组件在 Light/Dark 模式下样式正确
  - 询问用户是否有问题或需要调整

---

## 阶段 2：媒体库筛选重设计

### 7. 筛选组件基础结构

- [x] 7.1 创建搜索框组件
  - 在 `app/ui/admin/media/media-search-bar.tsx` 创建 `MediaSearchBar` 组件
  - 使用 Shadcn UI 的 `Input` 组件，添加搜索图标
  - 实现防抖搜索（300ms）
  - 支持清除按钮
  - 样式：圆角 `rounded-full`，玻璃拟态背景
  - _需求: FR-1.1, FR-1.2_

- [x] 7.2 创建存储类型快速筛选组件
  - 在 `app/ui/admin/media/storage-type-filter.tsx` 创建 `StorageTypeFilter` 组件
  - 使用 Chip/Badge 风格展示 4 个选项（All / Local / NAS / S3）
  - 显示每个类型的文件数量
  - 激活状态使用 `bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`
  - 添加图标（Database / HardDrive / Server / Cloud）
  - _需求: FR-1.1_

- [x] 7.3 创建高级筛选面板组件
  - 在 `app/ui/admin/media/advanced-filter-panel.tsx` 创建 `AdvancedFilterPanel` 组件
  - 使用 Shadcn UI 的 `Collapsible` 组件实现折叠展开
  - 包含：存储实例选择、发布状态、媒体类型、日期范围、Hero 标记筛选
  - 展开/收起动画：300ms ease-in-out
  - 显示当前激活的筛选条件数量
  - _需求: FR-1.1_


- [x] 7.4 创建筛选状态 Chips 组件
  - 在 `app/ui/admin/media/filter-chips.tsx` 创建 `FilterChips` 组件
  - 使用 Shadcn UI 的 `Badge` 组件展示激活的筛选条件
  - 每个 Chip 带 X 按钮，支持单独移除
  - 添加"清除全部"按钮
  - 颜色：`bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10`
  - _需求: FR-1.1_

### 8. 筛选逻辑与状态管理

- [x] 8.1 实现筛选状态管理
  - 在 `app/ui/admin/media/use-media-filters.ts` 创建 `useMediaFilters` hook
  - 管理所有筛选条件的状态（category, storageId, published, mediaType, dateRange, isHero）
  - 实现筛选条件的添加、移除、清除逻辑
  - 同步筛选条件到 URL 参数（使用 `useSearchParams` 和 `useRouter`）
  - _需求: FR-1.2_

- [x] 8.2 实现筛选 API 集成
  - 修改 `app/api/media/route.ts` 或创建 `app/api/media/search/route.ts`
  - 支持多维度筛选参数（category, storageId, published, mediaType, dateFrom, dateTo, isHero, q）
  - 返回筛选结果和总数
  - 添加分页支持
  - _需求: FR-1.1, FR-1.2_

- [x] 8.3 集成筛选组件到媒体库页面
  - 修改 `app/ui/admin/media/media-library.tsx`
  - 替换现有筛选栏为新的三层筛选结构
  - 集成 `MediaSearchBar`, `StorageTypeFilter`, `AdvancedFilterPanel`, `FilterChips`
  - 实现筛选变化时的骨架屏加载状态
  - 显示筛选结果数量
  - _需求: FR-1.1, FR-1.2_

- [ ]* 8.4 编写筛选逻辑单元测试
  - 测试 useMediaFilters hook 的各种筛选操作
  - 测试 URL 参数同步
  - 测试筛选条件的添加、移除、清除
  - _需求: FR-1.2_

### 9. 筛选性能优化

- [x] 9.1 实现虚拟滚动优化
  - 在媒体库网格中集成 `@tanstack/react-virtual`
  - 只渲染可见区域的媒体项
  - 支持动态高度（Masonry 布局）
  - 设置 overscan 为 5 项
  - _需求: FR-1.2, NFR-4.1_


- [x] 9.2 优化图片懒加载
  - 确保使用 Next.js `Image` 组件
  - 配置 BlurHash 占位符
  - 设置 `loading="lazy"` 和合适的 `sizes` 属性
  - 优先加载可见区域的图片
  - _需求: FR-1.2, NFR-4.1_

- [ ] 10. Checkpoint - 媒体库筛选验证
  - 测试所有筛选维度的组合
  - 验证 URL 参数同步和分享功能
  - 验证筛选性能（响应时间 < 300ms）
  - 验证移动端筛选体验
  - 询问用户是否有问题或需要调整

---

## 阶段 3：上传中心重构（任务机制）

### 11. 任务机制数据结构

- [ ] 11.1 创建任务相关数据类型定义
  - 在 `app/lib/definitions.ts` 添加任务机制相关类型
  - 定义 `TaskStatus` 类型（uploading / queued / completed / paused / failed）
  - 定义 `FileStatus` 类型（uploading / waiting / done / paused / error）
  - 定义 `UploadPhase` 类型（hashing / uploading / completing）
  - 定义 `UploadTask` 类型（包含 id, name, storageId, category, status, files, createdAt, startedAt, completedAt, config, metadata）
  - 定义 `UploadFile` 类型（包含 id, taskId, file, status, progress, speed, error, uploadedSize, totalSize, startTime, endTime, phase）
  - 定义 `TaskConfig` 类型（包含 concurrency, duplicateHandling, postProcessing）
  - 定义 `TaskMetadata` 类型（包含 totalFiles, totalSize, uploadedFiles, uploadedSize, failedFiles, progress, speed, remainingTime）
  - _需求: FR-2.1_

### 12. 统计卡片组件

- [ ] 12.1 创建统计卡片组件
  - 在 `app/ui/admin/upload/upload-stats-cards.tsx` 创建 `UploadStatsCards` 组件
  - 显示 4 个统计卡片：正在上传任务数、等待中任务数、当前传输速度、已完成文件数
  - 使用 Shadcn UI 的 `Card` 组件
  - 使用 `useMemo` 缓存统计计算结果
  - 数字使用 `font-mono` 字体，大号显示（text-3xl）
  - 响应式布局：桌面端 4 列，平板端 2 列，移动端 2 列
  - 支持 Light/Dark 双模态
  - _需求: FR-2.1_

### 13. 任务卡片组件

- [ ] 13.1 创建任务卡片组件
  - 在 `app/ui/admin/upload/task-card.tsx` 创建 `TaskCard` 组件
  - 显示任务名称、文件数量、总大小、整体进度条、状态标签
  - 添加任务操作按钮（暂停/恢复/查看详情）
  - 使用 Shadcn UI 的 `Card`, `Progress`, `Badge` 组件
  - 进度条高度 8px，显示百分比和剩余时间
  - 状态标签使用不同颜色（uploading: indigo, queued: zinc, completed: green, paused: amber, failed: red）
  - 卡片 hover 时添加阴影效果
  - 支持 Light/Dark 双模态
  - _需求: FR-2.1_

### 14. 任务列表组件

- [ ] 14.1 创建任务列表组件
  - 在 `app/ui/admin/upload/task-list.tsx` 创建 `TaskList` 组件
  - 显示所有任务卡片
  - 支持搜索任务（按任务名称）
  - 支持按状态筛选（全部/上传中/已完成）
  - 使用 `@tanstack/react-virtual` 实现虚拟滚动（支持大量任务）
  - 空状态显示引导性提示
  - _需求: FR-2.1_

### 15. 创建任务页面

- [ ] 15.1 创建任务表单组件
  - 在 `app/ui/admin/upload/create-task-form.tsx` 创建 `CreateTaskForm` 组件
  - 任务名称输入框（必填）
  - 目标存储选择下拉菜单（必填，使用 Shadcn UI 的 `Select`）
  - 文件分类选择下拉菜单（可选：照片/视频/文档）
  - 拖拽上传区域（集成 `DropZone` 组件）
  - 高级配置折叠面板（使用 Shadcn UI 的 `Collapsible`）
  - 表单验证（任务名称和存储必填，至少选择 1 个文件）
  - 底部操作按钮（取消/开始上传）
  - _需求: FR-2.1_

- [ ] 15.2 创建高级配置组件
  - 在 `app/ui/admin/upload/advanced-config.tsx` 创建 `AdvancedConfig` 组件
  - 并发上传数滑块（1-10，默认 3，使用 Shadcn UI 的 `Slider`）
  - 重复文件处理单选（跳过/重命名/覆盖，使用 `RadioGroup`）
  - 后处理插件复选框（AI 自动标签/视频转码/图片压缩，使用 `Checkbox`）
  - 配置项说明文本
  - _需求: FR-2.1_

- [ ] 15.3 创建拖拽上传区组件
  - 在 `app/ui/admin/upload/drop-zone.tsx` 创建 `DropZone` 组件
  - 支持拖拽文件和文件夹
  - 实现 `traverseFileTree` 递归遍历文件夹
  - 拖拽时高亮显示（边框变为 indigo，背景变为 indigo-50/10）
  - 显示文件夹图标和引导文案
  - 提供"选择文件"和"选择文件夹"按钮
  - 显示已选择文件的统计信息（文件数量和总大小）
  - 支持的文件类型：image/*, video/*
  - _需求: FR-2.1_

- [ ] 15.4 创建任务页面路由
  - 创建 `app/[locale]/dashboard/upload/create/page.tsx`
  - 集成 `CreateTaskForm` 组件
  - 实现任务创建逻辑（调用 Server Action 或 API）
  - 创建成功后跳转到上传中心主页面
  - 显示成功 Toast 提示
  - _需求: FR-2.1_

### 16. 任务详情面板

- [ ] 16.1 创建文件项组件
  - 在 `app/ui/admin/upload/file-item.tsx` 创建 `FileItem` 组件
  - 显示文件名、大小、进度条、上传速度、剩余时间
  - 显示当前阶段文本（计算哈希中/上传中/完成中）
  - 添加文件操作按钮（暂停/恢复/取消/重试）
  - 使用 Shadcn UI 的 `Card` 组件，紧凑布局
  - 进度条高度 4px
  - 错误状态显示错误信息（红色文本）
  - 完成状态显示绿色勾选图标
  - _需求: FR-2.1_

- [ ] 16.2 创建任务详情组件
  - 在 `app/ui/admin/upload/task-detail.tsx` 创建 `TaskDetail` 组件
  - 显示任务头部信息（名称、文件数、总大小、目标存储、整体进度）
  - 显示任务操作按钮（暂停全部/取消任务/重试失败）
  - 显示文件搜索框和状态筛选 Tabs（全部/上传中/失败）
  - 显示文件列表（使用 `FileItem` 组件）
  - 使用 `useMemo` 实现文件搜索和筛选
  - 底部显示"管理本组文件"按钮
  - _需求: FR-2.1_

- [ ] 16.3 创建任务详情页面路由
  - 创建 `app/[locale]/dashboard/upload/[taskId]/page.tsx`
  - 集成 `TaskDetail` 组件
  - 从 URL 参数获取 taskId
  - 加载任务数据
  - 添加返回按钮
  - _需求: FR-2.1_

### 17. 任务队列管理逻辑

- [ ] 17.1 实现任务队列管理类
  - 在 `app/lib/task-queue-manager.ts` 创建 `TaskQueueManager` 类
  - 实现任务添加方法（addTask）
  - 实现队列处理逻辑（processQueue，一次只处理一个任务）
  - 实现任务上传方法（uploadTask，调用 FileUploadQueue）
  - 实现任务暂停方法（pauseTask）
  - 实现任务恢复方法（resumeTask）
  - 实现任务取消方法（cancelTask）
  - 使用 Map 存储任务
  - _需求: FR-2.2_

- [ ] 17.2 实现文件并发上传类
  - 在 `app/lib/file-upload-queue.ts` 创建 `FileUploadQueue` 类
  - 实现并发控制逻辑（maxConcurrent，默认 3）
  - 实现文件入队方法（enqueue）
  - 实现队列处理逻辑（processQueue）
  - 实现单文件上传方法（uploadFile，包含三阶段：hashing / uploading / completing）
  - 实现哈希计算方法（calculateHash，使用 Web Worker）
  - 实现分片上传方法（uploadChunks）
  - 实现完成上传方法（completeUpload）
  - 实现等待完成方法（waitForCompletion）
  - _需求: FR-2.2_

- [ ] 17.3 创建 Web Worker 哈希计算
  - 创建 `public/workers/hash-worker.js`
  - 使用 Web Crypto API 计算 SHA-256 哈希
  - 支持进度回调
  - 分块读取文件（2MB 每块）
  - _需求: FR-2.3_

- [ ] 17.4 实现断点续传功能
  - 在 `app/lib/upload-resume.ts` 实现断点续传逻辑
  - 使用 IndexedDB 保存上传进度（idb 库）
  - 创建 upload-progress 数据库和 files 对象存储
  - 实现 `saveProgress` 方法（保存文件上传进度）
  - 实现 `resumeUpload` 方法（恢复上传）
  - 网络断开时自动暂停所有任务
  - 网络恢复时显示 Toast 提示，询问是否继续上传
  - _需求: FR-2.2_

- [ ] 17.5 实现错误重试机制
  - 在 `app/lib/upload-retry.ts` 实现重试逻辑
  - 实现 `uploadWithRetry` 方法（最多重试 3 次）
  - 指数退避策略（2^n * 1000ms）
  - 显示重试进度 Toast 提示
  - 失败后标记文件状态为 error
  - _需求: FR-2.2_

- [ ] 17.6 实现网络状态监听 Hook
  - 在 `app/ui/hooks/use-network-status.ts` 创建 `useNetworkStatus` hook
  - 监听 online 和 offline 事件
  - 网络断开时暂停所有任务并显示 Toast
  - 网络恢复时显示 Toast，提供"继续上传"操作按钮
  - _需求: FR-2.2_

### 18. 上传中心主页面集成

- [ ] 18.1 重构上传中心主页面
  - 修改 `app/ui/admin/upload-center.tsx`
  - 顶部显示"新建上传任务"按钮（跳转到创建页面）
  - 显示统计卡片区（`UploadStatsCards`）
  - 显示任务列表（`TaskList`）
  - 移除旧的单文件队列相关代码
  - 响应式布局适配
  - _需求: FR-2.1_

- [ ] 18.2 实现任务状态管理 Hook
  - 在 `app/ui/hooks/use-upload-tasks.ts` 创建 `useUploadTasks` hook
  - 管理所有任务的状态（使用 useState 或 Zustand）
  - 实现任务创建、更新、删除方法
  - 实现任务元数据计算（使用 useMemo）
  - 实现任务操作方法（暂停/恢复/取消/重试）
  - 集成 TaskQueueManager
  - _需求: FR-2.1, FR-2.2_

- [ ] 18.3 实现任务持久化存储
  - 在 `app/lib/task-storage.ts` 实现任务存储逻辑
  - 使用 IndexedDB 存储任务和文件信息（idb 库）
  - 创建 upload-center 数据库
  - 创建 tasks 和 files 对象存储
  - 实现 `saveTask`, `getTasks`, `updateTask`, `deleteTask` 方法
  - 页面加载时恢复未完成的任务
  - _需求: FR-2.2_

### 19. 上传性能优化

- [ ] 19.1 实现进度更新节流
  - 在任务和文件进度更新中使用节流（100ms）
  - 使用 `useThrottle` hook
  - 避免频繁渲染
  - _需求: FR-2.3, NFR-4.1_

- [ ] 19.2 实现任务列表虚拟滚动
  - 在 `TaskList` 组件中集成 `@tanstack/react-virtual`
  - 只渲染可见区域的任务卡片
  - 设置 estimateSize 为 120px（任务卡片高度）
  - 设置 overscan 为 3
  - _需求: NFR-4.1_

- [ ] 19.3 实现文件列表虚拟滚动
  - 在 `TaskDetail` 组件中集成 `@tanstack/react-virtual`
  - 只渲染可见区域的文件项
  - 支持大量文件（1000+）
  - _需求: NFR-4.1_

- [ ] 19.4 优化任务元数据计算
  - 使用 `useMemo` 缓存任务元数据计算结果
  - 只在任务文件状态变化时重新计算
  - 避免不必要的计算
  - _需求: NFR-4.1_

### 20. 上传中心国际化

- [ ] 20.1 添加上传中心国际化文案
  - 在 `messages/zh-CN.json` 添加上传中心相关中文文案
  - 在 `messages/en.json` 添加上传中心相关英文文案
  - 包含：任务状态、文件状态、阶段文本、操作按钮、提示信息等
  - 保持 key 结构一致（dashboard.upload.*）
  - _需求: FR-2.1, FR-2.2_

- [ ] 20.2 集成国际化到所有上传组件
  - 在所有上传相关组件中使用 `useTranslations` hook
  - 替换所有硬编码文案为国际化 key
  - 测试中英文切换
  - _需求: NFR-4.4_

### 21. 上传中心测试

- [ ]* 21.1 编写任务管理单元测试
  - 测试 TaskQueueManager 的任务添加、暂停、恢复、取消
  - 测试 FileUploadQueue 的并发控制
  - 测试断点续传逻辑
  - 测试错误重试逻辑
  - _需求: FR-2.2_

- [ ]* 21.2 编写上传流程集成测试
  - 测试完整的任务创建和上传流程
  - 测试任务级别和文件级别的操作
  - 测试网络断开和恢复
  - 测试大量文件上传（100+）
  - _需求: FR-2.2_

- [ ] 22. Checkpoint - 上传中心验证
  - 测试任务创建流程
  - 测试任务列表展示和操作
  - 测试任务详情页面和文件管理
  - 验证任务队列管理和并发控制
  - 验证断点续传功能
  - 验证错误处理和重试机制
  - 验证性能（1000 个文件无卡顿）
  - 验证国际化文案
  - 询问用户是否有问题或需要调整

---

## 阶段 4：照片详情与其他交互优化

### 23. 照片详情模态框编辑模式

- [ ] 23.1 添加编辑模式切换功能
  - 修改 `app/ui/front/photo-detail-modal.tsx`
  - 添加"编辑"/"查看"模式切换按钮（仅管理员可见）
  - 实现编辑状态管理（isEditing, hasChanges, editData）
  - 编辑模式下输入框有明显边框和背景
  - 保存按钮在有修改时始终可见
  - _需求: FR-3.1_


- [ ] 23.2 实现未保存提示功能
  - 切换照片时检测是否有未保存的修改
  - 有修改时弹出确认对话框（使用 Shadcn UI 的 `AlertDialog`）
  - 提供"保存"、"放弃"、"取消"三个选项
  - _需求: FR-3.1_

- [ ] 23.3 添加快捷键保存功能
  - 监听 Ctrl+S / Cmd+S 快捷键
  - 阻止浏览器默认保存行为
  - 触发保存操作并显示 Toast 提示
  - _需求: FR-3.1_

### 24. 照片详情导航优化

- [ ] 24.1 优化照片切换动画
  - 使用 Framer Motion 的 `AnimatePresence` 和 `motion.div`
  - 实现滑动切换效果（左右方向）
  - 配置弹簧动画（stiffness: 300, damping: 30）
  - 透明度过渡（duration: 0.2s）
  - _需求: FR-3.2_

- [ ] 24.2 优化缩略图滚动体验
  - 实现当前照片自动居中（scrollIntoView）
  - 添加拖拽滚动功能（鼠标拖拽）
  - 添加拖拽指示器（鼠标样式变化）
  - 优化滚动条样式
  - _需求: FR-3.2_

- [ ] 24.3 实现完整的键盘导航
  - 监听键盘事件（ArrowLeft, ArrowRight, Escape, Home, End）
  - 左右箭头切换照片
  - ESC 关闭模态框
  - Home 跳转到第一张
  - End 跳转到最后一张
  - _需求: FR-3.2, FR-7.1_

- [ ] 24.4 添加移动端触摸手势支持
  - 集成 `react-swipeable` 库
  - 左滑切换到下一张
  - 右滑切换到上一张
  - 下滑关闭模态框
  - 禁用滚动冲突
  - _需求: FR-3.2, FR-6.1_

### 25. 前台画廊筛选优化

- [ ] 25.1 优化前台筛选栏视觉层级
  - 修改 `app/ui/front/gallery-filter.tsx`
  - 简化筛选选项布局
  - 添加清晰的视觉分隔
  - 优化 Light/Dark 模式样式
  - _需求: FR-1.1_


- [ ] 25.2 实现移动端筛选抽屉
  - 使用 Shadcn UI 的 `Sheet` 组件
  - 移动端显示"筛选"按钮，点击打开底部抽屉
  - 抽屉高度 80vh
  - 包含所有筛选选项
  - 添加"应用"和"重置"按钮
  - _需求: FR-6.1_

- [ ] 25.3 添加筛选变化过渡动画
  - 筛选变化时使用淡入淡出动画
  - 使用骨架屏而非完整 Loading
  - 动画时长 200-300ms
  - _需求: FR-1.2_

### 26. 无限滚动优化

- [ ] 26.1 优化加载提示和错误处理
  - 修改 `app/ui/front/gallery-infinite.tsx`
  - 添加清晰的加载进度指示器（Spinner + 文本）
  - 加载失败显示错误提示和重试按钮
  - 到达底部显示"已加载全部内容"提示
  - _需求: FR-5.1_

- [ ] 26.2 添加返回顶部按钮
  - 创建 `BackToTop` 组件
  - 滚动超过一屏时显示
  - 点击平滑滚动到顶部
  - 使用 Framer Motion 实现淡入淡出动画
  - 固定在右下角
  - _需求: US-8_
### 27. 藏品管理优化

- [ ] 27.1 优化拖拽排序视觉反馈
  - 修改 `app/ui/dashboard/sortable-media-item.tsx`
  - 添加拖拽预览（半透明）
  - 添加占位符（虚线边框）
  - 拖拽时提升 z-index 和添加阴影
  - 优化拖拽手柄样式
  - _需求: FR-1.1_

- [ ] 27.2 优化媒体选择器对话框
  - 修改 `app/ui/dashboard/media-picker.tsx`
  - 响应式适配（移动端全屏，桌面端居中）
  - 添加搜索和筛选功能
  - 优化加载状态
  - 添加批量选择功能
  - _需求: FR-6.1_

- [ ] 27.3 优化空状态设计
  - 修改 `app/ui/dashboard/collection-manager.tsx`
  - 添加引导性的空状态插图
  - 添加"添加媒体"引导按钮
  - 使用 Framer Motion 添加淡入动画
  - _需求: US-4_


### 28. 存储管理改进

- [ ] 28.1 优化存储扫描进度显示
  - 修改 `app/ui/admin/storage/storage-view.tsx`
  - 添加实时进度条
  - 添加扫描日志查看功能（可折叠）
  - 显示扫描速度和预计剩余时间
  - _需求: FR-1.1_

- [ ] 28.2 优化依赖警告对话框
  - 修改 `app/ui/admin/storage/dependency-alert.tsx`
  - 优化文案，说明影响范围
  - 添加受影响的藏品列表
  - 使用友好的图标和颜色
  - _需求: US-5_

- [ ] 28.3 优化存储状态指示器
  - 修改 `app/ui/dashboard/status-indicator.tsx`
  - 清晰区分在线、扫描中、禁用状态
  - 使用颜色和图标组合
  - 添加动画效果（扫描中使用脉冲动画）
  - _需求: FR-1.1_

- [ ] 29. Checkpoint - 交互优化验证
  - 测试照片详情模态框的所有功能
  - 验证键盘导航和触摸手势
  - 测试前台筛选和无限滚动
  - 验证藏品管理的拖拽排序
  - 验证存储管理的进度显示
  - 询问用户是否有问题或需要调整

---

## 阶段 5：响应式与无障碍性完善

### 30. 响应式设计改进

- [ ] 30.1 优化移动端触摸目标尺寸
  - 检查所有可点击元素，确保至少 44x44px
  - 修改按钮、图标、链接的最小尺寸
  - 添加 `min-h-[44px] min-w-[44px]` 类
  - _需求: FR-6.1_

- [ ] 30.2 优化移动端批量操作
  - 创建底部固定操作栏（仅移动端显示）
  - 显示选中数量
  - 提供常用操作按钮（查看、下载、删除）
  - 使用图标按钮节省空间
  - _需求: FR-6.1_

- [ ] 30.3 优化移动端表格显示
  - 将媒体库列表视图在移动端转为卡片列表
  - 优化信息展示密度
  - 保持所有功能可访问
  - _需求: FR-6.1_


- [ ] 30.4 优化横屏模式布局
  - 画廊使用更多列数（6-8 列）
  - 照片详情模态框优化布局（左右分栏）
  - 后台管理侧边栏自动收起
  - _需求: FR-6.2_

### 31. 无障碍性改进

- [ ] 31.1 优化焦点样式
  - 为所有可交互元素添加清晰的焦点样式
  - 使用 `focus-visible:ring-2 focus-visible:ring-indigo-500`
  - 确保焦点样式在 Light/Dark 模式下都清晰可见
  - _需求: FR-7.1_

- [ ] 31.2 优化 Tab 键顺序
  - 检查所有页面的 Tab 键顺序
  - 确保逻辑顺序合理（从上到下，从左到右）
  - 移除不必要的 tabindex
  - _需求: FR-7.1_

- [ ] 31.3 实现模态框焦点管理
  - 模态框打开时聚焦第一个可交互元素
  - 实现焦点陷阱（Tab 循环在模态框内）
  - 模态框关闭时恢复焦点到触发元素
  - _需求: FR-7.1_

- [ ] 31.4 添加 ARIA 属性
  - 为所有按钮添加 `aria-label`（图标按钮）
  - 为加载状态添加 `aria-busy` 和 `aria-live`
  - 为模态框添加 `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`
  - 为表单字段添加 `aria-describedby` 和 `aria-invalid`
  - 为下拉菜单添加 `aria-expanded` 和 `aria-controls`
  - _需求: FR-7.2_

- [ ] 31.5 添加快捷键帮助提示
  - 创建快捷键帮助 Tooltip 组件
  - 在照片详情模态框添加快捷键提示按钮
  - 显示所有可用快捷键（← → ESC Ctrl+S）
  - _需求: FR-7.1_

- [ ] 31.6 验证颜色对比度
  - 使用工具检查所有文本颜色对比度
  - 确保主要文本对比度 ≥ 4.5:1
  - 确保大号文本对比度 ≥ 3:1
  - 调整不符合标准的颜色
  - _需求: NFR-4.3_

- [ ]* 31.7 使用屏幕阅读器测试
  - 使用 NVDA/JAWS（Windows）或 VoiceOver（Mac）测试
  - 验证所有功能可通过屏幕阅读器访问
  - 验证 ARIA 属性正确朗读
  - _需求: NFR-4.3_


### 32. 性能优化

- [ ] 32.1 实现代码分割
  - 使用 `next/dynamic` 动态导入大组件
  - 为 MediaLibrary, UploadCenter, PhotoDetailModal 添加动态导入
  - 配置 loading 组件（骨架屏）
  - 禁用 SSR（ssr: false）
  - _需求: NFR-4.1_

- [ ] 32.2 优化图片加载策略
  - 配置 Next.js Image 的 sizes 属性
  - 使用 BlurHash 占位符
  - 设置合适的 quality 参数
  - 优化缩略图尺寸
  - _需求: NFR-4.1_

- [ ] 32.3 实现进度更新节流
  - 在上传进度更新中使用节流（100ms）
  - 在滚动事件中使用节流（100ms）
  - 避免频繁渲染
  - _需求: NFR-4.1_

- [ ]* 32.4 运行 Lighthouse 性能测试
  - 测试首页、画廊、媒体库、上传中心
  - 确保 Performance 分数 ≥ 90
  - 确保 Accessibility 分数 ≥ 90
  - 确保首屏加载时间 < 2s
  - _需求: NFR-4.1, NFR-4.3_

- [ ] 33. Checkpoint - 响应式与无障碍性验证
  - 在不同设备和屏幕尺寸上测试
  - 验证触摸交互和键盘导航
  - 验证 ARIA 属性和屏幕阅读器支持
  - 验证性能指标
  - 询问用户是否有问题或需要调整

---

## 阶段 6：最终集成与测试

### 34. 全局样式与主题优化

- [ ] 34.1 统一 Light/Dark 模式样式
  - 检查所有新增组件的 Light/Dark 模式样式
  - 确保颜色、阴影、边框在两种模式下都协调
  - 使用 zinc 色系和 indigo 主色
  - 避免纯黑背景
  - _需求: 约束-5.2_

- [ ] 34.2 优化动画性能
  - 检查所有动画，确保 60fps
  - 使用 CSS transform 和 opacity（GPU 加速）
  - 避免使用 width/height 动画
  - 添加 `will-change` 提示
  - _需求: NFR-4.1_

- [ ] 34.3 统一间距和圆角
  - 检查所有组件的间距（padding, margin, gap）
  - 统一圆角尺寸（sm: 0.375rem, md: 0.5rem, lg: 0.75rem, xl: 1rem）
  - 保持视觉一致性
  - _需求: NFR-4.4_


### 35. 国际化完善

- [ ] 35.1 验证所有国际化文案
  - 检查所有新增功能的中英文文案
  - 确保文案准确、自然
  - 检查文案长度，避免 UI 溢出
  - 测试语言切换功能
  - _需求: NFR-4.4_

- [ ] 35.2 添加缺失的国际化文案
  - 检查是否有硬编码的文案
  - 将所有硬编码文案移到 messages 文件
  - 保持 key 结构一致
  - _需求: NFR-4.4_

### 36. 错误处理完善

- [ ] 36.1 替换所有 alert() 和 confirm()
  - 搜索代码中的 `alert()` 和 `confirm()` 调用
  - 替换为 Toast 通知或 AlertDialog 组件
  - 确保用户体验一致
  - _需求: FR-4.1_

- [ ] 36.2 添加网络错误处理
  - 为所有 API 调用添加错误处理
  - 使用统一的 ApiClient
  - 显示友好的错误提示
  - 提供重试选项
  - _需求: FR-4.3_

- [ ] 36.3 添加表单验证错误提示
  - 为所有表单添加验证
  - 显示清晰的错误提示
  - 使用 `aria-invalid` 和 `aria-describedby`
  - _需求: FR-7.2_

### 37. 全面测试

- [ ]* 37.1 功能测试
  - 测试所有用户故事的验收标准
  - 测试所有功能需求
  - 记录发现的问题
  - _需求: 所有功能需求_

- [ ]* 37.2 兼容性测试
  - 在 Chrome、Firefox、Safari、Edge 最新两个版本测试
  - 在 iOS 14+ 和 Android 10+ 测试
  - 测试触摸和鼠标交互
  - 测试键盘导航
  - _需求: NFR-4.2_

- [ ]* 37.3 性能测试
  - 测试筛选响应时间（< 300ms）
  - 测试上传队列渲染（1000 个文件无卡顿）
  - 测试照片切换动画（60fps）
  - 测试首屏加载时间（< 2s）
  - _需求: NFR-4.1_


- [ ]* 37.4 用户体验测试
  - 邀请用户测试新功能
  - 收集用户反馈
  - 评估用户满意度（目标 ≥ 4/5 分）
  - _需求: 验收-6.3_

### 38. Bug 修复与优化

- [ ] 38.1 修复测试中发现的 Bug
  - 根据测试结果修复所有 P0/P1 级别的 Bug
  - 优化用户反馈的问题
  - 调整不合理的交互
  - _需求: 验收-6.1_

- [ ] 38.2 代码质量检查
  - 运行 ESLint，修复所有错误
  - 运行 TypeScript 类型检查，修复所有错误
  - 代码审查，确保符合规范
  - 添加必要的代码注释
  - _需求: 验收-6.4_

- [ ] 38.3 性能优化调整
  - 根据性能测试结果优化
  - 减少不必要的渲染
  - 优化大文件和大列表的处理
  - _需求: NFR-4.1_

### 39. 文档与部署准备

- [ ] 39.1 更新项目文档
  - 更新 README.md（如有新功能说明）
  - 更新 AGENTS.md（如有新的组件或规范）
  - 编写变更日志（CHANGELOG.md）
  - _需求: NFR-4.4_

- [ ] 39.2 准备发布说明
  - 编写发布说明文档
  - 列出所有新功能和改进
  - 列出已知问题和限制
  - 提供升级指南（如需要）
  - _需求: NFR-4.4_

- [ ] 39.3 部署前检查
  - 确保所有环境变量配置正确
  - 确保数据库迁移已执行
  - 确保生产构建成功
  - 确保所有测试通过
  - _需求: 验收-6.1_

- [ ] 40. 最终 Checkpoint - 项目验收
  - 验证所有功能需求已实现
  - 验证所有非功能需求已满足
  - 验证所有验收标准已通过
  - 确认可以发布到生产环境
  - 询问用户是否满意，是否需要进一步调整

---

## 任务执行说明

### 优先级说明
- 阶段 1-2：高优先级（核心优化）
- 阶段 3-4：中优先级（功能增强）
- 阶段 5-6：中低优先级（完善与测试）

### 可选任务说明
- 标记 `*` 的任务为可选任务（主要是测试相关）
- 可根据项目时间和资源决定是否执行
- 建议至少执行关键路径的测试任务

### Checkpoint 说明
- 每个阶段结束后有 Checkpoint 任务
- 用于验证阶段成果和收集用户反馈
- 确保问题及早发现和解决

### 依赖关系
- 阶段 1 是所有后续阶段的基础，必须先完成
- 阶段 2-4 可以部分并行执行
- 阶段 5-6 依赖前面所有阶段

### 预估工作量
- 阶段 1：2-3 天
- 阶段 2：2-3 天
- 阶段 3：4-5 天（任务机制重构增加工作量）
- 阶段 4：2-3 天
- 阶段 5：1-2 天
- 阶段 6：1-2 天
- 总计：12-18 天（约 2.5-3.5 周）

---

**任务列表版本**：1.0  
**创建日期**：2026-04-07  
**最后更新**：2026-04-07





