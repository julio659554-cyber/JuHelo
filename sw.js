const CACHE = 'juhelo-v7';
const CORE = [
  './',
  './index.html',
  './styles.css?v=7',
  './styles-v2.css?v=7',
  './styles-v3.css?v=7',
  './styles-v4.css?v=7',
  './styles-v5.css?v=7',
  './app.js?v=7',
  './couple-widget.js?v=7',
  './settings-ui.js?v=7',
  './goals-boxes-v2.js?v=7',
  './ui-fixes-v7.js?v=7',
  './manifest.webmanifest?v=7',
  './assets/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
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
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
