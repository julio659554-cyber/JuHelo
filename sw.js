const CACHE = 'juhelo-v18';
const CORE = [
  './',
  './index.html',
  './styles.css?v=18',
  './styles-v2.css?v=18',
  './styles-v3.css?v=18',
  './styles-v4.css?v=18',
  './styles-v5.css?v=18',
  './reference-v8.css?v=18',
  './styles-v7.css?v=18',
  './responsive-v10.css?v=18',
  './home-v11.css?v=18',
  './transactions-v12.css?v=18',
  './compact-v13.css?v=18',
  './stability-v14.css?v=18',
  './tabs-profile-v15.css?v=18',
  './polish-v16.css?v=18',
  './design-v17.css?v=18',
  './home-v18.css?v=18',
  './app-v14.js?v=18',
  './settings-ui.js?v=18',
  './goals-boxes-v14.js?v=18',
  './ui-fixes-v7.js?v=18',
  './reference-v8.js?v=18',
  './transactions-v12.js?v=18',
  './profile-polish-v16.js?v=18',
  './ux-v17.js?v=18',
  './home-v18.js?v=18',
  './manifest.webmanifest?v=18',
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
