# 统一集合系统 (Unified Collection System) 重构方案

## 1. 核心目标与背景 (Objectives & Background)

### 为什么选择“混合集合” (Why Mixed Collections)?
从用户体验和内容管理的角度来看，“混合集合” (Mixed Collections) 是目前的主流趋势，也是更符合自然逻辑的选择。

1.  **现实场景是混合的**：
    -   例如“2024 日本旅行”，用户通常既拍摄照片，也录制 Vlog。
    -   若强制分开，用户需创建两个同名集合：“日本旅行（图）”和“日本旅行（视频）”，导致管理和浏览体验割裂。
2.  **降低心智负担**：
    -   用户无需纠结“我这个主要是视频但有几张封面图，该放哪”。
    -   统一称为“精选集”或“作品集”即可，简化分类逻辑。
3.  **技术实现的统一**：
    -   代码复用率更高，API 和组件仅需维护一套，提升开发与维护效率。

---

## 2. 业务逻辑与规则 (Business Logic)

### 2.1 集合定义 (Definition)
将“图集”和“视频集”合并为一个统一的 **作品集 (Collection)** 概念。

- **作品集 (Collection)**: 一个包含多个媒体文件（File）的容器。
- **Type**: 集合不再通过表区分，而是通过字段标记（可选）：
  - `mixed` (默认): 混合模式，允许图片与视频。
  - `photo`: 纯图模式（UI 上引导用户只传图）。
  - `video`: 纯视频模式（UI 上引导用户只传视频）。
- **约束策略**（建议）：
  - `mixed`: 不做限制。
  - `photo` / `video`: **Server Actions 层强校验**，拒绝加入不匹配的媒体类型；UI 仅做引导提示。
  - 若不需要强约束，可统一 `mixed`，但需在前台卡片与详情页逻辑中保持类型判断的健壮性。

### 2.2 关联规则
- 一个媒体文件可以属于多个集合（多对多关系）。
- 集合内的媒体文件可以自定义排序 (`sortOrder`)：
  - `sortOrder` 从 1 开始，且在同一集合内**唯一且连续**。
  - 拖拽排序时采用**全量重排**（避免局部更新导致空洞）。

### 2.3 权限与可见性
- 只有管理员可创建、编辑、删除集合。
- 所有用户（包括游客）可浏览已发布的集合。
- 增加发布状态字段（建议：`status`）：`draft` / `published`。
- 列表与详情页只展示 `published`，`draft` 仅管理员可见。
### 2.4 作者字段
- **作者**：自由字符串，可自填，默认填入**当前登录用户**，允许编辑修改。
- 允许填写外部账号标识，例如：个人 ID、B 站名称、微博名称等。

---

## 3. UI/UX 设计方案

### 3.1 后台管理 (`/dashboard/collections`)
- **列表页**：
  - 统一为一个入口 `/dashboard/collections`。
  - 统一展示所有集合，不再区分 Photo/Video Tab。
  - 列表项显示：封面、标题、类型图标（图/视/混）、包含项目数、创建时间。
  - 筛选器：按类型筛选（全部/图集/视频集）。
- **编辑/详情页**：
  - **媒体选择器**：统一的媒体库弹窗，不再区分“选图”或“选视频”，支持同时选中。
  - **拖拽排序**：统一的 Grid 拖拽排序区域。

### 3.2 前台展示 (`/[locale]/collections`)
- **入口页**：
  - 统一为一个入口 `/{locale}/collections`。
  - 使用 **Bento Grid** 布局展示所有集合。
  - 集合卡片 (`CollectionCard`) 增加类型角标 (Badge)：`Photo` / `Video` / `Mixed`。
  - 混合集合的卡片：鼠标悬停时，如包含视频，优先播放预览；否则轮播图片。
- **首页入口文案**：
  - 原「精选图集 / 精选视频集合」统一改为「精选作品集」。
- **详情页 (`/{locale}/collections/[id]`)**：
  - **Hero Header**：全屏视差封面。
  - **内容区** (智能适配布局)：
    - 如果集合里 **全是视频** -> 自动启用 **Cinema Mode** (暗色底)。
    - 如果集合里 **全是图片** -> 启用 **Masonry Gallery** (瀑布流)。
    - 如果是 **混合** -> 使用 Masonry 布局，视频卡片稍微大一点或带播放角标。
- **性能与媒体策略**：
  - 视频预览使用 `poster` + `preload="metadata"`，仅在 hover 时播放。
  - 图片与视频卡片统一使用 Skeleton 或 BlurHash，避免 CLS。

---

## 4. 技术架构与数据库迁移 (Technical Architecture)

### 4.1 数据库 Schema 变更 (`drizzle-orm`)

**废弃表**：
- `photo_collections`
- `video_series`
- `collection_items`
- `video_series_items`

**新增表**：
1.  **`collections`**
    - `id`: serial (PK)
    - `title`: varchar
    - `description`: text
    - `author`: varchar (可空, **自由字符串**, 默认当前登录用户, 可编辑)
    - `coverFileId`: integer (FK -> files.id, 可空)
    - `type`: varchar ('mixed', 'photo', 'video') - *新字段*
    - `status`: varchar ('draft', 'published') - *新字段*
    - `createdBy`: integer (FK -> users.id, 可空)
    - `updatedBy`: integer (FK -> users.id, 可空)
    - `createdAt`: timestamp
    - `updatedAt`: timestamp

2.  **`collection_media`** (关联表)
    - `collectionId`: integer (FK -> collections.id)
    - `fileId`: integer (FK -> files.id)
    - `sortOrder`: integer
    - **复合主键**：(`collectionId`, `fileId`)
    - **索引**：(`collectionId`, `sortOrder`)

### 4.2 API / Server Actions 变更
- 新增 `app/lib/actions/unified-collections.ts`：
  - `createCollection(data)`
  - `updateCollection(id, data)`
  - `deleteCollection(id)`
  - `addMediaToCollection(collectionId, fileIds)`
  - `removeMediaFromCollection(collectionId, fileIds)`
  - `reorderMedia(collectionId, items)`
- 新增查询函数（`app/lib/data.ts`）：
  - `fetchCollections({ type, status, page, pageSize, orderBy })`
  - `fetchCollectionById({ id, includeMedia, orderBy })`

---

## 5. 开发任务清单 (Development Checklist)

### Phase 1: 数据库与后端 (Database & Backend)
- [x] **DB Migration**: 创建 `collections` 和 `collection_media` 表，**旧表数据不迁移**（开发阶段默认空数据）。
- [x] **Schema Definition**: 更新 `app/lib/schema.ts`。
- [x] **Server Actions**: 实现 `unified-collections.ts` 中的 CRUD 逻辑。
- [x] **Data Fetching**: 更新 `app/lib/data.ts`，新增统一的查询函数 `fetchCollections`, `fetchCollectionById`。
- [x] **作者默认值**: `createCollection` 默认填入当前登录用户，允许编辑覆盖。

### Phase 2: 后台管理重构 (Admin Dashboard)
- [x] **UI Components**: 更新 `CollectionForm` 支持类型选择（混合/图/视）。
- [x] **作者字段输入**: 表单新增作者输入项（默认当前登录用户，可编辑）。
- [x] **Page Logic**: 重写 `/dashboard/collections/page.tsx` (Server Component) 读取新表数据。
- [x] **Client Logic**: 重写 `/dashboard/collections/collections-client.tsx`，移除 Tab 切换，统一列表。
- [x] **Media Picker**: 确保媒体选择器支持混合选择。

### Phase 3: 前台展示重构 (Front-end)
- [x] **List Page**: 新建 `/app/[locale]/(front)/collections/page.tsx`，替代原有的 `/photo-collections` 和 `/video-collections`。
- [x] **Detail Page**: 新建 `/app/[locale]/(front)/collections/[id]/page.tsx`。
  - 实现“智能布局适配”逻辑（检测内容类型决定是否开启 Cinema Mode）。
- [x] **首页入口文案**: 统一为「精选作品集」，并同步 i18n 文案。
- [x] **作者展示**: 卡片/详情页展示作者（为空则不展示）。
- [x] **Routing**: 配置 `next.config.js` 或中间件，统一 301 重定向：
  - `/photo-collections` -> `/{locale}/collections`
  - `/video-collections` -> `/{locale}/collections`
  - `/photo-collections/[id]` -> `/{locale}/collections/[id]`
  - `/video-collections/[id]` -> `/{locale}/collections/[id]`

### Phase 4: 清理与测试 (Cleanup)
- [x] **Data Migration Script**: 开发阶段不做数据迁移（旧表保留不导入）。
- [x] **Cleanup**: 删除旧的 API、Actions 和 Schema 定义。
- [ ] **Testing**: 验证混合集合的创建、展示、排序功能。
- [ ] **验收清单**：
  - `draft` 不对外展示，`published` 可公开访问。
  - 旧路由 301 正常且不会丢失 locale。
  - 作者默认值正确，且可在表单中手动修改。
  - `photo`/`video` 类型强约束生效。
