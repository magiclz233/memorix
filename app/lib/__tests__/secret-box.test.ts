import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  isMaskedSecret,
  maskSecret,
} from '../secret-box';

const KEY_A = Buffer.alloc(32, 7).toString('base64');
const KEY_B = Buffer.alloc(32, 9).toString('base64');

beforeEach(() => {
  vi.stubEnv('MEDIA_SECRET_KEY', KEY_A);
  vi.stubEnv('BETTER_AUTH_SECRET', 'a'.repeat(32));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('secret-box', () => {
  it('加密后解密可还原，且不保留明文', () => {
    const plain = 'memorix-test-secret-value';
    const cipher = encryptSecret(plain);
    expect(cipher).not.toContain(plain);
    expect(isEncryptedSecret(cipher)).toBe(true);
    expect(decryptSecret(cipher)).toBe(plain);
  });

  it('同一明文两次加密结果不同（随机 IV）', () => {
    expect(encryptSecret('same-secret')).not.toBe(encryptSecret('same-secret'));
  });

  it('换密钥后解密失败，而不是静默返回密文', () => {
    const cipher = encryptSecret('secret');
    vi.stubEnv('MEDIA_SECRET_KEY', KEY_B);
    expect(() => decryptSecret(cipher)).toThrow();
  });

  it('篡改密文会解密失败', () => {
    const cipher = encryptSecret('secret');
    const [prefix, iv, tag, data] = cipher.split(':');
    const tampered = [prefix, iv, tag, `A${data.slice(1)}`].join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('旧数据明文原样返回，保证升级兼容', () => {
    expect(decryptSecret('legacy-plain-secret')).toBe('legacy-plain-secret');
  });

  it('空值不加密', () => {
    expect(encryptSecret('')).toBe('');
    expect(decryptSecret('')).toBe('');
  });

  it('MEDIA_SECRET_KEY 长度非法时报错', () => {
    vi.stubEnv('MEDIA_SECRET_KEY', Buffer.alloc(16, 1).toString('base64'));
    expect(() => encryptSecret('secret')).toThrow(/32/);
  });

  it('未配置 MEDIA_SECRET_KEY 时回退 BETTER_AUTH_SECRET 派生并告警', () => {
    vi.stubEnv('MEDIA_SECRET_KEY', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const cipher = encryptSecret('fallback');
    expect(decryptSecret(cipher)).toBe('fallback');
    expect(warn).toHaveBeenCalled();
  });

  it('脱敏只暴露末 4 位', () => {
    const cipher = encryptSecret('abcdefghijklmnop');
    expect(maskSecret(cipher)).toBe('****mnop');
  });

  it('脱敏兼容明文与空值', () => {
    expect(maskSecret('legacy-secret')).toBe('****cret');
    expect(maskSecret('')).toBe('');
    expect(maskSecret(null)).toBe('');
  });

  it('识别脱敏值，避免二次加密', () => {
    expect(isMaskedSecret('****abcd')).toBe(true);
    expect(isMaskedSecret('plain-secret')).toBe(false);
    expect(encryptSecret('****abcd')).toBe('****abcd');
  });
});
