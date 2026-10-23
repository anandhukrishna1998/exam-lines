const CACHE_NAME = 'exam-lines-v1';
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

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          cache.put(e.request, res.clone());
        }
        return res;
      }).catch(() => null);

      if (cached) {
        networkFetch; // refresh in background
        return cached;
      }

      const res = await networkFetch;
      return res || cached;
    })
  );
});
