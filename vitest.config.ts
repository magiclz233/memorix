import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest baseline（ADR-0004）：服务端与纯逻辑接口测试。
 * 用手动 alias 解析 @/ ，避免引入 vite-tsconfig-paths 依赖。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
    },
  },
});
