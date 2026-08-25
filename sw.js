const CACHE = 'juhelo-v13';
const CORE = [
  './',
  './index.html',
  './styles.css?v=13',
  './styles-v2.css?v=13',
  './styles-v3.css?v=13',
  './styles-v4.css?v=13',
  './styles-v5.css?v=13',
  './reference-v8.css?v=13',
  './styles-v7.css?v=13',
  './responsive-v10.css?v=13',
  './home-v11.css?v=13',
  './transactions-v12.css?v=13',
  './compact-v13.css?v=13',
  './app.js?v=13',
  './couple-widget.js?v=13',
  './settings-ui.js?v=13',
  './goals-boxes-v2.js?v=13',
  './ui-fixes-v7.js?v=13',
  './reference-v8.js?v=13',
  './couple-avatars-v9.js?v=13',
  './transactions-v12.js?v=13',
  './manifest.webmanifest?v=13',
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
