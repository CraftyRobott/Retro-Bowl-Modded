const list=document.querySelector("#mod-list");
const count=document.querySelector("#count");
const summary=document.querySelector("#summary");
const build=document.querySelector("#build");
const status=document.querySelector("#status");

const OWNER="CraftyRobott";
const REPO="Retro-Bowl-Modded";
const BRANCH="main";
const API=`https://api.github.com/repos/${OWNER}/${REPO}/contents/mods?ref=${BRANCH}`;
let catalog=[];
const selected=new Set();

function titleFromFilename(filename){
  return filename.replace(/\.js$/i,"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}
function metadataFromSource(filename,source,path,download_url){
  const header=source.split("\n").slice(0,45).join("\n");
  const read=(key)=>{const match=header.match(new RegExp("^\\s*//\\s*@"+key+"\\s+(.+)$","im"));return match?match[1].trim():"";};
  return {
    id:filename.replace(/\.js$/i,""),
    name:read("name")||titleFromFilename(filename),
    description:read("description")||"Community mod. Select to include it in your personal build.",
    category:read("category")||"Community mod",
    path,
    download_url
  };
}
async function loadMods(){
  status.textContent="Checking the public mods folder…";
  const response=await fetch(API,{headers:{"Accept":"application/vnd.github+json"}});
  if(!response.ok){
    if(response.status===404){catalog=[];render();status.textContent="No mods folder found yet. Add .js files to the mods/ folder in the GitHub repository.";return;}
    if(response.status===403)throw new Error("GitHub API rate limit reached. Please try again in a few minutes.");
    throw new Error("GitHub could not provide the mod list (HTTP "+response.status+").");
  }
  const files=await response.json();
  const scripts=files.filter(file=>file.type==="file"&&file.name.toLowerCase().endsWith(".js"));
  catalog=await Promise.all(scripts.map(async file=>{
    let source="";
    try{const raw=await fetch(file.download_url);if(raw.ok)source=await raw.text();}catch(error){console.warn("Could not read mod metadata:",file.name,error);}
    return metadataFromSource(file.name,source,file.path,file.download_url);
  }));
  catalog.sort((a,b)=>a.name.localeCompare(b.name));
  for(const id of [...selected])if(!catalog.some(mod=>mod.id===id))selected.delete(id);
  render();
  status.textContent=catalog.length
    ?catalog.length+" mod"+(catalog.length===1?"":"s")+" discovered from the public GitHub repository."
    :"No .js mods found. Add a mod file to the mods/ folder to make it appear here.";
}
function render(){
  list.innerHTML="";
  if(!catalog.length){list.innerHTML='<div class="loading">No mods found in the public mods/ folder yet.</div>';}
  for(const mod of catalog){
    const card=document.createElement("label");
    card.className="mod-card"+(selected.has(mod.id)?" selected":"");
    card.innerHTML='<span class="mod-icon">JS</span><span class="mod-info"><h3>'+escapeHTML(mod.name)+'</h3><p>'+escapeHTML(mod.description)+'</p></span><span class="mod-tag">'+escapeHTML(mod.category)+'</span><span class="toggle">'+(selected.has(mod.id)?"✓":"")+'</span>';
    card.addEventListener("click",event=>{
      event.preventDefault();
      selected.has(mod.id)?selected.delete(mod.id):selected.add(mod.id);
      render();
    });
    list.append(card);
  }
  count.textContent=selected.size+" SELECTED";
  summary.textContent=selected.size?catalog.filter(m=>selected.has(m.id)).map(m=>m.name).join(", "):"No mods selected";
  build.disabled=selected.size===0;
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
build.addEventListener("click",()=>{
  const mods=catalog.filter(mod=>selected.has(mod.id)).map(mod=>mod.id);
  const config={schema:2,game:"retro-bowl-college",repository:`${OWNER}/${REPO}`,branch:BRANCH,mods};
  const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const url=new URL("./install.html",location.href);
  url.hash=encoded;
  location.href=url.href;
});
if("serviceWorker" in navigator&&location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
}
loadMods().catch(error=>{
  list.innerHTML='<div class="loading">Could not load mods. '+escapeHTML(error.message)+'</div>';
  status.textContent=error.message;
});
