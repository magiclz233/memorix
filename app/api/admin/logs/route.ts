import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { errorLogs } from '@/app/lib/schema';
import { desc, and, gte, lte, like, eq, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { AuthorizationError } from '@/app/lib/errors';
import { handleApiError } from '@/app/lib/errors';

/**
 * 日志查询 API（管理员专用）
 * 支持按 level、日期范围、关键词过滤，支持分页
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== 'admin') {
      throw new AuthorizationError('需要管理员权限');
    }

    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));

    const conditions = [];

    if (level) {
      conditions.push(eq(errorLogs.level, level));
    }
    if (startDate) {
      conditions.push(gte(errorLogs.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(errorLogs.createdAt, new Date(endDate)));
    }
    if (search) {
      conditions.push(like(errorLogs.message, `%${search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, countResult] = await Promise.all([
      db
        .select()
        .from(errorLogs)
        .where(whereClause)
        .orderBy(desc(errorLogs.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(errorLogs)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const { error: message, code, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message, code }, { status: statusCode });
  }
}
