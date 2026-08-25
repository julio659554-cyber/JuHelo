const CACHE = 'juhelo-v24';
const CORE = [
  './',
  './index.html',
  './styles.css?v=24',
  './styles-v2.css?v=24',
  './styles-v3.css?v=24',
  './styles-v4.css?v=24',
  './styles-v5.css?v=24',
  './reference-v8.css?v=24',
  './styles-v7.css?v=24',
  './responsive-v10.css?v=24',
  './home-v11.css?v=24',
  './transactions-v12.css?v=24',
  './compact-v13.css?v=24',
  './stability-v14.css?v=24',
  './tabs-profile-v15.css?v=24',
  './polish-v16.css?v=24',
  './design-v17.css?v=24',
  './home-v18.css?v=24',
  './transactions-v19.css?v=24',
  './boxes-v20.css?v=24',
  './reports-v21.css?v=24',
  './goals-v22.css?v=24',
  './modals-v23.css?v=24',
  './app-v14.js?v=24',
  './settings-ui.js?v=24',
  './goals-v22.js?v=24',
  './goals-boxes-v14.js?v=24',
  './ui-fixes-v7.js?v=24',
  './reference-v8.js?v=24',
  './transactions-v12.js?v=24',
  './profile-polish-v16.js?v=24',
  './ux-v17.js?v=24',
  './home-v18.js?v=24',
  './transactions-v19.js?v=24',
  './boxes-v20.js?v=24',
  './reports-v21.js?v=24',
  './modals-v23.js?v=24',
  './manifest.webmanifest?v=24',
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
