# Memorix Project: Admin Dashboard Development Prompt (Theme-Aware)

## 1. 项目背景与目标

我们要基于现有的 Memorix 项目（Next.js 全栈画廊应用），开发全新的 后台管理系统 (Admin Dashboard)。

核心要求：

1. **视觉风格**：基于 "Lumina Pro" 设计语言，但必须支持 **Light (默认)** 和 **Dark** 两种模式。
   - **Light Mode**: 极简、清爽、高雅的杂志风格（白底、深灰文字、细腻阴影）。
   - **Dark Mode**: 保持原设计稿的“流光黑洞”科技风格（黑底、霓虹点缀）。
2. **功能目标**：重构现有的资源管理，新增图集/视频集管理、上传中心和高级存储配置。

## 2. 技术栈约束 (Context)

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + `tailwindcss-animate`
- **Theme**: `next-themes` (已在项目中，需充分利用 `dark:` 前缀)
- **UI Components**: Shadcn UI (已安装)
- **Database**: Drizzle ORM (PostgreSQL)
- **Icons**: Lucide React

## 3. 核心视觉组件开发 (Visual System - Theme Aware)

请在 `components/ui/admin` 目录下创建以下支持主题切换的组件：

### A. `SpotlightCard` (聚光灯卡片 - 适配版)

实现 Aceternity UI 风格，但需适配双色模式。

- **Light Mode**:
  - 背景: 纯白 `bg-white` 或极淡灰 `bg-zinc-50/50`。
  - 边框: 极细灰线 `border-zinc-200`。
  - 阴影: 柔和的扩散阴影 `shadow-sm hover:shadow-md`。
  - 光效: 鼠标移动时，光晕为淡灰色或淡靛青色。
- **Dark Mode**:
  - 背景: 深色磨砂 `dark:bg-zinc-900/50`。
  - 边框: `dark:border-zinc-800`。
  - 光效: 保持原设计的亮白色或霓虹色光晕。
- **实现提示**: 使用 Tailwind 的 `dark:` 修饰符控制不同模式下的颜色。

### B. `DotBackground` (点阵背景 - 适配版)

- **Light Mode**: 白色底，黑色/灰色微弱点阵 (`bg-white`, dots `bg-black/5`)。
- **Dark Mode**: 纯黑底，白色点阵 (`dark:bg-black`, dots `dark:bg-white/10`)。
- **氛围光 (Aurora)**: 确保角落的模糊光斑在 Light Mode 下颜色更淡、更通透（如淡紫、淡蓝），不显脏。

## 4. 后台布局重构 (`app/dashboard/layout.tsx`)

**布局要求**:

- **侧边栏 (`AdminSidebar`)**:

  - 背景: 支持玻璃拟态 `backdrop-blur-xl`。
  - Light: `bg-white/80 border-r border-zinc-200`。
  - Dark: `dark:bg-black/40 dark:border-zinc-800`。
  - **功能**: 必须包含 **主题切换按钮 (`ModeToggle`)**，位置建议在底部用户信息旁。

- 导航项结构 (Navigation Items):

  请严格按照以下顺序实现侧边栏菜单：

  1. **概览 (Dashboard)**: `/dashboard`

  2. **资源库 (Media)**: `/dashboard/media`

  3. 集合管理 (Collections): /dashboard/collections

     (注：图集和视频集统一在此页面管理，页面内通过 Tab 切换)

  4. **上传中心 (Upload)**: `/dashboard/upload`

  5. **存储配置 (Storage)**: `/dashboard/storage`

  6. **系统设置 (System Settings)**: `/dashboard/settings/system`

  7. **用户设置 (User Settings)**: `/dashboard/settings/profile`

## 5. 功能模块开发 (Feature Implementation)

请按以下优先级开发页面：

### 5.1 存储配置 (`app/dashboard/storage/page.tsx`)

**复用逻辑**: 参考 `app/ui/photos/storage-config.tsx` 中的逻辑，但完全重写 UI。

- **UI**: 使用 `SpotlightCard` 网格展示存储源。
- **Light Mode 表现**: 卡片应像精致的实体卡片，清晰展示 NAS/S3 图标和状态。
- **功能**:
  - 列表展示：NAS, S3, 七牛云。
  - 状态指示：绿色圆点 (在线)，红色圆点 (离线)。
  - 操作：编辑配置、扫描文件 (调用 `app/lib/storage-scan.ts`)、删除。

### 5.2 资源库概览 (`app/dashboard/media/page.tsx`)

**重构目标**: 替换原有的 `/dashboard/photos` 页面，重点解决海量数据展示的性能问题。

- **性能优化 (Pagination)**:
  - **严禁一次性加载所有数据**，避免页面卡顿。
  - 必须实现 **服务器端分页** (Server-side Pagination)。
  - 前端采用 **无限滚动 (Infinite Scroll)** 或底部 **页码导航** 方式展示。
- **高级筛选**:
  - **存储来源 (Storage Source)**: 增加筛选器，允许用户根据来源（如 "Synology NAS", "AWS S3"）过滤显示内容。
  - **媒体类型**: 图片 / 视频切换。
- **UI 布局**:
  - **筛选栏**: 顶部悬浮胶囊样式 (适配 Light/Dark)。
  - **网格视图**:
    - **瀑布流 (Masonry)**: 图片视频混排，必须支持懒加载 (Lazy Load)。
    - **时光轴 (Timeline)**: 按月份分组展示。

### 5.3 上传中心 (`app/dashboard/upload/page.tsx`)

**全新页面**:

- **布局**: 左右分栏或上下分栏。
- **选择存储源**: 用户必须先选择“上传到哪里” (NAS 路径或 S3 Bucket)。
- **拖拽区域 (Dropzone)**:
  - Light: 虚线边框 `border-dashed border-zinc-300 bg-zinc-50 hover:bg-zinc-100`。
  - Dark: `dark:border-zinc-700 dark:bg-zinc-900/30`。
- **进度条**: 真实的上传进度反馈。

### 5.4 集合管理 (`/dashboard/collections`)

功能描述:

这是一个统一的集合管理入口，页面内部使用 Tabs (标签页) 组件来区分两种不同的集合类型。

- **UI 结构**:
  - 顶部标题: "集合管理"。
  - **Tabs**: `[图集 (Photos)]` | `[视频集 (Video Series)]`。
- **Tab 1: 图集 (Photo Collections)**:
  - 管理静态摄影图集。
  - 列表展示现有图集（封面、名称、包含图片数）。
  - 支持创建新图集、向图集添加现有图片。
- **Tab 2: 视频集 (Video Series)**:
  - 管理视频系列/播放列表。
  - UI 类似 Netflix 管理界面。
  - 支持创建系列、拖拽排序视频顺序。

### 5.5 设置模块

- **系统设置**: 全局站点配置（站点名称、SEO设置、公共访问权限开关）。
- **用户设置**: 当前管理员的资料修改、密码修改。

## 6. 数据库 Schema 更新 (`app/lib/schema.ts`)

为了支持上述功能，请检查并更新 Schema。此次设计采用了**“实体与关系分离”**的原则，将存储配置、资源文件与逻辑分组解耦。

### 1. 存储层：`storage_configs` (存储配置表)

用于管理用户配置的多种存储来源，使系统能同时连接多个后端。

- **`id`**: UUID, 主键。
- **`name`**: 显示名称 (如 "公司 NAS")。
- **`type`**: 枚举值 (`nas` | `s3` | `qiniu`)。
- **`config`**: `json` 类型。**关键字段**，存储连接信息（如 S3 的 Endpoint/Bucket/Region，或 NAS 的 Path）。注意敏感信息处理。
- **`status`**: 状态 (`connected` | `error` | `scanning`)。

### 2. 组织层：`photo_collections` (图集表)

定义“静态摄影图集”实体，只包含元数据，不包含具体文件。

- **`id`**: UUID, 主键。
- **`title`**: 标题 (如 "2024 东京街头")。
- **`description`**: 详细描述 (Markdown)。
- **`cover_image`**: 封面图 URL 或关联的文件 ID。
- **`created_at`**: 创建时间。

### 3. 关联层：`collection_items` (图集关联表)

**多对多 (Many-to-Many)** 中间表，连接 `photo_collections` 和 `files`。

- **`collection_id`**: 外键，指向图集。
- **`file_id`**: 外键，指向文件。
- **`sort_order`**: 整数。用于定义图片在图集中的**自定义排序**，允许用户拖拽调整顺序。

### 4. 组织层：`video_series` (视频集表)

定义“视频系列”或“播放列表”实体，逻辑上与图集区分。

- **`id`**: UUID, 主键。
- **`title`**: 标题 (如 "VLOG: 冰岛之旅")。
- **`description`**: 描述。
- **`cover_image`**: 封面海报。
- **`created_at` / `updated_at`**: 时间戳。

### 5. 关联层：`video_series_items` (视频集关联表)

**多对多** 中间表，连接 `video_series` 和 `files`。

- **`series_id`**: 外键，指向视频集。
- **`file_id`**: 外键，指向文件。
- **`sort_order`**: 整数。用于定义视频在系列中的播放顺序（如第1集、第2集）。

## 7. 样式开发特别提示 (Style Guide)

在编写 Tailwind 类名时，请始终遵循 **"Default Light, Dark Variant"** 的模式：

- **文字**: `text-zinc-900 dark:text-zinc-100`
- **次级文字**: `text-zinc-500 dark:text-zinc-400`
- **背景**: `bg-white dark:bg-black` 或 `bg-zinc-50 dark:bg-zinc-950`
- **边框**: `border-zinc-200 dark:border-zinc-800`
- **主色调 (Accent)**: 使用 Indigo 或 Violet 作为品牌色，在两种模式下保持一致或微调亮度。
  - Light: `text-indigo-600`
  - Dark: `dark:text-indigo-400`

**开始任务：**

1. 首先创建 `components/ui/admin/spotlight-card.tsx`，确保其在明亮模式下依然美观（不要只有黑色背景）。
2. 然后基于 `app/dashboard/layout.tsx` 重构侧边栏，加入主题切换。
3. 依次开发各个功能页面。

## 8. 开发完成情况（2026-01-09）

- [x] 3.A SpotlightCard（支持 Light/Dark）
- [x] 3.B DotBackground（支持 Light/Dark + Aurora）
- [x] 4 后台布局重构（AdminSidebar、ModeToggle、导航顺序）
- [x] 5.1 存储配置页面（新 UI + 表单逻辑 + 扫描/启停/删除入口）
- [ ] 5.2 资源库概览（已完成分页/筛选/瀑布流/时光轴 UI，真实数据与懒加载待接入）
- [ ] 5.3 上传中心（已完成选择存储/拖拽区/进度 UI，真实上传接入待完成）
- [ ] 5.4 集合管理（已完成 Tabs/UI，创建与拖拽排序待实现）
- [ ] 5.5 设置模块（已完成表单 UI，保存逻辑待实现）
- [ ] 6 数据库 Schema 更新（已在 `app/lib/schema.ts` 新增表定义，迁移脚本待补充）
