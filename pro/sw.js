const CACHE='moe-raspisanie-pro-10-0-0';
const CORE=['./','./index.html','./manifest.json','../icon.svg','../icon-180.png','../icon-192.png','../icon-512.png'];
const XLSX_URL='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  try {
    const response=await fetch(XLSX_URL,{mode:'cors'});
    if(response.ok)await cache.put(XLSX_URL,response.clone());
  } catch(_){}
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('moe-raspisanie-pro-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.href===XLSX_URL){
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{
      if(r&&r.ok)caches.open(CACHE).then(cache=>cache.put(event.request,r.clone()));
      return r;
    })));
    return;
  }
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(r=>{
      if(r&&r.ok)caches.open(CACHE).then(c=>c.put('./index.html',r.clone()));
      return r;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(r=>{
    if(r&&r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));
    return r;
  }).catch(()=>caches.match(event.request)));
});