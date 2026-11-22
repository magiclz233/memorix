/**
 * 统一的安全响应头（next.config headers() 与 proxy.ts 共用）。
 *
 * 生产环境不再放行 `unsafe-eval`；开发环境保留以支持 Next 的 HMR/调试。
 */
const isProduction = process.env.NODE_ENV === 'production';

const scriptSrc = isProduction
  ? "script-src 'self' 'unsafe-inline' https://vercel.live"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live";

export const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-XSS-Protection', '1; mode=block'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()'],
  [
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
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
  ],
];
