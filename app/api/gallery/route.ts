import { NextResponse } from 'next/server';
import { fetchPublishedMediaForGallery } from '@/app/lib/data';
import { buildGalleryItems } from '@/app/lib/gallery';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 60;

const parsePositiveInt = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const clampPageSize = (value: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(6, value));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get('page'), 1);
  const pageSize = clampPageSize(
    parsePositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
  );
  const limit = pageSize + 1;
  const offset = (page - 1) * pageSize;
  const records = await fetchPublishedMediaForGallery({ limit, offset });
  const hasNext = records.length > pageSize;
  const pageRecords = hasNext ? records.slice(0, pageSize) : records;
  const items = buildGalleryItems(pageRecords);

  return NextResponse.json({
    items,
    hasNext,
    page,
  });
}
