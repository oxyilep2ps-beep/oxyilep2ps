/* Oxyile PWA service worker — pass-through fetch so Chrome considers the app installable
   without aggressive caching that would break Next.js App Router. */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
