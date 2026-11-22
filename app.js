"use strict";
const OWNER="CraftyRobott";
const REPO="Retro-Bowl-Modded";
const BRANCH="main";
const TREE_API=`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
const RAW_BASE=`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
const list=document.querySelector("#mod-list");
const count=document.querySelector("#count");
const summary=document.querySelector("#summary");
const build=document.querySelector("#build");
const status=document.querySelector("#status");
const launch=document.querySelector("#launch-installed");
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
  let source="";
  try{const r=await fetch(RAW_BASE+file.path);if(r.ok)source=await r.text();}catch(e){console.warn("Metadata unavailable for",file.path,e);}
  return metadataFromSource(file.path,source);
 }));
 catalog.sort((a,b)=>a.name.localeCompare(b.name));
 for(const id of [...selected])if(!catalog.some(m=>m.id===id))selected.delete(id);
 render();
 status.textContent=catalog.length?catalog.length+" mod"+(catalog.length===1?"":"s")+" found. Supporting files in mods/data and mods/fields are included during installation.":"No mods have been published yet. You can still install the unmodified base game.";
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
 list.innerHTML="";
 if(!catalog.length)list.innerHTML='<div class="loading">No public mods yet. The base game can still be installed.</div>';
 for(const mod of catalog){
  const card=document.createElement("label");
  card.className="mod-card"+(selected.has(mod.id)?" selected":"");
  card.innerHTML='<span class="mod-icon">JS</span><span class="mod-info"><h3>'+escapeHTML(mod.name)+'</h3><p>'+escapeHTML(mod.description)+'</p></span><span class="mod-tag">'+escapeHTML(mod.category)+'</span><span class="toggle">'+(selected.has(mod.id)?"✓":"")+'</span>';
  card.addEventListener("click",event=>{event.preventDefault();selected.has(mod.id)?selected.delete(mod.id):selected.add(mod.id);render();});
  list.append(card);
 }
 count.textContent=selected.size+" SELECTED";
 summary.textContent=selected.size?catalog.filter(m=>selected.has(m.id)).map(m=>m.name).join(", "):"Base game only";
 build.disabled=false;
}
build.addEventListener("click",()=>{
 const config={schema:3,game:"retro-bowl-college",modRepository:`${OWNER}/${REPO}`,mods:catalog.filter(m=>selected.has(m.id)).map(m=>m.id)};
 const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 const url=new URL("./install.html",location.href);url.hash=encoded;location.href=url.href;
});
async function checkInstalled(){
 if(!("caches" in window))return;
 const marker=await caches.match(new URL("play/installed.json",location.href).href);
 if(marker){launch.hidden=false;launch.href="./play/";}
}
if("serviceWorker" in navigator&&location.protocol!=="file:"){
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
}
checkInstalled().catch(console.warn);
loadMods().catch(error=>{list.innerHTML='<div class="loading">'+escapeHTML(error.message)+'</div>';status.textContent=error.message;});
