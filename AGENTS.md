# Repository Guidelines

## 项目结构与模块组织
- Next.js App Router 入口在 `app/layout.tsx` 与 `app/page.tsx`；仪表盘路由集中于 `app/dashboard`（含 `(overview)`、`customers`、`invoices`、动态 `invoices/[id]`），局部布局在 `app/dashboard/layout.tsx`。
- 共享服务器逻辑在 `app/lib/`：`actions.ts`（服务器动作）、`data.ts`（查询）、`definitions.ts`（类型）、`utils.ts` 与 `placeholder-data.ts`（工具/示例数据）。
- UI 组件在 `app/ui/**`，按功能拆分；全局样式 `app/ui/global.css`，字体 `app/ui/fonts.ts`，通用组件如 `acme-logo.tsx`、`button.tsx`。静态资源在 `public/`。
- API/脚本路由：`app/seed/route.ts`（数据库预置）、`app/query/route.ts`（查询示例）。配置文件：`next.config.ts`、`tailwind.config.ts`、`eslint.config.mjs`、`tsconfig.json`、`auth.config.ts` 等。

## 构建、测试与开发命令
- `pnpm install` 安装依赖（以 `pnpm-lock.yaml` 为准）。
- `pnpm dev` 启动本地开发（Turbopack，http://localhost:3000）。
- `pnpm build` 生成生产包；`pnpm start` 以生产模式运行。
- `pnpm lint` 运行 ESLint（Next.js core-web-vitals 规则）。
- 预置数据：配置好环境变量后执行 `curl http://localhost:3000/seed`；`/query` 可用于调试查询。

## 代码风格与命名规范
- TypeScript + React，默认 Server Component，需客户端交互时添加 `"use client"`。
- 组件命名用 PascalCase；文件名用小写短横线或语义词（如 `app/ui/invoices/table.tsx`）；路由遵循 Next.js 约定（`[id]` 动态段、`(overview)` 组）。
- 样式优先 Tailwind 工具类，公共设计令牌在 `tailwind.config.ts`。缩进 2 空格，字符串单引号。避免提交敏感信息，私密配置放 `.env.local`。

## 测试指引
- 当前无自动化测试；至少确保 `pnpm lint` 通过，并手动验证 `/login`、`/dashboard`、发票创建/编辑/搜索/分页。
- 若新增测试，建议对服务器动作（`app/lib/actions.ts`）或关键组件做轻量集成测试；命名 `*.test.ts[x]`，就近放置。

## 提交与 Pull Request
- 使用 Conventional Commit（示例：`refactor: ...`、`build(deps): ...`，可加 scope，祈使语态，英文或中文均可）。
- PR 包含变更摘要、影响的路由/组件、数据库或认证影响；UI 变更附截图/GIF，并列出已执行的检查（lint、build、seed 等）。

## 安全与配置
- 秘密信息仅存于 `.env.local`，勿入库；部署时为 `AUTH_SECRET` 使用 `openssl rand -base64 32` 重新生成。
- Postgres 连接保持 SSL（`POSTGRES_URL`/`DATABASE_URL`）；避免在日志输出凭据。

## 语言与注释
- 本仓库相关的沟通、提交描述、代码注释统一使用简体中文，保持简洁明确；引用外部文档或协议时可保留原文。
