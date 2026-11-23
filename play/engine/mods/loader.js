(function(){
 "use strict";
 console.log("[Mod] Local mod loader starting...");

 function installNativeModBuilderButton(){
  try{
   // Patch the actual GameMaker object/script tables. Replacing only the
   // window function would not affect the callbacks already stored there.
   if(!window.JSON_game||!Array.isArray(JSON_game.Scripts)||!Array.isArray(JSON_game.GMObjects)){
    throw Error("GameMaker object/script tables are unavailable.");
   }
   const clickIndex=703; // script asset 100703: btn_click_Continue
   const originalContinue=JSON_game.Scripts[clickIndex];
   const optionsObject=JSON_game.GMObjects.find(object=>object.pName==="obj_options");
   if(typeof originalContinue!=="function"||!optionsObject||typeof optionsObject.CreateEvent!=="function"){
    throw Error("Retro Bowl settings hooks were not found.");
   }
   const originalOptionsCreate=optionsObject.CreateEvent;

   JSON_game.Scripts[clickIndex]=function(_inst,_other){
    if(_inst&&_inst.__rbModBuilderButton){
     window.location.href=new URL("../builder.html",window.location.href).href;
     return;
    }
    return originalContinue.apply(this,arguments);
   };

   // Add a native thin-button control in the open strip above the bottom
   // controls. It uses the game's own sprite, rendering and touch handling.
   optionsObject.CreateEvent=function(_inst,_other){
    const result=originalOptionsCreate.apply(this,arguments);
    if(_inst&&!_inst.__rbModBuilderAdded){
     const buttonObject=asset_get_index("obj_button_thin");
     if(typeof buttonObject!=="number"||buttonObject<0){
      throw Error("Could not find the game's thin button object.");
     }
     const button=instance_create_layer(176,208,_inst.layer,buttonObject);
     if(!button)throw Error("Could not create the Mod Builder button.");
     button.gmltext="MOD BUILDER";
     button.gmlonClickAction=100703;
     button.__rbModBuilderButton=true;
     button.depth=-1;
     _inst.__rbModBuilderAdded=true;
     console.log("[Mod] Native Settings > MOD BUILDER button added.");
    }
    return result;
   };
  }catch(error){
   console.warn("[Mod] Could not add native Settings button:",error);
  }
 }
 window.RBModsReady=(async function(){
  try{
   const response=await fetch("engine/mods/selected.json",{cache:"no-store"});
   if(!response.ok){console.log("[Mod] No selected mod manifest; starting vanilla game.");installNativeModBuilderButton();return;}
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

   installNativeModBuilderButton();
   console.log("[Mod] All selected mods loaded.");
  }catch(error){console.error("[Mod] Mod loading failed:",error);throw error;}
 })();
})();