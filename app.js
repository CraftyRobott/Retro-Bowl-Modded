const list=document.querySelector("#mod-list");
const count=document.querySelector("#count");
const summary=document.querySelector("#summary");
const build=document.querySelector("#build");
const status=document.querySelector("#status");
let catalog=[];
const selected=new Set();

async function init(){
  try {
    const response=await fetch("./mods/catalog.json");
    if(!response.ok) throw new Error("Catalog unavailable");
    catalog=await response.json();
    render();
  } catch(error) {
    list.innerHTML='<div class="loading">Could not load the mod catalog. Please try again later.</div>';
    status.textContent=error.message;
  }
}
function render(){
  list.innerHTML="";
  for(const mod of catalog){
    const card=document.createElement("label");
    card.className="mod-card"+(selected.has(mod.id)?" selected":"");
    card.innerHTML='<span class="mod-icon">'+escapeHTML(mod.icon||"＋")+'</span><span class="mod-info"><h3>'+escapeHTML(mod.name)+'</h3><p>'+escapeHTML(mod.description||"")+'</p></span><span class="mod-tag">'+escapeHTML(mod.category||"MOD")+'</span><span class="toggle">'+(selected.has(mod.id)?"✓":"")+'</span>';
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
  build.innerHTML='Build my game <span>↗</span>';
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
build.addEventListener("click",()=>{
  const mods=catalog.filter(mod=>selected.has(mod.id)).map(mod=>mod.id);
  const config={schema:1,game:"retro-bowl-college",mods};
  const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(config)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const url=new URL("./install.html",location.href);
  url.hash=encoded;
  location.href=url.href;
});
if("serviceWorker" in navigator&&location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
}
init();
