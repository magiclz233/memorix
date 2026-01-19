# Memorix - Next.js (App Router) 画廊

[English](README.md) | [中文](README.zh-CN.md)

Memorix 是一个基于 Next.js 16 App Router 构建的现代画廊项目。它包含一个高性能的前台展示站点（照片墙、无限滚动画廊、作品集）以及一个功能完善的管理后台，用于管理内容、存储和业务数据。

## 功能特性

- **前台展示**：Hero 落地页、无限滚动画廊、照片/视频合集、关于页。
- **管理后台**：全功能的后台管理，涵盖照片、藏品、系统设置等。
- **存储管理**：支持本地文件存储与 S3 兼容存储，并具备文件扫描功能。
- **图像处理**：自动生成 BlurHash、提取 Exif 信息，并使用 Sharp 生成缩略图。
- **身份认证**：基于 Better Auth 的安全登录（支持邮箱/密码 + GitHub OAuth）。
- **安全机制**：通过中间件进行路由保护，基于角色的访问控制（仅管理员可访问后台）。
- **技术栈**：Server Actions、Postgres (Drizzle ORM)、Shadcn UI、Framer Motion。

## 技术栈

- **框架**：Next.js 16 (App Router + Turbopack)
- **语言**：TypeScript + React 19
- **样式**：Tailwind CSS + Shadcn/UI (Radix UI) + Framer Motion
- **数据库**：Postgres + Drizzle ORM
- **认证**：Better Auth
- **图像处理**：Sharp, BlurHash, Exifr
- **校验**：Zod

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

创建 `.env.local` 文件（请勿提交到仓库）。
必需变量：`POSTGRES_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`。
可选变量：`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`（用于 OAuth）。

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

### 3. 数据库设置

启动开发服务器：
```bash
pnpm dev
```

运行迁移（应用数据库变更）：
```bash
pnpm drizzle-kit migrate
```

预置数据（创建默认管理员与示例数据）：
```bash
curl http://localhost:3000/seed
# Windows PowerShell 用户：
# Invoke-WebRequest http://localhost:3000/seed
```

### 4. 登录

默认管理员账号：
- **邮箱**: `admin@memorix.com`
- **密码**: `123456`

## 路由说明

### 前台
- `/`: 首页（Hero + 精选）
- `/gallery`: 主画廊（无限滚动）
- `/photo-collections`: 照片合集
- `/video-collections`: 视频合集
- `/about`: 关于页

### 后台
- `/login`: 管理员登录
- `/dashboard`: 仪表盘概览
- `/dashboard/photos`: 照片管理
- `/dashboard/collections`: 藏品管理
- `/dashboard/storage`: 存储配置与扫描
- `/dashboard/upload`: 文件上传
- `/dashboard/media`: 媒体库
- `/dashboard/settings`: 系统与用户设置

## 项目结构

- `app/(front)/`: 前台页面（首页、画廊等）
- `app/dashboard/`: 后台管理页面
- `app/api/`: API 路由（认证、画廊、存储）
- `app/lib/`: 共享逻辑（Server Actions、Drizzle Schema、工具函数）
- `app/ui/`: UI 组件（Shadcn、后台、前台）
- `public/`: 静态资源

## 脚本命令

- `pnpm dev`: 启动开发服务器
- `pnpm build`: 生产环境构建
- `pnpm start`: 启动生产服务器
- `pnpm lint`: 运行 ESLint 代码检查
- `pnpm drizzle-kit migrate`: 运行数据库迁移

## 数据库

项目使用 Drizzle ORM 进行数据库交互。Schema 定义位于 `app/lib/schema.ts`。
更多详情请参阅 [`docs/drizzle.md`](docs/drizzle.md)。

## 注意事项

- `/seed` 路由仅用于开发便利，生产环境请务必保护或禁用。
- 请确保在 `/dashboard/storage` 中配置有效的存储路径，以保证图片功能的正常运行。
