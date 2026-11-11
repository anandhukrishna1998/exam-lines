const CACHE_NAME = 'exam-lines-v2';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './exam-lines.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (!isSameOrigin && !isGoogleFont) {
    // Never intercept third-party AI provider calls or external endpoints
    return;
  }

  const isDoc = isSameOrigin && (
    e.request.mode === 'navigate' ||
    e.request.destination === 'document' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname === '/manifest.json'
  );

  if (isDoc) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const res = await fetch(e.request, { cache: 'no-cache' });
          if (res && res.status === 200) {
            await cache.put(e.request, res.clone());
            return res;
          }
          return (await cache.match(e.request)) || res;
        } catch {
          const cached = await cache.match(e.request);
          if (cached) return cached;
          if (e.request.mode === 'navigate') {
            const indexFallback = await cache.match('./index.html');
            if (indexFallback) return indexFallback;
          }
          return Response.error();
        }
      })
    );
    return;
  }

  const networkPromise = fetch(e.request)
    .then(async (res) => {
      if (res && res.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(e.request, res.clone());
      }
      return res;
    })
    .catch(() => null);

  e.waitUntil(networkPromise);

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      return (await networkPromise) || Response.error();
    })
  );
});
