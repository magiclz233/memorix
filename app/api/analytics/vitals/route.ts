import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { performanceMetrics } from '@/app/lib/schema';
import { createLogger } from '@/app/lib/logger';

const logger = createLogger('analytics-vitals');

/**
 * 接收并存储 Web Vitals 指标
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // 基本验证
    if (!data.name || typeof data.value !== 'number') {
      return NextResponse.json({ error: 'Invalid metrics data' }, { status: 400 });
    }

    await db.insert(performanceMetrics).values({
      metricName: String(data.name).slice(0, 50),
      metricValue: data.value,
      rating: data.rating ? String(data.rating).slice(0, 20) : null,
      page: data.page ? String(data.page).slice(0, 255) : null,
      userAgent: data.userAgent ? String(data.userAgent).slice(0, 500) : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, '保存 Web Vitals 指标失败');
    // 不返回错误给客户端，避免影响用户体验
    return NextResponse.json({ success: false });
  }
}
