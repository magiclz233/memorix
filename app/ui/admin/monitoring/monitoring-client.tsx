'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ListTabs } from '@/app/ui/shared/list-tabs';
import { ListPagination } from '@/app/ui/shared/list-pagination';
import { useDebounce } from '@/app/ui/hooks/use-debounce';

export type VitalStat = {
  metric: string;
  avg: number;
  count: number;
};

export type ErrorLevelStat = {
  level: string;
  count: number;
};

type SystemLogRow = {
  id: number;
  level: string;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  requestId: string | null;
  createdAt: string;
};

type AuditLogRow = {
  id: number;
  action: string;
  resource: string;
  resourceId: number | null;
  userId: number;
  userEmail: string | null;
  userName: string | null;
  changes: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type MonitoringClientProps = {
  vitals: VitalStat[];
  errorStats: ErrorLevelStat[];
};

const LEVEL_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  debug: 'secondary',
  info: 'default',
  warn: 'outline',
  error: 'destructive',
};

export function MonitoringClient({ vitals, errorStats }: MonitoringClientProps) {
  const t = useTranslations('dashboard.monitoring');
  const [activeTab, setActiveTab] = useState<'logs' | 'audit'>('logs');

  // 系统错误日志状态
  const [logLevel, setLogLevel] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const debouncedLogSearch = useDebounce(logSearch, 300);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(24);
  const [logs, setLogs] = useState<SystemLogRow[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // 审计日志状态
  const [auditResource, setAuditResource] = useState<string>('all');
  const [auditAction, setAuditAction] = useState('');
  const debouncedAuditAction = useDebounce(auditAction, 300);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditNextBefore, setAuditNextBefore] = useState<number | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(logPage),
        limit: String(logPageSize),
      });
      if (logLevel !== 'all') params.set('level', logLevel);
      if (debouncedLogSearch.trim()) params.set('search', debouncedLogSearch.trim());

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs ?? []);
      setLogTotal(Number(data.pagination?.total ?? 0));
      setLogTotalPages(Math.max(1, Number(data.pagination?.pages ?? 1)));
    } finally {
      setLogsLoading(false);
    }
  }, [debouncedLogSearch, logLevel, logPage, logPageSize]);

  const fetchAudit = useCallback(
    async (beforeId?: number | null) => {
      setAuditLoading(true);
      try {
        const params = new URLSearchParams({ limit: '30' });
        if (beforeId) params.set('before', String(beforeId));
        if (auditResource !== 'all') params.set('resource', auditResource);
        if (debouncedAuditAction.trim()) params.set('action', debouncedAuditAction.trim());

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const rows: AuditLogRow[] = data.logs ?? [];
        setAuditLogs((prev) => (beforeId ? [...prev, ...rows] : rows));
        setAuditNextBefore(data.nextBefore ?? null);
      } finally {
        setAuditLoading(false);
      }
    },
    [auditResource, debouncedAuditAction],
  );

  useEffect(() => {
    if (activeTab === 'logs') {
      void fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    if (activeTab === 'audit') {
      void fetchAudit(null);
    }
  }, [activeTab, fetchAudit]);

  return (
    <div className="space-y-6">
      {/* Web Vitals 与 24h 错误分布概览 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t('vitalsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {vitals.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noVitals')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {vitals.map((vital) => (
                  <div
                    key={vital.metric}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <p className="text-xs font-medium text-zinc-500">{vital.metric}</p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                      {vital.avg}
                      <span className="ml-0.5 text-xs font-normal text-zinc-400">
                        {vital.metric === 'CLS' ? '' : 'ms'}
                      </span>
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                      {t('samples', { count: vital.count })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t('errorStatsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {errorStats.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('noErrors')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {errorStats.map((stat) => (
                  <div
                    key={stat.level}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <p className="text-xs font-medium uppercase text-zinc-500">{stat.level}</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{stat.count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 双 Tab 切换：系统日志 / 操作审计日志 */}
      <ListTabs
        items={[
          { value: 'logs', label: t('tabs.systemLogs'), icon: Activity },
          { value: 'audit', label: t('tabs.auditLogs'), icon: ShieldCheck },
        ]}
        value={activeTab}
        onChange={(value) => setActiveTab(value as 'logs' | 'audit')}
      />

      {activeTab === 'logs' ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
                placeholder={t('logs.searchPlaceholder')}
                className="pl-9"
              />
            </div>

            <Select
              value={logLevel}
              onValueChange={(value) => {
                setLogLevel(value);
                setLogPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('logs.allLevels')}</SelectItem>
                <SelectItem value="error">error</SelectItem>
                <SelectItem value="warn">warn</SelectItem>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="debug">debug</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchLogs()}
              disabled={logsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </Button>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {logsLoading ? t('loading') : t('noErrors')}
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((row) => {
                const expanded = expandedLogId === row.id;
                return (
                  <Card
                    key={row.id}
                    className="border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/60"
                  >
                    <CardContent className="p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(expanded ? null : row.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          {expanded ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {row.message}
                            </p>
                            <p className="mt-1 font-mono text-xs text-zinc-400">
                              {new Date(row.createdAt).toLocaleString()}
                              {row.requestId ? ` · #${row.requestId.slice(0, 8)}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant={LEVEL_BADGE_VARIANT[row.level] ?? 'outline'}>
                          {row.level}
                        </Badge>
                      </button>

                      {expanded ? (
                        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                          {row.stack ? (
                            <pre className="max-h-60 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                              {row.stack}
                            </pre>
                          ) : null}
                          {row.context ? (
                            <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-100 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                              {JSON.stringify(row.context, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {logTotal > 0 ? (
            <ListPagination
              page={logPage}
              totalPages={logTotalPages}
              pageSize={logPageSize}
              totalCount={logTotal}
              onPageChange={setLogPage}
              onPageSizeChange={(size) => {
                setLogPageSize(size);
                setLogPage(1);
              }}
              disabled={logsLoading}
            />
          ) : null}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                placeholder={t('audit.actionPlaceholder')}
                className="pl-9"
              />
            </div>

            <Select value={auditResource} onValueChange={setAuditResource}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('audit.allResources')}</SelectItem>
                <SelectItem value="media">media</SelectItem>
                <SelectItem value="storage">storage</SelectItem>
                <SelectItem value="share">share</SelectItem>
                <SelectItem value="trash">trash</SelectItem>
                <SelectItem value="collection">collection</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchAudit(null)}
              disabled={auditLoading}
            >
              <RefreshCw className={`h-4 w-4 ${auditLoading ? 'animate-spin' : ''}`} />
              <span>{t('refresh')}</span>
            </Button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {auditLoading ? t('loading') : t('audit.empty')}
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((row) => {
                const expanded = expandedAuditId === row.id;
                return (
                  <Card
                    key={row.id}
                    className="border-zinc-200/80 bg-white/80 dark:border-zinc-800/80 dark:bg-zinc-900/60"
                  >
                    <CardContent className="p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedAuditId(expanded ? null : row.id)}
                        className="flex w-full items-start justify-between gap-3 text-left"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          {expanded ? (
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {row.action}
                              </span>
                              <Badge variant="secondary" className="text-[11px]">
                                {row.resource}
                                {row.resourceId ? ` #${row.resourceId}` : ''}
                              </Badge>
                            </div>
                            <p className="mt-1 font-mono text-xs text-zinc-400">
                              {new Date(row.createdAt).toLocaleString()} ·{' '}
                              {row.userEmail || row.userName || `User #${row.userId}`}
                              {row.ipAddress ? ` · ${row.ipAddress}` : ''}
                            </p>
                          </div>
                        </div>
                      </button>

                      {expanded && row.changes ? (
                        <pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-zinc-100 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                          {JSON.stringify(row.changes, null, 2)}
                        </pre>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {auditNextBefore ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void fetchAudit(auditNextBefore)}
                disabled={auditLoading}
              >
                {auditLoading ? t('loading') : t('audit.loadMore')}
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
