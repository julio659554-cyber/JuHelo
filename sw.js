const CACHE='juhelo-v36';
const CORE=['./','./index.html','./app-v31.css?v=36','./modal-ux-v36.css?v=36','./app-v31.js?v=36','./modal-ux-v36.js?v=36','./boot-v36.js?v=36','./supabase-proxy-v33.js?v=36','./manifest.webmanifest?v=36','./assets/icon.svg'];

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
