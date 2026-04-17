import { db } from '@/app/lib/drizzle';
import { performanceMetrics, errorLogs } from '@/app/lib/schema';
import { desc, gte, sql, eq, and } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function MonitoringPage() {
  // 验证管理员权限
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login');
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 最近 24 小时

  // Web Vitals 统计
  const vitals = await db
    .select({
      metric: performanceMetrics.metricName,
      avg: sql<number>`ROUND(AVG(${performanceMetrics.metricValue})::numeric, 2)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(performanceMetrics)
    .where(gte(performanceMetrics.createdAt, since))
    .groupBy(performanceMetrics.metricName)
    .orderBy(performanceMetrics.metricName);

  // 错误级别统计
  const errorStats = await db
    .select({
      level: errorLogs.level,
      count: sql<number>`COUNT(*)`,
    })
    .from(errorLogs)
    .where(gte(errorLogs.createdAt, since))
    .groupBy(errorLogs.level)
    .orderBy(errorLogs.level);

  // 最近 10 条错误日志
  const recentErrors = await db
    .select()
    .from(errorLogs)
    .where(
      and(
        gte(errorLogs.createdAt, since),
        eq(errorLogs.level, 'error'),
      ),
    )
    .orderBy(desc(errorLogs.createdAt))
    .limit(10);

  const levelColors: Record<string, string> = {
    debug: 'secondary',
    info: 'default',
    warn: 'outline',
    error: 'destructive',
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">系统监控</h1>
        <p className="text-muted-foreground mt-1">最近 24 小时的性能指标与错误统计</p>
      </div>

      {/* Web Vitals */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Web Vitals</h2>
        {vitals.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无性能数据</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {vitals.map((vital) => (
              <Card key={vital.metric}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {vital.metric}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {vital.avg}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {vital.metric === 'CLS' ? '' : 'ms'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vital.count} 次采样
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 错误统计 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">错误统计（24h）</h2>
        {errorStats.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无错误记录</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {errorStats.map((stat) => (
              <Card key={stat.level}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium capitalize text-muted-foreground">
                    {stat.level}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono">{stat.count}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 最近错误 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">最近错误</h2>
        {recentErrors.length === 0 ? (
          <p className="text-muted-foreground text-sm">暂无错误记录</p>
        ) : (
          <div className="space-y-2">
            {recentErrors.map((error) => (
              <Card key={error.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{error.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {error.createdAt.toLocaleString('zh-CN')}
                        {error.requestId && (
                          <span className="ml-2 font-mono">#{error.requestId.slice(0, 8)}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant={levelColors[error.level] as 'default' | 'secondary' | 'outline' | 'destructive'}>
                      {error.level}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
