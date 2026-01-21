# Memorix - Next.js (App Router) 画廊

[English](README.md) | [中文](README.zh-CN.md)

Memorix 是一个基于 Next.js 16 App Router 的现代画廊项目。它包含高性能的前台展示站点（照片墙、无限滚动画廊、作品集）以及用于管理内容、存储和业务数据的后台管理系统。

## 亮点

- **前台展示**：Hero 落地页、无限滚动画廊、照片/视频合辑、关于与作品集页面。
- **管理后台**：照片、藏品、媒体库、存储与系统设置统一管理。
- **存储管理**：支持本地与 S3 兼容存储，提供文件扫描能力。
- **图像流水线**：BlurHash 生成、EXIF 提取、Sharp 缩略图。
- **身份认证**：Better Auth（邮箱/密码 + GitHub OAuth），后台仅管理员可访问。
- **技术栈**：Server Actions、Postgres（Drizzle ORM）、Shadcn UI、Framer Motion。

## 技术栈

- **框架**：Next.js 16 (App Router + Turbopack)
- **语言**：TypeScript + React 19
- **样式**：Tailwind CSS + Shadcn/UI (Radix UI) + Framer Motion
- **数据库**：Postgres + Drizzle ORM
- **认证**：Better Auth
- **图像处理**：Sharp、BlurHash、Exifr
- **校验**：Zod

## 国际化（i18n）

- **支持语言**：`zh-CN`、`en`
- **路由形式**：语言前缀路由（例如 `/zh-CN`、`/en`、`/zh-CN/gallery`）
- **文案资源**：`messages/zh-CN.json`、`messages/en.json`
- **文档**：`docs/i18n.md`

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env.local`（请勿提交到仓库）。
必需变量：`POSTGRES_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`。
可选变量：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`（用于 OAuth）。

```bash
POSTGRES_URL=postgres://USER:PASSWORD@HOST:PORT/DB
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

生成 Secret：

```bash
openssl rand -base64 32
```

### 3. 运行迁移

```bash
pnpm drizzle-kit migrate
```

### 4. 启动开发服务器

```bash
pnpm dev
```

### 5. 预置数据（可选）

```bash
curl http://localhost:3000/seed
# Windows PowerShell 用户可用：
# Invoke-WebRequest http://localhost:3000/seed
```

### 6. 登录

默认管理员账号：
- **邮箱**：`admin@memorix.com`
- **密码**：`123456`

## 路由说明

### 前台

- `/`：首页（Hero + 精选）
- `/gallery`：主画廊（无限滚动）
- `/photo-collections`：照片合辑
- `/video-collections`：视频合辑
- `/about`：关于页

### 后台

- `/login`：管理员登录
- `/dashboard`：仪表盘概览
- `/dashboard/photos`：照片管理
- `/dashboard/collections`：藏品管理
- `/dashboard/storage`：存储配置与扫描
- `/dashboard/upload`：文件上传
- `/dashboard/media`：媒体库
- `/dashboard/settings`：系统与用户设置

## 项目结构

- `app/(front)/`：前台页面（首页、画廊等）
- `app/dashboard/`：后台管理页面
- `app/api/`：API 路由（认证、画廊、存储）
- `app/lib/`：共享逻辑（Server Actions、Drizzle schema、工具函数）
- `app/ui/`：UI 组件（Shadcn、后台、前台）
- `public/`：静态资源

## 脚本命令

- `pnpm dev`：启动开发服务器
- `pnpm build`：生产环境构建
- `pnpm start`：启动生产服务器
- `pnpm lint`：运行 ESLint
- `pnpm drizzle-kit migrate`：运行数据库迁移

## 数据库

项目使用 Drizzle ORM 进行数据库交互。Schema 定义位于 `app/lib/schema.ts`。
更多详情请参考 [`docs/drizzle.md`](docs/drizzle.md)。

## 注意事项

- `/seed` 路由仅用于开发便利，生产环境请务必保护或禁用。
- 请确保在 `/dashboard/storage` 中配置有效的存储路径，以保证图像处理功能正常运行。
