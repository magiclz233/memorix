import { NextRequest, NextResponse } from 'next/server';
import { AlertManager } from '@/app/lib/alerting';
import { createLogger } from '@/app/lib/logger';

const logger = createLogger('cron-check-alerts');

/**
 * Vercel Cron Job：定期检查告警规则
 * 在 vercel.json 中配置调度频率
 */
export async function GET(request: NextRequest) {
  // 验证 Cron 请求来自 Vercel；未配置 secret 时拒绝执行而不是接受任意 Bearer。
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    logger.error('CRON_SECRET 未配置，拒绝执行告警检查');
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await AlertManager.checkRules();
    logger.info('告警规则检查完成');
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error({ error }, '告警规则检查失败');
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}
