# Drizzle ORM（Postgres）使用与迁移流程（Next.js App Router）

本文档面向本仓库：使用 `drizzle-orm` + `drizzle-kit` 管理 Postgres 表结构与迁移，并在 Next.js（App Router）中进行服务端查询与写入。

## 目录

- [1. 关键概念与目录](#1-关键概念与目录)
- [2. 新建项目/可清库（方案 A）](#2-新建项目可清库方案-a)
- [3. 旧项目改造/不可清库（方案 B）](#3-旧项目改造不可清库方案-b)
- [4. 日常迭代（新增字段/新增表）](#4-日常迭代新增字段新增表)
- [5. `push` 怎么用（开发期快速同步）](#5-push-怎么用开发期快速同步)
- [6. 在本项目中如何使用 Drizzle（示例）](#6-在本项目中如何使用-drizzle示例)
- [7. 从 Next.js 原生 DB/SQL 写法迁移到 Drizzle](#7-从-nextjs-原生-dbsql-写法迁移到-drizzle)
- [8. 验证与排错](#8-验证与排错)

## 1. 关键概念与目录

- 结构真相源：`app/lib/schema.ts`（所有表结构在这里维护）
- 数据库连接：`app/lib/drizzle.ts`（读取 `POSTGRES_URL`，导出 `db`）
- 迁移目录：`drizzle/`（`drizzle-kit generate` 生成的 SQL 迁移文件）
- 迁移元数据：`drizzle/meta/*`（快照与 journal，用于生成差异）
- 数据库侧迁移记账表：`drizzle.__drizzle_migrations`（`migrate` 自动创建/写入）

约定建议：

- 结构变更默认走 `generate` + `migrate`（可追踪、适合生产）。
- `/seed` 只负责插入示例数据，不再负责建表（避免与迁移体系冲突），不要在生产环境中使用，打包上生产时请注释掉。

## 2. 新建项目/可清库（方案 A）

适用场景：新项目，或者开发库允许 drop/recreate（没有需要保留的历史数据）。

### 2.1 安装依赖（新项目才需要）

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### 2.2 建立 Drizzle 配置与连接（新项目才需要）

1) 创建 `drizzle.config.ts`（本仓库已存在），至少包含：

- `schema: './app/lib/schema.ts'`
- `out: './drizzle'`
- `dialect: 'postgresql'`
- `dbCredentials.url: process.env.POSTGRES_URL`

2) 创建 `app/lib/drizzle.ts`（本仓库已存在），导出 `db`。

### 2.3 配置环境变量

推荐放 `.env.local`（不要提交）：

```bash
POSTGRES_URL=postgres://USER:PASSWORD@HOST:PORT/DB
```

本仓库默认在 `app/lib/drizzle.ts` 使用 `ssl: 'require'`；如果本地 Postgres 不支持 SSL，需要自行调整。

### 2.4 初始化建表（迁移驱动）

1) 在 `app/lib/schema.ts` 定义表结构（本仓库已存在）。
2) 生成初始迁移（只生成文件，不改库）：

```bash
pnpm drizzle-kit generate --name init
```

3) 应用迁移（真正建表）：

```bash
pnpm drizzle-kit migrate
```

### 2.5 写入示例数据（可选）

先迁移，再 seed：

```bash
pnpm dev
curl http://localhost:3000/seed
```

## 3. 旧项目改造/不可清库（方案 B）

适用场景：数据库里已经有表与数据（例如最初通过 `/seed` 或手工 SQL 建表），不能清库，需要把迁移体系“接入”进来。

目标：

- 让数据库开始记录迁移（`drizzle.__drizzle_migrations`）。
- 从此以后结构变更全部走迁移文件。
- `/seed` 仅插入数据，不再建表。

### 3.1 前置检查（强烈建议）

- 确认 `.env.local` / `.env` 里的 `POSTGRES_URL` 指向正确数据库。
- 建议先备份数据库（至少备份 `users` 等关键表）。

### 3.2 建立/对齐 `schema.ts`

让 `app/lib/schema.ts` 表达“你期望的最终结构”（这会成为后续差异生成的依据）。

> 如果你不确定现有库真实结构，建议先跑 `pnpm drizzle-kit introspect`（也叫 `pull`）从数据库生成结构文件，再对照迁移到 `app/lib/schema.ts`。

### 3.3 生成基线迁移（baseline）

```bash
pnpm drizzle-kit generate --name baseline
```

会生成：

- `drizzle/0000_baseline.sql`
- `drizzle/meta/_journal.json`
- `drizzle/meta/0000_snapshot.json`

### 3.4 把基线迁移改成“幂等且安全”

因为旧库里表通常已存在，如果 `0000_baseline.sql` 里是裸 `CREATE TABLE ...`，第一次 `migrate` 就会报错；建议改成幂等：

- `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
- 外键/索引/约束：用 `DO $$ ... IF NOT EXISTS (...) THEN ... END IF; $$` 包一层
- 如果迁移里用了 `gen_random_uuid()`，通常需要启用 `pgcrypto` 扩展（无权限环境下可跳过，并在数据库侧提前启用）

本仓库示例：`drizzle/0000_baseline.sql` 已做了上述幂等处理。

### 3.5 应用基线迁移（开始“记账”）

```bash
pnpm drizzle-kit migrate
```

这一步会创建/写入 `drizzle.__drizzle_migrations`，并把基线迁移记录为已执行（即使表已存在也不会失败）。

### 3.6 对“已有表补列/修复默认值/修复数据”（推荐用自定义迁移）

注意：即使 `0000_baseline.sql` 里包含某些列，只要表已经存在，`CREATE TABLE IF NOT EXISTS` 就不会补列；补列必须靠 `ALTER TABLE`。

生成一个自定义迁移：

```bash
pnpm drizzle-kit generate --custom --name fix-existing-db
```

在生成的 `drizzle/0001_fix-existing-db.sql` 里写 `ALTER TABLE ...`，例如：

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(50);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
UPDATE "users" SET "role" = 'user' WHERE "role" IS NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image_url" varchar(255);
```

再执行：

```bash
pnpm drizzle-kit migrate
```

本仓库示例：`drizzle/0001_fix-users-role-image-url.sql`。

### 3.7 把 `/seed` 改为“只插入数据”

旧模式常见写法是 `/seed` 里先 `CREATE TABLE IF NOT EXISTS ...` 再插入数据；切换迁移后建议移除建表逻辑，只保留插入（并确保先跑迁移再 seed）。

本仓库示例：`app/seed/route.ts` 已移除建表 SQL。

## 4. 日常迭代（新增字段/新增表）

推荐流程（可追踪，适合生产）：

1) 修改 `app/lib/schema.ts`（新增列/新增表/新增关系）
2) 生成迁移文件：

```bash
pnpm drizzle-kit generate --name add-something
```

3) 检查 `drizzle/*.sql` 是否符合预期（重点关注 `DROP`、`ALTER` 是否会影响数据）
4) 应用到数据库：

```bash
pnpm drizzle-kit migrate
```

## 5. `push` 怎么用（开发期快速同步）

`push` 适合开发期快速把 `schema.ts` 的变化“直接同步”到数据库（更自动，但不够可审计）。

```bash
pnpm drizzle-kit push
```

建议使用方式：

- 仅用于本地/临时环境；生产环境优先 `generate+migrate`。
- 遇到重命名/删除列：优先用自定义迁移显式写 SQL，避免误操作。

常用辅助命令：

- 检查迁移/元数据状态：`pnpm drizzle-kit check`
- 从数据库拉取结构（辅助对齐旧库）：`pnpm drizzle-kit introspect`

## 6. 在本项目中如何使用 Drizzle（示例）

### 6.1 数据库实例放在哪里？

- `app/lib/drizzle.ts`：初始化 `postgres` client，并 `drizzle(client, { schema })` 导出 `db`
- `app/lib/schema.ts`：`pgTable(...)` 定义表结构与关系（`relations`）

使用约束：

- 只能在服务端代码使用 `db`（Server Components / Route Handlers / Server Actions）。
- 客户端组件（含 `"use client"`）不要直接引入 `db`，需要通过 Server Action 或 Route Handler 访问数据库。

### 6.2 示例：查询（列表/分页/模糊搜索）

`app/lib/data.ts` 里展示了：

- `ilike`/`or` 组合搜索
- `leftJoin` 关联查询
- `count()` 做分页统计

示意（与本项目写法一致，省略部分字段）：

```ts
const searchFilter = or(
  ilike(customers.name, searchTerm),
  ilike(customers.email, searchTerm),
);

const data = await db
  .select({ id: invoices.id, name: customers.name })
  .from(invoices)
  .leftJoin(customers, eq(invoices.customerId, customers.id))
  .where(searchFilter);
```

### 6.3 示例：关系查询（with customer）

`app/lib/data.ts` 的 `fetchLatestInvoices()` 使用了：

- `db.query.invoices.findMany({ with: { customer: true } })`

这依赖于 `app/lib/schema.ts` 中的 `relations(...)` 定义。

### 6.4 示例：写入/更新/删除（Server Actions）

`app/lib/actions.ts` 里是典型模式：

- Zod 校验输入
- `db.insert(...)` / `db.update(...)` / `db.delete(...)`
- 必要时 `revalidatePath(...)` 刷新页面数据

### 6.5 示例：鉴权回调中同步用户信息

`auth.ts` 的 GitHub 登录回调中会：

- 通过 `db.query.users.findFirst(...)` 查用户
- 若不存在则 `db.insert(users).values(...)` 写入（同步 `imageUrl` 等字段）

## 7. 从 Next.js 原生 DB/SQL 写法迁移到 Drizzle

这里的“原生写法”通常指：

- 直接用 `postgres`/`pg`/`@vercel/postgres` 写 SQL（模板字符串/`sql` tag）
- 手写 `SELECT ... JOIN ... WHERE ...` 并手动映射字段

迁移建议按“渐进式替换”做，不要一次性重写所有查询。

### 7.1 迁移步骤（推荐顺序）

1) 引入/对齐表结构：把现有表定义到 `app/lib/schema.ts`
2) 建立数据库实例：`app/lib/drizzle.ts` 导出 `db`
3) 先把“读操作”迁移为 Drizzle 查询（风险低）
4) 再迁移“写操作”（插入/更新/删除），并补齐约束/默认值
5) 最后把“建表 SQL”从 seed/脚本里移除，统一交给迁移体系

### 7.2 SQL 到 Drizzle 的对照（本仓库已有示例）

在 `app/lib/data.ts` 里保留过一段“原生 SQL 写法”的注释（`SELECT ... JOIN ...`），并替换成了 Drizzle 的关联查询与字段映射。迁移时可以按这个思路：

- 先做到“查询结果结构一致”（保证 UI 不改或少改）
- 再逐步把手写 join 替换成 `relations` + `with`

### 7.3 迁移时的常见注意点

- 字段命名：数据库列通常是 `snake_case`（如 `image_url`），代码属性可用 `camelCase`（如 `imageUrl`），在 `schema.ts` 里通过 `varchar('image_url', ...)` 映射。
- 默认值/扩展：`uuid` 默认值用 `gen_random_uuid()` 需要 `pgcrypto`；如果你用的是 `uuid_generate_v4()` 则需要 `uuid-ossp`。
- 旧数据修复：默认值只影响新行；历史行需要 `UPDATE`（建议放在自定义迁移里）。

### 7.4 从 `@vercel/postgres`（Next.js Learn 常见写法）迁移

如果你之前是 Next.js Learn/模板那种写法（例如 `import { sql } from '@vercel/postgres'`，然后 `await sql\`SELECT ...\``），迁移到 Drizzle 通常按下面做：

1) 把 SQL 里涉及的表全部落到 `app/lib/schema.ts`（列名保持数据库真实列名，例如 `image_url`）
2) 用 `app/lib/drizzle.ts` 提供的 `db` 替换 `sql` 的数据库访问入口
3) 逐个把 `sql\`...\`` 查询替换为 Drizzle 查询（先读后写），并保持返回数据结构不变，避免 UI 大改
4) 把“建表 SQL”（如果以前写在 seed/脚本里）迁移到 `generate+migrate`；旧库按方案 B 做 baseline + 补丁迁移

## 8. 验证与排错

### 8.1 验证迁移是否记录

```sql
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;
```

### 8.2 验证某表列是否存在

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY column_name;
```

### 8.3 常见问题

- 迁移没生效：多数是 `POSTGRES_URL` 指向了另一套库
- 表/约束已存在导致失败：把基线迁移改成幂等（`IF NOT EXISTS` / `DO $$ ... $$`）
- `gen_random_uuid()` 不存在：在数据库启用 `pgcrypto`，或改用 `uuid-ossp` 的 `uuid_generate_v4()`
