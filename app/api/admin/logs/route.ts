import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/drizzle';
import { errorLogs } from '@/app/lib/schema';
import { desc, and, gte, lte, like, eq, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { AuthorizationError, ValidationError } from '@/app/lib/errors';
import { handleApiError } from '@/app/lib/errors';

const parsePositiveInteger = (
  value: string | null,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
};

const parseDateParameter = (value: string | null, errorMessage: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(errorMessage);
  }
  return parsed;
};

/**
 * 日志查询 API（管理员专用）
 * 支持按 level、日期范围、关键词过滤，支持分页
 */
export async function GET(request: NextRequest) {
  try {
    const t = await getTranslations('api.errors');
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
    const page = parsePositiveInteger(searchParams.get('page'), 1, 1_000_000);
    const limit = parsePositiveInteger(searchParams.get('limit'), 50, 100);
    const parsedStartDate = parseDateParameter(
      startDate,
      t('invalidDateParameter', { name: 'startDate' }),
    );
    const parsedEndDate = parseDateParameter(
      endDate,
      t('invalidDateParameter', { name: 'endDate' }),
    );

    const conditions = [];

    if (level) {
      conditions.push(eq(errorLogs.level, level));
    }
    if (parsedStartDate) {
      conditions.push(gte(errorLogs.createdAt, parsedStartDate));
    }
    if (parsedEndDate) {
      conditions.push(lte(errorLogs.createdAt, parsedEndDate));
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
