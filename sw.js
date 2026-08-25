const CACHE = 'juhelo-v28';
const CORE = [
  './',
  './index.html',
  './styles.css?v=28',
  './styles-v2.css?v=28',
  './styles-v3.css?v=28',
  './styles-v4.css?v=28',
  './styles-v5.css?v=28',
  './reference-v8.css?v=28',
  './styles-v7.css?v=28',
  './responsive-v10.css?v=28',
  './home-v11.css?v=28',
  './transactions-v12.css?v=28',
  './compact-v13.css?v=28',
  './stability-v14.css?v=28',
  './tabs-profile-v15.css?v=28',
  './polish-v16.css?v=28',
  './design-v17.css?v=28',
  './home-v18.css?v=28',
  './transactions-v19.css?v=28',
  './boxes-v20.css?v=28',
  './reports-v21.css?v=28',
  './goals-v22.css?v=28',
  './modals-v23.css?v=28',
  './theme-v26.css?v=28',
  './stability-v27.css?v=28',
  './stability-v28.css?v=28',
  './app-v14.js?v=28',
  './settings-ui.js?v=28',
  './goals-v22.js?v=28',
  './goals-boxes-v14.js?v=28',
  './ui-fixes-v7.js?v=28',
  './reference-v8.js?v=28',
  './transactions-v12.js?v=28',
  './profile-polish-v16.js?v=28',
  './ux-v17.js?v=28',
  './home-v18.js?v=28',
  './transactions-v19.js?v=28',
  './boxes-v20.js?v=28',
  './reports-v21.js?v=28',
  './modals-v23.js?v=28',
  './theme-v26.js?v=28',
  './stability-v28.js?v=28',
  './manifest.webmanifest?v=28',
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

  // HTML/navegacao: busca a versao atual e usa o cache apenas se estiver offline.
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

  // CSS/JS versionados: cache-first. A query ?v=28 garante que uma nova build use outra chave.
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
