const CACHE = 'juhelo-v23';
const CORE = [
  './',
  './index.html',
  './styles.css?v=23',
  './styles-v2.css?v=23',
  './styles-v3.css?v=23',
  './styles-v4.css?v=23',
  './styles-v5.css?v=23',
  './reference-v8.css?v=23',
  './styles-v7.css?v=23',
  './responsive-v10.css?v=23',
  './home-v11.css?v=23',
  './transactions-v12.css?v=23',
  './compact-v13.css?v=23',
  './stability-v14.css?v=23',
  './tabs-profile-v15.css?v=23',
  './polish-v16.css?v=23',
  './design-v17.css?v=23',
  './home-v18.css?v=23',
  './transactions-v19.css?v=23',
  './boxes-v20.css?v=23',
  './reports-v21.css?v=23',
  './goals-v22.css?v=23',
  './modals-v23.css?v=23',
  './app-v14.js?v=23',
  './settings-ui.js?v=23',
  './goals-v22.js?v=23',
  './goals-boxes-v14.js?v=23',
  './ui-fixes-v7.js?v=23',
  './reference-v8.js?v=23',
  './transactions-v12.js?v=23',
  './profile-polish-v16.js?v=23',
  './ux-v17.js?v=23',
  './home-v18.js?v=23',
  './transactions-v19.js?v=23',
  './boxes-v20.js?v=23',
  './reports-v21.js?v=23',
  './modals-v23.js?v=23',
  './manifest.webmanifest?v=23',
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
