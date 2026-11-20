import { promises as fs } from 'node:fs';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { resolveS3Client } from './s3-helper';
import type { StorageConfigInput } from './storage-config-schema';

/**
 * 存储源连接测试（P2-4）。
 *
 * - 本地 / NAS：stat 校验存在且是目录，再 access 校验读权限；
 * - S3 / 七牛：用 listObjectsV2(MaxKeys=1) 同时验证网络、凭证与 bucket；
 * - 统一 5s 超时与结构化失败阶段，错误信息只保留错误码，避免泄露端点/凭据。
 */

export type StorageTestStage =
  | 'config'
  | 'path'
  | 'permission'
  | 'timeout'
  | 'auth'
  | 'bucket'
  | 'network'
  | 'unknown';

export type StorageTestResult =
  | { ok: true; latencyMs: number }
  | { ok: false; stage: StorageTestStage; message: string };

const TEST_TIMEOUT_MS = 4500;

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const candidate = error as { Code?: unknown; code?: unknown; name?: unknown };
  for (const value of [candidate.Code, candidate.code, candidate.name]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

const TIMEOUT_CODES = new Set(['AbortError', 'TimeoutError', 'RequestTimeout', 'ETIMEDOUT']);
const AUTH_CODES = new Set([
  'AccessDenied',
  'Forbidden',
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'InvalidToken',
  'ExpiredToken',
  'EACCES',
  'EPERM',
]);
const BUCKET_CODES = new Set(['NoSuchBucket', 'NotFound', '404']);
const PATH_CODES = new Set(['ENOENT', 'ENOTDIR']);
const NETWORK_CODES = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'EAI_AGAIN',
  'NetworkingError',
]);

/** 把底层错误归类为稳定的失败阶段；message 只含错误码，不带原始报文。 */
export function classifyStorageTestError(
  error: unknown,
  kind: 'local' | 's3',
): { stage: StorageTestStage; message: string } {
  const code = getErrorCode(error);

  if (TIMEOUT_CODES.has(code)) {
    return { stage: 'timeout', message: '连接超时（5s）' };
  }
  if (BUCKET_CODES.has(code)) {
    if (kind === 'local') return { stage: 'path', message: '路径不存在' };
    return { stage: 'bucket', message: `Bucket 不可用（${code}）` };
  }
  if (AUTH_CODES.has(code)) {
    if (kind === 'local') return { stage: 'permission', message: `无读权限（${code}）` };
    return { stage: 'auth', message: `认证失败（${code}）` };
  }
  if (PATH_CODES.has(code)) {
    return { stage: 'path', message: `路径不存在（${code}）` };
  }
  if (NETWORK_CODES.has(code)) {
    return { stage: 'network', message: `网络不可达（${code}）` };
  }
  return {
    stage: 'unknown',
    message: code ? `连接失败（${code.slice(0, 100)}）` : '连接失败（未知错误）',
  };
}

function withTimeout<T>(promise: Promise<T>, controller: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error('storage test timeout'), { name: 'AbortError' }));
    }, TEST_TIMEOUT_MS);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** 执行一次连接测试；调用方负责鉴权与配置校验。 */
export async function testStorageConnection(
  input: StorageConfigInput,
): Promise<StorageTestResult> {
  const startedAt = Date.now();

  try {
    if (input.type === 'local' || input.type === 'nas') {
      const rootPath = input.rootPath?.trim();
      if (!rootPath) {
        return { ok: false, stage: 'config', message: '未填写根目录路径' };
      }
      try {
        const stat = await fs.stat(rootPath);
        if (!stat.isDirectory()) {
          return { ok: false, stage: 'path', message: '根目录不是目录' };
        }
        await fs.access(rootPath, fs.constants.R_OK);
      } catch (error) {
        return { ok: false, ...classifyStorageTestError(error, 'local') };
      }
      return { ok: true, latencyMs: Date.now() - startedAt };
    }

    const bucket = input.bucket?.trim();
    if (!bucket || !input.accessKey?.trim() || !input.secretKey?.trim()) {
      return {
        ok: false,
        stage: 'config',
        message: 'S3 配置不完整，需要 bucket/accessKey/secretKey',
      };
    }

    let client: ReturnType<typeof resolveS3Client>;
    try {
      client = resolveS3Client(input);
    } catch (error) {
      return {
        ok: false,
        stage: 'config',
        message: error instanceof Error ? error.message : '存储密钥无法解密',
      };
    }

    const controller = new AbortController();
    try {
      await withTimeout(
        client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: 1,
            Prefix: input.prefix?.trim() || undefined,
          }),
          { abortSignal: controller.signal },
        ),
        controller,
      );
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { ok: false, ...classifyStorageTestError(error, 's3') };
    } finally {
      client.destroy();
    }
  } catch {
    return { ok: false, stage: 'unknown', message: '连接测试失败（未知错误）' };
  }
}
