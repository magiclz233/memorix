import type { UploadStorageOption } from '@/app/lib/definitions';

type StorageConfig = {
  rootPath?: string | null;
  alias?: string | null;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
};

type RawStorage = {
  id: number;
  type: string;
  config: unknown;
};

export function buildUploadStorageOption(
  storage: RawStorage,
  t: (key: string) => string,
): UploadStorageOption {
  const config = (storage.config ?? {}) as StorageConfig;
  const typeLabel = t(`storage.view.types.${storage.type}`);
  const name =
    config.alias ||
    config.bucket ||
    config.rootPath ||
    config.endpoint ||
    t('upload.unnamed');

  const description =
    storage.type === 'local' || storage.type === 'nas'
      ? config.rootPath ?? t('upload.noPath')
      : config.endpoint ?? config.region ?? t('upload.noConnection');

  return {
    id: storage.id,
    type: storage.type,
    label: `${typeLabel} · ${name}`,
    description,
  };
}