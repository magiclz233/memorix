# Repository Guidelines

## 项目结构与模块组织
- **Next.js App Router**：
  - 根布局：`app/layout.tsx`。
  - 前台入口：`app/(front)/page.tsx`。
  - 前台页面：位于 `app/(front)/`，包含 Hero、关于页 (`about`)、画廊 (`gallery`)、照片集 (`photo-collections`)、视频集 (`video-collections`)。
  - 管理后台：位于 `app/dashboard/`，包含概览、藏品管理 (`collections`)、媒体库 (`media`)、照片管理 (`photos`)、存储配置 (`storage`)、上传中心 (`upload`) 及设置。
- **共享逻辑 (`app/lib/`)**：
  - `actions.ts`：Server Actions。
  - `data.ts` / `front-data.ts` / `media-data.ts`：数据查询。
  - `schema.ts`：Drizzle ORM 数据库定义。
  - `drizzle.ts`：数据库连接实例。
  - `storage.ts` / `storage-scan.ts`：文件存储与扫描逻辑。
  - `auth.ts`：Better Auth 配置（位于根目录或 lib 中引用）。
- **UI 组件 (`app/ui/`)**：
  - 按功能域拆分：`admin`（后台组件）、`dashboard`（仪表盘组件）、`front`（前台组件）、`gallery`（画廊组件）、`photos`（照片管理组件）。
  - 通用组件：`acme-logo.tsx`、`button.tsx`、`modal.tsx` 等。
- **API 路由**：
  - `app/api/auth/[...all]`：Better Auth 处理。
  - `app/api/gallery`、`app/api/local-files/[id]`、`app/api/storage/scan`：业务 API。

## 构建、测试与开发命令
- `pnpm install`：安装依赖。
- `pnpm dev`：启动本地开发（Turbopack，http://localhost:3000）。
- `pnpm drizzle-kit migrate`：执行数据库迁移。
- `pnpm build`：生成生产包；`pnpm start`：以生产模式运行。
- `pnpm lint`：运行 ESLint。
- **数据预置**：配置环境变量后执行 `curl http://localhost:3000/seed`（初始化管理员与基础数据）。

## 技术栈与代码规范
- **核心栈**：Next.js 16、React 19、TypeScript、Tailwind CSS。
- **数据与后端**：Postgres + Drizzle ORM，Server Actions 为主。
- **认证**：Better Auth（支持 Email/Password 与 GitHub OAuth）。
- **UI 库**：Shadcn/UI (Radix UI) + Framer Motion。
- **图像处理**：Sharp + BlurHash + Exifr。
- **命名规范**：组件 PascalCase，文件 kebab-case；路由遵循 Next.js 约定。
- **提交规范**：Conventional Commits (e.g., `feat: add storage scan`, `fix: gallery layout`)。

## 测试与验证
- 重点验证路径：
  - `/login`：管理员登录。
  - `/dashboard`：后台管理功能（特别是上传与存储配置）。
  - `/gallery` & `/photo-collections`：前台展示与无限滚动。
- 存储验证：确保本地存储或 S3 配置正确，图片能生成缩略图与 BlurHash。

## 安全与配置
- 敏感配置（数据库 URL、Auth Secret、OAuth Keys）仅放于 `.env.local`。
- 生产部署需重新生成 `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)。

## 语言与注释
- 沟通、提交信息、代码注释统一使用 **简体中文**。
