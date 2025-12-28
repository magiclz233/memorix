# Memorix - Next.js (App Router) Gallery

[English](README.md) | [中文](README.zh-CN.md)

Memorix is a gallery project built with the Next.js App Router. It includes a public-facing site (photo wall, gallery, hero, portfolio) and an admin dashboard for managing content and business data.

## Features

- Public site: hero landing, photo wall, gallery, portfolio
- Admin dashboard: content and business data management
- NextAuth v5: Credentials (email/password) + GitHub OAuth sign-in
- Route protection via `proxy.ts`: unauthenticated users are redirected to `/login`
- Server Actions + Postgres (Drizzle ORM) for server-side data access

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

Run migrations first (creates/updates tables via Drizzle migrations):

```bash
pnpm drizzle-kit migrate
```

Then seed the database (inserts placeholder data):

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
