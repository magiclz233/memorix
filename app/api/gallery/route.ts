import { NextResponse } from 'next/server';
import { fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';
import {
  decodeGalleryCursor,
  encodeGalleryCursor,
  galleryCursorFromRecord,
} from '@/app/lib/gallery-cursor';
import { config as appConfig } from '@/app/lib/config';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = appConfig.gallery.defaultPageSize;
const MAX_PAGE_SIZE = appConfig.gallery.maxPageSize;
const MAX_QUERY_LENGTH = appConfig.gallery.maxQueryLength;

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 1_000_000);
};

const clampPageSize = (value: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(6, value));

const parseKeyword = (value: string | null) => {
  if (!value) return '';
  return value.trim().slice(0, MAX_QUERY_LENGTH);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = clampPageSize(
    parsePositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
  );

  const mediaTypeParam = url.searchParams.get('mediaType') || 'all';
  const sortOrder = url.searchParams.get('sortOrder') === 'oldest' ? 'oldest' : 'newest';
  const keyword = parseKeyword(url.searchParams.get('q'));

  // 时间轴过滤（P1-2）：year 必填且合法时 month 才生效
  const rawYear = Number.parseInt(url.searchParams.get('year') || '', 10);
  const rawMonth = Number.parseInt(url.searchParams.get('month') || '', 10);
  const year = Number.isFinite(rawYear) && rawYear >= 1900 && rawYear <= 2200 ? rawYear : undefined;
  const month = year && Number.isFinite(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : undefined;

  const mediaTypes: Array<'image' | 'video' | 'animated'> =
    mediaTypeParam === 'photo' ? ['image', 'animated'] :
    mediaTypeParam === 'video' ? ['video'] :
    ['image', 'video', 'animated'];

  // P2-10：大图库用 keyset 游标；显式传 cursor 时忽略 page/offset。
  const rawCursor = url.searchParams.get('cursor');
  const cursor = rawCursor ? decodeGalleryCursor(rawCursor) : null;
  if (rawCursor && !cursor) {
    return NextResponse.json({ error: 'invalid cursor' }, { status: 400 });
  }

  const limit = pageSize + 1;
  const offset = cursor ? 0 : (page - 1) * pageSize;

  const records = await fetchPublishedMediaForGallery({
    limit,
    offset,
    cursor: cursor ?? undefined,
    mediaTypes,
    sortOrder,
    keyword,
    year,
    month,
  });

  const hasNext = records.length > pageSize;
  const pageRecords = hasNext ? records.slice(0, pageSize) : records;
  const items = buildGalleryItems(pageRecords);
  const lastRecord = pageRecords[pageRecords.length - 1];
  const next = lastRecord ? galleryCursorFromRecord(lastRecord) : null;
  const nextCursor = hasNext && next ? encodeGalleryCursor(next) : null;

  return NextResponse.json({ items, hasNext, page, nextCursor });
}
