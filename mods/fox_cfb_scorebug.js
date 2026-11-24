// @name FOX CFB Broadcast Scorebug
// @description Replaces Retro Bowl College's in-game score strip with a responsive FOX-inspired broadcast scoreboard.
// @category presentation
// Install: engine/mods/fox_cfb_scorebug.js
(function () {
  "use strict";

  if (window.__foxCfbScorebugInstalled) return;
  window.__foxCfbScorebugInstalled = true;

  var TAG = "[FOX CFB]";
  var previousScores = [null, null];
  var overlay = null;
  var lastSnapshot = "";
  var originalDraw = window.gml_Object_obj_controller_Draw_64;
  var originalScoreboard = window.gml_Script_s_draw_scoreboard;

  function safeArray(value, index, fallback) {
    try {
      if (value == null) return fallback;
      var result = value[index];
      return result == null ? fallback : result;
    } catch (_) { return fallback; }
  }

  function safeText(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
  }

  function ordinal(q) {
    q = Number(q);
    if (!q || !isFinite(q)) return "PRE";
    if (q >= 5) return q === 5 ? "OT" : (q - 4) + "OT";
    return q + (q === 1 ? "ST" : q === 2 ? "ND" : q === 3 ? "RD" : "TH");
  }

  function colorFromTeam(team, fallback) {
    if (!team) return fallback;
    var keys = ["primary_color", "primaryColor", "primary", "colour", "color", "team_color"];
    for (var i = 0; i < keys.length; i++) {
      try {
        var v = team[keys[i]];
        if (typeof v === "string" && (/^#?[0-9a-f]{6}$/i).test(v)) return v.charAt(0) === "#" ? v : "#" + v;
      } catch (_) {}
    }
    try {
      if (typeof window.ds_map_find_value === "function") {
        for (var j = 0; j < keys.length; j++) {
          var c = window.ds_map_find_value(team, keys[j]);
          if (typeof c === "string" && (/^#?[0-9a-f]{6}$/i).test(c)) return c.charAt(0) === "#" ? c : "#" + c;
          if (typeof c === "number" && isFinite(c)) return "#" + ("000000" + (c >>> 0).toString(16)).slice(-6);
        }
      }
    } catch (_) {}
    return fallback;
  }

  function teamValue(team, key, fallback) {
    try {
      if (team && team[key] !== undefined && team[key] !== null) return team[key];
      if (typeof window.ds_map_find_value === "function") {
        var v = window.ds_map_find_value(team, key);
        if (v !== undefined && v !== null && v !== "") return v;
      }
    } catch (_) {}
    return fallback;
  }

  function ensureOverlay() {
    if (overlay && document.body.contains(overlay)) return overlay;

    var style = document.getElementById("fox-cfb-scorebug-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "fox-cfb-scorebug-style";
      style.textContent = \`
        #fox-cfb-scorebug {
          --fox-away:#8b1e2d; --fox-home:#173b67;
          position:fixed; z-index:99990; top:max(5px, env(safe-area-inset-top)); left:50%;
          transform:translateX(-50%); width:min(96vw, 830px); height:clamp(66px, 10.5vw, 88px);
          display:grid; grid-template-columns:minmax(0,1fr) clamp(104px,19vw,166px) minmax(0,1fr);
          overflow:hidden; color:#fff; background:#101317; border:1px solid rgba(255,255,255,.34);
          box-shadow:0 4px 14px rgba(0,0,0,.48); font-family:Arial,Helvetica,sans-serif;
          pointer-events:none; user-select:none; isolation:isolate;
        }
        #fox-cfb-scorebug * { box-sizing:border-box; }
        #fox-cfb-scorebug .fox-team { min-width:0; position:relative; display:grid; grid-template-columns:clamp(27px,5vw,42px) minmax(0,1fr) auto; align-items:center; gap:clamp(4px,1vw,9px); padding:5px clamp(6px,1.2vw,12px); overflow:hidden; }
        #fox-cfb-scorebug .fox-team:before { content:""; position:absolute; inset:0; z-index:-2; background:linear-gradient(115deg,rgba(255,255,255,.12),transparent 35%,rgba(0,0,0,.34)); }
        #fox-cfb-scorebug .fox-team:after { content:""; position:absolute; z-index:-1; width:55%; height:220%; top:-60%; opacity:.17; transform:rotate(28deg); background:repeating-linear-gradient(90deg,transparent 0 9px,#fff 10px 12px,transparent 13px 21px); }
        #fox-cfb-scorebug .fox-away { background:var(--fox-away); }
        #fox-cfb-scorebug .fox-home { background:var(--fox-home); }
        #fox-cfb-scorebug .fox-away:after { right:-12%; }
        #fox-cfb-scorebug .fox-home:after { left:-12%; }
        #fox-cfb-scorebug .fox-mark { width:clamp(25px,4.5vw,38px); height:clamp(25px,4.5vw,38px); border:2px solid rgba(255,255,255,.9); border-radius:50%; display:grid; place-items:center; background:rgba(0,0,0,.23); font-weight:900; font-size:clamp(10px,1.8vw,15px); letter-spacing:-.06em; text-shadow:0 1px 2px #000; }
        #fox-cfb-scorebug .fox-team-copy { min-width:0; display:flex; flex-direction:column; justify-content:center; gap:2px; }
        #fox-cfb-scorebug .fox-name { font-weight:900; font-stretch:condensed; font-size:clamp(10px,1.9vw,16px); line-height:1; letter-spacing:.025em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-transform:uppercase; text-shadow:0 1px 2px #000; }
        #fox-cfb-scorebug .fox-meta { display:flex; gap:6px; align-items:center; font-size:clamp(8px,1.15vw,10px); font-weight:700; opacity:.88; white-space:nowrap; }
        #fox-cfb-scorebug .fox-tos { display:flex; gap:3px; margin-top:2px; }
        #fox-cfb-scorebug .fox-to { width:clamp(8px,1.2vw,11px); height:3px; background:rgba(255,255,255,.25); transform:skewX(-25deg); }
        #fox-cfb-scorebug .fox-to.on { background:#fff; box-shadow:0 0 3px rgba(255,255,255,.6); }
        #fox-cfb-scorebug .fox-score { font-family:Impact,"Arial Narrow",sans-serif; font-size:clamp(27px,5vw,43px); line-height:.9; font-weight:900; letter-spacing:-.045em; min-width:1ch; text-align:center; padding:0 3px; text-shadow:0 2px 3px rgba(0,0,0,.55); }
        #fox-cfb-scorebug .fox-score.bump { animation:foxScorePop .62s cubic-bezier(.2,.85,.25,1); }
        @keyframes foxScorePop { 0%{transform:scale(1);color:#fff} 22%{transform:scale(1.42);color:#f7d24b;text-shadow:0 0 15px rgba(255,220,75,.9)} 100%{transform:scale(1);color:#fff} }
        #fox-cfb-scorebug .fox-center { position:relative; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:3px; background:linear-gradient(180deg,#252a30,#0b0d10); border-left:2px solid #d4b13d; border-right:2px solid #d4b13d; padding:3px 4px; }
        #fox-cfb-scorebug .fox-network { font-weight:1000; font-style:italic; font-size:clamp(9px,1.5vw,13px); line-height:1; letter-spacing:.12em; color:#fff; }
        #fox-cfb-scorebug .fox-network span { color:#e9c64e; }
        #fox-cfb-scorebug .fox-clock { font-family:Impact,"Arial Narrow",sans-serif; font-size:clamp(17px,3vw,25px); line-height:1; letter-spacing:.02em; color:#f2d35a; }
        #fox-cfb-scorebug .fox-situation { max-width:100%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:clamp(7px,1.1vw,9px); line-height:1; font-weight:800; letter-spacing:.08em; color:#e7e9eb; }
        #fox-cfb-scorebug .fox-pos { position:absolute; top:4px; width:0; height:0; border-top:5px solid transparent; border-bottom:5px solid transparent; filter:drop-shadow(0 1px 1px #000); }
        #fox-cfb-scorebug .fox-away .fox-pos { left:3px; border-left:7px solid #f4d24f; }
        #fox-cfb-scorebug .fox-home .fox-pos { right:3px; border-right:7px solid #f4d24f; }
        #fox-cfb-scorebug .fox-team:not(.has-ball) .fox-pos { display:none; }
        #fox-cfb-scorebug .fox-away .fox-score { order:3; }
        #fox-cfb-scorebug .fox-home .fox-score { order:3; }
        @media(max-width:430px) { #fox-cfb-scorebug { width:98vw; grid-template-columns:minmax(0,1fr) 94px minmax(0,1fr); } #fox-cfb-scorebug .fox-team { gap:3px; padding:4px; } #fox-cfb-scorebug .fox-meta { gap:3px; } }
      \`;
      document.head.appendChild(style);
    }

    overlay = document.createElement("div");
    overlay.id = "fox-cfb-scorebug";
    overlay.innerHTML = \`
      <div class="fox-team fox-away" id="fox-away">
        <div class="fox-mark" id="fox-away-mark">AW</div>
        <div class="fox-team-copy"><div class="fox-name" id="fox-away-name">AWAY</div><div class="fox-meta"><span id="fox-away-record">COLLEGE</span></div><div class="fox-tos" id="fox-away-tos"></div></div>
        <div class="fox-score" id="fox-away-score">0</div><i class="fox-pos"></i>
      </div>
      <div class="fox-center"><div class="fox-network">FOX <span>CFB</span></div><div class="fox-clock" id="fox-clock">15:00</div><div class="fox-situation"><span id="fox-quarter">1ST</span><span> · </span><span id="fox-down">LIVE</span></div></div>
      <div class="fox-team fox-home" id="fox-home">
        <div class="fox-mark" id="fox-home-mark">HM</div>
        <div class="fox-team-copy"><div class="fox-name" id="fox-home-name">HOME</div><div class="fox-meta"><span id="fox-home-record">COLLEGE</span></div><div class="fox-tos" id="fox-home-tos"></div></div>
        <div class="fox-score" id="fox-home-score">0</div><i class="fox-pos"></i>
      </div>\`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && el.textContent !== String(value)) el.textContent = String(value);
  }

  function renderTimeouts(id, count) {
    var el = document.getElementById(id);
    if (!el) return;
    count = Math.max(0, Math.min(3, Number(count) || 0));
    var html = "";
    for (var i = 0; i < 3; i++) html += '<i class="fox-to' + (i < count ? ' on' : '') + '"></i>';
    if (el.innerHTML !== html) el.innerHTML = html;
  }

  function updateFromController(inst, other) {
    if (!inst || !inst.gmlteam_name) return;
    var settings = null;
    try {
      if (typeof window.yyInst === "function" && typeof window.YYASSET_REF === "function") settings = window.yyInst(inst, other, window.YYASSET_REF(0x00000062));
    } catch (_) {}
    if (settings && settings.gmlgamepractice) {
      if (overlay) overlay.style.display = "none";
      return;
    }

    var team0 = safeArray(inst.gmlteam, 0, null);
    var team1 = safeArray(inst.gmlteam, 1, null);
    var name0 = safeText(safeArray(inst.gmlteam_name, 0, teamValue(team0, "tla", "AWAY")), "AWAY");
    var name1 = safeText(safeArray(inst.gmlteam_name, 1, teamValue(team1, "tla", "HOME")), "HOME");
    var score0 = safeText(safeArray(inst.gmlteam_score, 0, 0), "0");
    var score1 = safeText(safeArray(inst.gmlteam_score, 1, 0), "0");
    var minutes = Math.max(0, Number(inst.gmlminutes) || 0);
    var seconds = Math.max(0, Number(inst.gmlseconds) || 0);
    var clock = minutes + ":" + (seconds < 10 ? "0" : "") + Math.floor(seconds);
    var quarter = ordinal(inst.gmlquarter);
    var down = "LIVE";
    try {
      if (typeof window.gml_Script_s_get_string_downand === "function" && Number(inst.gmldown) > 0) {
        down = String(window.gml_Script_s_get_string_downand(inst, other));
      }
    } catch (_) {}

    var match = null;
    try {
      if (typeof window.yyInst === "function" && typeof window.YYASSET_REF === "function") match = window.yyInst(inst, other, window.YYASSET_REF(0x00000069));
    } catch (_) {}

    var timeouts0 = match ? (Number(match.gmltimeouts) || 0) : 3;
    var timeouts1 = match ? (Number(match.gmltimeouts_p2) || 0) : 3;
    var poss = Number(inst.gmlpossession) || 0;
    var color0 = colorFromTeam(team0, "#8b1e2d");
    var color1 = colorFromTeam(team1, "#173b67");
    var snapshot = [name0,name1,score0,score1,clock,quarter,down,poss,timeouts0,timeouts1,color0,color1].join("|");
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;

    var root = ensureOverlay();
    root.style.display = "grid";
    root.style.setProperty("--fox-away", color0);
    root.style.setProperty("--fox-home", color1);
    setText("fox-away-name", name0);
    setText("fox-home-name", name1);
    setText("fox-away-mark", name0.replace(/[^A-Z0-9]/gi, "").slice(0,2).toUpperCase() || "A");
    setText("fox-home-mark", name1.replace(/[^A-Z0-9]/gi, "").slice(0,2).toUpperCase() || "H");
    setText("fox-clock", clock);
    setText("fox-quarter", quarter);
    setText("fox-down", down);
    renderTimeouts("fox-away-tos", timeouts0);
    renderTimeouts("fox-home-tos", timeouts1);
    document.getElementById("fox-away").classList.toggle("has-ball", poss === 0);
    document.getElementById("fox-home").classList.toggle("has-ball", poss === 1);

    [["fox-away-score",score0,0],["fox-home-score",score1,1]].forEach(function (item) {
      var el = document.getElementById(item[0]);
      if (!el) return;
      if (previousScores[item[2]] !== null && previousScores[item[2]] !== item[1]) {
        el.classList.remove("bump");
        void el.offsetWidth;
        el.classList.add("bump");
      }
      setText(item[0], item[1]);
      previousScores[item[2]] = item[1];
    });
  }

  // Remove the stock top-line scoreboard, but leave commentary, wind, and
  // practice-mode UI untouched.
  if (typeof originalScoreboard === "function") {
    window.gml_Script_s_draw_scoreboard = function (inst, other) {
      var practice = false;
      try {
        if (typeof window.yyInst === "function" && typeof window.YYASSET_REF === "function") {
          var settings = window.yyInst(inst, other, window.YYASSET_REF(0x00000062));
          practice = !!(settings && settings.gmlgamepractice);
        }
      } catch (_) {}
      if (!practice) return;
      return originalScoreboard.apply(this, arguments);
    };
  } else {
    console.warn(TAG, "Could not find s_draw_scoreboard; custom bug will overlay the stock strip.");
  }

  if (typeof originalDraw === "function") {
    window.gml_Object_obj_controller_Draw_64 = function (inst, other) {
      var result = originalDraw.apply(this, arguments);
      try { updateFromController(inst, other); }
      catch (e) { console.warn(TAG, "HUD update failed:", e); }
      return result;
    };
    console.log(TAG, "Controller DrawGUI patched; FOX-style scoreboard ready.");
  } else {
    console.error(TAG, "Could not find obj_controller DrawGUI. Check mod load order.");
  }
})();
