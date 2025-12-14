# Next.js Dashboard (App Router)

[English](README.md) | [中文](README.zh-CN.md)

An example dashboard app built with the Next.js App Router. It includes authentication, invoices/customers pages, server-side data access, and Server Actions—useful as a learning project or a starter for further customization.

## Features

- NextAuth v5: Credentials (email/password) + GitHub OAuth sign-in
- Route protection via `proxy.ts`: unauthenticated users are redirected to `/login`
- Dashboard overview: cards, revenue chart, latest invoices (Suspense + Skeleton)
- Customers: list + search
- Invoices: search, pagination, create/edit (parallel + intercepting routes as modal), delete, error boundary, not-found

## Tech Stack

- Next.js 16 (App Router + Turbopack)
- React + TypeScript
- Tailwind CSS
- NextAuth (v5 beta)
- Postgres (`postgres` client)
- Zod (validation)

## Getting Started

### 1) Install

```bash
pnpm install
```

### 2) Environment Variables

Prefer `.env.local` (do not commit it). This project reads `POSTGRES_URL` for Postgres access. NextAuth needs `AUTH_SECRET`, and GitHub sign-in needs `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`.

```bash
POSTGRES_URL=postgres://USER:PASSWORD@HOST:PORT/DB
AUTH_SECRET=your-secret
AUTH_GITHUB_ID=your-github-oauth-client-id
AUTH_GITHUB_SECRET=your-github-oauth-client-secret
```

### 3) Seed Database (Dev Only)

Start the dev server:

```bash
pnpm dev
```

Then seed the database (creates `users/customers/invoices/revenue` and inserts placeholder data):

```bash
curl http://localhost:3000/seed
```

On Windows PowerShell:

```bash
Invoke-WebRequest http://localhost:3000/seed
```

### 4) Login

After seeding, you can sign in with the default credentials:

- Email: `user@nextmail.com`
- Password: `123456`

## Routes

- `/` Home
- `/login` Login (Credentials + GitHub)
- `/dashboard` Overview
- `/dashboard/customers` Customers
- `/dashboard/invoices` Invoices (search/pagination/create/edit/delete)
- `/seed` Seed database (dev only)
- `/query` Example query (dev only)

## Project Structure

- `app/layout.tsx` / `app/page.tsx`: App Router entry
- `app/dashboard/**`: dashboard routes (`(overview)`, `customers`, `invoices`, dynamic routes)
- `app/lib/**`: server logic (`actions.ts` Server Actions, `data.ts` queries, `definitions.ts` types)
- `app/ui/**`: UI components and styles
- `public/**`: static assets

## Scripts

- `pnpm dev`: dev server (Turbopack)
- `pnpm build`: production build
- `pnpm start`: production start
- `pnpm lint`: ESLint

## Notes

- Keep `/seed` and `/query` for local development only; remove them or add access protection in production.
