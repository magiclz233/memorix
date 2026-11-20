import { NextResponse } from 'next/server';
import { fetchGalleryTimelineBuckets } from '@/app/lib/data';

export const dynamic = 'force-dynamic';

/** GET /api/gallery/timeline — 返回 (年,月) 分桶，供时间轴年份轴导航 */
export async function GET() {
  const buckets = await fetchGalleryTimelineBuckets();
  return NextResponse.json({ buckets });
}
