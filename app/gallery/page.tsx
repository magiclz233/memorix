import Link from 'next/link';
import { auth } from '@/auth';
import { fetchPublishedPhotos, fetchUserByEmail } from '@/app/lib/data';
import { Gallery25 } from '@/components/gallery25';

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className='min-h-screen bg-background px-6 py-12 text-foreground'>
        <div className='mx-auto max-w-4xl space-y-4'>
          <h1 className='text-3xl font-semibold'>图库</h1>
          <p className='text-sm text-muted-foreground'>请先登录后查看图库内容。</p>
          <Link
            href='/login?callbackUrl=/gallery'
            className='inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground'
          >
            前往登录
          </Link>
        </div>
      </main>
    );
  }

  const user = await fetchUserByEmail(email);
  if (!user) {
    return (
      <main className='min-h-screen bg-background px-6 py-12 text-foreground'>
        <div className='mx-auto max-w-4xl space-y-4'>
          <h1 className='text-3xl font-semibold'>图库</h1>
          <p className='text-sm text-muted-foreground'>未找到用户信息。</p>
        </div>
      </main>
    );
  }

  const photos = await fetchPublishedPhotos(user.id);
  const items = photos.map((photo) => ({
    id: photo.id,
    src: `/api/local-files/${photo.id}`,
    title: photo.title ?? photo.path,
    width: photo.resolutionWidth ?? null,
    height: photo.resolutionHeight ?? null,
    resolution:
      photo.resolutionWidth && photo.resolutionHeight
        ? `${photo.resolutionWidth}×${photo.resolutionHeight}`
        : null,
    description: photo.description ?? null,
    camera: photo.camera ?? null,
    maker: photo.maker ?? null,
    lens: photo.lens ?? null,
    dateShot: photo.dateShot ? new Date(photo.dateShot).toISOString() : null,
    exposure: photo.exposure ?? null,
    aperture: photo.aperture ?? null,
    iso: photo.iso ?? null,
    focalLength: photo.focalLength ?? null,
    whiteBalance: photo.whiteBalance ?? null,
    size: photo.size ?? null,
  }));

  return (
    <main className='min-h-screen bg-background px-6 py-12 text-foreground'>
      <div className='flex flex-col gap-8'>
        <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-semibold'>图库</h1>
            <p className='text-sm text-muted-foreground'>仅展示已发布的图片。</p>
          </div>
          <Link
            href='/dashboard/photos'
            className='inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground'
          >
            返回配置
          </Link>
        </div>

        {photos.length === 0 ? (
          <div className='mx-auto w-full max-w-6xl rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground'>
            <p>暂无已发布的图片，请先在配置页扫描并发布。</p>
            <Link
              href='/dashboard/photos'
              className='mt-4 inline-flex items-center rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground'
            >
              去配置
            </Link>
          </div>
        ) : (
          <Gallery25 items={items} />
        )}
      </div>
    </main>
  );
}
