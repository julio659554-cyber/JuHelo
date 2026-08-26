const CACHE='juhelo-uiux-07';
const CORE=['./','./index.html','./app-v31.css?v=40','./design-system.css?v=uiux7','./app-shell.css?v=uiux7','./app-ui.css?v=uiux7','./modal-ux-v36.css?v=40','./picker-v40.css?v=40','./app-v31.js?v=40','./modal-ux-v36.js?v=40','./picker-v40.js?v=40','./boot-v40.js?v=40','./supabase-proxy-v33.js?v=40','./manifest.webmanifest?v=uiux7','./assets/icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(res=>{if(res?.ok)caches.open(CACHE).then(c=>c.put('./index.html',res.clone()));return res}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{if(res?.ok)caches.open(CACHE).then(c=>c.put(event.request,res.clone()));return res})));
});
