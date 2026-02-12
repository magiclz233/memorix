import { Readable } from 'stream';
import { S3Client } from '@aws-sdk/client-s3';

export type S3Config = {
  endpoint?: string | null;
  region?: string | null;
  bucket?: string | null;
  accessKey?: string | null;
  secretKey?: string | null;
  prefix?: string | null;
  alias?: string | null;
};

export const normalizeS3Prefix = (prefix?: string | null) => {
  const trimmed = (prefix ?? '').trim().replace(/^\/+/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

export const resolveS3Client = (config: S3Config) => {
  const normalizeEndpoint = (endpoint?: string | null, bucket?: string | null) => {
    const value = (endpoint ?? '').trim();
    if (!value) {
      return {
        endpoint: undefined as string | undefined,
        forcePathStyle: false,
        endpointHost: undefined as string | undefined,
      };
    }
    const url = (() => {
      try {
        return new URL(value.includes('://') ? value : `https://${value}`);
      } catch {
        return null;
      }
    })();
    if (!url) {
      return {
        endpoint: value,
        forcePathStyle: true,
        endpointHost: undefined as string | undefined,
      };
    }

    const host = url.hostname;
    const bucketName = (bucket ?? '').trim();
    if (
      bucketName &&
      host.toLowerCase().startsWith(`${bucketName.toLowerCase()}.`)
    ) {
      const baseHost = host.slice(bucketName.length + 1);
      const base = new URL(url.toString());
      base.hostname = baseHost;
      base.pathname = '/';
      base.search = '';
      base.hash = '';
      return { endpoint: base.toString(), forcePathStyle: false, endpointHost: baseHost };
    }

    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return { endpoint: url.toString(), forcePathStyle: true, endpointHost: host };
  };

  const normalizeRegion = (region?: string | null, endpointHost?: string) => {
    const raw = (region ?? '').trim();
    if (!raw) return 'auto';
    const lower = raw.toLowerCase();
    const host = (endpointHost ?? '').toLowerCase();
    const isQiniu = host.includes('qiniucs.com') || host.includes('qiniu');
    if (isQiniu) {
      const map: Record<string, string> = {
        z0: 'cn-east-1',
        z1: 'cn-north-1',
        z2: 'cn-south-1',
        na0: 'us-north-1',
        as0: 'ap-southeast-1',
      };
      return map[lower] ?? raw;
    }
    return raw;
  };

  const { endpoint, forcePathStyle, endpointHost } = normalizeEndpoint(
    config.endpoint,
    config.bucket,
  );
  const region = normalizeRegion(config.region, endpointHost);
  return new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials:
      config.accessKey && config.secretKey
        ? {
            accessKeyId: config.accessKey,
            secretAccessKey: config.secretKey,
          }
        : undefined,
  });
};

export const s3BodyToReadable = (body: unknown) => {
  if (!body) return null;
  if (body instanceof Readable) return body;
  return Readable.from(body as AsyncIterable<Uint8Array>);
};

export const getS3ErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object') return null;
  const anyError = error as {
    Code?: unknown;
    code?: unknown;
    name?: unknown;
  };
  if (typeof anyError.Code === 'string') return anyError.Code;
  if (typeof anyError.code === 'string') return anyError.code;
  if (typeof anyError.name === 'string') return anyError.name;
  return null;
};

export const isNoSuchKeyError = (error: unknown) => getS3ErrorCode(error) === 'NoSuchKey';
