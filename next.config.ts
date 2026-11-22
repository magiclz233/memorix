import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import dotenv from 'dotenv';
import path from 'path';
import { SECURITY_HEADERS } from './app/lib/security-headers';

// 允许经 next/image 优化的远程域名白名单（逗号分隔，支持 S3/CDN）。
// 默认留空：外部图走 <Image unoptimized> 或本地 /api/media/thumb 代理，
// 绝不使用 hostname '**' 通配——那是 Image Optimization SSRF 的直接触发条件。
const remoteImageHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const securityHeaders = SECURITY_HEADERS.map(([key, value]) => ({ key, value }));

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
      // 外网经反向代理时 Origin 与容器内 Host 不一致，从环境变量读取放行来源，
      // 避免把内网 IP / 域名硬编码进构建产物（换地址就要重新 build）。
      allowedOrigins: Array.from(
        new Set(
          (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
            .split(',')
            .flatMap((value) => {
              const origin = value.trim();
              if (!origin) return [];
              try {
                // 同时放行完整 origin 与裸 host，兼容不同 Next 版本的匹配格式
                const parsed = new URL(origin);
                return [origin, parsed.host];
              } catch {
                return [origin];
              }
            }),
        ),
      ),
    },
  },
  // libheif-js 和 pino 内部使用动态 require/worker 文件，不能被 Next 服务端打包安全静态分析。
  serverExternalPackages: ['heic-convert', 'heic-decode', 'libheif-js', 'pino'],
  // 隐藏 Next.js 版本信息
  poweredByHeader: false,
  images: {
    remotePatterns: remoteImageHosts.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
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
