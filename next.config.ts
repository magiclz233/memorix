import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import dotenv from 'dotenv';
import path from 'path';

// 本地开发时加载环境特定配置（Vercel 上通过 Dashboard 配置环境变量）
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const appEnv = process.env.APP_ENV || 'dev';
  console.log(`[Next.js Config] Loading environment: ${appEnv}`);

  dotenv.config({
    path: path.resolve(process.cwd(), `.env.${appEnv}`),
    override: true,
  });
}

const nextConfig: NextConfig = {
  // 注意：Vercel 部署不需要 standalone，本地 Docker 部署时可开启
  // output: 'standalone',
  // 隐藏 Next.js 版本信息
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // 优先 AVIF，降级 WebP
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  // 生产环境移除 console（保留 error/warn）
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
