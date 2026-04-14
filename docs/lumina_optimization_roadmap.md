# Lumina Gallery — 全面开发与体验优化路线图（校准版）

> 更新日期：2026-04-13  
> 本版本已按当前代码完成核对，修正了过时条目，补充了遗漏风险，并重排优先级。

---

## 使用说明
- `[ ]` 待办
- `[x]` 已在代码中实现（建议做一次回归后关闭）
- `[~]` 方向正确但原描述不准确，已改写

---

## 🔴 高优先级 (P0 - 需立即处理)

### 1. 安全与权限
- [x] **封禁或保护 `/seed` 接口（高危）**
  - 当前可匿名访问，且内置默认管理员凭据创建逻辑。
  - 建议：仅 `development` 环境可用 + 增加一次性密钥校验 + 生产环境硬禁用。

- [x] **注册能力受 `publicAccess` 控制（高危）**
  - 当前 `signup` 默认公开可用，未受系统设置中的 `publicAccess` 约束。
  - 建议：在 `signup` Server Action 与 `/signup` 页面入口双重拦截，并在关闭注册时返回统一提示。

- [x] **替换所有原生 `confirm()` 为 `AlertDialog`**
  - 目前仍有多个 `window.confirm/confirm` 在使用，存在样式割裂与可访问性不一致问题。
  - 范围：藏品删除、存储全量扫描确认、媒体批量删除。

### 2. 关键体验与一致性
- [x] **N1: 侧边栏真实用户信息接入**
  - Completed: session user is now passed from `dashboard/layout.tsx` to `DashboardShell` and `AdminSidebar`.

- [x] **S1: 存储配置 SecretKey 明文输入修复**
  - Completed: `storage-config-form` now uses password inputs for `accessKey/secretKey` with show/hide toggle.
  - 建议统一为 `type="password"` + 显示/隐藏切换。

- [x] **U2: 上传模块国际化补齐（范围扩大）**
  - Completed: hardcoded texts in `TaskCard` / `create-task-form` / `upload-stats-cards` moved to i18n keys.
  - 建议统一迁入 `messages/zh-CN.json` 与 `messages/en.json`。

- [~] **乱码清理（不仅 `media-library.tsx`）**
  - `media-library.tsx`、`data.ts` 等存在乱码注释/字符，影响可维护性。
  - 建议本轮统一修正并做一次编码巡检（UTF-8 无 BOM）。

### 3. 工程卫生
- [x] **清理测试与演示遗留文件**
  - 原 `components/*.html`（`code.html`、`demo.html`、`demo1.html`）已迁入 `docs/archive/` 归档。
  - 若后续确认无回溯需求，可在下一轮直接删除归档副本。

---

## 🟡 中优先级 (P1 - 体验与架构持续优化)

### 1. 架构重构与性能
- [x] **超大文件拆分**
  - `photo-detail-modal.tsx`（约 1400 行）按播放器/元数据/控制区拆分。
  - `actions.ts`、`data.ts`（约 1200+ 行）按领域拆分（文件、存储、集合、用户）。
  - Completed: `photo-detail-modal` 已拆分为播放器渲染/元数据面板/控制区子组件；`actions.ts`、`data.ts` 已改为领域化 barrel 入口并迁移到分域模块。

- [x] **消除 `fetchCollections` 默认封面补全的 N+1 查询**
  - 当前对“无封面集合”逐条查询 `collectionMedia`，应改为单次聚合查询（窗口函数或分组聚合）。
  - Completed: `fetchCollections`/`fetchCollectionById` 已改为单次聚合 `array_agg(...)[1:3]` 批量获取默认封面。

- [x] **统一前台筛选实现，消除双实现割裂**
  - 目前 `GalleryFilter` 与 `GalleryWithFilter` 存在功能重复和入口分裂。
  - 建议保留一套实现，统一筛选、排序与分页行为。
  - Completed: `GalleryFilter` 已收敛为 `GalleryWithFilter` 的统一包装入口，筛选实现单一化。

### 2. UI 交互进阶
- [ ] **G2: 推行乐观更新，减少 `router.refresh()` 闪屏**
  - 媒体库批量发布/取消发布等操作仍以刷新为主，体验抖动明显。

- [ ] **ML3: 媒体库右键菜单（Context Menu）**
  - 补齐查看、发布切换、设主图、复制信息、删除等快捷操作。

- [ ] **F1: 画廊筛选状态写入 URL（`searchParams`）**
  - 当前前台筛选主要依赖本地 `useState`，分享链接不可复现状态。

- [ ] **F3: 画廊大图弹窗响应浏览器返回**
  - 需支持 `popstate/hash` 关闭弹窗，而非直接离开页面。

- [ ] **C1: 藏品表单二级弹窗优化**
  - `CollectionForm` 内再次打开大 Dialog，建议改为 Sheet 或内嵌选择器。

- [ ] **C3: 藏品列表快捷管理能力补齐**
  - 增加外露发布开关与常用快捷操作，减少深层跳转。

- [ ] **U4: 上传完成后一键发布**
  - 为 `completed` 任务提供“全部发布”动作，减少后续手动操作成本。

### 3. 业务能力补全
- [ ] **GPS 地图视图（Leaflet）集成**
- [ ] **Tags 功能（数据结构 + 管理 + 前台展示）**
- [ ] **Like/Favorite 与分享能力落地（含 OG 图）**
- [ ] **前台全局搜索入口补齐**

---

## ✅ 已核实实现（建议从待办中移出）
- [x] **ML2: 媒体库筛选切换会重置 `page`**
- [x] **S3: 扫描进度已使用 SSE 实时推送**
- [x] **U1: 上传完成后已直接入库并异步提取元数据**
- [x] **C5: 拖拽手柄 `GripVertical` 已实现**
- [x] **缓存清理脱节（删除文件时缩略图缓存删除）已实现**

---

## 📝 描述修正（原判断不准确）
- [~] **F2: 详情页“只能浏览器返回”**
  - 实际上：集合详情页隐藏了全局浮动导航，但页面内部已有 Back 按钮。
  - 可优化方向：补一个更轻量的品牌顶栏（Logo + Back），而不是判定为“不可返回”。

- [~] **关于页“无配置即空白”**
  - 实际上已有标题/描述兜底文案，不是完全空白。
  - 可优化方向：补充无头像/无联系方式时的占位块与骨架感知。

---

## 🟢 低优先级储备 (P2 - 收尾)

### 1. 外围功能增强
- [ ] **G3: 操作可撤销机制（5 秒 Undo）**
- [ ] **N4: 命令面板（Cmd+K）**
- [ ] **ML4: 媒体库框选多图（Rubber Band Selection）**
- [ ] **表单防离开保护（`beforeunload`）**

### 2. 展示增强
- [ ] **深色主题氛围增强（indigo 迷雾 + Spotlight 弱层）**
- [ ] **输出能力扩展（RSS / Embed Iframe / 原片下载入口）**

---

## 建议执行顺序（两周）
1. **第 1 周（止血）**：`/seed` 安全、注册开关、`confirm` 替换、侧边栏真实用户、上传 i18n、乱码清理。
2. **第 2 周（提效）**：N+1 改造、乐观更新、筛选 URL 化、弹窗返回行为、表单/弹窗交互优化。
3. **并行回归**：登录、`/dashboard`、`/gallery`、`/photo-collections`、上传完成链路、存储扫描 SSE。
