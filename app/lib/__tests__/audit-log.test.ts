import { describe, expect, it } from 'vitest';
import { buildAuditLogValues, parseClientIp } from '../audit-log-values';

describe('buildAuditLogValues', () => {
  it('保留合法字段并补空值', () => {
    const values = buildAuditLogValues({
      userId: 7,
      action: 'storage.update',
      resource: 'storage',
      resourceId: 12,
      changes: { type: 's3' },
    });

    expect(values).toMatchObject({
      userId: 7,
      action: 'storage.update',
      resource: 'storage',
      resourceId: 12,
      changes: { type: 's3' },
      ipAddress: null,
      userAgent: null,
    });
  });

  it('action/resource 去空格并截断到 100 字符', () => {
    const values = buildAuditLogValues({
      userId: 1,
      action: `  ${'a'.repeat(120)}  `,
      resource: 'r'.repeat(120),
    });

    expect(values.action).toHaveLength(100);
    expect(values.resource).toHaveLength(100);
  });

  it('非法 resourceId 归一为 null', () => {
    expect(
      buildAuditLogValues({ userId: 1, action: 'a', resource: 'r', resourceId: 0 })
        .resourceId,
    ).toBeNull();
    expect(
      buildAuditLogValues({ userId: 1, action: 'a', resource: 'r', resourceId: -3 })
        .resourceId,
    ).toBeNull();
    expect(
      buildAuditLogValues({ userId: 1, action: 'a', resource: 'r', resourceId: 1.5 })
        .resourceId,
    ).toBeNull();
  });

  it('IP 截断到 45 字符，User-Agent 截断到 2000 字符', () => {
    const values = buildAuditLogValues(
      { userId: 1, action: 'a', resource: 'r' },
      { ipAddress: '1'.repeat(60), userAgent: 'u'.repeat(2100) },
    );

    expect(values.ipAddress).toHaveLength(45);
    expect(values.userAgent).toHaveLength(2000);
  });
});

describe('parseClientIp', () => {
  it('取 X-Forwarded-For 第一跳并去空格', () => {
    expect(parseClientIp(' 203.0.113.9 , 10.0.0.1')).toBe('203.0.113.9');
  });

  it('空值返回 null，超长值截断', () => {
    expect(parseClientIp(null)).toBeNull();
    expect(parseClientIp('   ')).toBeNull();
    expect(parseClientIp('1'.repeat(60))).toHaveLength(45);
  });
});
