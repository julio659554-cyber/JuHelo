const CACHE = 'juhelo-v11';
const CORE = [
  './',
  './index.html',
  './styles.css?v=11',
  './styles-v2.css?v=11',
  './styles-v3.css?v=11',
  './styles-v4.css?v=11',
  './styles-v5.css?v=11',
  './reference-v8.css?v=11',
  './styles-v7.css?v=11',
  './responsive-v10.css?v=11',
  './home-v11.css?v=11',
  './app.js?v=11',
  './couple-widget.js?v=11',
  './settings-ui.js?v=11',
  './goals-boxes-v2.js?v=11',
  './ui-fixes-v7.js?v=11',
  './reference-v8.js?v=11',
  './couple-avatars-v9.js?v=11',
  './manifest.webmanifest?v=11',
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
