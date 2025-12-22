import Link from 'next/link';
import { auth } from '@/auth';
import { fetchPublishedPhotos, fetchUserByEmail } from '@/app/lib/data';

export default async function Page() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email) {
    return (
      <main className='min-h-screen bg-gray-950 px-6 py-12 text-white'>
        <div className='mx-auto max-w-4xl space-y-4'>
          <h1 className='text-3xl font-semibold'>图库</h1>
          <p className='text-sm text-gray-300'>请先登录后查看图库内容。</p>
          <Link
            href='/login'
            className='inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-900'
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
      <main className='min-h-screen bg-gray-950 px-6 py-12 text-white'>
        <div className='mx-auto max-w-4xl space-y-4'>
          <h1 className='text-3xl font-semibold'>图库</h1>
          <p className='text-sm text-gray-300'>未找到用户信息。</p>
        </div>
      </main>
    );
  }

  const photos = await fetchPublishedPhotos(user.id);

  return (
    <main className='min-h-screen bg-gray-950 px-6 py-12 text-white'>
      <div className='mx-auto flex max-w-6xl flex-col gap-8'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-semibold'>图库</h1>
            <p className='text-sm text-gray-300'>仅展示已发布的图片。</p>
          </div>
          <Link
            href='/dashboard/photos'
            className='inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-900'
          >
            返回配置
          </Link>
        </div>

        {photos.length === 0 ? (
          <div className='rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-sm text-gray-300'>
            <p>暂无已发布的图片，请先在配置页扫描并发布。</p>
            <Link
              href='/dashboard/photos'
              className='mt-4 inline-flex items-center rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-900'
            >
              去配置
            </Link>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {photos.map((photo) => {
              const title = photo.title ?? photo.path;
              return (
                <article
                  key={photo.id}
                  className='group overflow-hidden rounded-2xl border border-white/10 bg-white/5'
                >
                  <div className='aspect-square w-full overflow-hidden bg-black/40'>
                    <img
                      src={`/api/local-files/${photo.id}`}
                      alt={title}
                      loading='lazy'
                      className='h-full w-full object-cover transition duration-300 group-hover:scale-105'
                    />
                  </div>
                  <div className='space-y-1 p-4'>
                    <h2 className='truncate text-sm font-medium text-white'>{title}</h2>
                    <p className='text-xs text-gray-400'>
                      {photo.resolutionWidth && photo.resolutionHeight
                        ? `${photo.resolutionWidth}×${photo.resolutionHeight}`
                        : '暂无分辨率'}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
