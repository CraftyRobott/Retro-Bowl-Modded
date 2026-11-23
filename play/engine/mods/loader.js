(function(){
 "use strict";
 console.log("[Mod] Local mod loader starting...");

 function cleanAssetPath(path){
  let value=String(path||"").split(String.fromCharCode(92)).join("/");
  while(value.charAt(0)==="/")value=value.slice(1);
  const parts=value.split("/").filter(Boolean);
  if(!parts.length||parts.some(part=>part==="."||part===".."||part.includes(":")))return "";
  return parts.join("/");
 }
 function makeAssetNamespace(scriptPath){
  const slash=scriptPath.lastIndexOf("/");
  const base=slash>=0?scriptPath.slice(0,slash+1):"";
  function getURL(path){
   const clean=cleanAssetPath(path);
   if(!clean)return null;
   return new URL("engine/mods/"+base+clean,location.href).href;
  }
  return {
   base:base,
   getURL:getURL,
   fetch:function(path,options){
    const url=getURL(path);
    if(!url)return Promise.reject(Error("Invalid mod asset path: "+path));
    return window.fetch(url,options||{});
   },
   loadImage:function(path){
    return new Promise(function(resolve,reject){
     const url=getURL(path);
     if(!url){reject(Error("Invalid mod image path: "+path));return;}
     const image=new Image();
     image.onload=function(){resolve(image);};
     image.onerror=function(){reject(Error("Could not load mod image: "+path));};
     image.src=url;
    });
   },
   loadBlob:function(path){
    return this.fetch(path).then(function(response){
     if(!response.ok)throw Error("Mod asset not found: "+path);
     return response.blob();
    });
   }
  };
 }
 const assetAPI={
  current:null,
  forMod:function(scriptPath){return makeAssetNamespace(String(scriptPath||""));},
  getURL:function(path){return (this.current||makeAssetNamespace("")).getURL(path);},
  loadImage:function(path){return (this.current||makeAssetNamespace("")).loadImage(path);},
  fetch:function(path,options){return (this.current||makeAssetNamespace("")).fetch(path,options);}
 };
 window.RetroBowlModAssets=assetAPI;

 function installNativeModBuilderButton(){
  try{
   if(!window.JSON_game||!Array.isArray(JSON_game.GMObjects))throw Error("GameMaker object table is unavailable.");
   const optionsObject=JSON_game.GMObjects.find(object=>object.pName==="obj_options");
   if(!optionsObject||typeof optionsObject.CreateEvent!=="function")throw Error("Retro Bowl Settings Create event was not found.");
   const originalOptionsCreate=optionsObject.CreateEvent;
   optionsObject.CreateEvent=function(_inst,_other){
    const result=originalOptionsCreate.apply(this,arguments);
    if(_inst&&!_inst.__rbModBuilderAdded){
     const buttonObject=asset_get_index("obj_button_thin");
     if(typeof buttonObject!=="number"||buttonObject<0)throw Error("Could not find the game's thin button object.");
     const buttonId=instance_create_layer(176,208,_inst.layer,buttonObject);
     if(!buttonId)throw Error("Could not create the Mod Builder button.");
     const button=yyInst(_inst,_other,buttonId);
     if(!button)throw Error("Could not resolve the Mod Builder button instance.");
     button.gmltext="MOD BUILDER";
     button.gmlonClickAction=function(){
      console.log("[Mod] Native Mod Builder button clicked.");
      window.location.href=new URL("../builder.html",window.location.href).href;
     };
     button.__rbModBuilderButton=true;
     button.depth=-1;
     _inst.__rbModBuilderAdded=true;
     console.log("[Mod] Native Settings > MOD BUILDER button added.");
    }
    return result;
   };
  }catch(error){console.warn("[Mod] Could not add native Settings button:",error);}
 }

 window.RBModsReady=(async function(){
  try{
   const response=await fetch("engine/mods/selected.json",{cache:"no-store"});
   if(!response.ok){
    console.log("[Mod] No selected mod manifest; starting vanilla game.");
    installNativeModBuilderButton();
    return;
   }
   const manifest=await response.json();
   const mods=Array.isArray(manifest.mods)?manifest.mods:[];
   for(const path of mods){
    const parts=String(path).split("/");
    if(!path||path.startsWith("/")||parts.some(part=>!part||part==="."||part==="..")||!path.toLowerCase().endsWith(".js"))throw Error("Invalid mod path: "+path);
    const file=await fetch("engine/mods/"+path,{cache:"no-store"});
    if(!file.ok)throw Error("Could not load selected mod: "+path);
    const source=await file.text();
    const script=document.createElement("script");
    script.textContent=source;
    script.dataset.mod=path;
    assetAPI.current=makeAssetNamespace(path);
    try{document.head.appendChild(script);}finally{assetAPI.current=null;script.remove();}
    console.log("[Mod] Loaded:",path);
   }
   installNativeModBuilderButton();
   console.log("[Mod] All selected mods loaded.");
  }catch(error){console.error("[Mod] Mod loading failed:",error);throw error;}
 })();
})();