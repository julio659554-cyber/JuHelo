const CACHE = 'juhelo-v30';
const CORE = [
  './',
  './index.html',
  './styles.css?v=30',
  './styles-v2.css?v=30',
  './styles-v3.css?v=30',
  './styles-v4.css?v=30',
  './styles-v5.css?v=30',
  './reference-v8.css?v=30',
  './styles-v7.css?v=30',
  './responsive-v10.css?v=30',
  './home-v11.css?v=30',
  './transactions-v12.css?v=30',
  './compact-v13.css?v=30',
  './stability-v14.css?v=30',
  './tabs-profile-v15.css?v=30',
  './polish-v16.css?v=30',
  './design-v17.css?v=30',
  './home-v18.css?v=30',
  './transactions-v19.css?v=30',
  './boxes-v20.css?v=30',
  './reports-v21.css?v=30',
  './goals-v22.css?v=30',
  './modals-v23.css?v=30',
  './theme-v26.css?v=30',
  './stability-v27.css?v=30',
  './stability-v28.css?v=30',
  './canonical-v29.css?v=30',
  './app-v14.js?v=30',
  './settings-ui.js?v=30',
  './ui-fixes-v7.js?v=30',
  './reference-v8.js?v=30',
  './transactions-v12.js?v=30',
  './profile-polish-v16.js?v=30',
  './ux-v17.js?v=30',
  './home-v18.js?v=30',
  './transactions-v19.js?v=30',
  './reports-v21.js?v=30',
  './modals-v23.js?v=30',
  './theme-v26.js?v=30',
  './goals-v29.js?v=30',
  './boxes-v29.js?v=30',
  './boxes-bridge-v30.js?v=30',
  './stability-v28.js?v=30',
  './manifest.webmanifest?v=30',
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
