const CACHE = 'juhelo-v27';
const CORE = [
  './',
  './index.html',
  './styles.css?v=27',
  './styles-v2.css?v=27',
  './styles-v3.css?v=27',
  './styles-v4.css?v=27',
  './styles-v5.css?v=27',
  './reference-v8.css?v=27',
  './styles-v7.css?v=27',
  './responsive-v10.css?v=27',
  './home-v11.css?v=27',
  './transactions-v12.css?v=27',
  './compact-v13.css?v=27',
  './stability-v14.css?v=27',
  './tabs-profile-v15.css?v=27',
  './polish-v16.css?v=27',
  './design-v17.css?v=27',
  './home-v18.css?v=27',
  './transactions-v19.css?v=27',
  './boxes-v20.css?v=27',
  './reports-v21.css?v=27',
  './goals-v22.css?v=27',
  './modals-v23.css?v=27',
  './theme-v26.css?v=27',
  './stability-v27.css?v=27',
  './app-v14.js?v=27',
  './settings-ui.js?v=27',
  './goals-v22.js?v=27',
  './goals-boxes-v14.js?v=27',
  './ui-fixes-v7.js?v=27',
  './reference-v8.js?v=27',
  './transactions-v12.js?v=27',
  './profile-polish-v16.js?v=27',
  './ux-v17.js?v=27',
  './home-v18.js?v=27',
  './transactions-v19.js?v=27',
  './boxes-v20.js?v=27',
  './reports-v21.js?v=27',
  './modals-v23.js?v=27',
  './theme-v26.js?v=27',
  './stability-v27.js?v=27',
  './manifest.webmanifest?v=27',
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
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
