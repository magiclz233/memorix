import { describe, expect, it } from 'vitest';
import { classifyStorageTestError } from '../storage-test';

function errorWithCode(code: string) {
  return Object.assign(new Error(`failed: ${code}`), { code, name: code });
}

describe('classifyStorageTestError', () => {
  it('本地路径不存在 → path', () => {
    expect(classifyStorageTestError(errorWithCode('ENOENT'), 'local').stage).toBe('path');
  });

  it('本地无读权限 → permission', () => {
    expect(classifyStorageTestError(errorWithCode('EACCES'), 'local').stage).toBe('permission');
  });

  it('超时 → timeout', () => {
    expect(classifyStorageTestError(errorWithCode('AbortError'), 's3').stage).toBe('timeout');
  });

  it('S3 凭证错误 → auth', () => {
    expect(classifyStorageTestError(errorWithCode('InvalidAccessKeyId'), 's3').stage).toBe('auth');
    expect(classifyStorageTestError(errorWithCode('AccessDenied'), 's3').stage).toBe('auth');
  });

  it('S3 bucket 不存在 → bucket', () => {
    expect(classifyStorageTestError(errorWithCode('NoSuchBucket'), 's3').stage).toBe('bucket');
  });

  it('网络不可达 → network', () => {
    expect(classifyStorageTestError(errorWithCode('ENOTFOUND'), 's3').stage).toBe('network');
  });

  it('未知错误 → unknown，且不泄露原始堆栈/凭据', () => {
    const result = classifyStorageTestError(
      Object.assign(new Error('accessKey=AKIA123 secretKey=topsecret'), {
        code: 'WeirdError',
      }),
      's3',
    );
    expect(result.stage).toBe('unknown');
    expect(result.message).not.toContain('topsecret');
    expect(result.message).not.toContain('AKIA123');
    expect(result.message.length).toBeLessThanOrEqual(200);
  });
});
