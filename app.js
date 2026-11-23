"use strict";
const OWNER="CraftyRobott";
const REPO="Retro-Bowl-Modded";
const BRANCH="main";
const TREE_API="https://api.github.com/repos/"+OWNER+"/"+REPO+"/git/trees/"+BRANCH+"?recursive=1";
const RAW_BASE="https://raw.githubusercontent.com/"+OWNER+"/"+REPO+"/"+BRANCH+"/";
const list=document.querySelector("#mod-list");
const count=document.querySelector("#count");
const summary=document.querySelector("#summary");
const build=document.querySelector("#build");
const status=document.querySelector("#status");
const launch=document.querySelector("#launch-installed");
const customFileInput=document.querySelector("#custom-mod-files");
const customFolderInput=document.querySelector("#custom-mod-folder");
const customList=document.querySelector("#custom-mod-list");
const customMods=[];
const DB_NAME="rb-modded-custom-mods";
const MAX_CUSTOM_MODS=10;
const MAX_FOLDER_BYTES=25*1024*1024;
function openCustomDB(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("mods"))request.result.createObjectStore("mods",{keyPath:"id"});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}
async function saveCustomMod(record){
 const db=await openCustomDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("mods","readwrite");tx.objectStore("mods").put(record);
  tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};
 });
}
async function deleteCustomMod(id){
 const db=await openCustomDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("mods","readwrite");tx.objectStore("mods").delete(id);
  tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
 });
}
async function loadSavedCustomMods(){
 const db=await openCustomDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("mods","readonly"),request=tx.objectStore("mods").getAll();
  request.onsuccess=()=>{
   customMods.splice(0,customMods.length,...request.result.map(({id,name,files,source})=>({id,name,files:files?files.length:(source?1:0)})));
   db.close();resolve();
  };
  request.onerror=()=>{db.close();reject(request.error);};
 });
}
function renderCustomMods(){
 customList.innerHTML="";
 if(!customMods.length){customList.innerHTML='<span class="loading">No custom mods added.</span>';return;}
 for(const mod of customMods){
  const item=document.createElement("div");item.className="custom-mod-item";
  const details=document.createElement("span");details.textContent=mod.name;
  const meta=document.createElement("small");meta.textContent=mod.files+" file(s), including scripts and assets";details.append(meta);
  const remove=document.createElement("button");remove.type="button";remove.textContent="REMOVE";
  remove.addEventListener("click",async()=>{
   try{await deleteCustomMod(mod.id);customMods.splice(customMods.findIndex(x=>x.id===mod.id),1);renderCustomMods();render();status.textContent=mod.name+" removed from this build.";}
   catch(error){status.textContent="Could not remove custom mod: "+error.message;}
  });
  item.append(details,remove);customList.append(item);
 }
}
let catalog=[];
const selected=new Set();
function titleFromFilename(filename){return filename.split("/").pop().replace(/\.js$/i,"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function metadataFromSource(path,source){
 const header=source.split("\n").slice(0,50).join("\n");
 const read=key=>{const m=header.match(new RegExp("^\\s*//\\s*[@]"+key+"\\s+(.+)$","im"));return m?m[1].trim():"";};
 const relative=path.slice("mods/".length);
 return {id:relative,name:read("name")||titleFromFilename(relative),description:read("description")||"Community mod. Select to include it in your installation.",category:read("category")||"Community",path};
}
async function loadMods(){
 status.textContent="Checking the public mods repository…";
 const response=await fetch(TREE_API,{headers:{"Accept":"application/vnd.github+json"}});
 if(!response.ok)throw new Error(response.status===403?"GitHub API rate limit reached. Try again shortly.":"Could not read the public mod repository (HTTP "+response.status+").");
 const tree=await response.json();
 if(tree.truncated)throw new Error("The repository is too large for automatic mod discovery.");
 const paths=tree.tree.filter(x=>x.type==="blob"&&x.path.startsWith("mods/")&&x.path.toLowerCase().endsWith(".js"));
 catalog=await Promise.all(paths.map(async file=>{
  let source="";try{const r=await fetch(RAW_BASE+file.path);if(r.ok)source=await r.text();}catch(e){console.warn("Metadata unavailable for",file.path,e);}
  return metadataFromSource(file.path,source);
 }));
 catalog.sort((a,b)=>a.name.localeCompare(b.name));
 for(const id of [...selected])if(!catalog.some(m=>m.id===id))selected.delete(id);
 render();
 status.textContent=catalog.length?catalog.length+" mod"+(catalog.length===1?"":"s")+" found. Supporting files under mods/ are included in the offline install.":"No public mods have been published yet. You can still install the base game.";
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 list.innerHTML="";
 if(!catalog.length)list.innerHTML='<div class="loading">No public mods yet. The base game can still be installed.</div>';
 for(const mod of catalog){
  const card=document.createElement("label");card.className="mod-card"+(selected.has(mod.id)?" selected":"");
  card.innerHTML='<span class="mod-icon">JS</span><span class="mod-info"><h3>'+escapeHTML(mod.name)+'</h3><p>'+escapeHTML(mod.description)+'</p></span><span class="mod-tag">'+escapeHTML(mod.category)+'</span><span class="toggle">'+(selected.has(mod.id)?"✓":"")+'</span>';
  card.addEventListener("click",event=>{event.preventDefault();selected.has(mod.id)?selected.delete(mod.id):selected.add(mod.id);render();});
  list.append(card);
 }
 count.textContent=(selected.size+customMods.length)+" SELECTED";
 const names=catalog.filter(m=>selected.has(m.id)).map(m=>m.name).concat(customMods.map(m=>m.name));
 summary.textContent=names.length?names.join(", "):"Base game only";
 build.disabled=false;
}
function cleanRelativePath(path){
 let value=String(path||"").split(String.fromCharCode(92)).join("/");
 while(value.charAt(0)==="/")value=value.slice(1);
 const parts=value.split("/").filter(Boolean);
 if(!parts.length||parts.some(part=>part==="."||part===".."||part.includes(":")))return "";
 return parts.join("/");
}
async function importCustomFiles(fileList,isFolder){
 const files=Array.from(fileList||[]).filter(file=>file&&file.name&&!file.name.startsWith("."));
 if(!files.length)return;
 if(customMods.length>=MAX_CUSTOM_MODS){status.textContent="You can add up to "+MAX_CUSTOM_MODS+" custom mod folders.";return;}
 let root="";
 if(isFolder&&files[0].webkitRelativePath){
  const first=files[0].webkitRelativePath.replace(/\\/g,"/").split("/");
  if(first.length>1&&files.every(file=>file.webkitRelativePath&&file.webkitRelativePath.replace(/\\/g,"/").split("/")[0]===first[0]))root=first[0];
 }
 const stored=[];let totalBytes=0;
 for(const file of files){
  let path=isFolder&&file.webkitRelativePath?file.webkitRelativePath.replace(/\\/g,"/"):file.name;
  if(root&&path.startsWith(root+"/"))path=path.slice(root.length+1);
  path=cleanRelativePath(path);if(!path)continue;
  totalBytes+=file.size||0;
  if(totalBytes>MAX_FOLDER_BYTES){status.textContent="That folder is larger than the 25 MB custom-mod limit.";return;}
  if(/\.js$/i.test(path)&&(file.size||0)>2*1024*1024){status.textContent=path+" is larger than the 2 MB per-script limit.";return;}
  stored.push({path,blob:file.slice(0,file.size,file.type||"application/octet-stream")});
 }
 const scripts=stored.filter(file=>/\.js$/i.test(file.path));
 if(!scripts.length){status.textContent="The selected folder must contain at least one .js mod file.";return;}
 if(stored.length>300){status.textContent="That folder contains more than 300 files. Split it into smaller mods.";return;}
 const id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)).replace(/[^a-z0-9-]/gi,"");
 const name=root||scripts[0].path.replace(/\.js$/i,"");
 try{
  await saveCustomMod({id,name,files:stored,entrypoints:scripts.map(file=>file.path)});
  customMods.push({id,name,files:stored.length});renderCustomMods();render();
  status.textContent=name+" imported ("+stored.length+" files, "+scripts.length+" JavaScript file(s)). It will be included in your next offline installation.";
 }catch(error){status.textContent="Could not save "+name+": "+error.message;}
}
customFolderInput.addEventListener("change",async()=>{const files=Array.from(customFolderInput.files||[]);customFolderInput.value="";await importCustomFiles(files,true);});
customFileInput.addEventListener("change",async()=>{const files=Array.from(customFileInput.files||[]);customFileInput.value="";for(const file of files)await importCustomFiles([file],false);});
build.addEventListener("click",()=>{
 const config={schema:5,game:"retro-bowl-college",modRepository:OWNER+"/"+REPO,mods:catalog.filter(m=>selected.has(m.id)).map(m=>m.id),customMods:customMods.map(({id,name})=>({id,name}))};
 const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const url=new URL("./install.html",location.href);url.hash=encoded;location.href=url.href;
});
async function checkInstalled(){
 if(!("caches" in window))return;
 const marker=await caches.match(new URL("play/installed.json",location.href).href);
 if(marker){launch.hidden=false;launch.href="./play/";}
}
if("serviceWorker" in navigator&&location.protocol!=="file:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
checkInstalled().catch(console.warn);
loadSavedCustomMods().then(()=>{renderCustomMods();render();}).catch(error=>{status.textContent="Could not read saved custom mods: "+error.message;});
loadMods().catch(error=>{list.innerHTML='<div class="loading">'+escapeHTML(error.message)+'</div>';status.textContent=error.message;});
