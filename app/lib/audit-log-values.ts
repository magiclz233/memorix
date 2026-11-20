/**
 * 审计日志的纯函数部分（无 DB / next/headers 依赖，便于单测）。
 */

export type AuditLogInput = {
  userId: number;
  action: string;
  resource: string;
  resourceId?: number | null;
  changes?: unknown;
};

export type AuditLogMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditLogValues = {
  userId: number;
  action: string;
  resource: string;
  resourceId: number | null;
  changes: unknown;
  ipAddress: string | null;
  userAgent: string | null;
};

const MAX_ACTION_LENGTH = 100;
const MAX_RESOURCE_LENGTH = 100;
const MAX_IP_LENGTH = 45;
const MAX_USER_AGENT_LENGTH = 2000;

/** 取 X-Forwarded-For 的第一跳；空值或非法值返回 null。 */
export function parseClientIp(forwardedFor: string | null | undefined): string | null {
  const first = forwardedFor?.split(',')[0]?.trim();
  return first ? first.slice(0, MAX_IP_LENGTH) : null;
}

/** 生成可直接插入 audit_logs 的值；纯函数，便于单测覆盖截断与空值。 */
export function buildAuditLogValues(
  input: AuditLogInput,
  meta: AuditLogMeta = {},
): AuditLogValues {
  const resourceId =
    typeof input.resourceId === 'number' &&
    Number.isInteger(input.resourceId) &&
    input.resourceId > 0
      ? input.resourceId
      : null;

  return {
    userId: input.userId,
    action: input.action.trim().slice(0, MAX_ACTION_LENGTH),
    resource: input.resource.trim().slice(0, MAX_RESOURCE_LENGTH),
    resourceId,
    changes: input.changes ?? null,
    ipAddress: meta.ipAddress?.trim().slice(0, MAX_IP_LENGTH) || null,
    userAgent: meta.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) || null,
  };
}
