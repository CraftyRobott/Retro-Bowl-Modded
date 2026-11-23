(function(){
 "use strict";
 console.log("[Mod] Local mod loader starting...");

 function installNativeModBuilderButton(){
  try{
   // Patch the actual GameMaker object table before GameMaker_Init creates
   // the Settings screen and its controls.
   if(!window.JSON_game||!Array.isArray(JSON_game.GMObjects)){
    throw Error("GameMaker object table is unavailable.");
   }
   const optionsObject=JSON_game.GMObjects.find(object=>object.pName==="obj_options");
   if(!optionsObject||typeof optionsObject.CreateEvent!=="function"){
    throw Error("Retro Bowl Settings Create event was not found.");
   }
   const originalOptionsCreate=optionsObject.CreateEvent;

   optionsObject.CreateEvent=function(_inst,_other){
    const result=originalOptionsCreate.apply(this,arguments);
    if(_inst&&!_inst.__rbModBuilderAdded){
     const buttonObject=asset_get_index("obj_button_thin");
     if(typeof buttonObject!=="number"||buttonObject<0){
      throw Error("Could not find the game's thin button object.");
     }
     const buttonId=instance_create_layer(176,208,_inst.layer,buttonObject);
     if(!buttonId)throw Error("Could not create the Mod Builder button.");

     // GameMaker's instance_create_layer returns an instance ID, not the
     // JavaScript instance object. Resolve it through yyInst before changing
     // any GML instance variables.
     const button=yyInst(_inst,_other,buttonId);
     if(!button)throw Error("Could not resolve the Mod Builder button instance.");

     button.gmltext="MOD BUILDER";
     // obj_button's Step event calls script_execute(instance, other, action).
     // A function callback is supported by this runtime.
     button.gmlonClickAction=function(_buttonInstance,_otherInstance){
      console.log("[Mod] Native Mod Builder button clicked.");
      window.location.href=new URL("../builder.html",window.location.href).href;
     };
     button.__rbModBuilderButton=true;
     button.depth=-1;
     console.log("[Mod] Button callback installed:",typeof button.gmlonClickAction,
      "button id:",buttonId,"text:",button.gmltext);
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
   if(!response.ok){
    console.log("[Mod] No selected mod manifest; starting vanilla game.");
    installNativeModBuilderButton();
    return;
   }
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