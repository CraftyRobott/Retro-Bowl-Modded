(function(){
 "use strict";
 console.log("[Mod] Local mod loader starting...");
 window.RBModsReady=(async function(){
  try{
   const response=await fetch("engine/mods/selected.json",{cache:"no-store"});
   if(!response.ok){console.log("[Mod] No selected mod manifest; starting vanilla game.");return;}
   const manifest=await response.json();
   const mods=Array.isArray(manifest.mods)?manifest.mods:[];
   for(const path of mods){
    if(typeof path!=="string"||path.includes("..")||path.startsWith("/")||!path.toLowerCase().endsWith(".js"))throw Error("Invalid mod path: "+path);
    const file=await fetch("engine/mods/"+path,{cache:"no-store"});
    if(!file.ok)throw Error("Could not load selected mod: "+path);
    const source=await file.text();
    const script=document.createElement("script");script.textContent=source;script.dataset.mod=path;document.head.appendChild(script);script.remove();
    console.log("[Mod] Loaded:",path);
   }
   console.log("[Mod] All selected mods loaded.");
  }catch(error){console.error("[Mod] Mod loading failed:",error);throw error;}
 })();
})();