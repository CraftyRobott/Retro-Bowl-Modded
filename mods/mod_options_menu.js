// @name Retro Bowl Mod Options Framework
// @description Adds a custom HTML options menu and shared settings API for other mods.
// @category framework
// Retro Bowl College — shared mod settings UI
(function () {
  "use strict";
  if (window.RetroBowlModOptions) return;

  var ROOM_OPTIONS = 0x03000012;
  var STORE_KEY = "retroBowlCollege.modOptions.v1";
  var settings = [];
  var values = {};
  var button, overlay, contentEl, lastActive = false;

  try { values = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (_) {}

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(values)); } catch (_) {}
  }
  function inSettings() {
    try {
      return typeof g_pBuiltIn !== "undefined" &&
        g_pBuiltIn && typeof g_pBuiltIn.get_current_room === "function" &&
        typeof YYASSET_REF === "function" &&
        g_pBuiltIn.get_current_room() == YYASSET_REF(ROOM_OPTIONS);
    } catch (_) { return false; }
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function style() {
    if (document.getElementById("rbmo-style")) return;
    var s = el("style"); s.id = "rbmo-style";
    s.textContent = `
#rbmo-button{position:fixed;z-index:99990;display:none;transform:translateX(-50%);padding:8px 14px;background:#202b35;color:#fff;border:2px solid #fff;box-shadow:3px 3px #000;font:bold 12px Arial;letter-spacing:1px;cursor:pointer}
#rbmo-overlay{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background:#000c;font-family:Arial;color:#fff}
#rbmo-panel{width:min(560px,100%);max-height:85vh;display:flex;flex-direction:column;background:#17232d;border:3px solid #eee;box-shadow:8px 8px #0008}
#rbmo-head,#rbmo-foot{padding:13px 16px;background:#263746;display:flex;justify-content:space-between;align-items:center}
#rbmo-head{font-weight:900;letter-spacing:1px;text-transform:uppercase}
#rbmo-close{background:none;border:0;color:white;font-size:25px;cursor:pointer}
#rbmo-content{padding:12px 16px;overflow:auto}
.rbmo-section{margin:8px 0;padding-bottom:7px;border-bottom:1px solid #52616b;color:#9db2c1;font-size:11px;font-weight:bold;letter-spacing:1px}
.rbmo-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #ffffff18}
.rbmo-info{min-width:0}.rbmo-name{font-size:13px;font-weight:bold}.rbmo-desc{font-size:11px;color:#aeb9c1;margin-top:4px}
.rbmo-control{max-width:48%;min-width:90px;padding:7px;background:#293b49;color:#fff;border:1px solid #71818c}
.rbmo-action{padding:8px 12px;background:#3b6848;color:white;border:2px solid #dce8df;font-weight:bold;cursor:pointer}
#rbmo-foot{font-size:10px;color:#aab7c0}
`;
    document.head.appendChild(s);
  }
  function render() {
    contentEl.textContent = "";
    if (!settings.length) { contentEl.textContent = "No mod settings registered yet."; return; }
    settings.forEach(function (def) {
      if (def.type === "section") {
        contentEl.appendChild(el("div", "rbmo-section", def.label || def.title || "OPTIONS"));
        return;
      }
      var row = el("div", "rbmo-row");
      var info = el("div", "rbmo-info");
      info.appendChild(el("div", "rbmo-name", def.label || def.title || def.id));
      if (def.description) info.appendChild(el("div", "rbmo-desc", def.description));
      row.appendChild(info);
      var value = Object.prototype.hasOwnProperty.call(values, def.id) ? values[def.id] : def.default;
      var control;
      function changed(v) {
        values[def.id] = v; save();
        if (typeof def.onChange === "function") def.onChange(v, api);
      }
      if (def.type === "button") {
        control = el("button", "rbmo-action", def.buttonText || "RUN");
        control.addEventListener("click", function () { if (def.onClick) def.onClick(api); });
      } else if (def.type === "toggle" || def.type === "checkbox") {
        control = el("input", "rbmo-control"); control.type = "checkbox"; control.checked = !!value;
        control.addEventListener("change", function () { changed(control.checked); });
      } else if (def.type === "select") {
        control = el("select", "rbmo-control");
        (def.options || []).forEach(function (o) {
          var opt = el("option", "", typeof o === "object" ? o.label : o);
          opt.value = typeof o === "object" ? o.value : o; control.appendChild(opt);
        });
        control.value = value;
        control.addEventListener("change", function () { changed(control.value); });
      } else {
        control = el("input", "rbmo-control");
        control.type = def.type === "range" || def.type === "slider" ? "range" : (def.type === "number" ? "number" : "text");
        if (def.min != null) control.min = def.min;
        if (def.max != null) control.max = def.max;
        if (def.step != null) control.step = def.step;
        if (def.placeholder) control.placeholder = def.placeholder;
        control.value = value == null ? "" : value;
        control.addEventListener(control.type === "range" ? "input" : "change", function () {
          changed(control.type === "number" || control.type === "range" ? Number(control.value) : control.value);
        });
      }
      row.appendChild(control); contentEl.appendChild(row);
    });
  }
  function open() { render(); overlay.style.display = "flex"; button.style.display = "none"; }
  function close() { overlay.style.display = "none"; if (inSettings()) button.style.display = "block"; }
  function build() {
    if (button) return;
    style();
    button = el("button"); button.id = "rbmo-button"; button.textContent = "MOD OPTIONS";
    button.addEventListener("click", open); document.body.appendChild(button);
    overlay = el("div"); overlay.id = "rbmo-overlay";
    var panel = el("section"); panel.id = "rbmo-panel"; panel.setAttribute("role","dialog"); panel.setAttribute("aria-modal","true");
    var head = el("header"); head.id = "rbmo-head"; head.appendChild(el("span","","MOD OPTIONS"));
    var closeBtn = el("button"); closeBtn.id = "rbmo-close"; closeBtn.textContent = "×"; closeBtn.addEventListener("click",close); head.appendChild(closeBtn);
    contentEl = el("div"); contentEl.id = "rbmo-content";
    var foot = el("footer"); foot.id = "rbmo-foot"; foot.appendChild(el("span","","RETRO BOWL MODS")); foot.appendChild(el("span","","Saved automatically"));
    panel.appendChild(head); panel.appendChild(contentEl); panel.appendChild(foot); overlay.appendChild(panel); document.body.appendChild(overlay);
    overlay.addEventListener("click",function(e){if(e.target===overlay)close();});
    document.addEventListener("keydown",function(e){if(e.key==="Escape")close();});
  }
  var api = {
    register:function(def){
      if(!def || !def.id || !def.type) throw new Error("register requires id and type");
      var allowed=["section","toggle","checkbox","select","range","slider","number","text","button"];
      if(allowed.indexOf(def.type)<0) throw new Error("Unsupported setting type: "+def.type);
      var i=settings.findIndex(function(x){return x.id===def.id;});
      if(i<0) settings.push(def); else settings[i]=def;
      if(def.type!=="section" && def.type!=="button" && !Object.prototype.hasOwnProperty.call(values,def.id)){
        values[def.id]=def.default; save();
      }
      if(overlay && overlay.style.display==="flex") render();
    },
    get:function(id){var d=settings.find(function(x){return x.id===id;});return Object.prototype.hasOwnProperty.call(values,id)?values[id]:(d?d.default:undefined);},
    set:function(id,value){values[id]=value;save();var d=settings.find(function(x){return x.id===id;});if(d&&d.onChange)d.onChange(value,api);if(overlay&&overlay.style.display==="flex")render();},
    open:open, close:close,
    unregister:function(id){settings=settings.filter(function(x){return x.id!==id;});if(overlay&&overlay.style.display==="flex")render();}
  };
  window.RetroBowlModOptions = api;

  // Small example entry confirms the menu works; remove this section once real mods register settings.
  api.register({id:"rbmo_framework_status",type:"section",label:"MOD SETTINGS FRAMEWORK"});
  api.register({id:"rbmo_framework_note",type:"text",label:"Framework status",description:"Other mods can register their own options here.",default:"Ready"});

  function tick(){
    var active=inSettings();
    if(active!==lastActive){
      lastActive=active;
      if(active){build();var c=document.getElementById("canvas");if(c){var r=c.getBoundingClientRect();button.style.left=(r.left+r.width*.70)+"px";button.style.top=(r.top+r.height*.79)+"px";button.style.fontSize=Math.max(10,Math.min(13,r.width/65))+"px";button.style.display="block";}}
      else {if(button)button.style.display="none";if(overlay)overlay.style.display="none";}
    }
    if(active&&button){var c=document.getElementById("canvas");if(c){var r=c.getBoundingClientRect();button.style.left=(r.left+r.width*.70)+"px";button.style.top=(r.top+r.height*.79)+"px";}}
    requestAnimationFrame(tick);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){build();requestAnimationFrame(tick);});
  else {build();requestAnimationFrame(tick);}
  console.log("[Mod Options] Framework loaded. API: window.RetroBowlModOptions");
})();