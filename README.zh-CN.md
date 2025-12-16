# Next.js Dashboard（App Router）

[English](README.md) | [中文](README.zh-CN.md)

这是一个基于 Next.js App Router 的示例仪表盘项目，整合了登录鉴权、Postgres 数据访问、Server Actions、Suspense Streaming、以及发票/客户等典型业务页面，适合作为学习与二次开发的起点。

## 功能概览

- NextAuth v5：Credentials（邮箱/密码）+ GitHub OAuth 登录
- `proxy.ts` 路由保护：未登录访问 `/dashboard/**` 自动跳转 `/login`
- Dashboard 概览：卡片指标、营收图表、最新发票（Suspense + Skeleton）
- Customers：客户列表与搜索
- Invoices：搜索、分页、新增/编辑（并行路由 + 拦截路由弹窗）、删除、error boundary、not-found

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

再访问 `/seed` 写入示例数据（`users/customers/invoices/revenue`）：

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

- `/` 首页
- `/login` 登录页（Credentials + GitHub）
- `/dashboard` 概览
- `/dashboard/customers` 客户列表
- `/dashboard/invoices` 发票列表（搜索/分页/新增/编辑/删除）
- `/seed` 预置数据库（仅建议本地开发使用）
- `/query` 查询示例（仅建议本地开发使用）

## 目录结构

- `app/layout.tsx` / `app/page.tsx`：App Router 入口
- `app/dashboard/**`：仪表盘路由（含 `(overview)`、`customers`、`invoices`、动态路由等）
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
