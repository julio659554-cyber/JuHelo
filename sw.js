const CACHE = 'juhelo-v20';
const CORE = [
  './',
  './index.html',
  './styles.css?v=20',
  './styles-v2.css?v=20',
  './styles-v3.css?v=20',
  './styles-v4.css?v=20',
  './styles-v5.css?v=20',
  './reference-v8.css?v=20',
  './styles-v7.css?v=20',
  './responsive-v10.css?v=20',
  './home-v11.css?v=20',
  './transactions-v12.css?v=20',
  './compact-v13.css?v=20',
  './stability-v14.css?v=20',
  './tabs-profile-v15.css?v=20',
  './polish-v16.css?v=20',
  './design-v17.css?v=20',
  './home-v18.css?v=20',
  './transactions-v19.css?v=20',
  './boxes-v20.css?v=20',
  './app-v14.js?v=20',
  './settings-ui.js?v=20',
  './goals-boxes-v14.js?v=20',
  './ui-fixes-v7.js?v=20',
  './reference-v8.js?v=20',
  './transactions-v12.js?v=20',
  './profile-polish-v16.js?v=20',
  './ux-v17.js?v=20',
  './home-v18.js?v=20',
  './transactions-v19.js?v=20',
  './boxes-v20.js?v=20',
  './manifest.webmanifest?v=20',
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
