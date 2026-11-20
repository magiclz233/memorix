import { encryptSecret, isEncryptedSecret, isMaskedSecret } from './secret-box';

/**
 * 历史明文密钥回填的纯决策函数（P2-4 收尾）。
 *
 * P2-4 只在“再次保存存储源”时加密旧密钥；升级前已存在且之后没编辑过的行
 * 仍是明文。管理端一次性回填接口用本函数逐行判断，幂等且不接触数据库。
 */
export type SecretBackfillPlan =
  | { action: 'update'; config: Record<string, unknown> }
  | {
      action: 'skip';
      reason: 'missing' | 'empty' | 'encrypted' | 'masked';
    };

export function planSecretBackfill(config: unknown): SecretBackfillPlan {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { action: 'skip', reason: 'missing' };
  }

  const record = config as Record<string, unknown>;
  const secret = record.secretKey;
  if (typeof secret !== 'string' || secret.length === 0) {
    return { action: 'skip', reason: 'empty' };
  }
  if (isEncryptedSecret(secret)) {
    return { action: 'skip', reason: 'encrypted' };
  }
  if (isMaskedSecret(secret)) {
    // 脱敏值不应入库；加密它只会制造一个永远解不开的假密钥。
    return { action: 'skip', reason: 'masked' };
  }

  return {
    action: 'update',
    config: { ...record, secretKey: encryptSecret(secret) },
  };
}
