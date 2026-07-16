const CACHE = 'ncr-suite-shell-v2.5.8';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/brand/ncr-suite-logo-horizontal.png',
  '/brand/ncr-suite-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const requestUrl = new URL(event.request.url);
    const sameOrigin = requestUrl.origin === self.location.origin;
    const isNavigation = event.request.mode === 'navigate';
    const isCodeAsset = sameOrigin && (
      requestUrl.pathname.startsWith('/assets/')
      || ['script', 'style', 'worker', 'font'].includes(event.request.destination)
    );

    try {
      const response = await fetch(event.request);
      const contentType = response.headers.get('content-type') || '';

      // Ne jamais mettre une page HTML en cache sous l’URL d’un module JS/CSS.
      if (isCodeAsset && contentType.includes('text/html')) return Response.error();

      if (response.ok && sameOrigin) {
        const clone = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(event.request, clone));
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (isNavigation) return (await caches.match('/index.html')) || Response.error();
      return Response.error();
    }
  })());
});
