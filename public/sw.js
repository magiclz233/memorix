/**
 * Lumina Pro Service Worker
 * 实现三种缓存策略：
 * - 图片资源：Cache First（优先缓存）
 * - API 请求：Network First（优先网络）
 * - 静态资源：Stale-While-Revalidate（缓存优先，后台更新）
 */

const CACHE_NAME = 'lumina-v1';
const STATIC_ASSETS = ['/'];

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) return;

  // Next 开发环境静态资源变化频繁，不应被 Service Worker 缓存。
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    if (url.pathname.startsWith('/_next/')) return;
  }

  // 图片资源：Cache First
  if (
    request.destination === 'image' ||
    url.pathname.startsWith('/api/media/thumb/') ||
    url.pathname.startsWith('/api/media/preview/')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API 请求：Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静态资源（_next/static）：Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 其他资源：Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Cache First 策略
 * 优先返回缓存，缓存不存在时请求网络并缓存结果
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Network error', { status: 503 });
  }
}

/**
 * Network First 策略
 * 优先请求网络，失败时返回缓存
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Network error', { status: 503 });
  }
}

/**
 * Stale-While-Revalidate 策略
 * 立即返回缓存，同时后台更新缓存
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response.clone());
        });
      }
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}
