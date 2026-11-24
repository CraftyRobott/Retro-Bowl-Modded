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
  var frameRootName = "Root";
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

      // Extend the scorebug's native Design Component inputs with the live
      // game fields that were static demo text in the original export.
      function addLiveInputs(source) {
        var propMatch = source.match(/data-props="([^"]*)"/);
        if (!propMatch) throw new Error("Could not locate FOX component input metadata.");
        var decoded = propMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        var schema = JSON.parse(decoded);
        // Never let the exported demo values appear while live game data is loading.
        var liveInputs = [
          "gameQuarter", "gameClock", "gamePlayClock", "gameDownDistance",
          "awayRecordText", "homeRecordText", "awayLogoUrl", "homeLogoUrl"
        ];
        liveInputs.forEach(function (key) {
          if (!schema[key]) {
            schema[key] = { editor: "text", default: "", tsType: "string", section: "Live game" };
          } else {
            schema[key].default = "";
          }
        });
        var encoded = JSON.stringify(schema).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        source = source.replace(propMatch[0], 'data-props="' + encoded + '"');

        function replaceOnce(before, after, label) {
          if (source.indexOf(before) === -1) throw new Error("Could not bind FOX input: " + label);
          source = source.replace(before, after);
        }
        replaceOnce('style="{{ cellQtr }}"><span>2</span><span style="{{ infoSuffix }}">ND</span></div>',
          'style="{{ cellQtr }}">{{ gameQuarter }}</div>', "quarter");
        replaceOnce('style="{{ cellClock }}">1:39</div>',
          'style="{{ cellClock }}">{{ gameClock }}</div>', "game clock");
        replaceOnce('style="{{ cellPlay }}">16</div>',
          'style="{{ cellPlay }}">{{ gamePlayClock }}</div>', "play clock");
        replaceOnce('style="{{ cellDown }}"><span>1</span><span style="{{ infoSuffix }}">ST</span><span>&nbsp;&amp;&nbsp;GOAL</span></div>',
          'style="{{ cellDown }}">{{ gameDownDistance }}</div>', "down and distance");
        replaceOnce('style="{{ recHome }}">4-0</div>',
          'style="{{ recHome }}">{{ awayRecordText }}</div>', "away record");
        replaceOnce('style="{{ recAway }}">3-1</div>',
          'style="{{ recAway }}">{{ homeRecordText }}</div>', "home record");
        replaceOnce('data-bind="awayLogo" alt="" style=',
          'data-bind="awayLogo" src="{{ awayLogoUrl }}" alt="" style=', "away logo");
        replaceOnce('data-bind="homeLogo" alt="" style=',
          'data-bind="homeLogo" src="{{ homeLogoUrl }}" alt="" style=', "home logo");
        return source;
      }
      template = addLiveInputs(template);

      // The source can use the chroma key in more than one generated style
      // (the canvas and the document adapter). Remove the key color throughout
      // the compiled template, not just from one exact formatting of the expression.
      var greenMatches = (template.match(/#00b140/gi) || []).length;
      template = template.replace(/#00b140/gi, "transparent");
      // Force the generated canvas to transparent even if editor defaults enable chroma key.
      template = template.replace(/background:\s*\(p\.greenScreen\s*\?\?\s*true\)\s*\?\s*\(p\.keyColor\s*\?\?\s*"[^"]*"\)\s*:\s*"[^"]*"/g, 'background: "transparent"');
      // The source's body and outer wrapper also use chroma green.
      template = template.replace(/background:\s*#00b140/gi, "background: transparent");
      template = template.replace(/background-color:\s*#00b140/gi, "background-color: transparent");
      var transparentDocStyle = '<style id="fox-cfb-live-transparent">html,body,x-dc,x-dc>div,body>div{background:transparent!important;background-color:transparent!important}*[style*="#00b140"]{background:transparent!important;background-color:transparent!important}</style>';
      template = template.replace(/<head([^>]*)>/i, '<head$1>' + transparentDocStyle);
      console.log(TAG, "Removed", greenMatches, "chroma-key green references and prepared native component inputs.");
      var patched = html.slice(0, match.index) + match[1] + JSON.stringify(template).replace(/</g, "\\u003C") + match[3] +
        html.slice(match.index + match[0].length);
      // The original chroma-key adapter paints the document green as well.
      // Override only that host canvas background; the FOX artwork is untouched.
      var transparentStyle = '<style id="fox-overlay-transparent">html,body,canvas{background:transparent!important;background-color:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important}</style>';
      // The bundled asset manifest in this export wraps UUID paths in quotes.
      // The browser percent-encodes those quotes as %22, producing invalid image URLs.
      // Normalize only image URL assignments; leave the original artwork and layout intact.
      var imageUrlFix = '<script id="fox-overlay-image-url-fix">(function(){function clean(v){return typeof v==="string"?v.replace(/%22/gi,""):v;}var p=HTMLImageElement.prototype;var nativeSet=p.setAttribute;p.setAttribute=function(n,v){return nativeSet.call(this,n,n&&String(n).toLowerCase()==="src"?clean(v):v);};var d=Object.getOwnPropertyDescriptor(p,"src");if(d&&d.set&&d.get){Object.defineProperty(p,"src",{configurable:d.configurable,enumerable:d.enumerable,get:function(){return d.get.call(this);},set:function(v){return d.set.call(this,clean(v));}});}})();</script>';
      if (patched.indexOf("</head>") !== -1) patched = patched.replace("</head>", transparentStyle + imageUrlFix + "</head>");
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

  var downDistanceObserver = null;
  var observedDownDistanceElement = null;
  var latestDownDistanceText = "";
  // The opening kickoff can briefly expose a stale 2ND & 5 value.
  var startupDownDistancePending = true;

  function updateNativeDownDistance(doc, value) {
    if (!doc || value === undefined || value === null) return false;

    var text = String(value).trim();
    latestDownDistanceText = text;

    var element = doc.getElementById("downDistance");
    if (!element) return false;

    // Observe only the down/distance node. Watching the entire iframe body
    // also reacts to clock and score animations, so keep this isolated from
    // every other live field in the FOX component.
    if (element !== observedDownDistanceElement &&
        typeof doc.defaultView.MutationObserver === "function") {
      if (downDistanceObserver) downDistanceObserver.disconnect();
      observedDownDistanceElement = element;
      downDistanceObserver = new doc.defaultView.MutationObserver(function () {
        var current = doc.getElementById("downDistance");
        if (current) {
          var currentText = String(current.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
          var liveText = String(latestDownDistanceText).replace(/\s+/g, " ").trim().toUpperCase();
          if (currentText !== liveText) current.textContent = latestDownDistanceText;
        }
      });
      downDistanceObserver.observe(element, {
        subtree: true,
        childList: true,
        characterData: true
      });
    }

    // The source component uses non-breaking spaces in its rebuilt spans.
    var normalize = function (value) {
      return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
    };
    if (normalize(element.textContent) !== normalize(text)) {
      element.textContent = text;
    }
    return true;
  }

  var quarterObserver = null;
  var observedQuarterElement = null;
  var latestQuarterText = "";

  function updateNativeQuarter(doc, value) {
    if (!doc || value === undefined || value === null) return false;

    // Keep the FOX period label compact: "1st Qtr" becomes "1st".
    var text = String(value).trim().replace(/\s*Qtr$/i, "");
    if (!text) return false;
    latestQuarterText = text;

    var element = doc.getElementById("quarter");
    if (!element) return false;

    // The exported component leaves the original demo quarter in this node
    // even after __dcSetProps receives gameQuarter. Keep this isolated from
    // the clock, score animations, and down/distance observer.
    if (element !== observedQuarterElement &&
        typeof doc.defaultView.MutationObserver === "function") {
      if (quarterObserver) quarterObserver.disconnect();
      observedQuarterElement = element;
      quarterObserver = new doc.defaultView.MutationObserver(function () {
        var current = doc.getElementById("quarter");
        if (current && latestQuarterText) {
          var currentText = String(current.textContent || "").replace(/\s+/g, " ").trim().toUpperCase();
          var liveText = String(latestQuarterText).replace(/\s+/g, " ").trim().toUpperCase();
          if (currentText !== liveText) current.textContent = latestQuarterText;
        }
      });
      quarterObserver.observe(element, {
        subtree: true,
        childList: true,
        characterData: true
      });
    }

    var normalize = function (value) {
      return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
    };
    if (normalize(element.textContent) !== normalize(text)) {
      element.textContent = text;
    }
    return true;
  }

  function sendState(state) {
    pendingState = state;
    if (!frame || !frameReady || !state) return;
    try {
      var child = frame.contentWindow;
      if (!child || typeof child.__dcSetProps !== "function") return;
      var rootName = typeof child.__dcRootName === "function" ? child.__dcRootName() : frameRootName;
      if (!rootName) rootName = "Root";

      // Use the FOX scorebug's native Design Component input mechanism.
      // One prop update keeps React rendering and the scorebug's own observers
      // (including the score-pop animation) in control of the display.
      var componentProps = {
        awayNameText: state.away.name,
        homeNameText: state.home.name,
        awayWordmark: state.away.mascot || "",
        homeWordmark: state.home.mascot || "",
        scoreLeftText: String(state.away.score),
        scoreRightText: String(state.home.score),
        rankLeftText: state.away.rank ? "#" + String(state.away.rank).replace(/^#/, "") : " ",
        rankRightText: state.home.rank ? "#" + String(state.home.rank).replace(/^#/, "") : " ",
        awayColor: state.away.color || "#8c2d2e",
        homeColor: state.home.color || "#1e2e45",
        awayTimeouts: state.away.timeouts,
        homeTimeouts: state.home.timeouts,
        possession: state.away.possession ? "left" : state.home.possession ? "right" : "none",
        gameQuarter: state.game.quarter || "",
        gameClock: state.game.clock || "",
        gamePlayClock: state.game.playClock || "",
        gameDownDistance: state.game.downDistance || "",
        awayRecordText: state.away.record || "",
        homeRecordText: state.home.record || "",
        awayLogoUrl: state.away.logo || "",
        homeLogoUrl: state.home.logo || ""
      };

      // Trace the exact value crossing the mod-to-FOX component boundary.
      console.log(TAG, "Sending FOX component inputs:", {
        rootName: rootName,
        gameDownDistance: componentProps.gameDownDistance,
        gameQuarter: componentProps.gameQuarter,
        gameClock: componentProps.gameClock
      });
      child.__dcSetProps(rootName, componentProps);

      // The exported FOX binding does not update this field reliably, so
      // synchronize the original three-span down-and-distance element directly.
      updateNativeDownDistance(child.document, componentProps.gameDownDistance);
      updateNativeQuarter(child.document, componentProps.gameQuarter);

      // Read the rendered iframe text after the component has had a chance to update.
      window.setTimeout(function () {
        try {
          // Reapply after React's render in case it restored the demo text.
          updateNativeDownDistance(child.document, componentProps.gameDownDistance);
          updateNativeQuarter(child.document, componentProps.gameQuarter);
          var renderedText = child.document && child.document.body
            ? String(child.document.body.innerText || child.document.body.textContent || "").replace(/\\s+/g, " ").trim()
            : "[FOX iframe document unavailable]";
          console.log(TAG, "FOX rendered text after input update:", {
            sentQuarter: componentProps.gameQuarter,
            renderedContainsSentQuarter: !!componentProps.gameQuarter &&
              renderedText.indexOf(String(componentProps.gameQuarter)) !== -1,
            sentDownDistance: componentProps.gameDownDistance,
            renderedContainsSentValue: !!componentProps.gameDownDistance &&
              renderedText.indexOf(String(componentProps.gameDownDistance)) !== -1,
            renderedText: renderedText.slice(0, 1200)
          });
        } catch (readError) {
          console.warn(TAG, "Could not inspect rendered FOX text:", readError);
        }
      }, 50);

      // Reveal the scorebug only after real game data replaces every demo/default value.
      frame.style.visibility = "visible";
    } catch (error) {
      logError("Could not update the FOX component inputs.", error);
    }
  }

  function onFrameMessage(event) {
    if (!frame || event.source !== frame.contentWindow) return;
    var data = event.data;
    if (!data || data.type !== "__dc_booted") return;
    frameReady = true;
    frameRootName = data.rootName || "Root";
    if (pendingState) sendState(pendingState);
    console.log(TAG, "FOX component input system is ready:", frameRootName);
  }

  window.addEventListener("message", onFrameMessage);

  // Expose the layout callback on window so the game wrapper's evaluator and
  // resize callbacks always resolve the same function scope.
  window.__foxCfbLayoutFrame = function () {
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
  };

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
      frameLoading = false;
      // Keep the iframe hidden until the live game state has been applied.
      window.__foxCfbLayoutFrame();
      // The document load precedes the Design Component boot. The
      // __dc_booted message is the normal readiness signal; this covers a fast boot.
      try {
        var child = frame.contentWindow;
        if (child && typeof child.__dcSetProps === "function") {
          frameReady = true;
          frameRootName = typeof child.__dcRootName === "function" ? child.__dcRootName() : "Root";
          if (pendingState) sendState(pendingState);
        }
      } catch (_) {}
      console.log(TAG, "Original HTML/CSS scorebug document loaded.");
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

    window.__foxCfbLayoutFrame();
    if (!resizeHandler) {
      resizeHandler = window.__foxCfbLayoutFrame;
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

  // Rankings are season data, not live-play data. Cache the parsed value
  // for each team map so transient in-game values cannot make the labels flicker.
  var teamRankCache = typeof WeakMap === "function" ? new WeakMap() : null;
  var teamRankFallbackCache = [];

  function rankFromTeam(team, inst, other) {
    if (!team) return "";

    if (teamRankCache && (typeof team === "object" || typeof team === "function")) {
      if (teamRankCache.has(team)) return teamRankCache.get(team);
    } else {
      for (var cachedIndex = 0; cachedIndex < teamRankFallbackCache.length; cachedIndex++) {
        if (teamRankFallbackCache[cachedIndex].team === team) {
          return teamRankFallbackCache[cachedIndex].rank;
        }
      }
    }

    var result = "";
    try {
      if (typeof window.gml_Script_s_get_ranking_pos_data === "function") {
        var rankData = window.gml_Script_s_get_ranking_pos_data(inst, other, team);
        var rank = Number(rankData && rankData.gmlpos);
        if (isFinite(rank) && rank > 0 && rank <= 25) result = String(rank);
      }
    } catch (_) {}

    if (!result) {
      var encoded = Number(teamValue(team, "ranking_pos", 0)) || 0;
      var fallbackRank = Math.floor(encoded);
      if (fallbackRank > 0 && fallbackRank <= 25) result = String(fallbackRank);
    }

    if (teamRankCache && (typeof team === "object" || typeof team === "function")) {
      teamRankCache.set(team, result);
    } else {
      teamRankFallbackCache.push({ team: team, rank: result });
    }
    return result;
  }

  function gameNumber(inst, key, fallback) {
    var value = inst && inst[key];
    if (value && typeof value.toNumber === "function") value = value.toNumber();
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function quarterText(inst, other) {
    var quarter = gameNumber(inst, "gmlquarter", NaN);
    if (!isFinite(quarter)) return "";
    var text = "";
    try {
      // Match the game's own stock scoreboard and the working SEC scorebug.
      if (typeof window.gml_Script_s_str === "function") {
        text = window.gml_Script_s_str(inst, other, "quarter_" + String(quarter));
      }
    } catch (error) {
      console.warn(TAG, "Native quarter formatter failed.", error);
    }
    if (inst.gmlcollege_overtime) {
      var round = gameNumber(inst, "gmlcollege_overtime_round", 1);
      if (quarter >= 5 && round > 1) return String(round) + " " + String(text || "OT");
    }
    return asText(text, "");
  }

  function downDistanceText(inst, other) {
    var text = "";

    // Use Retro Bowl's own formatter first. The working SEC scorebug calls
    // this exact helper with the scoreboard's _inst/_other arguments.
    try {
      if (typeof window.gml_Script_s_get_string_downand === "function") {
        var nativeText = window.gml_Script_s_get_string_downand(inst, other);
        if (nativeText !== undefined && nativeText !== null) text = String(nativeText).trim();
      }
    } catch (error) {
      console.warn(TAG, "Native down/distance formatter failed; using field fallback.", error);
    }

    // Compatibility fallback only for builds where the native helper is unavailable.
    if (!text) {
      var down = Math.round(gameNumber(inst, "gmldown", 0));
      if (down >= 1 && down <= 4) {
        var yardLine = gameNumber(inst, "gmlx_yards", NaN);
        var yardsToGo = gameNumber(inst, "gmlyards", NaN);
        var label = down === 1 ? "1ST" : down === 2 ? "2ND" : down === 3 ? "3RD" : "4TH";
        if (isFinite(yardLine) && (yardLine < 300 || yardLine > 2300)) text = label + " & GOAL";
        else if (isFinite(yardsToGo) && yardsToGo < 1) text = label + " & INCHES";
        else if (isFinite(yardsToGo)) text = label + " & " + String(Math.round(yardsToGo));
      }
    }

    // Hide only the stale startup value until a real live down/distance arrives.
    if (startupDownDistancePending) {
      var normalized = String(text).replace(/\\s+/g, " ").trim().toUpperCase();
      if (normalized === "2ND & 5" || normalized === "2ND AND 5") return "";
      if (normalized) startupDownDistancePending = false;
    }

    return text;
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
    var downDistance = downDistanceText(inst, other);

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
        mascot2: "",
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
        mascot2: "",
        rank: rankFromTeam(homeTeam, inst, other),
        record: recordFromTeam(homeTeam),
        score: String(homeScore),
        color: colorFromTeam(homeTeam, "#1e2e45"),
        logo: logoFromTeam(homeTeam),
        possession: possession === 1,
        timeouts: Math.max(0, Math.min(3, Math.round(homeTimeouts)))
      },
      game: {
        quarter: quarterText(inst, other),
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
      console.log(TAG, "Live game fields:", {
        quarter: inst.gmlquarter,
        nativeQuarter: (function () {
          try {
            return typeof window.gml_Script_s_str === "function"
              ? window.gml_Script_s_str(inst, other, "quarter_" + String(inst.gmlquarter))
              : "native string helper unavailable";
          } catch (error) {
            return "native quarter error: " + String(error);
          }
        })(),
        overtime: inst.gmlcollege_overtime,
        overtimeRound: inst.gmlcollege_overtime_round,
        down: inst.gmldown,
        yardLine: inst.gmlx_yards,
        yardsToGo: inst.gmlyards,
        matchQuarter: (function () { var m = getMatch(inst, other); return m ? m.gmlquarter : undefined; })(),
        matchDown: (function () { var m = getMatch(inst, other); return m ? m.gmldown : undefined; })(),
        nativeDownDistance: (function () {
          try {
            return typeof window.gml_Script_s_get_string_downand === "function"
              ? window.gml_Script_s_get_string_downand(inst, other)
              : "native helper unavailable";
          } catch (error) {
            return "native helper error: " + String(error);
          }
        })(),
        displayedQuarter: state.game.quarter,
        displayedDownDistance: state.game.downDistance
      });
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