# Memorix - Next.js (App Router) Gallery

[English](README.md) | [中文](README.zh-CN.md)

Memorix is a modern gallery built on the Next.js 16 App Router. It includes a high-performance public site (photo wall, infinite gallery, portfolios) and an admin dashboard for managing content, storage, and system data.

## Highlights

- **Public Site**: Hero landing, infinite scroll gallery, photo/video collections, about and portfolio pages.
- **Admin Dashboard**: Manage photos, collections, media library, storage, and system settings.
- **Storage Management**: Local and S3-compatible storage with file scanning.
- **Image Pipeline**: BlurHash generation, EXIF extraction, and thumbnails via Sharp.
- **Authentication**: Better Auth (Email/Password + GitHub OAuth) with admin-only access control.
- **Tech**: Server Actions, Postgres (Drizzle ORM), Shadcn UI, Framer Motion.

## Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Language**: TypeScript + React 19
- **Styling**: Tailwind CSS + Shadcn/UI (Radix UI) + Framer Motion
- **Database**: Postgres + Drizzle ORM
- **Auth**: Better Auth
- **Image Processing**: Sharp, BlurHash, Exifr
- **Validation**: Zod

## Internationalization (i18n)

- **Supported locales**: `zh-CN`, `en`
- **Routing**: Locale-prefixed routes (e.g. `/zh-CN`, `/en`, `/zh-CN/gallery`)
- **Messages**: `messages/zh-CN.json`, `messages/en.json`
- **Docs**: `docs/i18n.md`

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create `.env.local` (do not commit it).
Required variables: `POSTGRES_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
Optional: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (for OAuth).

```bash
POSTGRES_URL=postgres://USER:PASSWORD@HOST:PORT/DB
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Generate a secret:

```bash
openssl rand -base64 32
```

### 3. Run migrations

```bash
pnpm drizzle-kit migrate
```

### 4. Start the dev server

```bash
pnpm dev
```

### 5. Seed data (optional)

```bash
curl http://localhost:3000/seed
# Or on Windows PowerShell:
# Invoke-WebRequest http://localhost:3000/seed
```

### 6. Login

Default admin credentials:
- **Email**: `admin@memorix.com`
- **Password**: `123456`

## Routes

### Public

- `/`: Home (Hero + Highlights)
- `/gallery`: Main Gallery (Infinite Scroll)
- `/photo-collections`: Photo Sets
- `/video-collections`: Video Sets
- `/about`: About Page

### Admin

- `/login`: Admin Login
- `/dashboard`: Dashboard Overview
- `/dashboard/photos`: Photo Management
- `/dashboard/collections`: Collection Management
- `/dashboard/storage`: Storage Configuration & Scanning
- `/dashboard/upload`: File Upload
- `/dashboard/media`: Media Library
- `/dashboard/settings`: System & User Settings

## Project Structure

- `app/(front)/`: Public pages (Home, Gallery, etc.)
- `app/dashboard/`: Admin dashboard pages
- `app/api/`: API routes (Auth, Gallery, Storage)
- `app/lib/`: Shared logic (Server Actions, Drizzle schema, utilities)
- `app/ui/`: UI components (Shadcn, Admin, Front)
- `public/`: Static assets

## Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Build for production
- `pnpm start`: Start production server
- `pnpm lint`: Run ESLint
- `pnpm drizzle-kit migrate`: Run database migrations

## Database

Drizzle ORM is used for database interactions. Schema definitions are in `app/lib/schema.ts`.
See [`docs/drizzle.md`](docs/drizzle.md) for more details.

## Notes

- The `/seed` route is for development convenience. Secure or disable it in production.
- Ensure your storage configuration is valid in `/dashboard/storage` for image features to work correctly.
