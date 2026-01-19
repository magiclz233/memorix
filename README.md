# Memorix - Next.js (App Router) Gallery

[English](README.md) | [中文](README.zh-CN.md)

Memorix is a modern gallery project built with the Next.js 16 App Router. It features a high-performance public-facing site (photo wall, gallery, portfolio) and a comprehensive admin dashboard for managing content, storage, and business data.

## Features

- **Public Site**: Hero landing, infinite scroll gallery, photo/video collections, portfolio.
- **Admin Dashboard**: Comprehensive management for photos, collections, and system settings.
- **Storage Management**: Support for local file storage and S3-compatible storage with file scanning capabilities.
- **Image Processing**: Automatic BlurHash generation, Exif extraction, and thumbnail creation using Sharp.
- **Authentication**: Secure login via Better Auth (Email/Password + GitHub OAuth).
- **Security**: Route protection via Middleware, role-based access control (Admin only dashboard).
- **Tech**: Server Actions, Postgres (Drizzle ORM), Shadcn UI, Framer Motion.

## Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Language**: TypeScript + React 19
- **Styling**: Tailwind CSS + Shadcn/UI (Radix UI) + Framer Motion
- **Database**: Postgres + Drizzle ORM
- **Auth**: Better Auth
- **Image Processing**: Sharp, BlurHash, Exifr
- **Validation**: Zod

## Getting Started

### 1. Install

```bash
pnpm install
```

### 2. Environment Variables

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

### 3. Database Setup

Start the dev server:
```bash
pnpm dev
```

Run migrations (apply schema changes):
```bash
pnpm drizzle-kit migrate
```

Seed the database (creates default admin & sample data):
```bash
curl http://localhost:3000/seed
# Or on Windows PowerShell:
# Invoke-WebRequest http://localhost:3000/seed
```

### 4. Login

Default Admin Credentials:
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
- `app/lib/`: Shared logic (Server Actions, Drizzle Schema, Utils)
- `app/ui/`: UI Components (Shadcn, Admin, Front)
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
