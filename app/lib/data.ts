import { db } from './drizzle';
import {
  files,
  photoCollections,
  collectionItems,
  photoMetadata,
  userSettings,
  userStorages,
  users,
  videoSeries,
  videoSeriesItems,
  videoMetadata,
} from './schema';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';

export async function fetchDashboardOverview(userId: number) {
  const storageCountPromise = db
    .select({ count: count() })
    .from(userStorages)
    .where(eq(userStorages.userId, userId));
  const fileCountPromise = db
    .select({ count: count() })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(eq(userStorages.userId, userId));
  const publishedCountPromise = db
    .select({ count: count() })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(eq(userStorages.userId, userId), eq(files.isPublished, true)));
  const photoCollectionsPromise = db
    .select({ count: count() })
    .from(photoCollections);
  const videoSeriesPromise = db.select({ count: count() }).from(videoSeries);

  const [
    storageCount,
    fileCount,
    publishedCount,
    photoCollectionsCount,
    videoSeriesCount,
  ] = await Promise.all([
    storageCountPromise,
    fileCountPromise,
    publishedCountPromise,
    photoCollectionsPromise,
    videoSeriesPromise,
  ]);

  return {
    storageCount: Number(storageCount[0]?.count ?? 0),
    fileCount: Number(fileCount[0]?.count ?? 0),
    publishedCount: Number(publishedCount[0]?.count ?? 0),
    photoCollectionsCount: Number(photoCollectionsCount[0]?.count ?? 0),
    videoSeriesCount: Number(videoSeriesCount[0]?.count ?? 0),
  };
}

export async function fetchUserByEmail(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return user ?? null;
}

export async function fetchUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
}

export async function fetchUserStorages(userId: number) {
  return db
    .select({
      id: userStorages.id,
      type: userStorages.type,
      config: userStorages.config,
      createdAt: userStorages.createdAt,
      updatedAt: userStorages.updatedAt,
    })
    .from(userStorages)
    .where(eq(userStorages.userId, userId))
    .orderBy(desc(userStorages.updatedAt));
}

export async function fetchStorageFiles(storageId: number) {
  return db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      size: files.size,
      mimeType: files.mimeType,
      mtime: files.mtime,
      isPublished: files.isPublished,
      blurHash: files.blurHash,
      resolutionWidth: photoMetadata.resolutionWidth,
      resolutionHeight: photoMetadata.resolutionHeight,
    })
    .from(files)
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(eq(files.userStorageId, storageId))
    .orderBy(desc(files.mtime));
}

export type MediaLibrarySort =
  | 'dateShotDesc'
  | 'dateShotAsc'
  | 'sizeDesc'
  | 'sizeAsc'
  | 'resolutionDesc'
  | 'resolutionAsc'
  | 'titleAsc'
  | 'titleDesc';

export type MediaLibraryFilters = {
  storageIds?: number[];
  mediaType?: 'all' | 'image' | 'video' | 'animated';
  publishStatus?: 'all' | 'published' | 'unpublished';
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  sizeMin?: number;
  sizeMax?: number;
  widthMin?: number;
  widthMax?: number;
  heightMin?: number;
  heightMax?: number;
  exposureMin?: number;
  exposureMax?: number;
  apertureMin?: number;
  apertureMax?: number;
  isoMin?: number;
  isoMax?: number;
  focalLengthMin?: number;
  focalLengthMax?: number;
  orientation?: 'all' | 'landscape' | 'portrait' | 'square';
  camera?: string;
  maker?: string;
  lens?: string;
  hasGps?: 'all' | 'yes' | 'no';
  sort?: MediaLibrarySort;
};

export type MediaLibraryItem = {
  id: number;
  title: string | null;
  path: string;
  size: number | null;
  mimeType: string | null;
  mtime: Date | null;
  createdAt: Date;
  url: string | null;
  thumbUrl: string | null;
  mediaType: string;
  isPublished: boolean;
  blurHash: string | null;
  resolutionWidth: number | null;
  resolutionHeight: number | null;
  videoWidth: number | null;
  videoHeight: number | null;
  videoDuration: number | null;
  liveType: string | null;
  description: string | null;
  dateShot: Date | null;
  camera: string | null;
  maker: string | null;
  lens: string | null;
  exposure: number | null;
  aperture: number | null;
  iso: number | null;
  focalLength: number | null;
  whiteBalance: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  storage: {
    id: number;
    type: string;
    alias: string | null;
    isDisabled: boolean;
  };
};

type MediaLibraryPageOptions = {
  userId: number;
  page: number;
  perPage: number;
  filters?: MediaLibraryFilters;
};

const parseDateStart = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateEnd = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function fetchMediaLibraryPage({
  userId,
  page,
  perPage,
  filters = {},
}: MediaLibraryPageOptions) {
  const storageIds = filters.storageIds?.filter((id) => id > 0) ?? [];
  const mediaType = filters.mediaType ?? 'all';
  const publishStatus = filters.publishStatus ?? 'all';
  const keyword = filters.keyword?.trim();
  const dateFrom = parseDateStart(filters.dateFrom);
  const dateTo = parseDateEnd(filters.dateTo);
  const camera = filters.camera?.trim();
  const maker = filters.maker?.trim();
  const lens = filters.lens?.trim();
  const orientation = filters.orientation ?? 'all';
  const hasGps = filters.hasGps ?? 'all';
  const sort = filters.sort ?? 'dateShotDesc';

  const dateExpr = sql<Date>`coalesce(${photoMetadata.dateShot}, ${files.mtime}, ${files.createdAt})`;
  const resolutionArea = sql<number>`coalesce(${photoMetadata.resolutionWidth}, ${videoMetadata.width}, 0) * coalesce(${photoMetadata.resolutionHeight}, ${videoMetadata.height}, 0)`;
  const widthExpr = sql<number>`coalesce(${photoMetadata.resolutionWidth}, ${videoMetadata.width})`;
  const heightExpr = sql<number>`coalesce(${photoMetadata.resolutionHeight}, ${videoMetadata.height})`;

  const conditions = [eq(userStorages.userId, userId)];

  if (storageIds.length > 0) {
    conditions.push(inArray(files.userStorageId, storageIds));
  }

  if (mediaType !== 'all') {
    conditions.push(eq(files.mediaType, mediaType));
  } else {
    conditions.push(inArray(files.mediaType, ['image', 'video', 'animated']));
  }

  if (publishStatus === 'published') {
    conditions.push(eq(files.isPublished, true));
  } else if (publishStatus === 'unpublished') {
    conditions.push(eq(files.isPublished, false));
  }

  if (keyword) {
    const keywordCondition = or(
      ilike(files.title, `%${keyword}%`),
      ilike(files.path, `%${keyword}%`),
      ilike(photoMetadata.description, `%${keyword}%`),
    );
    if (keywordCondition) {
      conditions.push(keywordCondition);
    }
  }

  if (dateFrom) {
    conditions.push(gte(dateExpr, dateFrom));
  }

  if (dateTo) {
    conditions.push(lte(dateExpr, dateTo));
  }

  if (typeof filters.sizeMin === 'number') {
    conditions.push(gte(files.size, filters.sizeMin));
  }

  if (typeof filters.sizeMax === 'number') {
    conditions.push(lte(files.size, filters.sizeMax));
  }

  if (typeof filters.widthMin === 'number') {
    conditions.push(gte(widthExpr, filters.widthMin));
  }

  if (typeof filters.widthMax === 'number') {
    conditions.push(lte(widthExpr, filters.widthMax));
  }

  if (typeof filters.heightMin === 'number') {
    conditions.push(gte(heightExpr, filters.heightMin));
  }

  if (typeof filters.heightMax === 'number') {
    conditions.push(lte(heightExpr, filters.heightMax));
  }

  if (typeof filters.exposureMin === 'number') {
    conditions.push(gte(photoMetadata.exposure, filters.exposureMin));
  }

  if (typeof filters.exposureMax === 'number') {
    conditions.push(lte(photoMetadata.exposure, filters.exposureMax));
  }

  if (typeof filters.apertureMin === 'number') {
    conditions.push(gte(photoMetadata.aperture, filters.apertureMin));
  }

  if (typeof filters.apertureMax === 'number') {
    conditions.push(lte(photoMetadata.aperture, filters.apertureMax));
  }

  if (typeof filters.isoMin === 'number') {
    conditions.push(gte(photoMetadata.iso, filters.isoMin));
  }

  if (typeof filters.isoMax === 'number') {
    conditions.push(lte(photoMetadata.iso, filters.isoMax));
  }

  if (typeof filters.focalLengthMin === 'number') {
    conditions.push(gte(photoMetadata.focalLength, filters.focalLengthMin));
  }

  if (typeof filters.focalLengthMax === 'number') {
    conditions.push(lte(photoMetadata.focalLength, filters.focalLengthMax));
  }

  if (orientation === 'landscape') {
    conditions.push(sql`${widthExpr} > ${heightExpr}`);
  } else if (orientation === 'portrait') {
    conditions.push(sql`${heightExpr} > ${widthExpr}`);
  } else if (orientation === 'square') {
    conditions.push(sql`${widthExpr} = ${heightExpr}`);
  }

  if (camera) {
    conditions.push(ilike(photoMetadata.camera, `%${camera}%`));
  }

  if (maker) {
    conditions.push(ilike(photoMetadata.maker, `%${maker}%`));
  }

  if (lens) {
    conditions.push(ilike(photoMetadata.lens, `%${lens}%`));
  }

  if (hasGps === 'yes') {
    const gpsCondition = and(
      isNotNull(photoMetadata.gpsLatitude),
      isNotNull(photoMetadata.gpsLongitude),
    );
    if (gpsCondition) {
      conditions.push(gpsCondition);
    }
  } else if (hasGps === 'no') {
    const gpsCondition = or(
      isNull(photoMetadata.gpsLatitude),
      isNull(photoMetadata.gpsLongitude),
    );
    if (gpsCondition) {
      conditions.push(gpsCondition);
    }
  }

  const orderBy =
    sort === 'dateShotAsc'
      ? [asc(dateExpr), asc(files.id)]
      : sort === 'sizeDesc'
        ? [desc(files.size), desc(dateExpr)]
        : sort === 'sizeAsc'
          ? [asc(files.size), desc(dateExpr)]
          : sort === 'resolutionDesc'
            ? [desc(resolutionArea), desc(dateExpr)]
            : sort === 'resolutionAsc'
              ? [asc(resolutionArea), desc(dateExpr)]
              : sort === 'titleAsc'
                ? [asc(files.title), desc(dateExpr)]
                : sort === 'titleDesc'
                  ? [desc(files.title), desc(dateExpr)]
                  : [desc(dateExpr), desc(files.id)];

  const countResult = await db
    .select({ count: count() })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .leftJoin(videoMetadata, eq(files.id, videoMetadata.fileId))
    .where(and(...conditions));

  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const offset = (safePage - 1) * perPage;

  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      size: files.size,
      mimeType: files.mimeType,
      mtime: files.mtime,
      createdAt: files.createdAt,
      url: files.url,
      thumbUrl: files.thumbUrl,
      mediaType: files.mediaType,
      isPublished: files.isPublished,
      blurHash: files.blurHash,
      resolutionWidth: photoMetadata.resolutionWidth,
      resolutionHeight: photoMetadata.resolutionHeight,
      videoWidth: videoMetadata.width,
      videoHeight: videoMetadata.height,
      videoDuration: videoMetadata.duration,
      liveType: photoMetadata.liveType,
      description: photoMetadata.description,
      dateShot: photoMetadata.dateShot,
      camera: photoMetadata.camera,
      maker: photoMetadata.maker,
      lens: photoMetadata.lens,
      exposure: photoMetadata.exposure,
      aperture: photoMetadata.aperture,
      iso: photoMetadata.iso,
      focalLength: photoMetadata.focalLength,
      whiteBalance: photoMetadata.whiteBalance,
      gpsLatitude: photoMetadata.gpsLatitude,
      gpsLongitude: photoMetadata.gpsLongitude,
      storageId: userStorages.id,
      storageType: userStorages.type,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .leftJoin(videoMetadata, eq(files.id, videoMetadata.fileId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(perPage)
    .offset(offset);

  const items: MediaLibraryItem[] = records.map((record) => {
    const config = (record.storageConfig ?? {}) as {
      alias?: string | null;
      isDisabled?: boolean;
    };
    return {
      id: record.id,
      title: record.title,
      path: record.path,
      size: record.size ?? null,
      mimeType: record.mimeType ?? null,
      mtime: record.mtime ?? null,
      createdAt: record.createdAt,
      url: record.url ?? null,
      thumbUrl: record.thumbUrl ?? null,
      mediaType: record.mediaType,
      isPublished: record.isPublished,
      blurHash: record.blurHash ?? null,
      resolutionWidth: record.resolutionWidth ?? null,
      resolutionHeight: record.resolutionHeight ?? null,
      videoWidth: record.videoWidth ?? null,
      videoHeight: record.videoHeight ?? null,
      videoDuration: record.videoDuration ?? null,
      liveType: record.liveType ?? null,
      description: record.description ?? null,
      dateShot: record.dateShot ?? null,
      camera: record.camera ?? null,
      maker: record.maker ?? null,
      lens: record.lens ?? null,
      exposure: record.exposure ?? null,
      aperture: record.aperture ?? null,
      iso: record.iso ?? null,
      focalLength: record.focalLength ?? null,
      whiteBalance: record.whiteBalance ?? null,
      gpsLatitude: record.gpsLatitude ?? null,
      gpsLongitude: record.gpsLongitude ?? null,
      storage: {
        id: record.storageId,
        type: record.storageType,
        alias: config.alias?.trim() || null,
        isDisabled: Boolean(config.isDisabled),
      },
    };
  });

  return {
    items,
    totalCount,
    totalPages,
    page: safePage,
  };
}

export async function fetchPublishedPhotos(userId: number) {
  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      size: files.size,
      mimeType: files.mimeType,
      mtime: files.mtime,
      resolutionWidth: photoMetadata.resolutionWidth,
      resolutionHeight: photoMetadata.resolutionHeight,
      description: photoMetadata.description,
      camera: photoMetadata.camera,
      maker: photoMetadata.maker,
      lens: photoMetadata.lens,
      dateShot: photoMetadata.dateShot,
      exposure: photoMetadata.exposure,
      aperture: photoMetadata.aperture,
      iso: photoMetadata.iso,
      focalLength: photoMetadata.focalLength,
      whiteBalance: photoMetadata.whiteBalance,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(and(eq(files.isPublished, true), eq(userStorages.userId, userId)))
    .orderBy(desc(files.mtime));

  return records
    .filter(
      (record) =>
        !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig, ...rest }) => rest);
}

export async function fetchPhotoCollections() {
  const collections = await db
    .select({
      id: photoCollections.id,
      title: photoCollections.title,
      description: photoCollections.description,
      coverImage: photoCollections.coverImage,
      createdAt: photoCollections.createdAt,
      itemCount: count(collectionItems.fileId),
    })
    .from(photoCollections)
    .leftJoin(
      collectionItems,
      eq(photoCollections.id, collectionItems.collectionId)
    )
    .groupBy(photoCollections.id)
    .orderBy(desc(photoCollections.createdAt));

  return collections.map((c) => ({
    ...c,
    itemCount: Number(c.itemCount),
  }));
}

export async function fetchVideoSeries() {
  const series = await db
    .select({
      id: videoSeries.id,
      title: videoSeries.title,
      description: videoSeries.description,
      coverImage: videoSeries.coverImage,
      createdAt: videoSeries.createdAt,
      updatedAt: videoSeries.updatedAt,
      itemCount: count(videoSeriesItems.fileId),
    })
    .from(videoSeries)
    .leftJoin(videoSeriesItems, eq(videoSeries.id, videoSeriesItems.seriesId))
    .groupBy(videoSeries.id)
    .orderBy(desc(videoSeries.updatedAt));

  return series.map((s) => ({
    ...s,
    itemCount: Number(s.itemCount),
  }));
}

export async function fetchCollectionById(id: number) {
  const collection = await db.query.photoCollections.findFirst({
    where: eq(photoCollections.id, id),
  });
  return collection ?? null;
}

export async function fetchVideoSeriesById(id: number) {
  const series = await db.query.videoSeries.findFirst({
    where: eq(videoSeries.id, id),
  });
  return series ?? null;
}

export async function fetchCollectionItems(collectionId: number) {
  const records = await db
    .select({
      file: files,
      sortOrder: collectionItems.sortOrder,
      metadata: photoMetadata,
    })
    .from(collectionItems)
    .innerJoin(files, eq(collectionItems.fileId, files.id))
    .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(asc(collectionItems.sortOrder));
  const seen = new Set<number>();
  return records.filter((item) => {
    if (seen.has(item.file.id)) return false;
    seen.add(item.file.id);
    return true;
  });
}

export async function fetchVideoSeriesItems(seriesId: number) {
  const records = await db
    .select({
      file: files,
      sortOrder: videoSeriesItems.sortOrder,
      metadata: videoMetadata,
    })
    .from(videoSeriesItems)
    .innerJoin(files, eq(videoSeriesItems.fileId, files.id))
    .leftJoin(videoMetadata, eq(files.id, videoMetadata.fileId))
    .where(eq(videoSeriesItems.seriesId, seriesId))
    .orderBy(asc(videoSeriesItems.sortOrder));
  const seen = new Set<number>();
  return records.filter((item) => {
    if (seen.has(item.file.id)) return false;
    seen.add(item.file.id);
    return true;
  });
}


const HERO_SETTING_KEY = 'hero_images';

const normalizeIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const ids = value
    .map((item) => {
      if (typeof item === 'number' && Number.isFinite(item)) return Math.trunc(item);
      if (typeof item === 'string') {
        const parsed = Number(item);
        if (Number.isFinite(parsed)) return Math.trunc(parsed);
      }
      return null;
    })
    .filter((item): item is number => typeof item === 'number' && item > 0);
  return Array.from(new Set(ids));
};

const getErrorCode = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: string }).code;
  if (code) return code;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) {
    const nestedCode = getErrorCode(cause);
    if (nestedCode) return nestedCode;
  }
  const original = (error as { original?: unknown; originalError?: unknown }).original ?? (error as { originalError?: unknown }).originalError;
  if (original && original !== error) {
    const nestedCode = getErrorCode(original);
    if (nestedCode) return nestedCode;
  }
  return null;
};

const getErrorMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: string }).message;
  if (typeof message === 'string' && message.length > 0) return message;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) {
    const nestedMessage = getErrorMessage(cause);
    if (nestedMessage) return nestedMessage;
  }
  const original = (error as { original?: unknown; originalError?: unknown }).original ?? (error as { originalError?: unknown }).originalError;
  if (original && original !== error) {
    const nestedMessage = getErrorMessage(original);
    if (nestedMessage) return nestedMessage;
  }
  return null;
};

const getErrorQuery = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;
  const query = (error as { query?: string }).query;
  if (typeof query === 'string' && query.length > 0) return query;
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) {
    const nestedQuery = getErrorQuery(cause);
    if (nestedQuery) return nestedQuery;
  }
  const original = (error as { original?: unknown; originalError?: unknown }).original ?? (error as { originalError?: unknown }).originalError;
  if (original && original !== error) {
    const nestedQuery = getErrorQuery(original);
    if (nestedQuery) return nestedQuery;
  }
  return null;
};

const isMissingRelationError = (error: unknown) => {
  const code = getErrorCode(error);
  if (code === '42P01') return true;
  const message = getErrorMessage(error) ?? '';
  return message.includes('relation') && message.includes('does not exist');
};

const shouldIgnoreHeroSettingsError = (error: unknown) => {
  if (isMissingRelationError(error)) return true;
  const query = getErrorQuery(error) ?? '';
  if (query.includes('"user_settings"')) return true;
  const message = getErrorMessage(error) ?? '';
  return message.includes('user_settings');
};

const warnHeroSettingsFallback = (error: unknown) => {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const detail = [code ? `code=${code}` : null, message].filter(Boolean).join(' ');
  console.warn(`Failed to read Hero config, fallback to default.${detail ? ` ${detail}` : ''}`);
};

export async function fetchHeroPhotoIdsByUser(userId: number) {
  try {
    const record = await db
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(and(eq(userSettings.userId, userId), eq(userSettings.key, HERO_SETTING_KEY)))
      .limit(1);
    return normalizeIdList(record[0]?.value);
  } catch (error) {
    // 兼容未执行迁移或库权限不足导致读取失败的情况
    if (shouldIgnoreHeroSettingsError(error)) {
      warnHeroSettingsFallback(error);
      return [];
    }
    throw error;
  }
}

const fetchHeroPhotoIdsForHome = async (userId?: number) => {
  try {
    if (userId) {
      return fetchHeroPhotoIdsByUser(userId);
    }
    const record = await db
      .select({ value: userSettings.value })
      .from(userSettings)
      .where(eq(userSettings.key, HERO_SETTING_KEY))
      .orderBy(desc(userSettings.updatedAt))
      .limit(1);
    return normalizeIdList(record[0]?.value);
  } catch (error) {
    // 兼容未执行迁移或库权限不足导致读取失败的情况
    if (shouldIgnoreHeroSettingsError(error)) {
      warnHeroSettingsFallback(error);
      return [];
    }
    throw error;
  }
};

export async function fetchHeroPhotosForHome(options?: { userId?: number; limit?: number }) {
  const limit = options?.limit ?? 12;
  const heroIds = await fetchHeroPhotoIdsForHome(options?.userId);
  if (heroIds.length === 0) return [];
  const limitedIds = heroIds.slice(0, limit);
  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mtime: files.mtime,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(and(inArray(files.id, limitedIds), eq(files.isPublished, true)));

  const filtered = records
    .filter(
      (record) =>
        !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig, ...rest }) => rest);

  const recordMap = new Map(filtered.map((item) => [item.id, item]));
  return limitedIds
    .map((id) => recordMap.get(id))
    .filter((item): item is (typeof filtered)[number] => Boolean(item));
}

type FetchGalleryOptions = {
  limit?: number;
  offset?: number;
};

export async function fetchPublishedMediaForGallery(
  options: FetchGalleryOptions = {},
) {
  try {
    let query = db
      .select({
        id: files.id,
        title: files.title,
        path: files.path,
        size: files.size,
        mimeType: files.mimeType,
        mediaType: files.mediaType,
        url: files.url,
        thumbUrl: files.thumbUrl,
        mtime: files.mtime,
        blurHash: files.blurHash,
        resolutionWidth: photoMetadata.resolutionWidth,
        resolutionHeight: photoMetadata.resolutionHeight,
        videoWidth: videoMetadata.width,
        videoHeight: videoMetadata.height,
        videoDuration: videoMetadata.duration,
        description: photoMetadata.description,
        camera: photoMetadata.camera,
        maker: photoMetadata.maker,
        lens: photoMetadata.lens,
        dateShot: photoMetadata.dateShot,
        exposure: photoMetadata.exposure,
        aperture: photoMetadata.aperture,
        iso: photoMetadata.iso,
        focalLength: photoMetadata.focalLength,
        whiteBalance: photoMetadata.whiteBalance,
        gpsLatitude: photoMetadata.gpsLatitude,
        gpsLongitude: photoMetadata.gpsLongitude,
        liveType: photoMetadata.liveType,
        storageConfig: userStorages.config,
      })
      .from(files)
      .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
      .leftJoin(photoMetadata, eq(files.id, photoMetadata.fileId))
      .leftJoin(videoMetadata, eq(files.id, videoMetadata.fileId))
      .where(
        and(eq(files.isPublished, true), inArray(files.mediaType, ['image', 'video', 'animated'])),
      )
      .orderBy(desc(files.mtime))
      .$dynamic();
    if (typeof options.limit === 'number') {
      query = query.limit(options.limit);
    }
    if (typeof options.offset === 'number' && options.offset > 0) {
      query = query.offset(options.offset);
    }
    const records = await query;

    return records
      .filter(
        (record) =>
          !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
      )
      .map(({ storageConfig, ...rest }) => rest);
  } catch (error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    console.error('Gallery query failed:', error);
    if (cause) {
      console.error('Gallery query raw error:', cause);
    }
    throw error;
  }
}

export async function fetchPublishedPhotosForHome(limit = 12) {
  const records = await db
    .select({
      id: files.id,
      title: files.title,
      path: files.path,
      mtime: files.mtime,
      storageConfig: userStorages.config,
    })
    .from(files)
    .innerJoin(userStorages, eq(files.userStorageId, userStorages.id))
    .where(eq(files.isPublished, true))
    .orderBy(desc(files.mtime))
    .limit(limit);

  return records
    .filter(
      (record) =>
        !(record.storageConfig as { isDisabled?: boolean })?.isDisabled,
    )
    .map(({ storageConfig, ...rest }) => rest);
}

