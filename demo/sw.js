const CACHE="moe-raspisanie-demo-10-0-0";
const CORE=["./","./index.html","./manifest.json","../icon.svg","../icon-192.png","../icon-512.png"];
self.addEventListener("install",event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);await cache.addAll(CORE);await self.skipWaiting();
})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith("moe-raspisanie-demo-")&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(event.request.mode==="navigate"){
   event.respondWith(fetch(event.request).catch(()=>caches.match("./index.html")));
   return;
 }
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});