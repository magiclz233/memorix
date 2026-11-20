import { headers } from 'next/headers';
import { db } from './drizzle';
import { auditLogs } from './schema';
import { requireAdminUser } from './auth-utils';
import {
  buildAuditLogValues,
  parseClientIp,
  type AuditLogInput,
} from './audit-log-values';

/**
 * 审计日志（P2-5）。
 *
 * - `recordAuditLog` 只负责落库；写库失败只告警，绝不影响主流程。
 * - IP / User-Agent 从当前请求头取，取不到就留空。
 * - 记录内容不包含密钥、密码等敏感值，调用方只需传业务快照。
 */

export type { AuditLogInput } from './audit-log-values';

/** 记录一条审计日志；任何失败都吞掉并告警，保证主流程不受影响。 */
export async function recordAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const requestHeaders = await headers();
    const values = buildAuditLogValues(input, {
      ipAddress:
        parseClientIp(requestHeaders.get('x-forwarded-for')) ??
        requestHeaders.get('x-real-ip'),
      userAgent: requestHeaders.get('user-agent'),
    });
    await db.insert(auditLogs).values(values);
  } catch (error) {
    console.warn('[audit-log] 写入审计日志失败（已忽略）:', error);
  }
}

/**
 * 当前管理员操作后记录日志。
 * 适用于只拿到 session user、没有现成数据库 id 的 Server Action 包装层。
 */
export async function recordAuditLogForCurrentUser(
  input: Omit<AuditLogInput, 'userId'>,
): Promise<void> {
  try {
    const user = await requireAdminUser();
    const userId = Number(user.id);
    if (!Number.isInteger(userId) || userId <= 0) return;
    await recordAuditLog({ ...input, userId });
  } catch (error) {
    console.warn('[audit-log] 无法确定操作者，跳过审计（已忽略）:', error);
  }
}
