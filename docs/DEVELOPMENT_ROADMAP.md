# Memorix 开发路线图（单一事实来源）

> **文档定位**：本文是后续开发的**统一入口**——盘点「已做完什么 / 还缺什么 / 下一步做什么」。
> 老文档互相矛盾且严重滞后（`improvement-suggestions.md` 15 条里 11 条已做；`lumina_optimization_roadmap.md` 是空模板；`.kiro/specs/.../tasks.md` 全部打勾但含大量「假完成」）。**以本文为准，改动后同步更新本文。**

| 项 | 值 |
|---|---|
| 文档版本 | v2.7（交接版） |
| 更新日期 | 2026-11-20 |
| 基线提交 | 批次 A/B/C + P2-4 `867a728` + P2-5 `07eec9d` + P2-10 `d215ecf` + review 修复 `18f1c0e` / `efdbdd2` / `5793868` + 资源库发布/预览修复 `30c9d34`；NAS 已部署 `v20261120d`（2026-11-20），历史 1404 张已全部取消发布 |
| 已知使用场景 | **万张以上图片** + **外网可达**（绿联 UGLink 域名）+ 部署在 NAS |
| 验证基线 | `tsc --noEmit` ✅ / ESLint ✅（0 error，20 warning）/ Vitest **128/128** ✅（21 个测试文件，2026-11-20 复验）；完整 build 受 Windows symlink 与 ffmpeg-static 下载限制（见 §5.3） |

---

## 0. 一分钟速览

**结论**：项目完成度高于多数自托管图库，但地基有几处裂缝。当前阶段的主线是「**先清安全与数据正确性的 P0，再做差异化产品能力**」。不要去硬碰 Immich 的手机备份 + 端侧 AI——走 **只读外部库 + 摄影师级展示与分享** 路线（PhotoPrism / Photofield / ChronoFrame）。

| 分档 | 主题 | 状态 |
|---|---|---|
| **P0** | 安全 + 数据不可逆损失 + 万张图可用性 | **12 项全部完成**（两轮修复） |
| **P1** | 分享链接、时间轴、虚拟滚动、筛选统一、搜索 DSL、任务队列 | **6 项全部完成**（批次 B：P1-1~5；批次 C：P1-6） |
| **P2** | 批量交互、回收站、去重、CI/备份/部署加固、死代码清理、存储源管理、审计日志、排序键索引化 | **已完成 10 项**（P2-1 主体 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10）；遗留 P2-1 尾巴（见 §3.3） |
| **P3** | PWA、语义搜索增强层、地图相册等战略项 | 待评估 |
| **不做** | 手机原生 App / 人脸 / E2EE / 存储大重构 | 明确否决，见 §3.6 |

**下一步从哪开始**：P2-4 / P2-5 / P2-10 已完成，review 发现的问题已修复（见 §2.10）。P2 仅剩 **P2-1 尾巴**（批量移动存储源、命令面板，可缓）；之后按评估制决定 P3。详见 §3.3、§4 与 §4.1 任务卡。

---

## 0.5 交接须知（新接手 Agent 必读）

> 你如果是接手继续开发的 AI / 工程师，**从本节开始按顺序读完再动手**。

**1. 阅读路径**（按此顺序，约 10 分钟）：

1. §0 一分钟速览 —— 项目定位与整体进度；
2. §1.2 「假完成」清单 —— **旧文档 `.kiro/specs/.../tasks.md` 全部打勾但含大量假完成，勿信**，一切以本文档与代码实际为准；
3. §3.3 + §4.1 —— 待办任务明细（含每项的入口文件与实现要点）；
4. §5 —— 开发规范、必配环境变量、本机环境坑；
5. §6.1 ADR 索引 —— 改媒体投递/上传/Live Photo 前必读对应 ADR。

**2. 工作区状态（截至 2026-11-20）**：

- 批次 A/B/C 已按逻辑分组提交到 `master`：`8d9f83a`（批次 A 安全与数据正确性修复）/ `bac3a64`（批次 B 分享·时间轴·虚拟滚动·搜索 DSL）/ `bda8c09`（批次 C 扫描队列·回收站·去重·批量交互·运维加固）；P2-4 `867a728`、P2-5 `07eec9d`、P2-10 `d215ecf`、review 修复 `18f1c0e` / `efdbdd2` / 本提交也已合入；本地 `master` 领先 `origin`，尚未 push；
- `.workbuddy/`、`.zcode/` 是 AI 工作目录，非项目代码，不要提交也不要删除。

**3. 首个任务**：P2-4、P2-5、P2-10 已完成，review 修复见 §2.10；P2 仅剩 **P2-1 尾巴**（批量移动存储源 / 命令面板，可缓），之后进入 P3 评估。

**4. 开发纪律**（严格执行）：

- 每一项开独立分支，改动只做一件事（§5.4）；
- 先写/更新测试再改代码，纯函数逻辑必须有 Vitest 覆盖；
- **每完成一项，立即同步更新本文档的状态标记与验收标准**——本文档是单一事实来源，改完代码不改文档视为未完成；
- 出口条件：`tsc --noEmit` + `eslint .` + `pnpm test:unit` 全绿；
- 遇到与本文档描述不符的代码，**以代码实际为准**，并在本文档记录偏差（参考 §2.6 P1-6 的 ADR 偏差写法）。

**5. 本机（Windows）环境坑速查**（详见 §5.3）：

- `pnpm install --ignore-scripts` 跳过 ffmpeg-static 的 GitHub 下载（该域名不通）；跑 `vitest`/`tsc`/`eslint` 无碍，本地完整 build 不行是环境问题，别试图在本机修好它；
- 本机 build 失败（symlink EPERM）≠ 代码有问题，验证以 `tsc --noEmit` + lint + 单测为准；
- NAS 已于 2026-11-20 部署（应用容器内 `/api/health` 200），外网 UGLink 域名有登录门禁，验证以容器内 `/api/health` 与 `/api/gallery` 为准。

---

## 1. 能力盘点：已完成 / 未完成 / 假完成

### 1.1 真实已完成（代码里确实能用）

| 域 | 能力 | 关键位置 |
|---|---|---|
| 架构 | Next.js 16 App Router + Server Actions、Postgres/Drizzle、next-intl 中英双语（1028 key 对齐）、pino 结构化日志 | `app/`、`messages/`、`app/lib/logger.ts` |
| 媒体 | 图片/视频/Live Photo/动图；EXIF + 直方图 + GPS；视频 206 Range（含 Motion Photo ftyp 偏移修正）；HEIC 处理 | `app/lib/metadata-extractor.ts`、`api/media/stream/[id]` |
| 上传 | 分片上传三段式（init/chunk/complete）、断点续传、并发控制、进度反馈 | `api/upload/*`、`app/lib/file-upload-queue.ts` |
| 内容 | 统一集合（照片集/视频集）、收藏、发布可见性 | `app/lib/actions/unified-collections.ts` |
| 后台 | 仪表盘、媒体库、存储源配置、监控页 | `app/[locale]/dashboard/**` |
| 运维 | 5 份 ADR、health 端点、告警规则、备份脚本、Docker 多阶段构建 | `docs/adr/`、`api/health`、`scripts/backup-*.sh` |

### 1.2 ⚠️「打勾但没做」的假完成（最容易误导后续开发）

> `.kiro/specs/lumina-comprehensive-optimization/tasks.md` 里 14 个维度全部 `[x]`，但以下条目**实际未落地或已失效**：

| 声称完成 | 实际情况 | 处置 |
|---|---|---|
| 12.x Vitest / Playwright 测试体系 | **仓库里 0 个 `*.test.*` / `*.spec.*` 文件**；`package.json` 里**没有** `test:unit` / `test:coverage` / `test:e2e` 脚本；ADR-0004 完全没有落地 | 见 P0-10 |
| CI 跑单测 / 集成 / E2E | `.github/workflows/test.yml` 跑不存在的脚本且 `continue-on-error: true`，**CI 恒绿** | 见 P0-10 |
| 7.1 虚拟滚动 / 7.3 `virtual-gallery-grid` | 组件写了但**没有接入**；前台实际是 JS 贪心 Masonry + 全量 DOM 累积 | 见 P1-3 |
| 7.2 `optimized-image.tsx` / 7.7 Service Worker | 死代码 / 未生效 | 见 P2-6 |
| 3.8 CSRF 防护 `csrf.ts` | middleware 零调用，`use-csrf.ts` 只取 token 不注入头；本轮改用 proxy 同源校验兜底 | 见 §2、P2-7 |
| 14.2 `config-validator.ts` 启动校验 | 死代码，BETTER_AUTH_SECRET 缺失仅警告不拦截 | 见 P0-8 |
| 1.6 `validations.ts` / 3.4 `file-validator.ts` | 未接线（死代码） | 见 P2-6 |
| `auditLogs` 表 | 已接线写入（P2-5），不再是零写入 | 见 P2-5 ✅ |
| `improvement-suggestions.md` 15 条 | 11 条已实现（Redis、路径校验、扫描分批、分片上传、索引、错误处理、EXIF 脱敏、日志等），该文档已失去指导价值 | 归档，勿再照做 |

### 1.3 当前缺口清单（缺什么）

按「用户能否感知」排序：

1. ~~**安全缺口**：越权删除 IDOR、analytics 无鉴权、注册门禁、CI 无门禁、上传大文件 hash 崩浏览器。~~ **✅ P0 已全部修复。**
2. ~~**数据正确性缺口**：扫描长事务 + 外部文件消失即删、元数据提取失败无重试。~~ **✅ 软删 + 安全网 + 短事务已落地**；✅ 扫描已入任务队列（P1-6 批次 C），失败文件进队列错误列表可重试。
3. ~~**万张图可用性缺口**：全量 DOM、无虚拟滚动、无日期分桶、搜索只有 `ILIKE '%kw%'`。~~ **✅ 批次 B 已修复**（窗口虚拟化 + 时间轴分桶 + pg_trgm/搜索 DSL）。
4. ~~**产品能力缺口**：**分享链接**（只能发 `?media=id` 深链）、时间轴、搜索 DSL、PWA 离线。~~ **✅ 分享链接/时间轴/搜索 DSL 已落地**；PWA 离线仍属 P3（见 §3.4）。
5. **后台工作流缺口**：P2 主体已完成（任务队列、回收站、去重、Shift 连选、存储源密钥加密、审计日志）；仅剩 P2-1 尾巴（批量移动存储源 / 命令面板，可缓）。
6. **工程缺口**：测试/CI/备份/部署加固已落地（P0-10、P2-7/8/9）；剩余是 NAS 实机迁移与 EXPLAIN 验证，以及 P3 战略项。

---

## 2. 本轮已落地改动（2026-11-19）

> 确认「上万张 + 外网可见」后，第一批安全与性能修复已直接改完并通过类型检查 + ESLint。以下为回归测试重点。

### 2.1 改动清单（19 个文件）

| # | 改动 | 涉及文件 | 回归验证点 |
|---|---|---|---|
| 1 | 私有媒体缓存策略统一（新建 `media-cache.ts`）：私有 `private, no-store` + `Vary: Cookie`，公开才 immutable；覆盖原图/缩略图/视频流全部响应点（含 206、占位图、降级原图） | `app/lib/media-cache.ts`(新)、`api/local-files/[id]`、`api/media/thumb/[id]`、`api/media/stream/[id]` | 私有图响应头不再出现 `public` / `immutable`；公开图仍 immutable |
| 2 | 下载修复：`basePath`→`rootPath`（原来本地/NAS 批量下载恒 404）；新增 `GET /api/download?id=` 供前台单文件下载（公开免登录、私有校验 owner）；补 S3 下载、路径穿越校验；前台下载按钮改指新端点 | `api/download/route.ts`、`app/ui/front/photo-detail/photo-info-sidebar.tsx` | 灯箱照片下载成功；后台批量 zip 成功；S3 单文件下载成功 |
| 3 | 扫描误删防护：物理删除→软删（`deletedAt`）+ 两道安全网（结果为空 / 待删占比 >30% 则中止告警）；文件回归时清 `deletedAt` 恢复；补 3 个 i18n key | `app/lib/storage-scan.ts`、`messages/{zh-CN,en}.json` | 断连一个子目录后扫描，索引不被清空；目录恢复后记录自动回来 |
| 4 | 软删连锁：11 处读取查询 + 4 个投递/下载路由 + 集合校验 + 批量操作统一加 `isNull(files.deletedAt)` | `app/lib/data-legacy.ts`、`app/lib/actions-legacy.ts`、`app/lib/actions/unified-collections.ts`、4 个路由 | 软删文件不在前台/后台显示 |
| 5 | 外网安全：API 写操作加同源 Origin 校验（信任 `BETTER_AUTH_TRUSTED_ORIGINS`，适配 UGLink 反代）；注册门禁下沉到 auth hook，堵住原生注册端点绕过 | `proxy.ts`、`auth.ts` | 跨站 POST 被 403；publicAccess=false 时注册被拒 |
| 6 | 依赖升级：Next 16.0.7→16.4.6、react/react-dom 定版 19.3.1、eslint-config-next 16.4.6、@types 19.3.0；`remotePatterns` 去 `hostname:'**'`；硬编码 UGLink 域名/内网 IP 改环境变量 | `package.json`、`pnpm-lock.yaml`、`next.config.ts` | `pnpm install --frozen-lockfile` 成功；换域名无需重新 build |
| 7 | 万张图性能：网格一律走缩略图；Hero 只渲染当前帧（next/image）；`whileInView` 动画限首屏 24 张 + delay 封顶；窄屏收敛到 2 列 | `app/lib/gallery.ts`、`app/ui/front/front-home.tsx`、`components/gallery25.tsx` | 首屏网络请求数下降；万张列表滚动不卡；手机 2 列 |

### 2.2 已验证 / 未验证

- ✅ `tsc --noEmit`（Next 16.4.6 + React 19.3.1）EXIT 0
- ✅ ESLint（全部改动文件）EXIT 0
- ✅ `next build`：静态页 55/55 生成成功（代码可编译）
- ⚠️ **完整构建未跑完**：Windows 创建 symlink 报 EPERM（需开发者模式/管理员）；新依赖下 Turbopack 构建超时（ffmpeg-static postinstall 走 GitHub 下载被墙，node_modules 不完整）。**均为环境问题，非代码问题**——NAS 上用 `FFMPEG_PATH` 指向系统 ffmpeg 无此问题。
- ✅ **NAS 服务已部署**：容器内 `/api/health` 200（database/redis/storage 均 up），`/api/gallery` 200；外网直连超时是网络隔离/UGLink 门禁。

### 2.3 第一轮刻意没做（不是遗漏）

真正的虚拟滚动重写、SSR 去 `ssr:false`（有 localStorage hydration 风险需配套改）、分享链接、时间轴、任务队列——均为独立设计项，见 P1。

### 2.4 第二轮：交付前 code review 修复 + P0 收尾（同日）

对第一轮改动做了严格 review（三路深审 + 逐行核实），修掉了 review 发现的问题，并把 P0 剩余 6 项全部做完。

**review 发现并修复的问题：**

| 问题 | 位置 | 修复 |
|---|---|---|
| 无 Origin 写请求一律 403（误杀 curl/agent/反代） | `proxy.ts` | 区分浏览器与非浏览器：只对带浏览器特征的请求强制同源校验，服务端调用放行 |
| `x-forwarded-host` 客户端可控可绕过同源校验 | `proxy.ts` | 改用 `request.nextUrl.host` 判定，不再信任该头 |
| 下载响应全缺缓存头（ADR-0001 唯一漏网路径） | `api/download` | 全部响应套 `mediaCacheHeaders` |
| `withCleanup` 无 `cancel()`，中断下载泄漏 fd + 未处理 rejection | `api/download` | 补 cancel + canceled 标志 + 防御 enqueue/error |
| 安全网 30% 阈值小样本误伤（3 删 1 就中止，产生幽灵文件） | `scan-safety.ts`(新) | 加绝对数量下限（≥5 才启用比例判断） |
| S3 catch 把刚从软删恢复的记录物理删除 | `storage-scan.ts` | 改软删，保留可恢复性 |
| gallery HEIC 无 thumbUrl 时退化成 1×1 占位 | `gallery.ts` | 恢复 image 原图回退链 |
| metadata 重试按 id 取软删记录 | `metadata-extractor.ts` | 加 `isNull(deletedAt)` |
| GET download 缺 id → `Number(null)=0` 返回 404 | `api/download` | 显式校验 rawId，返回 400 |
| POST 同名文件 mime 取错 | `zip-generator.ts` + download | `FileToZip` 带 mimeType，不再按文件名反查 |
| 416 响应未走缓存头且回显视频大小 | `stream/[id]` | 套 `mediaCacheHeaders` |
| stream ftyp 探测复用 buffer + 忽略 bytesRead 误判 | `stream/[id]` | 每次新 buffer + `subarray(0, bytesRead)` |
| 首用户抢注接管（既有风险） | `auth.ts` | 加 `INIT_ADMIN_EMAIL` 约束；`throw Error` 改 `return false` 友好拒绝 |
| `config-validator.ts` 是死代码、secret 缺失只警告 | `config-validator.ts` + `instrumentation.ts`(新) | 生产启动时强校验，缺失即拒绝启动 |
| analytics 端点可被脚本投毒 | `api/analytics/*` | 加同源浏览器上报校验 |
| S3 endpoint 无协议校验（SSRF） | `storage-config-schema.ts` | 只允许 http(s) |
| `liveType='google'` 违反 ADR-0003 | `metadata-extractor.ts` | 改规范值 `embedded`/`none` |
| hash-worker 整文件进内存，5GB 必崩 | `public/workers/hash-worker.js` | 重写为增量 SHA-256（已用 Node crypto 对比验证，含 5MB 分块） |
| 上传高级配置是 UI 摆设 | `advanced-config.tsx` | 加实验性提示横幅，明确服务端未执行 |
| 死代码 `csrf.ts`/`use-csrf.ts` 造成误以为有 CSRF | 见 P2-6 | 待清理（本轮用 proxy 方案兜底） |

**P0 剩余项落地：**

| 项 | 落地内容 |
|---|---|
| P0-7 越权删除 IDOR + S3 残留 | `actions-legacy.ts` 删除只用已鉴权 `authorizedIds`；补 S3 桶对象删除；本地删除加路径穿越校验 |
| P0-8 API 验权加固 | analytics 同源校验、config 启动强校验、endpoint 协议白名单（密钥加密留 P2） |
| P0-9 上传/OOM | 增量 SHA-256、liveType 规范化、高级配置标实验性 |
| P0-10 测试与 CI | 新建 Vitest baseline（`vitest.config.ts` + 3 个测试文件 15 用例），`test:*` 脚本入 package.json，CI 去掉 `continue-on-error` 改真实门禁；ESLint 新规则降 warn 保持门禁可用 |
| P0-11 长事务 | 两处扫描 `BATCH_SIZE` 100→1，消除 ffprobe/sharp 长事务占连接池与整批回滚 |
| P0-12 Live Photo 触屏 + 移动灯箱 | 卡片角标 `onClick` 点按播放 + `preload=none`；灯箱小屏改抽屉（Info 按钮 + 遮罩 + 滑入侧栏） |

**新增文件**：`app/lib/media-cache.ts`、`app/lib/path-safety.ts`、`app/lib/scan-safety.ts`、`instrumentation.ts`、`vitest.config.ts`、`app/lib/__tests__/{media-cache,path-safety,scan-safety}.test.ts`。

**验证**：`tsc --noEmit` EXIT 0；`eslint .` EXIT 0（0 error / 16 warn）；`vitest run` 15/15 通过。

### 2.5 批次 B：产品差异化（P1-1 ~ P1-5，同日完成）

> 五项错误全部落地；新增纯函数均有 Vitest 覆盖，验证 `tsc` / `eslint`（0 error）/ `vitest` 43/43 全绿。

| 项 | 落地内容 | 关键文件 |
|---|---|---|
| **P1-1 分享链接** | `shares` 表（高熵 192bit token + 可选 scrypt 密码 + 过期 + viewer/editor 角色 + 吊销）；游客分享页 + 密码解锁 cookie；白名单能力模型——分享只暴露创建时快照的 fileIds，且必须仍属于创建者；4 个投递路由（原图/缩略图/视频流/下载）统一用 `canAccessPrivateMedia` 门禁（owner 或有效分享二者居一）；管理端「分享链接」页（选片/密码/有效期/权限/撤销/复制链接）。**私有图可显式选入分享，但白名单外的任何私密图都不会泄露。** | `app/lib/schema.ts`(+shares)、`app/lib/data/shares.ts`、`app/lib/share-{token,access}.ts`、`app/api/shares/**`、`app/[locale]/(front)/share/[token]/`、`app/ui/front/share/**`、`app/ui/admin/shares/`、`drizzle/0015_add_shares.sql` |
| **P1-2 时间轴** | 按 (年,月) 的 SQL 分桶查询（date_trunc 语义，不拉全量到 JS）；`/timeline` 页面 + 年份轴导航 + 月份 chips + 按月分组展示；`fetchPublishedMediaForGallery` 支持 `year`/`month` 下推；排序改用统一 `galleryDateExpr`（拍摄时间优先）。 | `app/lib/data-legacy.ts`(+fetchGalleryTimelineBuckets)、`app/api/gallery/timeline/`、`app/[locale]/(front)/timeline/`、`app/ui/front/timeline/` |
| **P1-3 虚拟滚动** | 新增 `computeJustifiedRows`（纯函数，9 用例）：等高两端对齐行布局；`VirtualPhotoGrid` 用 `useWindowVirtualizer` 只渲染视口附近的行（万张图下 DOM 恒定），带 ResizeObserver/scrollMargin 校正；大图库（首屏有下一页）自动启用，小图库保留功能更全的 Gallery25。**禁用存储源过滤已下推到 SQL**，分页/hasNext 不再错位。 | `app/lib/justified-layout.ts`、`app/ui/front/gallery/virtual-photo-grid.tsx`、`app/ui/front/gallery-infinite.tsx` |
| **P1-4 搜索 DSL + pg_trgm** | `parseSearchDSL`（纯函数，10 用例）：`type:video camera:"Sony A7" year:2024 海边` → 结构化字段 + 自由文本，未知字段保留不丢；前台/后台两条查询线统一走 `buildDslConditions`；新增 pg_trgm + GIN 索引（title/path/author/description/location/camera/maker/lens）。 | `app/lib/search-dsl.ts`、`app/lib/data-legacy.ts`(+buildDslConditions)、`drizzle/0016_add_search_indexes.sql` |
| **P1-5 筛选统一 + 去 ssr:false + 修骨架** | 首屏按 URL 的 `mediaType`/`sortOrder` 直接查 DB，消除重复请求；Gallery25 增加 `showFilters` 开关，前台关闭内嵌筛选栏避免双重 Tabs；列数读取移到挂载后 effect（去 hydration 风险）；Gallery25 恢复 SSR 输出真实网格；骨架 `Math.random()` 改确定性高度；灯箱 `pushState` 用 ref 保证一次打开会话只压一条历史，prev/next 不再污染后退栈。 | `app/[locale]/(front)/gallery/page.tsx`、`app/ui/front/gallery-content.tsx`、`app/ui/front/gallery-with-filter.tsx`、`components/gallery25.tsx`、`app/ui/front/gallery-skeleton.tsx`、`app/ui/front/photo-detail-modal.tsx` |

**新增纯函数测试**：`share-token.test.ts`(9) + `justified-layout.test.ts`(9) + `search-dsl.test.ts`(10)，连同原有 15 用例共 **43/43 通过**。
**新增文件**：`app/lib/{share-token,share-access,search-dsl,justified-layout}.ts`、`app/lib/data/shares.ts`、`app/ui/front/share/**`、`app/ui/front/timeline/**`、`app/ui/front/gallery/virtual-photo-grid.tsx`、`app/ui/admin/shares/**`、`app/api/shares/**`、`app/api/gallery/timeline/`、`app/[locale]/(front)/share/[token]/`、`app/[locale]/(front)/timeline/`、`app/[locale]/dashboard/shares/`、`drizzle/0015_add_shares.sql`、`drizzle/0016_add_search_indexes.sql`、3 个测试文件。

---

### 2.6 批次 C：任务队列 + 回收站 + 去重 + 工程加固（P1-6 + P2-1/2/3/6/7/8/9，同日完成）

> 新增纯函数测试 `scan-job-state.test.ts`(9) + `trash-policy.test.ts`(8) + `hash-file.test.ts`(3)，连同批次 B 共 **65/65 通过**；`tsc` / `eslint`（0 error）全绿。

| 项 | 落地内容 | 关键文件 |
|---|---|---|
| **P1-6 扫描任务队列** | 扫描从「HTTP SSE 内同步执行」改为 **DB 持久化队列 + 服务端常驻 runner**：`scan_jobs` 表（migration 0017）+ `claimNextScanJob`（FOR UPDATE SKIP LOCKED 原子认领）+ 刷新页面不并发重扫（同存储源活跃任务拒绝入队 409）+ 协作式取消（遍历器每目录/批间轮询 `cancelRequested`）+ 失败/取消任务保留日志环（200 条）与单文件失败列表（100 条），支持一键重试（生成新任务，保留历史）。服务器重启恢复：running 判中断、queued 继续排队。**顺带修复两个预存 bug**：本地扫描无按文件容错（坏文件炸整场扫描）→ 事务级 try/catch + 失败计数；增量模式未变更文件进度双计数。旧 SSE 路由 `/api/storage/scan` 与无调用方的 `scanStorage` action 已删除。存储页改为入队 + 1.5s 轮询，刷新自动接回进行中/最近失败任务。ADR 偏差：选自研 DB 队列而非 pg-boss——单实例 NAS 语义下零新依赖、更少移动部件，验收标准（可取消/可重试/失败可见/防并发）全部满足。 | `app/lib/scan-job-state.ts`、`app/lib/scan-job-runner.ts`、`app/lib/data/scan-jobs.ts`、`app/api/scan-jobs/**`、`app/lib/storage-scan.ts`、`app/lib/storage.ts`(+ScanCancelledError)、`instrumentation.ts`、`app/ui/admin/storage/storage-view.tsx`、`drizzle/0017_add_scan_jobs.sql` |
| **P2-2 回收站** | 软删语义闭环：媒体库「删除」改为移入回收站（软删 + 下架）；新建 `/dashboard/trash`（网格 + 批量恢复/彻底删除 + 分页），彻底删除才清 S3 对象/本地原文件/缩略图/元数据/集合封面与 Hero 引用（引用清理抽到 `data/reference-cleanup.ts` 共用）；彻底删除仅允许作用于已软删文件（防误删活文件）；30 天保留 + runner 每日自动清理（单批上限 200）；缩略图路由对软删文件放行 **owner 本人**（回收站预览依赖），游客/分享 token 仍 404，软删内容强制私有缓存头。 | `app/lib/trash-policy.ts`、`app/lib/data/trash.ts`、`app/lib/data/reference-cleanup.ts`、`app/lib/actions/trash.ts`、`app/[locale]/dashboard/trash/`、`app/ui/admin/trash/`、`app/api/media/thumb/[id]/route.ts` |
| **P2-3 内容级去重** | SHA-256 补齐三条写入路径：本地/NAS 扫描（新文件/变更文件/full 重扫，流式计算）、S3 扫描（对象下载到 tempPath 后顺路补齐）、简单上传（buffer 在内存，`bufferSha256`）；分片上传链路原本就有。`/dashboard/dedup` 重复组检测（GROUP BY fileHash HAVING count>1，组内 mtime 升序=建议保留项）+「保留最早，其余移入回收站」一键处理（走 P2-2 软删，绝不物理删除）；摘要条显示可释放体积；**只检测不自动删**。 | `app/lib/hash-file.ts`、`app/lib/data/dedup.ts`、`app/[locale]/dashboard/dedup/`、`app/ui/admin/dedup/`、`app/lib/storage-scan.ts`、`app/api/upload/route.ts` |
| **P2-1 批量交互** | 媒体库 Shift 连选（anchor 模型：最近单独点击为锚，Shift+点击选区间替换选区）；批量标签 UI（`setMediaTags` 已有 action 但从未接线，新增 Dialog + 缓存清理）。遗留子项：批量移动存储源（无既有能力，需跨存储复制）、cmdk 命令面板。 | `app/ui/admin/media/media-library.tsx`、`app/lib/actions/media.ts`(+setMediaTags) |
| **P2-7 CI/CD** | `deploy.yml` 修复：standalone 运行镜像无 pnpm/drizzle-kit，迁移改用 compose `migrate` 服务（`docker-compose build migrate && run --rm`）；新增 QEMU + `platforms: linux/amd64,linux/arm64` 多架构产物；compose 补 `CRON_SECRET` 环境变量。 | `.github/workflows/deploy.yml`、`docker-compose*.yml` |
| **P2-8 备份修复** | `backup-media.sh` 重写：不再只备 `./uploads`——支持 `MEDIA_SOURCES` 多来源 + 自动探测容器内挂载（/media/photos、/nas/volume1~3、/app/uploads）；每来源独立 tar.gz + SHA256 + **恢复自检**（tar 条目数为 0 直接报错）；已用临时目录端到端验证「备份→校验→恢复→内容一致」。ops-guide 同步更新恢复命令。 | `scripts/backup-media.sh`、`docs/ops-guide.md` |
| **P2-9 部署加固** | 两个 compose：`depends_on` 加条件（migrate `service_completed_successfully`、postgres/redis `service_healthy`）；app 加 `mem_limit`/`memswap_limit`/`cpus` + `NODE_OPTIONS=--max-old-space-size=1024`（sharp/ffmpeg 无并发上限防 OOM）；全服务 json-file 日志轮转（10m×3）。**刻意偏差**：NAS `user: 0:0` 保留 root——NAS 源目录 0:0+0770，改非 root 需先 chown 源目录，已在 compose 注释与本文档记录。 | `docker-compose.yml`、`docker-compose.nas.yml` |
| **P2-6 死代码清理** | 删除 9 文件 + 1 路由：`virtual-gallery-grid.tsx`、`dynamic-imports.ts`、`optimized-image.tsx`、`front-gallery.tsx`、`use-csrf.ts`、`csrf.ts`、`/api/csrf-token`、`storage-adapter.ts`、`validations.ts`、`file-validator.ts`；cache-keys 的 csrfToken 条目一并移除。**保留例外**（曾列入清单但实际已接线）：`config-validator.ts`（instrumentation 启动校验在用）、`data/front.ts`（timeline API 经 barrel 在用）。 | 见左列 |

**批次 C 之后剩余 P2**：P2-10 排序键可索引化（`sort_at` 生成列 + keyset 分页）、P2-1 尾巴（批量移动存储源、命令面板）。P2-4、P2-5 已完成，见 §2.7、§2.8。

---

### 2.7 批次 C+：P2-4 存储源管理（2026-11-20 完成）

> 新增 `secret-box` / `media-roots` / `storage-test` 三组测试（26 个），全套 **91/91 通过**；`tsc` / `eslint`（0 error）全绿。

| 项 | 落地内容 | 关键文件 |
|---|---|---|
| 测试连接 | `POST /api/storage/test-connection`（admin + storage owner 校验，5s 超时）：S3 用 `listObjectsV2(MaxKeys=1)`，本地/NAS 用 `stat` + `access(R_OK)`；返回 `{ok, latencyMs}` 或 `{ok:false, stage, message}`，错误只保留错误码，不回显端点/凭据 | `app/api/storage/test-connection/route.ts`、`app/lib/storage-test.ts`、`app/ui/admin/storage/storage-modal.tsx` |
| 密钥加密 | AES-256-GCM，密文格式 `enc:v1:<iv>:<tag>:<data>`；主密钥取 `MEDIA_SECRET_KEY`（32B base64），缺失时从 `BETTER_AUTH_SECRET` SHA-256 派生并告警；`resolveS3Client` 统一解密，历史明文兼容；`fetchUserStorages` 只向 UI 返回 `****last4`，编辑留空/脱敏值沿用旧密钥，并顺手加密历史明文 | `app/lib/secret-box.ts`、`app/lib/s3-helper.ts`、`app/lib/data-legacy.ts`、`app/lib/actions-legacy.ts` |
| rootPath 白名单 | `MEDIA_ROOTS` 逗号分隔；保存与本地扫描前 resolve + 前缀匹配，越界拒绝；未配置保持现状并每次进程告警一次 | `app/lib/path-safety.ts`、`app/lib/actions-legacy.ts`、`app/lib/scan-job-runner.ts` |
| 存量回填 | `POST /api/storage/backfill-secrets`（admin，`?dryRun=1` 预演）：扫描 `user_storages.config.secretKey`，只加密明文，密文/脱敏值/空值跳过，幂等；写审计 `storage.secrets.backfill`（仅计数） | `app/api/storage/backfill-secrets/route.ts`、`app/lib/storage-secret-backfill.ts` |
| 偏差记录 | 任务卡写 `POST /api/storage/test` + HeadBucket；实际路由为 `test-connection` + `listObjectsV2`——后者同时验证凭证与读权限，对 S3 兼容实现更稳 | — |

**遗留**：无。历史明文需部署后调用一次回填接口（见 ops-guide）；未调用前旧行仍是明文。

### 2.8 批次 C+：P2-5 审计日志接线（2026-11-20 完成）

> 新增 `audit-log-values` 纯函数测试（6 个），全套 **97/97 通过**；`tsc` / `eslint`（0 error）全绿。

| 项 | 落地内容 | 关键文件 |
|---|---|---|
| 写入 helper | `recordAuditLog` 落 `audit_logs`（action / resource / resourceId / userId / changes / ip / userAgent），写库失败只告警；`recordAuditLogForCurrentUser` 供 Server Action 包装层使用 | `app/lib/audit-log.ts`、`app/lib/audit-log-values.ts` |
| 覆盖范围 | 回收站移入 / 恢复 / 彻底删除；分享创建 / 吊销；存储源创建 / 更新 / 启停 / 删除；批量发布 / Hero / 标签 / 旧物理删除 | `app/lib/actions/trash.ts`、`app/api/shares/*`、`app/lib/actions-legacy.ts`、`app/lib/actions/media.ts` |
| 查询接口 | `GET /api/audit-logs?limit=&before=&action=&resource=`：仅管理员，join users 返回操作者邮箱，`Cache-Control: no-store`，`before` 做 id 前翻页；查询取 `limit+1`，只有确实多一条才返回 `nextBefore`，避免多请求空页 | `app/api/audit-logs/route.ts`、`app/lib/audit-log-page.ts` |
| 偏差记录 | 任务卡字段 `actorId/targetType/targetId/detail` 与现有表结构不一致，按代码用 `userId/resource/resourceId/changes`；不记录密钥、密码、分享 token | — |

**API 鉴权盘点（2026-11-20）**：全站 27 个 `route.ts`，含写方法的 15 个均已有校验——

| 路由 | 鉴权方式 |
|---|---|
| `upload`、`upload/init`、`upload/complete`、`upload/chunk` | admin session + 每用户限流 + 存储源 owner 校验 |
| `storage/test-connection` | `requireAdminUser` + 存储源 owner |
| `storage/backfill-secrets` | `requireAdminUser`；一次性回填，仅计数，不回显密钥 |
| `shares` POST、`shares/[id]` DELETE | session + `filterOwnedFileIds` / share owner |
| `shares/[token]/unlock` POST | 有意公开：token 格式 + 有效期/吊销校验 + 密码校验，成功才下发 httpOnly cookie；按 IP+token 10 次/分钟限流 |
| `scan-jobs` POST、`scan-jobs/[id]/retry`、`scan-jobs/[id]/cancel` | admin session + 存储源 owner |
| `download` POST | session + `resolveFiles` 强制 `userStorages.userId = userId` |
| `analytics/vitals`、`analytics/errors` POST | 有意公开：`Sec-Fetch-Site`/`Origin` 同源校验 + 每 IP 限流 |

公开读接口 `gallery`、`gallery/timeline`、`health` 均为设计内公开内容；未鉴权写接口数量为 **0**。`shares/[token]/unlock` 已补按 IP+token 的 10 次/分钟限流（超限 429 + `Retry-After: 60`），见 §2.10。


**遗留**：后台可视化审计页（低优先级，未做）。

### 2.9 批次 C+：P2-10 排序键索引化（2026-11-20 完成）

> 新增 `gallery-cursor` 5 个单测，P2-10 提交时全套 **102/102 通过**；review 修复后最终 **122/122**。`tsc` / `eslint`（0 error）全绿。迁移与 EXPLAIN 需在 NAS Postgres 执行（本机无 docker/psql）。

| 项 | 落地内容 | 关键文件 |
|---|---|---|
| 排序列 | `files.sort_at`（timestamp(3)，非空，毫秒精度与游标一致），由触发器维护 `coalesce(photo_metadata.date_shot, files.mtime, files.created_at)`；回填后建 `(sort_at DESC, id DESC)` btree | `drizzle/0018_add_sort_at.sql`、`app/lib/schema.ts` |
| 查询改造 | 前台画廊、时间轴分桶、后台媒体库日期过滤/排序、首页/存储源/分享查询统一用 `files.sortAt`，删除运行时 coalesce | `app/lib/data-legacy.ts`、`app/lib/data/shares.ts` |
| keyset 分页 | 画廊/时间轴改用 `(sort_at, id)` 游标（base64url `v1.<ms>.<id>`），`GET /api/gallery?cursor=`，响应 `nextCursor`；非法游标 400；后台小页面继续 OFFSET | `app/lib/gallery-cursor.ts`、`app/api/gallery/route.ts`、`app/ui/front/gallery-*`、`app/ui/front/timeline/timeline-view.tsx` |
| 偏差记录 | ① 路线图要求生成列，但 `date_shot` 在 `photo_metadata`，Postgres 生成列不能跨表，改为普通列 + 两个触发器；② 用 `timestamp(3)`（无时区，毫秒精度）与 files 现有时间列/JS 游标一致；③ 分享页仍按 share.fileIds 取数后再排序 | — |
| 复核修复（2026-11-20） | 时间轴 SSR 读取 `searchParams` 的 year/month，首屏与翻页过滤一致；分组改用 `sortAt` + UTC getter，修复浏览器时区/空日期丢组；删除未使用且缓存 key 不含游标的 `fetchPublishedMediaForGalleryCached` | `app/lib/timeline-params.ts`、`app/lib/timeline-group.ts`、`app/[locale]/(front)/timeline/page.tsx`、`app/lib/data/front.ts` |
| 待部署验证 | 迁移 0018 需在万行 NAS 库执行；EXPLAIN 验收 SQL 见 §4.1 任务卡 3 | — |

### 2.10 Review 修复（2026-11-20）

> 针对整体 review 的 8 个发现修复 1、3、4、5、6、7、8；#2 迁移顺序写入 ops-guide；另修复部署时发现的迁移 journal 时间戳乱序；symlink 与 test-connection 白名单作为已接受风险保留。全套 **123/123** 单测（19 个文件），`tsc` / `eslint`（0 error）全绿。

| 问题 | 修复 | 关键文件 |
|---|---|---|
| 历史明文存储密钥 | admin 一次性回填接口 `POST /api/storage/backfill-secrets`，支持 `?dryRun=1`；只加密明文，密文/脱敏/空值跳过，幂等；审计只记计数 | `app/lib/storage-secret-backfill.ts`、`app/api/storage/backfill-secrets/route.ts` |
| 时间轴直接 URL 首屏错位 | SSR 读取 `searchParams` 的 year/month 并传入首屏查询；客户端改用服务端校验过的 `initialYear/initialMonth` | `app/lib/timeline-params.ts`、`app/[locale]/(front)/timeline/page.tsx`、`app/ui/front/timeline/timeline-view.tsx` |
| 时间轴分组时区/空值 | `GalleryItem.sortAt` 透传 DB 排序键；分组优先 sortAt、UTC getter，跳过非法/全空 | `app/lib/timeline-group.ts`、`app/lib/gallery.ts` |
| 游标毫秒精度 | `sort_at` 改 `timestamp(3)`，迁移兼容已部分执行环境，与 JS Date 毫秒游标一致 | `drizzle/0018_add_sort_at.sql`、`app/lib/schema.ts` |
| 缓存 key 不含游标 | 删除未使用且 key 缺 cursor/sort/year/month 的 `fetchPublishedMediaForGalleryCached` | `app/lib/data/front.ts` |
| 审计分页多一页 | 查询 `limit+1`，纯函数分页，仅 hasMore 时返回 `nextBefore` | `app/lib/audit-log-page.ts`、`app/api/audit-logs/route.ts` |
| unlock 可暴力尝试 | IP+token 10 次/分钟，超限 429 + `Retry-After: 60`；Redis 不可用降级内存 | `app/api/shares/[id]/unlock/route.ts` |
| 部署启动 slug 冲突 | `shares/[id]/route.ts` 与 `shares/[token]/unlock` 同级动态段名不同，Next 启动报错；unlock 并入 `[id]/unlock`，参数改 `id`（URL 不变） | `app/api/shares/[id]/unlock/route.ts` |
| 迁移顺序 | ops-guide 手动部署改为先 `build migrate` + `run --rm migrate`，再 `up -d app`；部署后调用密钥回填 | `docs/ops-guide.md` |
| 迁移 journal 时间戳 | 0015–0018 的 `when` 小于已执行的 0014，drizzle 只执行时间戳更大的迁移，导致 migrate 打印成功但静默跳过；改为 1776418347268–271 严格递增，并新增 journal 单测防回归 | `drizzle/meta/_journal.json`、`app/lib/__tests__/migration-journal.test.ts` |

**保留的已接受风险**：`MEDIA_ROOTS` 仍只做 lexical 前缀比较，不解析 symlink（管理员可信配置，path-safety 有注释）；`storage/test-connection` 不校验 MEDIA_ROOTS（仅 admin 可用）。

### 2.11 资源库整库发布 / 分页 / 灯箱预览（2026-11-20）

> 用户反馈资源库只能发布当前页、每页数量会跳回默认值，灯箱大图使用缩略图导致破图或过小。本轮把批量发布提升为整库操作，分页数量落 URL，并把灯箱切到原图流 + 按屏幕自适应。全套 **128/128** 单测（21 个文件），`tsc` / `eslint`（0 error）全绿。

| 项 | 落地内容 | 关键文件 |
|---|---|---|
| 默认不发布 | `files.is_published` 默认 false；上传初始化/完成显式 false；扫描 insert 不写 true。历史已发布数据需一次性取消发布，不改变新数据默认行为 | `app/lib/schema.ts`、`app/api/upload/*` |
| 整库发布/取消发布 | 新增 `setAllFilesPublished(isPublished)`：覆盖当前管理员全部 userStorages 下未删除文件，返回更新数量并写 `media.publish.all` / `media.unpublish.all` 审计；UI 工具栏“整库操作”+ AlertDialog 二次确认，与当前页选中项发布并存 | `app/lib/actions-legacy.ts`、`app/lib/actions/media.ts`、`app/ui/admin/media/media-library.tsx` |
| 每页数量 | 白名单 12/24/48/96/200（非法回退 24）；`buildPageUrl` 保留 `limit`，翻页不再跳回 24；后台仍用 OFFSET | `app/lib/media-library-view.ts`、`app/[locale]/dashboard/media/page.tsx`、`media-library.tsx` |
| 灯箱原图 | 网格缩略图统一走同源 `/api/media/thumb/:id`（避免 HTTPS 页面混用内网 HTTP `thumbUrl`）；灯箱新增 `fullSrc=/api/media/stream/:id`，分享场景带 token；视频/动图同样走 stream；`BlurImage` 对 `/api/` 图片跳过 Next 图片优化器，由浏览器带会话直接请求，避免优化器无 cookie 拉取私有媒体 401 | `app/lib/media-preview.ts`、`app/lib/gallery.ts`、`app/ui/gallery/blur-image.tsx`、`media-library.tsx` |
| 自适应尺寸 | fit 模式移除 `max-h-[75vh]` shrink-wrap，改为容器内 `fill + object-contain`，按可用屏幕区域等比铺满；frame 模式保留相框但同样使用原图 | `app/ui/front/photo-detail/photo-media-canvas.tsx` |
| 存量数据 | 已在 NAS 执行：`BEFORE=1404 → UPDATE 1404 → AFTER=0`；gallery API 返回空列表；Redis `FLUSHDB` 清理缓存 | 运维记录见 §5.2 |
| 验收 | 每页切换后翻页保持、整库发布/取消发布二次确认且覆盖全账号、灯箱大图不再使用缩略图且按屏幕自适应；tsc + lint + 128 单测全绿 | — |

---

## 3. 路线图（P0 → P3）


### 3.1 P0 — 必做（外网 + 万张图前提下的止血）

> 12 项全部完成；保留验收标准便于回归。

#### P0-1 私有媒体缓存头泄露 · ✅ 已完成

- **问题**：私有媒体返回 `public, immutable`（可缓存一年），CDN/共享代理可留存私密原图；违反 ADR-0001。
- **处置**：统一 `mediaCacheHeaders()`，私有 `private, no-store, max-age=0` + `Vary: Cookie`。
- **验收**：三个投递路由的全部响应点（含 206 / 占位图 / 降级原图）私有时无 `public`。

#### P0-2 下载两个 bug · ✅ 已完成

- **问题**：`api/download` 读不存在的 `basePath` → 本地/NAS 批量下载恒失败；前台按钮指向只处理视频的 stream 路由 → 照片必 404。
- **处置**：改 `rootPath`、新增 `GET /api/download`、补 S3 与路径校验。
- **验收**：照片/视频/批量/S3 四条下载路径均成功。

#### P0-3 扫描误删索引 · ✅ 已完成

- **问题**：把「本次没扫到的」物理删除；NAS 子目录断连/权限错误 → 整个目录索引被清空。
- **处置**：软删 + 删除占比 >30% / 空结果中止告警 + 文件回归自动恢复。
- **验收**：见 §2.1 #3。
- **遗留**：清理流程仍是同步阻塞（见 P0-11）；真正的回收站 UI 见 P2-4。

#### P0-4 CSRF + 注册门禁 · ✅ 已完成

- **问题**：`csrf.ts` 中间件零调用；`publicAccess` 只挡 Server Action，Better Auth 原生注册端点畅通 + 首个用户自动 admin → 可接管。
- **处置**：proxy 对 API 写操作校验同源 Origin；auth `user.create.before` 检查 admin 的 publicAccess 设置。
- **验收**：跨站写请求 403；关闭公开访问后注册被拒。
- **遗留**：`csrf.ts` / `use-csrf.ts` / `/api/csrf-token` 成为冗余代码，见 P2-7。

#### P0-5 Next 升级 + 图片代理收紧 · ✅ 已完成

- **问题**：16.0.7 存在 2026 年多个 CVE（proxy 鉴权绕过 / Server Action SSRF / Image SSRF）；`remotePatterns hostname:'**'` 正是 Image SSRF 触发条件；`react-dom: "latest"` 破坏可复现性。
- **处置**：16.4.6 + 定版 React 19.3.1 + 白名单化 image hosts。
- **验收**：lockfile 四处 pnpm 版本统一 9.15.4；`frozen-lockfile` 可安装。

#### P0-6 万张图基础性能 · ✅ 已完成（部分）

- **处置**：缩略图统一、Hero 单帧、动画限量、窄屏列数。
- **遗留**：真正的虚拟滚动见 P1-3；`ssr:false` 见 P1-5。

#### P0-7 越权删除 IDOR + S3 对象残留 · ✅ 已完成

- **问题**：`actions-legacy.ts:1221` 只校验「至少一个 fileId 属于自己」，事务内却用原始 `fileIds` 全量删除 → 混入他人 ID 即可跨账户删。S3 只删 DB 记录，桶对象持续计费。
- **涉及文件**：`app/lib/actions-legacy.ts`（批量 remove/delete action）、S3 删除逻辑。
- **改动思路**：用「已鉴权的 fileId 集合」替换原始入参执行删除；S3 记录先发 DeleteObject（或移入待清理队列）再删 DB；写集成测试覆盖「混入他人 ID」。
- **验收**：用户 A 提交 [A 的 id, B 的 id] → B 的文件不受影响；S3 删除后桶对象消失。

#### P0-8 API 验权与密钥加固 · ✅ 已完成（密钥加密留 P2）

- **问题**：`/api/analytics/*` 无鉴权，任何人可 POST 污染看板；`/api/search` 等只验登录不验 owner；`BETTER_AUTH_SECRET` 缺失仅警告（`config-validator.ts` 是死代码）；存储密钥明文且可能回显。
- **涉及文件**：`api/analytics/*`、`app/lib/config-validator.ts`、`app/lib/actions/*`（存储源配置）。
- **改动思路**：所有写 API 统一 `requireUser` / `requireAdmin`；生产环境启动时强校验 secret 缺失即退出；密钥加密存储且接口只返回脱敏值；S3 endpoint 校验防 SSRF。
- **验收**：未登录 POST analytics 返回 401；缺 secret 生产构建/启动失败；配置接口不回显密钥。

#### P0-9 上传大文件 hash 崩浏览器 · ✅ 已完成

- **问题**：`workers/hash-worker.js` 把整文件合并进内存；上传上限 5GB → hash 阶段必 OOM。上传「高级配置」（重复处理/自动标签/转码）全是 UI 摆设，无消费方；`liveType='google'` 违反 ADR-0003。
- **涉及文件**：`workers/hash-worker.js`、`app/ui/admin/media/advanced-config.tsx`、`app/lib/metadata-extractor.ts:44`。
- **改动思路**：改流式增量哈希（分块喂 SparkMD5，不合并整文件）；把高级配置接上真实逻辑或从 UI 移除；`liveType` 统一走 ADR-0003 规范值。
- **验收**：2GB+ 文件能在浏览器完成 hash；高级配置项要么生效要么不显示。

#### P0-10 测试与 CI 门禁 · ✅ 已完成

- **问题**：0 个测试文件；`package.json` 无 `test:*` 脚本；CI 跑不存在的脚本且 `continue-on-error: true` → 恒绿；ADR-0004 完全没落地。
- **涉及文件**：`package.json`、`.github/workflows/test.yml`、`vitest.config.ts`(新建)、`app/lib/__tests__/*`。
- **改动思路**：按 ADR-0004 建 Vitest baseline（先覆盖 `media-cache`、`resolveSafeLocalPath`、扫描安全网阈值、软删过滤这些本轮改动的纯函数）；补 `test:unit` / `test:coverage` 脚本；CI 去掉 `continue-on-error`，门禁为 `tsc && lint && test`。
- **验收**：`pnpm test:unit` 有真实用例且通过；CI 故意注错测试能变红。

#### P0-11 长事务与同步扫描阻塞 · ✅ 已完成（降批大小方案）

- **问题**：`storage-scan.ts:574` 把 ffprobe/sharp 放进 `db.transaction` 内；`actions-legacy.ts:612` 同步 `await` 全量扫描 → 长事务占连接池，万张图下 HTTP 必超时、失败整批回滚。元数据提取 fire-and-forget，容器回收即永久丢。
- **涉及文件**：`app/lib/storage-scan.ts`、`app/lib/actions-legacy.ts`、`app/lib/metadata-extractor.ts`。
- **✅ 已落地（批次 C）**：扫描进入 DB 持久化任务队列（可取消/重试/防并发/失败列表）；本地扫描按文件容错（坏文件不再炸整场扫描）。
- **验收**：万张图扫描期间后台 API 仍可响应；中断后已处理批次不回滚。

#### P0-12 Live Photo 触屏 + 移动端灯箱 · ✅ 已完成（汉堡菜单留 P2）

- **问题**：Live/Motion Photo 只靠 `onMouseEnter` 触发，`onClick` 仅 `stopPropagation` → **主打的实况图在手机上完全是静态图**；灯箱 375px 视口下 420px 侧栏挤没主图，`floating-nav` 无汉堡菜单。
- **涉及文件**：前台 Live Photo 卡片组件、`photo-detail-modal`、`floating-nav`。
- **改动思路**：触屏点按切换播放 + 常驻「实况/动态」角标 + 视频 `preload="none"` 防 hover 洪泛；灯箱移动端改抽屉式元数据；补汉堡菜单。
- **验收**：手机点按实况图能播放；375px 下主图与元数据均可操作。

### 3.2 P1 — 高价值产品能力（批次 B 已完成 5 项，P1-6 归批次 C）

| 编号 | 事项 | 为什么值得做 | 涉及文件 / 思路 | 验收标准 |
|---|---|---|---|---|
| **P1-1** | **分享链接四件套** · ✅ 已完成 | 项目最值得做的产品功能。前台这么讲究，现在只能发 `?media=id` 深链，私密图要么全公开要么全私有——与「外网可见」场景最不匹配 | 新建 share 表 + token/过期/密码/角色（owner-editor-viewer）；高熵 token；私有图服务端强制排除；**别学 PhotoPrism 把 secret 当密码** | 可生成带过期+密码的链接；过期失效；私密图不被分享页泄露 |
| **P1-2** | 时间轴 + 日期分桶 · ✅ 已完成 | 图库之所以像图库的关键；万张图下「一下跳到 2019 年」比无限滚重要得多 | 按月份分桶查询 + 年份轴导航；配合 P1-3 虚拟滚动 | 年份轴可跳转；按月分组正确 |
| **P1-3** | 真正虚拟滚动 + justified rows · ✅ 已完成 | 现 Masonry 全量 DOM，万张必崩；`virtual-gallery-grid.tsx` 写好了没接 | 接 `@tanstack/react-virtual` 做分桶窗口化；或 `react-photo-album` 的 Knuth–Plass justified rows；**NAS 上别全量转 AVIF** | 万张图下首屏 DOM < 500 节点，滚动 60fps |
| **P1-4** | 搜索 DSL + pg_trgm · ✅ 已完成 | `ILIKE '%kw%'` 全表扫描且无字段筛选 | `pg_trgm` GIN / `tsvector`；PhotoPrism 式 `field:value` 语法（官方 filter reference 可当规格书）；把 LIMIT/OFFSET **之后**的 JS `.filter()`（现在禁用存储源会让分页与 hasNext 错乱）下推到 SQL | 搜索走索引；`type:video camera:sony` 可用；禁用存储源不破坏分页 |
| **P1-5** | 筛选统一 + 去 `ssr:false` + 修骨架 · ✅ 已完成 | 两套筛选 Tabs 状态冲突；首屏忽略 URL 参数导致二次请求；`gallery-skeleton.tsx` 用 `Math.random()` 导致 hydration mismatch；`pushState` 依赖内联 onClose 反复 push 污染历史栈 | 统一筛选状态到 URL；列数读取移到 `useEffect` 后去掉 `ssr:false`；骨架用确定性高度 | 首屏 SSR 有内容；无 hydration 告警；浏览器后退行为正常 |
| **P1-6** | 任务队列化 ✅ | 扫描/上传后处理是「HTTP 内同步 + fire-and-forget」两个极端；需要取消、进度、失败重试 | **已落地（批次 C，ADR 偏差）**：自研 DB 队列（`scan_jobs` 表 + 常驻 runner）替代 pg-boss——单实例 NAS 下零新依赖、验收标准全满足，详见 §2.6 | 扫描可取消/可重试 ✅；刷新页面不并发重扫 ✅；失败有可见列表 ✅ |

### 3.3 P2 — 后台工作流与工程

| 编号 | 事项 | 涉及文件 / 思路 |
|---|---|---|
| P2-1 | 批量交互：Shift 连选（anchor 模型）、`cmdk` 命令面板、批量加标签/移动存储源 | ✅ **主体完成**（Shift 连选 + 批量标签 UI）；遗留：移动存储源、命令面板 |
| P2-2 | 回收站 / 撤销：30 天软删保留 + 彻底删除（复用 P0-3 的 `deletedAt`），彻底删除时清理缩略图与 S3 对象 | ✅ **完成**（/dashboard/trash + 30 天日清理 + 物理清理链） |
| P2-3 | 内容级去重：按 SHA-256 精确去重（现在仅分片上传写 `fileHash`，扫描/直接上传都不写）；近似重复只人工复核 + 元数据合并，别自动删 | ✅ **完成**（三条路径补 hash + /dashboard/dedup 人工复核） |
| P2-4 ✅ | 存储源管理：测试连接（listObjectsV2 / `fs.stat`）、密钥加密不回显、`rootPath` 白名单 | `api/storage/*`、存储源配置表单 |
| P2-5 ✅ | API 验权粒度统一 + 审计日志接线：`auditLogs` 已覆盖敏感操作，并提供管理员查询接口 | `app/lib/audit-log.ts`、`app/api/audit-logs/route.ts` |
| P2-6 | 死代码清理：`virtual-gallery-grid.tsx`、`optimized-image.tsx`、`front-gallery.tsx`、`use-csrf.ts`、`csrf.ts`、`storage-adapter.ts`、`validations.ts`、`file-validator.ts` 等——两套语义并存会持续制造冲突 | ✅ **完成**（删 9 文件 + csrf-token 路由；`config-validator.ts`/`data/front.ts` 经核实已接线，保留） |
| P2-7 | CI/CD 与 NAS 对齐：`deploy.yml` 别在 standalone 容器跑 `pnpm db:migrate`；补 arm64 镜像产物；`CRON_SECRET` 配置 | ✅ **完成**（migrate 服务 + QEMU 多架构 + CRON_SECRET） |
| P2-8 | 备份修复：`backup-media.sh` 现在只备 `./uploads`，漏掉 `/volume1~3` 的真实媒体；把备份真正跑起来并验证恢复 | ✅ **完成**（多来源 + 自动探测 + 恢复自检，端到端验证过） |
| P2-9 | 部署加固：compose 加 `depends_on` condition、`mem_limit`/`cpus` + `NODE_OPTIONS`（sharp/ffmpeg 无并发上限易 OOM）、json-file 日志轮转、`user: 0:0` 改非 root | ✅ **完成**（除 user 非 root——NAS 源目录 0:0+0770 所限，刻意保留 root，见 §2.6） |
| P2-10 ✅ | 排序键可索引化：`coalesce(...)` 排序让已建索引失效，改可索引的 `sort_at`（触发器维护）+ keyset 分页 | `data-legacy.ts`、`app/lib/gallery-cursor.ts`、`drizzle/0018_add_sort_at.sql` |

### 3.4 P3 — 长期 / 战略（先评估再启动）

| 事项 | 判断 |
|---|---|
| PWA / 离线浏览 | PhotoPrism 证明 PWA + PhotoSync 够用，不必先做原生 App。中等投入 |
| 语义搜索（CLIP） | **只做可关闭的增强层**。Google Ask Photos 2025 年因延迟/质量回滚，2026 年加回「经典搜索」开关——NAS 算力更撑不住。必须先有开关 |
| 地图相册 / 地理聚类 | 依赖 EXIF GPS 数据质量；有摄影场景价值 |
| OCR / 物体标签 | 需引入模型服务，NAS 资源紧张；晚于分享与时间轴 |
| N 档缩略图 + ThumbHash 内联 | Immich 规格：250w 网格 / 720w / 1440w。当前只有单档；等 P1-3 一起做 |

### 3.5 明确不做（避免重复讨论）

| 不做 | 原因 |
|---|---|
| 手机原生 App / 端侧备份 | Immich 的护城河，拿短板打长板；PWA 足够 |
| 人脸识别 / 人物分组 | 独立产品线 + 隐私敏感 + NAS 算力不足 |
| E2EE | 与「外网分享」「Web 直览」架构冲突 |
| 存储抽象大重构 | `storage-adapter.ts` 是死代码；当前 local/NAS/S3 三套够用，重构收益低于风险 |
| justified rows + 虚拟滚动重写 | ✅ P1-3 已在批次 B 落地（窗口虚拟化 + justified rows），不再是待做 |
| 审计日志 / 命令面板 / Shift 连选 | 单人 NAS 场景投入产出比低，见 P2 |
| 全量 AVIF 转码 | NAS CPU 弱，编码慢会拖垮机器 |

### 3.6 优先级总表

| 分档 | 总数 | 已完成 | 待做 |
|---|---|---|---|
| P0 | 12 | **12 全部** | 0 |
| P1 | 6 | **6 全部** | 0 |
| P2 | 10 | **10（P2-1 主体 + 2~10）** | P2-1 尾巴 |
| P3 | 5 | 0 | 5（评估制） |

---

## 4. 建议执行顺序（批次）

```
批次 A（安全与数据清账）· ✅ 已完成
  P0-7 越权删除  →  P0-8 API 鉴权  →  P0-10 CI 门禁
  →  P0-11 长事务  →  P0-9 hash OOM  →  P0-12 Live Photo 触屏
  （外加 review 修复：缓存头/cancel/安全网/S3 catch/ftyp/注册门禁等）

批次 B（产品差异化，用户可感知）· ✅ 已完成
  P1-1 分享链接  →  P1-2 时间轴  →  P1-3 虚拟滚动
  →  P1-5 筛选统一  →  P1-4 搜索 DSL

批次 C（后台与工程）· ✅ 已完成
  P1-6 任务队列  →  P2-2 回收站  →  P2-3 去重  →  P2-1 批量交互
  →  P2-7/8/9 部署与备份  →  P2-6 死代码清理

批次 C+（P2 尾巴）
  P2-4 存储源管理 ✅  →  P2-5 审计日志 ✅  →  P2-10 排序键索引化 ✅
  →  P2-1 尾巴（移动存储源 / 命令面板，可缓）

批次 D（战略评估）
  P3-1 PWA  →  P3-2 语义搜索增强层（带开关）  →  其余
```

**每批次出口条件**：`tsc --noEmit` + `lint` + `test:unit` 全绿，且 NAS 上 `curl /api/health` 通过。

### 4.1 批次 C+ 任务卡（给接手者的可执行明细）

#### 任务卡 1：P2-4 存储源管理 ✅（2026-11-20 完成）

| 维度 | 内容 |
|---|---|
| 入口文件 | `app/api/storage/*`、`app/lib/actions/storage.ts`、`app/lib/storage-config-schema.ts`（SSRF 白名单已在此）、`app/lib/path-safety.ts`（复用 `resolveSafeLocalPath`）、存储源配置表单 UI（后台存储设置页） |
| 测试连接 | 新增 action 或 `POST /api/storage/test`：S3 用 HeadBucket / listObjectsV2(maxKeys=1) 验证凭证与桶可达；本地/NAS 用 `fs.promises.stat(rootPath)` 验证存在与读权限。返回结构化结果（成功 / 失败阶段 / 原始错误信息脱敏）。**用最小超时（如 5s）防 UI 挂死** |
| 密钥加密 | AES-256-GCM 加密后入库；密钥从独立环境变量 `MEDIA_SECRET_KEY`（推荐，32 字节 base64）派生，未配置时回退从 `BETTER_AUTH_SECRET` HKDF/scrypt 派生并在文档记录。**接口只返回脱敏值**（`****last4`）；编辑表单密钥字段留空 = 不修改原值。加密/解密抽成纯函数放 `app/lib/secret-box.ts` + Vitest 覆盖（roundtrip、错误密钥解密失败、脱敏函数） |
| rootPath 白名单 | 新增环境变量 `MEDIA_ROOTS`（逗号分隔允许的挂载根，NAS 上如 `/nas/volume1,/nas/volume2`）；保存/扫描前 resolve 后 require 前缀匹配（复用 path-safety）。未配置时保持现有行为但打印告警 |
| 验收 ✅ | 测试连接按钮真实可用且 5s 内返回（`storage-test.ts` 超时 4.5s + 阶段分类测试）；入库前 AES-256-GCM 加密（`secret-box.test.ts` roundtrip/错误密钥）；UI 接口只返回 `****last4`；越界 rootPath 保存/扫描被拒（`media-roots.test.ts` 前缀匹配） |

#### 任务卡 2：P2-5 API 验权统一 + 审计日志接线 ✅（2026-11-20 完成）

| 维度 | 内容 |
|---|---|
| 入口文件 | `app/lib/schema.ts`（`auditLogs` 表已定义、零写入）、全部 `app/api/**` 路由、`app/lib/actions/**`（Server Actions 是写入主力） |
| 验权盘点 | 系统过一遍 API 路由清单，确认写操作均经 `auth()` 会话校验 + owner/admin 判定；Server Actions 注意 Next.js 的 action 也可被直接 POST，防伪造 id 的模式参照 P0-7（只用已鉴权集合执行写操作） |
| 审计接线 | 抽 `recordAuditLog({ actorId, action, targetType, targetId, detail })` helper（写库失败只告警不阻塞主流程）；**先覆盖不可逆/敏感操作**：删除与彻底删除、回收站恢复、分享创建/吊销、存储源增删改、批量操作。不追求全量埋点 |
| 审计查看 | 本任务只落库 + 最简查询接口；后台可视化页可后补（低优先级） |
| 验收 ✅ | 上述每类操作成功后写入 `audit_logs`（见 §2.8 覆盖表）；`recordAuditLog` 吞错告警，不阻塞主操作；查询接口 admin-only；全站写 API 鉴权盘点完成（见 §2.8，未鉴权写接口 0 个） |

#### 任务卡 3：P2-10 排序键可索引化 ✅（2026-11-20 完成）

| 维度 | 内容 |
|---|---|
| 入口文件 | `app/lib/data-legacy.ts`（`galleryDateExpr` 排序表达式）、`drizzle/`（迁移 0018）、`app/lib/schema.ts`、`app/lib/gallery-cursor.ts` |
| 排序列 | 实际加 `files.sort_at timestamp NOT NULL` + 触发器（files 插入/时间更新、photo_metadata 增删改）+ btree `(sort_at DESC, id DESC)`。**偏差**：`date_shot` 在 `photo_metadata`，Postgres 生成列不能跨表引用，故弃用 generatedAlwaysAs |
| 迁移 | `drizzle/0018_add_sort_at.sql`：加列 → 回填（拍摄时间 → mtime → created_at）→ SET NOT NULL → 建触发器 → 建索引；journal 追加 0018 |
| 查询改造 | 画廊/时间轴分桶、后台媒体库日期过滤与排序、首页/存储源/分享查询统一改用 `files.sortAt`；删除运行时 coalesce |
| keyset 分页 | 大图库网格/时间轴改 `(sort_at, id)` 游标；`GET /api/gallery?cursor=` 返回 `nextCursor`，非法游标 400；后台媒体库等小页面继续 OFFSET |
| 验收 | 单测覆盖游标 roundtrip/非法输入；`tsc` / `eslint` / 123 单测全绿。**待 NAS 实机**：`EXPLAIN (ANALYZE, BUFFERS)` 确认走 `files_sort_at_id_idx` 且无 `Sort` 节点；keyset 与 OFFSET 同页 id 序列比对一致 |

**EXPLAIN 验收 SQL（部署后执行）**：

```sql
SET enable_seqscan = off;
EXPLAIN (ANALYZE, BUFFERS)
SELECT id
FROM files
WHERE is_published = true
  AND deleted_at IS NULL
  AND media_type IN ('image', 'video', 'animated')
ORDER BY sort_at DESC, id DESC
LIMIT 25;
```

预期出现 `Index Scan using files_sort_at_id_idx`（或 Index Only Scan），且计划中**没有** `Sort` 节点。

#### 任务卡 4：P2-1 尾巴（可缓）

| 子项 | 说明 |
|---|---|
| 批量移动存储源 | 需要跨存储复制基础设施（本地↔S3 双向），是三个任务里最重的；建议等 P2-4 密钥加密落地后再做（复制需要读源存储凭证）；先做「复制后校验 hash 再切存储源」的两阶段方案，不做直接剪切 |
| cmdk 命令面板 | 纯 UI 增强，依赖 `cmdk` 包；单用户场景收益低，最后做或不做 |

---

## 5. 开发规范与环境约束

### 5.1 命令

```bash
pnpm dev              # next dev --webpack
pnpm lint             # eslint .
pnpm build            # next build
pnpm db:migrate       # drizzle-kit migrate
pnpm tsc --noEmit     # 类型检查
pnpm test:unit        # Vitest 单元测试（128 用例：21 个测试文件全绿，2026-11-20 复验）
pnpm test:coverage    # 覆盖率报告
pnpm test:watch       # 监听模式
```

### 5.2 环境变量（从硬编码迁移来的，部署时必配）

| 变量 | 用途 | 相关项 |
|---|---|---|
| `BETTER_AUTH_SECRET` | **生产必填**（≥32 位）。`instrumentation.ts` 在服务器启动时强校验，缺失/过短直接拒绝启动 | P0-8 ✅ |
| `INIT_ADMIN_EMAIL` | **外网部署强烈建议配置**：首个用户的邮箱白名单，防止他人抢注成 admin；未配则兼容旧行为但打印告警 | P0-4 ✅ |
| `BETTER_AUTH_TRUSTED_ORIGINS` | proxy 同源校验 + Next `allowedOrigins`，逗号分隔完整 origin（UGLink 外网域名必配） | P0-4 / P0-5 |
| `NEXT_PUBLIC_IMAGE_HOSTS` | `next/image` 远程域名白名单（默认空，别开 `**`） | P0-5 |
| `MEDIA_SECRET_KEY` | 存储密钥加密主密钥（**32 字节 base64**）。未配置时回退从 `BETTER_AUTH_SECRET` 派生并告警；更换回退源会导致历史密文无法解密，生产建议显式配置 | P2-4 ✅ |
| `MEDIA_ROOTS` | 本地/NAS 存储根白名单（逗号分隔，如 `/nas/volume1,/nas/volume2`）。保存与扫描前校验；未配置保持旧行为但告警 | P2-4 ✅ |
| `CRON_SECRET` | 定时任务鉴权（回收站日清理等） | ✅ 已接入 compose（P2-7） |
| `FFMPEG_PATH` | 指向系统 ffmpeg，绕开 ffmpeg-static 从 GitHub 下载（github.com 不通） | §5.3 |

> **部署提醒（批次 B + C + P2-10 全部 4 个新迁移必执行）**：`drizzle/0015_add_shares.sql`（分享表）、`drizzle/0016_add_search_indexes.sql`（搜索索引）、`drizzle/0017_add_scan_jobs.sql`（扫描任务表）、`drizzle/0018_add_sort_at.sql`（排序键与触发器）。compose 的 `migrate` 服务会自动跑；手动方式见 ops-guide。
> **迁移 journal 注意**：新增迁移的 `when` 必须严格大于上一版本（drizzle 按时间戳判断是否执行）。本次 NAS 部署发现 0015–0018 旧时间戳小于 0014，migrate 打印成功但静默跳过，已修正并加单测。
> **部署后一次性动作**：调用 `POST /api/storage/backfill-secrets?dryRun=1` 确认历史明文条数，再去掉 `dryRun` 执行（见 §2.7 / ops-guide）；资源库历史发布数据按 §2.11 执行一次全量取消发布并清理 `gallery:list:*` 缓存。

### 5.3 本机验证环境坑（非代码问题）

- **Windows build**：standalone 输出创建 symlink 报 EPERM → 开 Windows 开发者模式或管理员运行。
- **ffmpeg-static postinstall**：从 GitHub 下二进制，国内网络不通会卡住 → 配镜像或预置 `FFMPEG_PATH`，别让安装卡死。
- **node_modules**：用 `pnpm install --ignore-scripts` 可跳过 ffmpeg-static 的 GitHub 下载快速装好（vitest/tsc/eslint 都可用，但 sharp 原生二进制需 postinstall——本地 build 会受影响；NAS 上用 `FFMPEG_PATH` + 正常 install 无此问题）。若 `.bin` 链接缺失，可用 `node node_modules/typescript/bin/tsc --noEmit` 等直接调用。
- **NAS 服务**：2026-11-20 已部署 `memorix-app:v20261120d`（项目 `memorix-v3`，app-only，端口 30001）；容器内健康检查 200、`/api/gallery` 200 且返回空列表；外网验证受 UGLink 登录门禁限制。

### 5.4 开发流程

1. 每一项开独立分支，改动只做一件事；
2. 先写/更新对应测试（P0 项强制），再改代码；
3. 同步更新本文件的状态与验收标准；
4. 涉及媒体投递/鉴权的改动，必须回归 §2.1 的验证点；
5. 安全项（P0-7/8/9/10）合并前做一次针对越权与缓存头的专项检查。

---

## 6. 附录

### 6.1 ADR 索引（决策背景，改相关模块前必读）

| ADR | 主题 | 与本路线图关系 |
|---|---|---|
| 0001 | 私有媒体用私有缓存策略 | P0-1 已落地 |
| 0002 | 双上传路径保留 + 共享媒体入库 | P0-9 去重需遵循 |
| 0003 | Live / Motion Photo 规范生命周期 | P0-9 已把 `liveType='google'` 改为规范值 `embedded`/`none` |
| 0004 | Vitest 接口测试 baseline | P0-10 已落地（15 用例 + CI 真实门禁） |
| 0005 | 媒体架构按投递链路排序改进 | 整体批次划分依据 |

### 6.2 老文档处置

| 文档 | 处置 |
|---|---|
| `docs/improvement-suggestions.md` | 归档（15 条里 11 条已做），勿再照做 |
| `docs/lumina_optimization_roadmap.md` | 空模板，内容已并入本文 |
| `.kiro/specs/.../tasks.md` | 保留作历史，但注意「假完成」（§1.2） |
| `docs/adr/*` | 有效，继续维护 |

### 6.3 战略定位（一句话）

> 不与 Immich 拼手机备份与端侧 AI；发挥 **local/NAS/S3 多源 + 只读挂载 + 精美前台** 的既有优势，走 **PhotoPrism / Photofield / ChronoFrame 路线：只读外部库 + 摄影师级展示与分享**。最大的产品缺口是「发现能力」——分享、时间轴、搜索、PWA，按 P1 顺序补。
