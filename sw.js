const SHELL_CACHE="rb-modded-shell-v6";
const SHELL=["./","./index.html","./install.html","./styles.css","./app.js","./manifest.webmanifest","./game-manifest.json","./play/","./play/index.html","./play/manifest.webmanifest","./play/engine/mods/loader.js"];
self.addEventListener("install",event=>event.waitUntil(caches.open(SHELL_CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("rb-modded-shell-")&&key!==SHELL_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const request=event.request,url=new URL(request.url),method=request.method;
 if((method!=="GET"&&method!=="HEAD")||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const lookup=method==="HEAD"?new Request(request.url,{method:"GET"}):request;
  const cached=await caches.match(lookup);
  if(cached){
   if(method==="HEAD")return new Response(null,{status:cached.status,statusText:cached.statusText,headers:cached.headers});
   return cached;
  }
  try{
   const response=await fetch(request);
   if(method==="GET"&&response.ok&&url.pathname.indexOf("/play/")===-1){
    const shell=await caches.open(SHELL_CACHE);
    shell.put(request,response.clone()).catch(()=>{});
   }
   return response;
  }catch(error){
   // GameMaker's file_exists() treats most non-404 statuses as "exists".
   // Return a real 404 for an uncached offline file, otherwise it tries to
   // open a nonexistent file and crashes with file_text_open_read() === -1.
   if(method==="HEAD")return new Response(null,{status:404,statusText:"Not Found"});
   if(request.mode==="navigate"){
    const fallback=await caches.match("./index.html");
    if(fallback)return fallback;
   }
   return new Response(null,{status:503,headers:{"Content-Type":"text/plain"}});
  }
 })());
});