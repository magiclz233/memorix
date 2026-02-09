import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import * as dotenv from 'dotenv';
import path from 'path';

// 1. Load main .env (Next.js does this automatically, but we do it to ensure we have APP_ENV available if run outside Next context, though next.config.ts implies Next context)
// Actually, relying on process.env.APP_ENV is safe if Next.js loaded .env.
// But to be safe and consistent with drizzle.config.ts:
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const appEnv = process.env.APP_ENV || 'dev';
console.log(`[Next.js Config] Loading environment: ${appEnv}`);

// 2. Load specific env file based on APP_ENV
dotenv.config({ 
  path: path.resolve(process.cwd(), `.env.${appEnv}`), 
  override: true 
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
