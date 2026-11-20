/**
 * Next.js 服务器启动钩子：在真正启动服务器时执行启动期初始化。
 * 只在 Node.js runtime 执行；edge runtime 与 build 阶段不受影响。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateConfigOnStartup } = await import('@/app/lib/config-validator');
    validateConfigOnStartup();

    // P1-6：启动扫描任务 runner（含中断恢复）。
    // 失败不阻塞服务器启动；API 路由也会兜底调用 ensureScanJobRunner。
    try {
      const { ensureScanJobRunner } = await import('@/app/lib/scan-job-runner');
      ensureScanJobRunner();
    } catch (error) {
      console.warn('[instrumentation] scan runner failed to start:', error);
    }
  }
}
