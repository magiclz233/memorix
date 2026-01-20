# Repository Guidelines

## 项目结构与模块组织
- **Next.js App Router**
  - 根布局：`app/layout.tsx`
  - 前台入口：`app/(front)/page.tsx`
  - 前台页面：位于 `app/(front)/`，包含 Hero、关于页（`about`）、画廊（`gallery`）、照片集（`photo-collections`）、视频集（`video-collections`）
  - 管理后台：位于 `app/dashboard/`，包含概览、藏品管理（`collections`）、媒体库（`media`）、照片管理（`photos`）、存储配置（`storage`）、上传中心（`upload`）及设置
- **共享逻辑（`app/lib/`）**
  - `actions.ts`：Server Actions
  - `data.ts` / `front-data.ts` / `media-data.ts`：数据查询
  - `schema.ts`：Drizzle ORM 数据库定义
  - `drizzle.ts`：数据库连接实例
  - `storage.ts` / `storage-scan.ts`：文件存储与扫描逻辑
  - `auth.ts`：Better Auth 配置（位于根目录或 `app/lib` 中引用）
- **UI 组件（`app/ui/`）**
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
- **可直接使用的 UI/Block 来源（基于 Shadcn 兼容体系）**
  - **Magic UI**
  - **Aceternity UI**
  - **React Bits**
  - **Animata.design**
  - **Kibo UI**
  - **Shadcn Blocks**
  - **Cult UI（cult-ui.vercel.app）**
  - **Shadcn Studio**
  - **Shadcn Examples（shadcnexamples.com）**
- **适用场景建议（按来源）**
  - **Magic UI**：视觉冲击型 Hero、渐变/光晕背景、登录页引导区
  - **Aceternity UI**：玻璃拟态卡片、Spotlight/光斑背景、首页首屏与画廊封面
  - **React Bits**：小而精的交互组件（徽章、统计卡片、标签组）
  - **Animata.design**：高质量动效区块、滚动展示、分段叙事布局
  - **Kibo UI**：偏产品化的表单、设置页、管理后台常用模块
  - **Shadcn Blocks**：通用业务块（Hero、Features、CTA、Pricing）
  - **Cult UI**：强视觉风格的展示页、品牌感组件（需对齐色板）
  - **Shadcn Studio**：仪表盘/管理后台模板与数据密集型布局
  - **Shadcn Examples**：基础布局与常见交互样例（快速对齐规范）
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
  - **特效组件**：可采用 Aceternity/Magic UI 等风格组件（如 `SpotlightCard`、`DotBackground`）增强层级
  - **玻璃拟态**：侧边栏与浮动层使用 `bg-white/70 backdrop-blur-xl dark:bg-zinc-900/60` 等方案
- **布局与排版**
  - **字体策略**：标题使用 `tracking-tight`；数据与仪表盘读数使用 `font-mono`
  - **画廊布局**：必须使用 Masonry 或虚拟滚动，配合 BlurHash 或 Skeleton 骨架屏，避免 CLS
  - **响应式**：遵循 Mobile-First，复杂表格在移动端转为 Card List
- **交互与动效**
  - **状态反馈**：所有可交互元素需具备 `hover`、`active`、`focus`
  - **动态感知**：耗时操作提供可见的进度/日志反馈，避免静止 Loading
  - **媒体交互**：实况图与视频支持 Hover-to-Play，并有明确角标

## UI 组件与 Block 使用规则
- 优先选择 **Shadcn 兼容** 的组件或 Block，避免引入新设计系统造成割裂
- 使用 Magic UI / Aceternity / React Bits / Animata / Kibo UI / Shadcn Blocks 等 Block 时需：
  - 对齐现有色板与材质（zinc + indigo、玻璃拟态、Light/Dark 双模态）
  - 替换为本项目的 Button/Input/Modal 等基础组件，避免重复实现
  - 控制动效密度，保留 1~2 个关键动效即可
  - 保持模块化：Block 落在 `app/ui/<domain>` 或 `components/`，避免散落
  - 交互态必须完整（hover/active/focus/disabled），并保持键盘可达

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
