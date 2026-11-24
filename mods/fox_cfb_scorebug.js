// @name FOX CFB Original Scorebug
// @description Preserves the uploaded FOX CFB scoreboard design and connects it to Retro Bowl College game data.
// @category presentation
// Design source: mods/fox_cfb_scorebug_source.html
(function () {
  "use strict";

  if (window.__foxCfbOriginalScorebugInstalled) return;
  window.__foxCfbOriginalScorebugInstalled = true;

  var TAG = "[FOX CFB]";
  var originalScoreboard = window.gml_Script_s_draw_scoreboard;
  var frame = null;
  var frameReady = false;
  var frameLoading = false;
  var loadFailed = false;
  var lastActiveAt = 0;
  var lastSnapshot = "";
  var pendingState = null;
  var resizeHandler = null;

  function logError(message, error) {
    console.error(TAG, message, error || "");
  }

  function fetchSource() {
    var urls = [
      "engine/mods/fox_cfb_scorebug_source.html",
      "mods/fox_cfb_scorebug_source.html",
      "https://raw.githubusercontent.com/CraftyRobott/Retro-Bowl-Modded/main/mods/fox_cfb_scorebug_source.html"
    ];

    function makeTransparent(html) {
      // Preserve the uploaded HTML/CSS/React design; disable only its chroma-key canvas.
      var match = html.match(/(<script type="__bundler\/template"[^>]*>)([\s\S]*?)(<\/script>)/);
      if (!match) throw new Error("Could not locate original FOX scorebug template.");
      var template = JSON.parse(match[2]);
      template = template.replace(
        'background: (p.greenScreen ?? true) ? (p.keyColor ?? "#00b140") : "#1b2417"',
        'background: "transparent"'
      );
      var patched = html.slice(0, match.index) + match[1] + JSON.stringify(template) + match[3] +
        html.slice(match.index + match[0].length);
      // The original chroma-key adapter paints the document green as well.
      // Override only that host canvas background; the FOX artwork is untouched.
      var transparentStyle = '<style id="fox-overlay-transparent">html,body{background:transparent!important;background-color:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important}</style>';
      if (patched.indexOf("</head>") !== -1) patched = patched.replace("</head>", transparentStyle + "</head>");
      return patched;
    }

    function attempt(index) {
      if (index >= urls.length) return Promise.reject(new Error("No scorebug source URL could be loaded."));
      return fetch(urls[index], { cache: "no-cache" }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status + " from " + urls[index]);
        return response.text();
      }).then(function (html) {
        if (html.indexOf("data-dc-script") === -1 || html.indexOf("data-cfb27-scorebug") === -1) {
          throw new Error("The fetched file is not the standalone FOX scorebug source.");
        }
        html = makeTransparent(html);
        console.log(TAG, "Loaded original FOX design with transparent canvas from", urls[index]);
        return html;
      }).catch(function (error) {
        if (index + 1 < urls.length) return attempt(index + 1);
        throw error;
      });
    }
    return attempt(0);
  }

  function sendState(state) {
    pendingState = state;
    if (!frame || !frameReady || !frame.contentWindow || !state) return;
    try {
      frame.contentWindow.postMessage(state, "*");
    } catch (error) {
      logError("Could not send live game data to the scorebug.", error);
    }
  }

  function layoutFrame() {
    if (!frame) return;
    var vw = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    var vh = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    // The uploaded FOX design uses a 2315 x 534 authoring canvas.
    // Scale it to fit the lower portion of the game viewport without changing its layout.
    var scale = Math.min(0.42, (vw * 0.82) / 2315, (vh * 0.42) / 534);
    var width = 2315 * scale;
    var height = 534 * scale;
    frame.style.left = ((vw - width) / 2) + "px";
    frame.style.top = (vh - height - Math.max(8, vh * 0.018)) + "px";
    frame.style.transform = "scale(" + scale + ")";
  }

  function ensureOverlay() {
    if (frame && document.body.contains(frame)) return frame;
    if (frameLoading || loadFailed) return frame;

    frameLoading = true;
    frame = document.createElement("iframe");
    frame.id = "fox-cfb-original-scorebug-frame";
    frame.title = "FOX CFB Scorebug";
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.style.cssText = "position:fixed;left:0;top:0;width:2315px;height:534px;border:0;margin:0;padding:0;z-index:2147483646;pointer-events:none;overflow:hidden;background:transparent;transform-origin:top left;visibility:hidden;";
    var sourceAssigned = false;
    frame.onload = function () {
      // Ignore the iframe's initial about:blank load; the original source has not arrived yet.
      if (!sourceAssigned) return;
      frameReady = true;
      frameLoading = false;
      frame.style.visibility = "visible";
      layoutFrame();
      if (pendingState) sendState(pendingState);
      console.log(TAG, "Original HTML/CSS scorebug loaded.");
    };
    frame.onerror = function (error) {
      frameReady = false;
      frameLoading = false;
      loadFailed = true;
      logError("The original scorebug iframe failed to load.", error);
    };
    document.body.appendChild(frame);

    fetchSource().then(function (html) {
      if (frame) {
        sourceAssigned = true;
        frame.srcdoc = html;
      }
    }).catch(function (error) {
      frameLoading = false;
      loadFailed = true;
      frameReady = false;
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      frame = null;
      logError("Could not load the preserved FOX scorebug source. The stock scoreboard will remain active.", error);
    });

    layoutFrame();
    if (!resizeHandler) {
      resizeHandler = layoutFrame;
      window.addEventListener("resize", resizeHandler, { passive: true });
      window.addEventListener("orientationchange", resizeHandler, { passive: true });
    }
    return frame;
  }

  function safeArray(value, index, fallback) {
    try {
      if (value == null) return fallback;
      var result = value[index];
      return result == null ? fallback : result;
    } catch (_) {
      return fallback;
    }
  }

  function teamValue(team, key, fallback) {
    try {
      if (team && team[key] !== undefined && team[key] !== null) return team[key];
      if (team && typeof window.ds_map_find_value === "function") {
        var value = window.ds_map_find_value(team, key);
        if (value !== undefined && value !== null) return value;
      }
    } catch (_) {}
    return fallback;
  }

  function asText(value, fallback) {
    if (value === undefined || value === null) return fallback;
    var result = String(value).trim();
    return result ? result : fallback;
  }

  function asOptionalText(value) {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string" && typeof value !== "number") return "";
    return String(value).trim();
  }

  function normalizeTeamColor(value) {
    if (typeof value !== "string") return "";
    var hex = value.trim().replace(/^\$/, "").replace(/^#/, "");
    return /^[0-9a-f]{6}$/i.test(hex) ? "#" + hex : "";
  }

  function colorFromTeam(team, fallback) {
    if (!team) return fallback;
    // Teams_CO.txt uses $RRGGBB values in colshirt/colhelmet.
    var keys = ["colshirt", "colhelmet", "coltertiary", "primary_color", "primaryColor", "primary", "colour", "color", "team_color"];
    for (var i = 0; i < keys.length; i++) {
      try {
        var value = normalizeTeamColor(team[keys[i]]);
        if (value) return value;
      } catch (_) {}
    }
    try {
      if (typeof window.ds_map_find_value === "function") {
        for (var j = 0; j < keys.length; j++) {
          var color = window.ds_map_find_value(team, keys[j]);
          var normalized = normalizeTeamColor(color);
          if (normalized) return normalized;
          if (typeof color === "number" && isFinite(color)) {
            return "#" + ("000000" + (color >>> 0).toString(16)).slice(-6);
          }
        }
      }
    } catch (_) {}
    return fallback;
  }

  function logoFromTeam(team) {
    var value = teamValue(team, "logo", teamValue(team, "logo_url", ""));
    return typeof value === "string" ? value.trim() : "";
  }

  function recordFromTeam(team) {
    var wins = Number(teamValue(team, "wins", NaN));
    var losses = Number(teamValue(team, "losses", NaN));
    var ties = Number(teamValue(team, "ties", 0)) || 0;
    if (isFinite(wins) && isFinite(losses)) {
      return String(wins) + "-" + String(losses) + (ties > 0 ? "-" + String(ties) : "");
    }
    return asOptionalText(teamValue(team, "record", ""));
  }

  function rankFromTeam(team, inst, other) {
    try {
      if (typeof window.gml_Script_s_get_ranking_pos_data === "function") {
        var rankData = window.gml_Script_s_get_ranking_pos_data(inst, other, team);
        var rank = Number(rankData && rankData.gmlpos);
        if (isFinite(rank) && rank > 0 && rank <= 99) return String(rank);
      }
    } catch (_) {}
    var encoded = Number(teamValue(team, "ranking_pos", 0)) || 0;
    var fallbackRank = Math.floor(encoded);
    return fallbackRank > 0 && fallbackRank <= 99 ? String(fallbackRank) : "";
  }

  function quarterText(inst) {
    if (inst.gmlcollege_overtime) {
      var round = Number(inst.gmlcollege_overtime_round) || 1;
      return round > 1 ? "OT" + round : "OT";
    }
    var quarter = Number(inst.gmlquarter) || 1;
    if (quarter >= 5) return "OT";
    return quarter === 1 ? "1ST" : quarter === 2 ? "2ND" : quarter === 3 ? "3RD" : "4TH";
  }

  function getSettings(inst, other) {
    try {
      if (typeof window.yyInst === "function" && typeof window.YYASSET_REF === "function") {
        return window.yyInst(inst, other, window.YYASSET_REF(0x00000062));
      }
    } catch (_) {}
    return null;
  }

  function getMatch(inst, other) {
    try {
      if (typeof window.yyInst === "function" && typeof window.YYASSET_REF === "function") {
        return window.yyInst(inst, other, window.YYASSET_REF(0x00000069));
      }
    } catch (_) {}
    return null;
  }

  function buildState(inst, other) {
    if (!inst || !inst.gmlteam) return null;
    var awayTeam = safeArray(inst.gmlteam, 0, null);
    var homeTeam = safeArray(inst.gmlteam, 1, null);
    if (!awayTeam || !homeTeam) return null;

    // Team maps expose the full display name and the short team abbreviation.
    var awayName = asText(teamValue(awayTeam, "name", ""), asText(teamValue(awayTeam, "tla", "AWAY"), "AWAY"));
    var homeName = asText(teamValue(homeTeam, "name", ""), asText(teamValue(homeTeam, "tla", "HOME"), "HOME"));
    var awayMark = asText(teamValue(awayTeam, "tla", ""), "");
    var homeMark = asText(teamValue(homeTeam, "tla", ""), "");
    var awayScore = Number(safeArray(inst.gmlteam_score, 0, 0)) || 0;
    var homeScore = Number(safeArray(inst.gmlteam_score, 1, 0)) || 0;

    var minutes = Math.max(0, Number(inst.gmlminutes) || 0);
    var seconds = Math.max(0, Number(inst.gmlseconds) || 0);
    var clock = minutes + ":" + (seconds < 10 ? "0" : "") + Math.floor(seconds);
    var downDistance = "";
    try {
      if (typeof window.gml_Script_s_get_string_downand === "function" && Number(inst.gmldown) > 0) {
        downDistance = String(window.gml_Script_s_get_string_downand(inst, other));
      }
    } catch (_) {}

    var match = getMatch(inst, other);
    var awayTimeouts = 3;
    var homeTimeouts = 3;
    var settings = getSettings(inst, other);
    var exhibitionNoPlayer = false;
    try {
      exhibitionNoPlayer = !!(typeof global !== "undefined" && global.gmlexhibition &&
        settings && Number(settings.gmlplayerteamindex) === -1);
    } catch (_) {}

    if (match) {
      if (exhibitionNoPlayer) {
        awayTimeouts = match.gmltimeouts !== undefined ? Number(match.gmltimeouts) : 3;
        homeTimeouts = match.gmltimeouts_p2 !== undefined ? Number(match.gmltimeouts_p2) : 3;
      } else if (Number(match.gmlhuman_team) === 0) {
        awayTimeouts = match.gmltimeouts !== undefined ? Number(match.gmltimeouts) : 3;
      } else if (Number(match.gmlhuman_team) === 1) {
        homeTimeouts = match.gmltimeouts !== undefined ? Number(match.gmltimeouts) : 3;
      }
    }
    if (!isFinite(awayTimeouts)) awayTimeouts = 3;
    if (!isFinite(homeTimeouts)) homeTimeouts = 3;

    var possession = Number(inst.gmlpossession) || 0;

    return {
      away: {
        name: awayName,
        mascot: awayMark,
        rank: rankFromTeam(awayTeam, inst, other),
        record: recordFromTeam(awayTeam),
        score: String(awayScore),
        color: colorFromTeam(awayTeam, "#8c2d2e"),
        logo: logoFromTeam(awayTeam),
        possession: possession === 0,
        timeouts: Math.max(0, Math.min(3, Math.round(awayTimeouts)))
      },
      home: {
        name: homeName,
        mascot: homeMark,
        rank: rankFromTeam(homeTeam, inst, other),
        record: recordFromTeam(homeTeam),
        score: String(homeScore),
        color: colorFromTeam(homeTeam, "#1e2e45"),
        logo: logoFromTeam(homeTeam),
        possession: possession === 1,
        timeouts: Math.max(0, Math.min(3, Math.round(homeTimeouts)))
      },
      game: {
        quarter: quarterText(inst),
        clock: clock,
        playClock: "",
        downDistance: downDistance
      }
    };
  }

  function snapshotState(inst, other) {
    var state = buildState(inst, other);
    if (!state) return null;
    var signature;
    try {
      signature = JSON.stringify(state);
    } catch (_) {
      return null;
    }
    if (signature !== lastSnapshot) {
      lastSnapshot = signature;
      sendState(state);
    }
    return state;
  }

  function hideOverlay() {
    if (frame) frame.style.display = "none";
  }

  function showOverlay() {
    if (frame) frame.style.display = "block";
  }

  function scoreboardHook(inst, other) {
    lastActiveAt = Date.now();
    var settings = getSettings(inst, other);
    var practice = !!(settings && settings.gmlgamepractice);
    var hideUi = false;
    try {
      hideUi = typeof global !== "undefined" && !!global.gmldebug_aa_hide_ui;
    } catch (_) {}

    if (practice || hideUi) {
      hideOverlay();
      if (typeof originalScoreboard === "function") return originalScoreboard.apply(this, arguments);
      return;
    }

    if (!inst || !inst.gmlteam) {
      hideOverlay();
      if (typeof originalScoreboard === "function") return originalScoreboard.apply(this, arguments);
      return;
    }

    ensureOverlay();
    showOverlay();
    snapshotState(inst, other);

    // Keep the stock scoreboard visible only while the original design is still loading.
    if (!frameReady && typeof originalScoreboard === "function") return originalScoreboard.apply(this, arguments);
  }

  if (typeof originalScoreboard === "function") {
    window.gml_Script_s_draw_scoreboard = scoreboardHook;
    console.log(TAG, "Hooked s_draw_scoreboard; preserving the uploaded FOX design as a DOM overlay.");
  } else {
    logError("Could not find gml_Script_s_draw_scoreboard; scorebug not installed.");
  }

  // The hook runs every frame only during gameplay; hide the overlay after play stops.
  window.setInterval(function () {
    if (frame && lastActiveAt && Date.now() - lastActiveAt > 1800) hideOverlay();
  }, 500);
})();