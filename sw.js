const SHELL_CACHE="rb-modded-shell-v4";
const SHELL=["./","./index.html","./install.html","./styles.css","./app.js","./manifest.webmanifest","./game-manifest.json","./play/","./play/index.html","./play/manifest.webmanifest","./play/engine/mods/loader.js"];
self.addEventListener("install",event=>event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("rb-modded-shell-")&&key!==SHELL_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=="GET"||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cached=await caches.match(request);
  if(cached)return cached;
  try{
   const response=await fetch(request);
   if(response.ok&&url.pathname.indexOf("/play/")===-1){const shell=await caches.open(SHELL_CACHE);shell.put(request,response.clone()).catch(()=>{});}
   return response;
  }catch(error){
   if(request.mode==="navigate"){
    const fallback=await caches.match("./index.html");
    if(fallback)return fallback;
   }
   return new Response("This file is not installed for offline use.",{status:503,headers:{"Content-Type":"text/plain"}});
  }
 })());
});