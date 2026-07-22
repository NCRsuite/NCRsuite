const CACHE = 'ncr-suite-shell-v2.11.5-access-matrix';
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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
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

    const networkRequest = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), isNavigation ? 9000 : 15000);
      try {
        return await fetch(event.request, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      const response = await networkRequest();
      const contentType = response.headers.get('content-type') || '';

      // Ne jamais mettre une page HTML en cache sous l’URL d’un module JS/CSS.
      if (isCodeAsset && contentType.includes('text/html')) return Response.error();

      if (response.ok && sameOrigin && response.type === 'basic') {
        const clone = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
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

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'NCR Suite', body: event.data ? event.data.text() : 'Nouvelle notification' };
  }

  const title = payload.title || 'NCR Suite';
  const options = {
    body: payload.body || 'Une nouvelle information est disponible.',
    icon: payload.icon || '/brand/ncr-suite-icon.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || 'ncr-suite-notification',
    renotify: payload.urgency === 'critical' || payload.urgency === 'high',
    requireInteraction: payload.urgency === 'critical',
    data: {
      url: payload.url || '/notifications',
      ...(payload.data || {})
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/notifications', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
