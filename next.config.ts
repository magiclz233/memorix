import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import dotenv from 'dotenv';
import path from 'path';

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self' blob: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

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
  // Docker 部署需要 standalone 产物（Dockerfile 会 COPY .next/standalone）
  output: 'standalone',
  experimental: {
    serverActions: {
      // 外网经绿联 UGLink 反向代理，Origin 与容器内 Host 不一致，放行这些来源
      allowedOrigins: [
        'app-30001-3d2y.cn44.ugdocker.link',
        'app-3000-3d2y.cn44.ugdocker.link',
        '192.168.0.105:30001',
      ],
    },
  },
  // libheif-js 和 pino 内部使用动态 require/worker 文件，不能被 Next 服务端打包安全静态分析。
  serverExternalPackages: ['heic-convert', 'heic-decode', 'libheif-js', 'pino'],
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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);
