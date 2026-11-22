/* Service worker: aplikasi tetap jalan saat jaringan ada, lambat, atau mati.
   - Berkas situs & data terenkripsi: jaringan dulu (maks. 3,5 dtk), lalu salinan tersimpan di perangkat.
   - Pustaka Excel (CDN): salinan tersimpan dipakai lebih dulu.
   Hanya berkas TERENKRIPSI yang disimpan; data asli tidak pernah ditulis ke cache. */
const C='swac-v1',WAIT=3500;
const SHELL=['./','index.html','admin.html','manifest.webmanifest','assets/style.css','assets/lib.js','assets/dashboard.js','assets/admin.js','assets/pwa.js','assets/logo.png','assets/icon-192.png','assets/icon-512.png','data/index.json'];
const key=u=>{const x=new URL(u,self.registration.scope);return x.origin+x.pathname};
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(C);await Promise.allSettled(SHELL.map(p=>fetch(new Request(key(p),{cache:'reload'})).then(r=>{if(r.ok)return c.put(key(p),r)})));self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})())});
async function netFirst(req){const c=await caches.open(C),k=key(req.url),cached=await c.match(k);
 const net=fetch(req).then(r=>{if(r.ok)c.put(k,r.clone());else if(r.status===404)c.delete(k);return r});
 if(!cached)return net;
 return Promise.race([net.catch(()=>cached),new Promise(ok=>setTimeout(()=>ok(cached),WAIT))])}
async function cacheFirst(req){const c=await caches.open(C),m=await c.match(req);if(m)return m;
 const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin)e.respondWith(netFirst(r));
 else if(u.hostname==='cdnjs.cloudflare.com')e.respondWith(cacheFirst(r))});
