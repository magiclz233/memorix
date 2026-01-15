# Memorix - Next.js (App Router) Gallery

[English](README.md) | [中文](README.zh-CN.md)

Memorix is a gallery project built with the Next.js App Router. It includes a public-facing site (photo wall, gallery, hero, portfolio) and an admin dashboard for managing content and business data.

## Features

- Public site: hero landing, photo wall, gallery, portfolio
- Admin dashboard: content and business data management
- Better Auth: Email/password + GitHub OAuth sign-in
- Route protection via `proxy.ts`: admin-only `/dashboard`, public front pages
- Server Actions + Postgres (Drizzle ORM) for server-side data access

## Tech Stack

- Next.js 16 (App Router + Turbopack)
- React + TypeScript
- Tailwind CSS
- Better Auth
- Postgres (`postgres` client)
- Zod (validation)

## Getting Started

### 1) Install

```bash
pnpm install
```

### 2) Environment Variables

Prefer `.env.local` (do not commit it). This project reads `POSTGRES_URL` for Postgres access. Better Auth needs `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`, and GitHub sign-in needs `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.

```bash
POSTGRES_URL=postgres://USER:PASSWORD@HOST:PORT/DB
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
```

### 3) Seed Database (Dev Only)

Start the dev server:

```bash
pnpm dev
```

Run migrations first (creates/updates tables via Drizzle migrations):

```bash
pnpm drizzle-kit migrate
```

Then seed the database (inserts placeholder data and the default admin):

```bash
curl http://localhost:3000/seed
```

On Windows PowerShell:

```bash
Invoke-WebRequest http://localhost:3000/seed
```

### 4) Login

After seeding, you can sign in with the default admin:

- Email: `admin@memorix.com`
- Password: `123456`

## Routes

- `/` Public home (hero + highlights)
- `/gallery` Gallery
- `/portfolio` Portfolio
- `/login` Admin login (Credentials + GitHub)
- `/dashboard` Admin dashboard
- `/seed` Seed database (dev only)
- `/query` Example query (dev only)

## Project Structure

- `app/layout.tsx` / `app/page.tsx`: App Router entry and public site entry
- `app/dashboard/**`: admin dashboard routes
- `app/lib/**`: server logic (`actions.ts` Server Actions, `data.ts` queries, `definitions.ts` types)
- `app/ui/**`: UI components and styles
- `public/**`: static assets

## Scripts

- `pnpm dev`: dev server (Turbopack)
- `pnpm build`: production build
- `pnpm start`: production start
- `pnpm lint`: ESLint

## Database (Drizzle ORM)

- Drizzle ORM schema & migration guide: [`docs/drizzle.md`](docs/drizzle.md)

## Notes

- Keep `/seed` and `/query` for local development only; remove them or add access protection in production.
