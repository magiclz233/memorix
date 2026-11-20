import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptSecret, isEncryptedSecret } from '../secret-box';
import { planSecretBackfill } from '../storage-secret-backfill';

beforeEach(() => {
  vi.stubEnv('MEDIA_SECRET_KEY', Buffer.alloc(32, 7).toString('base64'));
  vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('planSecretBackfill', () => {
  it('把历史明文加密，且不改动原对象', () => {
    const config = { bucket: 'photos', secretKey: 'legacy-plain' };
    const plan = planSecretBackfill(config);

    expect(plan.action).toBe('update');
    if (plan.action !== 'update') return;
    expect(plan.config.bucket).toBe('photos');
    expect(plan.config.secretKey).not.toBe('legacy-plain');
    expect(isEncryptedSecret(plan.config.secretKey as string)).toBe(true);
    expect(decryptSecret(plan.config.secretKey as string)).toBe('legacy-plain');
    expect(config.secretKey).toBe('legacy-plain');
  });

  it('已加密的行保持原值，保证幂等', () => {
    const encrypted = planSecretBackfill({ secretKey: 'plain' });
    if (encrypted.action !== 'update') throw new Error('expected update');

    expect(planSecretBackfill(encrypted.config)).toEqual({
      action: 'skip',
      reason: 'encrypted',
    });
  });

  it('脱敏值跳过，避免把 **** 变成假密钥', () => {
    expect(planSecretBackfill({ secretKey: '****abcd' })).toEqual({
      action: 'skip',
      reason: 'masked',
    });
  });

  it('空密钥与缺失密钥跳过', () => {
    expect(planSecretBackfill({ secretKey: '' })).toEqual({
      action: 'skip',
      reason: 'empty',
    });
    expect(planSecretBackfill({})).toEqual({
      action: 'skip',
      reason: 'empty',
    });
  });

  it('非对象配置跳过', () => {
    expect(planSecretBackfill(null)).toEqual({
      action: 'skip',
      reason: 'missing',
    });
    expect(planSecretBackfill('not-json')).toEqual({
      action: 'skip',
      reason: 'missing',
    });
  });

  it('保留 config 里的其他字段', () => {
    const plan = planSecretBackfill({
      endpoint: 'https://s3.example.com',
      secretKey: 'plain',
      isDisabled: false,
    });
    if (plan.action !== 'update') throw new Error('expected update');
    expect(plan.config.endpoint).toBe('https://s3.example.com');
    expect(plan.config.isDisabled).toBe(false);
  });
});
