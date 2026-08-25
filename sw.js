const CACHE = 'juhelo-v29';
const CORE = [
  './',
  './index.html',
  './styles.css?v=29',
  './styles-v2.css?v=29',
  './styles-v3.css?v=29',
  './styles-v4.css?v=29',
  './styles-v5.css?v=29',
  './reference-v8.css?v=29',
  './styles-v7.css?v=29',
  './responsive-v10.css?v=29',
  './home-v11.css?v=29',
  './transactions-v12.css?v=29',
  './compact-v13.css?v=29',
  './stability-v14.css?v=29',
  './tabs-profile-v15.css?v=29',
  './polish-v16.css?v=29',
  './design-v17.css?v=29',
  './home-v18.css?v=29',
  './transactions-v19.css?v=29',
  './boxes-v20.css?v=29',
  './reports-v21.css?v=29',
  './goals-v22.css?v=29',
  './modals-v23.css?v=29',
  './theme-v26.css?v=29',
  './stability-v27.css?v=29',
  './stability-v28.css?v=29',
  './canonical-v29.css?v=29',
  './app-v14.js?v=29',
  './settings-ui.js?v=29',
  './ui-fixes-v7.js?v=29',
  './reference-v8.js?v=29',
  './transactions-v12.js?v=29',
  './profile-polish-v16.js?v=29',
  './ux-v17.js?v=29',
  './home-v18.js?v=29',
  './transactions-v19.js?v=29',
  './reports-v21.js?v=29',
  './modals-v23.js?v=29',
  './theme-v26.js?v=29',
  './goals-v29.js?v=29',
  './boxes-v29.js?v=29',
  './stability-v28.js?v=29',
  './manifest.webmanifest?v=29',
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

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
