const CACHE = 'juhelo-v12';
const CORE = [
  './',
  './index.html',
  './styles.css?v=12',
  './styles-v2.css?v=12',
  './styles-v3.css?v=12',
  './styles-v4.css?v=12',
  './styles-v5.css?v=12',
  './reference-v8.css?v=12',
  './styles-v7.css?v=12',
  './responsive-v10.css?v=12',
  './home-v11.css?v=12',
  './transactions-v12.css?v=12',
  './app.js?v=12',
  './couple-widget.js?v=12',
  './settings-ui.js?v=12',
  './goals-boxes-v2.js?v=12',
  './ui-fixes-v7.js?v=12',
  './reference-v8.js?v=12',
  './couple-avatars-v9.js?v=12',
  './transactions-v12.js?v=12',
  './manifest.webmanifest?v=12',
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
