const CACHE='juhelo-uiux-20';
const CORE=['./','./index.html','./design-system.css?v=uiux20','./app-shell.css?v=uiux20','./app-ui.css?v=uiux20','./forms.css?v=uiux20','./categories.css?v=uiux20','./picker.css?v=uiux20','./interactions.css?v=uiux20','./app.js?v=uiux20','./form-ux.js?v=uiux20','./picker.js?v=uiux20','./motion.js?v=uiux20','./boot.js?v=uiux20','./supabase-proxy-v33.js?v=uiux20-auth1','./manifest.webmanifest?v=uiux20','./assets/icon.svg'];

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