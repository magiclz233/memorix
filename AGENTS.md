# Repository Guidelines

## 项目结构与模块组织
- **Next.js App Router**
  - 根布局：`app/layout.tsx`
  - 前台入口：`app/(front)/page.tsx`
  - 前台页面：位于 `app/(front)/`，包含 Hero、关于页（`about`）、画廊（`gallery`）、照片集（`photo-collections`）、视频集（`video-collections`）
  - 管理后台：位于 `app/dashboard/`，包含概览、藏品管理（`collections`）、媒体库（`media`）、照片管理（`photos`）、存储配置（`storage`）、上传中心（`upload`）及设置
- **共享逻辑 (`app/lib/`)**
  - `actions.ts`：Server Actions
  - `data.ts` / `front-data.ts` / `media-data.ts`：数据查询
  - `schema.ts`：Drizzle ORM 数据库定义
  - `drizzle.ts`：数据库连接实例
  - `storage.ts` / `storage-scan.ts`：文件存储与扫描逻辑
  - `auth.ts`：Better Auth 配置（位于根目录或 lib 中引用）
- **UI 组件 (`app/ui/`)**
  - 按功能域拆分：`admin`（后台组件）、`dashboard`（仪表盘组件）、`front`（前台组件）、`gallery`（画廊组件）、`photos`（照片管理组件）
  - 通用组件：`acme-logo.tsx`、`button.tsx`、`modal.tsx` 等
- **API 路由**
  - `app/api/auth/[...all]`：Better Auth 处理
  - `app/api/gallery`、`app/api/local-files/[id]`、`app/api/storage/scan`：业务 API

## 构建、测试与开发命令
- `pnpm install`：安装依赖
- `pnpm dev`：启动本地开发（Turbopack，http://localhost:3000）
- `pnpm drizzle-kit migrate`：执行数据库迁移
- `pnpm build`：生成生产包
- `pnpm start`：以生产模式运行
- `pnpm lint`：运行 ESLint
- **数据预置**：配置环境变量后执行 `curl http://localhost:3000/seed`（Windows PowerShell 可用 `Invoke-WebRequest`）

## 技术栈与代码规范
- **核心栈**：Next.js 16、React 19、TypeScript、Tailwind CSS
- **数据与后端**：Postgres + Drizzle ORM，Server Actions 为主
- **认证**：Better Auth（Email/Password 与 GitHub OAuth）
- **UI 库**：Shadcn/UI（Radix UI）+ Framer Motion
- **图像处理**：Sharp + BlurHash + Exifr
- **命名规范**：组件 PascalCase，文件 kebab-case；路由遵循 Next.js 约定
- **提交规范**：Conventional Commits（例如 `feat: add storage scan`）
- **文件编码**：统一使用 UTF-8（无 BOM）

## UI/UX 设计规范
项目现有设计风格：Lumina Pro（流光黑洞 / 极简杂志风）

- **双模态适配**：必须同时支持 Light Mode（默认）与 Dark Mode
- **Light Mode**：极简杂志风，高亮白底（`bg-white` 或 `bg-zinc-50`）、深灰文字、细腻阴影、强调留白
- **Dark Mode**：流光黑洞风，深邃黑底（`dark:bg-zinc-950`），使用 `indigo/violet` 霓虹光晕点缀，玻璃拟态质感
- **色彩系统**：中性色统一使用 Tailwind 的 `zinc` 色系；品牌主色使用 `indigo`；禁止使用纯黑（`#000`）背景
- **组件与材质**
  - **基础组件**：优先复用 `shadcn/ui`，保持一致性
  - **特效组件**：使用 Aceternity UI 风格组件（如 `SpotlightCard`、`DotBackground`）增强层级
  - **玻璃拟态**：侧边栏与浮动层使用 `bg-white/70 backdrop-blur-xl dark:bg-zinc-900/60` 等方案
- **布局与排版**
  - **字体策略**：标题使用 `tracking-tight`；数据与仪表盘读数使用 `font-mono`
  - **画廊布局**：必须使用 Masonry 或虚拟滚动，配合 BlurHash 或 Skeleton 骨架屏，避免 CLS
  - **响应式**：遵循 Mobile-First，复杂表格在移动端转为 Card List
- **交互与动效**
  - **状态反馈**：所有可交互元素需具备 `hover`、`active`、`focus`
  - **动态感知**：耗时操作提供可见的进度/日志反馈，避免静止 Loading
  - **媒体交互**：实况图与视频支持 Hover-to-Play，并有明确角标

## 测试与验证
- 重点验证路径：
  - `/login`：管理员登录
  - `/dashboard`：后台管理功能（尤其是上传与存储配置）
  - `/gallery` 与 `/photo-collections`：前台展示与无限滚动
- 存储验证：确保本地存储或 S3 配置正确，图片可生成缩略图与 BlurHash

## 安全与配置
- 敏感配置（数据库 URL、Auth Secret、OAuth Keys）仅放在 `.env.local`
- 生产部署需重新生成 `BETTER_AUTH_SECRET`（`openssl rand -base64 32`）

## 语言与注释
- 沟通、提交信息、代码注释统一使用简体中文