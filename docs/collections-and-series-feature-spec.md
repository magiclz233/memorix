# 方案文档：图集与视频集管理系统

## 1. 概述 (Overview)
本方案旨在完善系统的媒体组织能力，通过 **“图集 (Photo Collections)”** 和 **“视频集 (Video Series)”** 两个核心维度，将零散的媒体文件进行主题化归档与展示。

- **后台目标**：提供高效的集合创建、编辑、媒体关联与排序管理功能。
- **前台目标**：提供极具视觉冲击力的集合列表页与详情页，支持沉浸式浏览。

## 2. 业务需求与流程 (Business Logic)

### 2.1 核心实体定义
| 实体 | 描述 | 关键属性 | 关联关系 |
| :--- | :--- | :--- | :--- |
| **图集 (Photo Collection)** | 用于归纳一组静态照片（如“2023旅行”、“人像精选”） | 标题、描述、封面图、创建时间 | 多对多关联 `files` (Photo only) |
| **视频集 (Video Series)** | 用于归纳一组视频（如“Vlog系列”、“教程合集”） | 标题、描述、封面图、状态、更新时间 | 多对多关联 `files` (Video only) |

### 2.2 后台管理流程 (Admin Workflow)
1.  **列表浏览**：
    -   管理员进入 `/dashboard/collections`。
    -   通过 Tabs 切换查看“图集”或“视频集”列表。
    -   列表项展示：封面、标题、包含项目数量、创建时间。
2.  **新建/编辑集合**：
    -   填写基本信息：标题 (Title)、描述 (Description)。
    -   设置封面 (Cover)：从现有媒体库选择或直接上传。
3.  **内容管理 (Content Management)**：
    -   **添加媒体**：弹窗打开媒体库选择器，勾选多个文件加入集合。
    -   **排序**：支持拖拽调整图片/视频在集合中的播放/展示顺序。
    -   **移除**：将文件从集合中移除（保留原始文件）。
4.  **删除集合**：
    -   删除集合本身，**不删除**其中的原始媒体文件。

### 2.3 前台展示流程 (Front Workflow)
1.  **列表页浏览**：
    -   用户访问 `/photo-collections` 或 `/video-collections`。
    -   以网格形式浏览所有集合，通过封面图和标题快速筛选感兴趣的主题。
2.  **详情页沉浸体验**：
    -   点击卡片进入 `/photo-collections/[id]`。
    -   顶部 Hero 区域展示集合封面与介绍。
    -   下方以 **瀑布流 (Masonry)** 展示图集照片，或以 **Grid** 展示视频集分集。
    -   点击具体照片/视频打开 Lightbox 或播放器。

## 3. UI/UX 设计方案 (UI Design)

### 3.1 后台 (Dashboard)
-   **页面结构**：复用现有的 `Tabs` 布局，保持与设计系统一致。
-   **交互设计**：
    -   **集合卡片**：使用 Card 组件，右上角提供 Dropdown Menu (编辑、管理内容、删除)。
    -   **内容管理器**：建议使用全屏 `Sheet` (抽屉) 或独立子页面，左侧为“已选列表（可拖拽）”，右侧为“媒体库选择器”。
    -   **拖拽排序**：使用 `dnd-kit` 实现平滑的拖拽效果。

### 3.2 前台 (Front)
-   **设计风格**：
    -   **Light Mode**：极简杂志风，大留白，Serif 字体标题。
    -   **Dark Mode**：流光黑洞风，玻璃拟态背景，高对比度。
-   **列表页**：
    -   复用 `CollectionCard` 组件，增加 `hover` 时的封面轻微放大与光影效果。
    -   加载状态使用 `Skeleton` 骨架屏。
-   **详情页**：
    -   **Header**：全宽背景图 + 模糊蒙层，文字居中叠加，营造电影感。
    -   **Gallery**：照片采用等宽不等高瀑布流；视频采用 16:9 卡片网格。

## 4. 技术框架与选型 (Tech Stack)

| 模块 | 技术选型 | 理由 |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | 项目现有框架，RSC 性能最优 |
| **Database** | **Postgres + Drizzle ORM** | 类型安全，Schema 已定义 |
| **Data Fetching** | **Server Actions + RSC** | 直接在服务端组件获取数据，减少 Client Bundle |
| **Mutations** | **Server Actions** | 处理表单提交、拖拽排序更新 |
| **UI Components** | **Shadcn/UI** | 项目现有组件库，保证风格统一 |
| **Drag & Drop** | **@dnd-kit** | 轻量级、无障碍友好、React 专属的拖拽库 |
| **Transitions** | **Framer Motion** | 页面切换与元素加载动画 |

## 5. 详细技术方案 (Implementation Plan)

### 5.1 数据库层 (Database)
Schema 已在 `app/lib/schema.ts` 中定义，无需修改：
-   `photoCollections`: `id`, `title`, `description`, `coverImage`...
-   `collectionItems`: `collectionId`, `fileId`, `sortOrder` (复合主键)
-   `videoSeries`: `id`, `title`, `description`, `coverImage`...
-   `videoSeriesItems`: `seriesId`, `fileId`, `sortOrder` (复合主键)

### 5.2 后端逻辑 (Server Actions)
创建 `app/lib/actions/collections.ts`：
1.  **CRUD 操作**：
    -   `createCollection(formData)`: 校验并插入 DB。
    -   `updateCollection(id, formData)`: 更新标题/描述/封面。
    -   `deleteCollection(id)`: 级联删除关联关系（Drizzle 需手动处理或配置 Cascade）。
2.  **关系管理**：
    -   `addItemsToCollection(collectionId, fileIds[])`: 批量插入 `collectionItems`。
    -   `removeItemsFromCollection(collectionId, fileIds[])`: 删除关联记录。
    -   `reorderItems(collectionId, items[])`: 批量更新 `sortOrder` 字段。

### 5.3 数据查询层 (Data Layer)
在 `app/lib/data.ts` 中扩展查询函数：
1.  **列表查询**：
    -   `fetchPhotoCollections()`: Join `collectionItems` 表 count 数量，按 `createdAt` 倒序。
2.  **详情查询**：
    -   `fetchCollectionById(id)`: 获取集合详情。
    -   `fetchCollectionItems(id)`: 获取集合内的 `files`，按 `sortOrder` 排序。

### 5.4 前端开发任务 (Frontend Tasks)

#### A. 后台管理 (`app/dashboard/collections`)
1.  **列表页改造**：
    -   移除 Mock 数据，替换为 `await fetchPhotoCollections()`。
    -   实现“创建”按钮的 `Dialog` 表单。
2.  **详情/管理页**：
    -   点击集合进入管理模式。
    -   集成 `MediaLibrary` 组件（需增加 `selectionMode` 属性）。
    -   实现拖拽排序列表。

#### B. 前台展示 (`app/(front)`)
1.  **图集列表页 (`/photo-collections`)**：
    -   获取真实数据渲染 `CollectionCard`。
    -   处理空状态与 Loading 状态。
2.  **图集详情页 (`/photo-collections/[id]`)**：
    -   新建动态路由页面。
    -   实现 Hero Header。
    -   复用 `FrontGallery` 组件展示图片列表。
3.  **视频集同理**：
    -   对应 `/video-collections` 和 `/video-collections/[id]`。
