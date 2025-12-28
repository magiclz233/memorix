# memorix 画廊（Next.js App Router）

[English](README.md) | [中文](README.zh-CN.md)

这是一个基于 Next.js App Router 的画廊项目，包含前端展示站点与管理端 dashboard。前端主要展示照片墙、画廊、Hero 页面与作品集，管理端用于管理内容与业务数据。

## 功能概览

- 前端展示：Hero、照片墙、画廊、作品集
- 管理端 dashboard：内容与业务数据管理
- NextAuth v5：Credentials（邮箱/密码）+ GitHub OAuth 登录
- `proxy.ts` 路由保护：未登录访问 `/dashboard/**` 自动跳转 `/login`
- Server Actions + Postgres（Drizzle ORM）用于服务端数据访问

## 技术栈

- Next.js 16（App Router + Turbopack）
- React + TypeScript
- Tailwind CSS
- NextAuth（v5 beta）
- Postgres（`postgres` client）
- Zod（表单校验）

## 快速开始

### 1）安装依赖

```bash
pnpm install
```

### 2）配置环境变量

推荐使用 `.env.local`（不要提交到仓库）。本项目在服务端读取 `POSTGRES_URL` 连接数据库；NextAuth 需要 `AUTH_SECRET`；GitHub 登录需要 `AUTH_GITHUB_ID/AUTH_GITHUB_SECRET`。

```bash
POSTGRES_URL=postgres://USER:PASSWORD@HOST:PORT/DB
AUTH_SECRET=your-secret
AUTH_GITHUB_ID=your-github-oauth-client-id
AUTH_GITHUB_SECRET=your-github-oauth-client-secret
```

生成 `AUTH_SECRET`（示例）：

```bash
openssl rand -base64 32
```

### 3）预置数据库（仅本地开发建议）

启动开发服务器：

```bash
pnpm dev
```

先运行迁移（通过 Drizzle 迁移创建/更新表结构）：

```bash
pnpm drizzle-kit migrate
```

再访问 `/seed` 写入示例数据（用户/画廊/作品集等）：

```bash
curl http://localhost:3000/seed
```

Windows PowerShell 也可以用：

```bash
Invoke-WebRequest http://localhost:3000/seed
```

### 4）登录验证

预置数据写入后，可以使用默认账号登录：

- 邮箱：`user@nextmail.com`
- 密码：`123456`

## 常用路由

- `/` 前台首页（Hero + 入口）
- `/gallery` 画廊
- `/portfolio` 作品集
- `/login` 管理端登录（Credentials + GitHub）
- `/dashboard` 管理端 dashboard
- `/seed` 预置数据库（仅建议本地开发使用）
- `/query` 查询示例（仅建议本地开发使用）

## 目录结构

- `app/layout.tsx` / `app/page.tsx`：App Router 入口与前台入口
- `app/dashboard/**`：管理端 dashboard 路由
- `app/lib/**`：服务端逻辑（`actions.ts`、`data.ts`、`definitions.ts` 等）
- `app/ui/**`：UI 组件与样式
- `public/**`：静态资源

## 脚本命令

- `pnpm dev`：本地开发（Turbopack）
- `pnpm build`：生产构建
- `pnpm start`：生产启动
- `pnpm lint`：ESLint

## 数据库（Drizzle ORM）

- Drizzle ORM 结构与迁移流程：[`docs/drizzle.md`](docs/drizzle.md)

## 注意事项

- `/seed` 与 `/query` 建议仅用于本地开发，生产环境请移除或增加访问保护。
