const CACHE='juhelo-uiux-18';
const CORE=['./','./index.html','./design-system.css?v=uiux18','./app-shell.css?v=uiux18','./app-ui.css?v=uiux18','./forms.css?v=uiux18','./categories.css?v=uiux18','./picker.css?v=uiux18','./interactions.css?v=uiux18','./app.js?v=uiux18','./form-ux.js?v=uiux18','./picker.js?v=uiux18','./boot.js?v=uiux18','./supabase-proxy-v33.js?v=uiux18-auth1','./manifest.webmanifest?v=uiux18','./assets/icon.svg'];

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