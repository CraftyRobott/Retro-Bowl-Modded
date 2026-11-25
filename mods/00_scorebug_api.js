// @name Retro Bowl Scorebug API
// @description Shared live-game data API for scorebug and broadcast-overlay mods.
// @category framework
(function () {
  "use strict";

  if (window.RBScorebug && window.RBScorebug.version) {
    console.warn("[RB Scorebug API] Another API instance is already active.");
    return;
  }

  var TAG = "[RB Scorebug API]";
  var VERSION = "1.0.0";
  var subscribers = [];
  var latestState = null;
  var lastSignature = "";
  var originalScoreboard = window.gml_Script_s_draw_scoreboard;

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

  // Team logo assets are hosted with this mod. The manifest's team names and
  // aliases are normalized so the game's display names and short marks can match.
  var TEAM_LOGO_FILES = {"KY":"047-kentucky.png","TN":"098-tennessee.png","AIRFORCE":"000-air-force.png","AKRON":"001-akron.png","ALABAMA":"002-alabama.png","APPALACHIANSTATE":"003-appalachian-state.png","APPSTATE":"003-appalachian-state.png","ARIZONA":"004-arizona.png","ARIZONASTATE":"005-arizona-state.png","ARKANSAS":"006-arkansas.png","ARKANSASSTATE":"007-arkansas-state.png","ARMY":"008-army.png","AUBURN":"009-auburn.png","BALLSTATE":"010-ball-state.png","BAYLOR":"011-baylor.png","BOISESTATE":"012-boise-state.png","BOSTONCOLLEGE":"013-boston-college.png","BOWLINGGREENSTATE":"014-bowling-green-state.png","BOWLINGGREEN":"014-bowling-green-state.png","BGSU":"014-bowling-green-state.png","BUFFALO":"015-buffalo.png","BYU":"016-byu.png","CALIFORNIA":"017-california.png","CENTRALMICHIGAN":"018-central-michigan.png","CHARLOTTE":"019-charlotte.png","CINCINNATI":"020-cincinnati.png","CLEMSON":"021-clemson.png","COASTALCAROLINA":"022-coastal-carolina.png","COLORADO":"023-colorado.png","COLORADOSTATE":"024-colorado-state.png","CONNECTICUT":"025-connecticut.png","UCONN":"025-connecticut.png","DUKE":"026-duke.png","EASTERNMICHIGAN":"027-eastern-michigan.png","EASTCAROLINA":"028-east-carolina.png","FIU":"029-fiu.png","FLORIDA":"030-florida.png","FAU":"031-fau.png","FLORIDAATLANTIC":"031-fau.png","FLORIDASTATE":"032-florida-state.png","FRESNOSTATE":"033-fresno-state.png","GEORGIA":"034-georgia.png","GEORGIASOUTHERN":"035-georgia-southern.png","GEORGIASTATE":"036-georgia-state.png","GEORGIATECH":"037-georgia-tech.png","HAWAII":"038-hawaii.png","HOUSTON":"039-houston.png","ILLINOIS":"040-illinois.png","INDIANA":"041-indiana.png","IOWA":"042-iowa.png","IOWASTATE":"043-iowa-state.png","KANSAS":"044-kansas.png","KANSASSTATE":"045-kansas-state.png","KENTSTATE":"046-kent-state.png","KENTUCKY":"047-kentucky.png","LIBERTY":"048-liberty.png","ULLAFAYETTE":"049-ul-lafayette.png","LOUISIANA":"049-ul-lafayette.png","ULL":"049-ul-lafayette.png","LATECH":"050-la-tech.png","LOUISIANATECH":"050-la-tech.png","LOUISVILLE":"051-louisville.png","LSU":"052-lsu.png","MARSHALL":"053-marshall.png","MARYLAND":"054-maryland.png","MEMPHIS":"055-memphis.png","MIAMI":"056-miami.png","MIAMIOFOHIO":"057-miami-of-ohio.png","MIAMIOH":"057-miami-of-ohio.png","MIAMIOHIO":"057-miami-of-ohio.png","MICHIGAN":"058-michigan.png","MICHIGANSTATE":"059-michigan-state.png","MIDDLETENNESSEESTATE":"060-middle-tennessee-state.png","MIDDLETENNESSEE":"060-middle-tennessee-state.png","MTSU":"060-middle-tennessee-state.png","MINNESOTA":"061-minnesota.png","MISSISSIPPISTATE":"062-mississippi-state.png","MISSOURI":"063-missouri.png","NAVY":"064-navy.png","NCSTATE":"065-n-c-state.png","NEBRASKA":"066-nebraska.png","NEVADA":"067-nevada.png","NEWMEXICO":"068-new-mexico.png","NEWMEXICOSTATE":"069-new-mexico-state.png","NMSU":"069-new-mexico-state.png","NORTHCAROLINA":"070-north-carolina.png","NORTHTEXAS":"071-north-texas.png","NORTHERNILLINOIS":"072-northern-illinois.png","NORTHWESTERN":"073-northwestern.png","NOTREDAME":"074-notre-dame.png","OHIO":"075-ohio.png","OHIOSTATE":"076-ohio-state.png","OKLAHOMA":"077-oklahoma.png","OKLAHOMASTATE":"078-oklahoma-state.png","OLDDOMINION":"079-old-dominion.png","OLEMISS":"080-ole-miss.png","MISSISSIPPI":"080-ole-miss.png","OREGON":"081-oregon.png","OREGONSTATE":"082-oregon-state.png","PENNSTATE":"083-penn-state.png","PENNST":"083-penn-state.png","PITTSBURGH":"084-pittsburgh.png","PITT":"084-pittsburgh.png","PURDUE":"085-purdue.png","RICE":"086-rice.png","RUTGERS":"087-rutgers.png","SANDIEGOSTATE":"088-san-diego-state.png","SANJOSESTATE":"089-san-jose-state.png","SMU":"090-smu.png","SOUTHALABAMA":"091-south-alabama.png","SOUTHCAROLINA":"092-south-carolina.png","SOUTHERNMISS":"093-southern-miss.png","SOUTHERNMISSISSIPPI":"093-southern-miss.png","STANFORD":"094-stanford.png","SYRACUSE":"095-syracuse.png","TCU":"096-tcu.png","TEMPLE":"097-temple.png","TENNESSEE":"098-tennessee.png","TEXAS":"099-texas.png","TEXASAM":"100-texas-a-and-m.png","TEXASAANDM":"100-texas-a-and-m.png","TAMU":"100-texas-a-and-m.png","TEXASSTATE":"101-texas-state.png","TEXASTECH":"102-texas-tech.png","TOLEDO":"103-toledo.png","TROY":"104-troy.png","TULANE":"105-tulane.png","TULSA":"106-tulsa.png","UAB":"107-uab.png","UCF":"108-ucf.png","UCLA":"109-ucla.png","ULMONROE":"110-ul-monroe.png","LOUISIANAMONROE":"110-ul-monroe.png","ULM":"110-ul-monroe.png","MASSACHUSETTS":"111-massachusetts.png","UMASS":"111-massachusetts.png","UNLV":"112-unlv.png","USC":"113-usc.png","USF":"114-usf.png","UTAH":"115-utah.png","UTAHSTATE":"116-utah-state.png","UTEP":"117-utep.png","UTSA":"118-utsa.png","VANDERBILT":"119-vanderbilt.png","VIRGINIA":"120-virginia.png","VIRGINIATECH":"121-virginia-tech.png","WAKEFOREST":"122-wake-forest.png","WASHINGTON":"123-washington.png","WASHINGTONSTATE":"124-washington-state.png","WESTVIRGINIA":"125-west-virginia.png","WVU":"125-west-virginia.png","WKENTUCKY":"126-w-kentucky.png","WESTERNKENTUCKY":"126-w-kentucky.png","WKU":"126-w-kentucky.png","WESTERNMICHIGAN":"127-w-michigan.png","WMICHIGAN":"127-w-michigan.png","WMU":"127-w-michigan.png","WISCONSIN":"128-wisconsin.png","WYOMING":"129-wyoming.png","SAMHOUSTON":"add-sam-houston.png","SAMHOUSTONSTATE":"add-sam-houston.png","SHSU":"add-sam-houston.png","JAMESMADISON":"add-james-madison.png","JMU":"add-james-madison.png","JACKSONVILLESTATE":"add-jacksonville-state.png","JAXSTATE":"add-jacksonville-state.png","JSU":"add-jacksonville-state.png","DELAWARE":"add-delaware.png","KENNESAWSTATE":"add-kennesaw-state.png","KENNESAWST":"add-kennesaw-state.png","NORTHDAKOTASTATE":"add-north-dakota-state.png","NDSU":"add-north-dakota-state.png","MISSOURISTATE":"add-missouri-state.png","MISSOURIST":"add-missouri-state.png","MOSTATE":"add-missouri-state.png","SACRAMENTOSTATE":"add-sacramento-state.png","SACSTATE":"add-sacramento-state.png"};
  var TEAM_LOGO_BASE = "https://raw.githubusercontent.com/CraftyRobott/Retro-Bowl-Modded/main/team-logos/";

    var TEAM_LOGO_FILES = {"KY":"047-kentucky.png","TN":"098-tennessee.png","AIRFORCE":"000-air-force.png","AKRON":"001-akron.png","ALABAMA":"002-alabama.png","APPALACHIANSTATE":"003-appalachian-state.png","APPSTATE":"003-appalachian-state.png","ARIZONA":"004-arizona.png","ARIZONASTATE":"005-arizona-state.png","ARKANSAS":"006-arkansas.png","ARKANSASSTATE":"007-arkansas-state.png","ARMY":"008-army.png","AUBURN":"009-auburn.png","BALLSTATE":"010-ball-state.png","BAYLOR":"011-baylor.png","BOISESTATE":"012-boise-state.png","BOSTONCOLLEGE":"013-boston-college.png","BOWLINGGREENSTATE":"014-bowling-green-state.png","BOWLINGGREEN":"014-bowling-green-state.png","BGSU":"014-bowling-green-state.png","BUFFALO":"015-buffalo.png","BYU":"016-byu.png","CALIFORNIA":"017-california.png","CENTRALMICHIGAN":"018-central-michigan.png","CHARLOTTE":"019-charlotte.png","CINCINNATI":"020-cincinnati.png","CLEMSON":"021-clemson.png","COASTALCAROLINA":"022-coastal-carolina.png","COLORADO":"023-colorado.png","COLORADOSTATE":"024-colorado-state.png","CONNECTICUT":"025-connecticut.png","UCONN":"025-connecticut.png","DUKE":"026-duke.png","EASTERNMICHIGAN":"027-eastern-michigan.png","EASTCAROLINA":"028-east-carolina.png","FIU":"029-fiu.png","FLORIDA":"030-florida.png","FAU":"031-fau.png","FLORIDAATLANTIC":"031-fau.png","FLORIDASTATE":"032-florida-state.png","FRESNOSTATE":"033-fresno-state.png","GEORGIA":"034-georgia.png","GEORGIASOUTHERN":"035-georgia-southern.png","GEORGIASTATE":"036-georgia-state.png","GEORGIATECH":"037-georgia-tech.png","HAWAII":"038-hawaii.png","HOUSTON":"039-houston.png","ILLINOIS":"040-illinois.png","INDIANA":"041-indiana.png","IOWA":"042-iowa.png","IOWASTATE":"043-iowa-state.png","KANSAS":"044-kansas.png","KANSASSTATE":"045-kansas-state.png","KENTSTATE":"046-kent-state.png","KENTUCKY":"047-kentucky.png","LIBERTY":"048-liberty.png","ULLAFAYETTE":"049-ul-lafayette.png","LOUISIANA":"049-ul-lafayette.png","ULL":"049-ul-lafayette.png","LATECH":"050-la-tech.png","LOUISIANATECH":"050-la-tech.png","LOUISVILLE":"051-louisville.png","LSU":"052-lsu.png","MARSHALL":"053-marshall.png","MARYLAND":"054-maryland.png","MEMPHIS":"055-memphis.png","MIAMI":"056-miami.png","MIAMIOFOHIO":"057-miami-of-ohio.png","MIAMIOH":"057-miami-of-ohio.png","MIAMIOHIO":"057-miami-of-ohio.png","MICHIGAN":"058-michigan.png","MICHIGANSTATE":"059-michigan-state.png","MIDDLETENNESSEESTATE":"060-middle-tennessee-state.png","MIDDLETENNESSEE":"060-middle-tennessee-state.png","MTSU":"060-middle-tennessee-state.png","MINNESOTA":"061-minnesota.png","MISSISSIPPISTATE":"062-mississippi-state.png","MISSOURI":"063-missouri.png","NAVY":"064-navy.png","NCSTATE":"065-n-c-state.png","NEBRASKA":"066-nebraska.png","NEVADA":"067-nevada.png","NEWMEXICO":"068-new-mexico.png","NEWMEXICOSTATE":"069-new-mexico-state.png","NMSU":"069-new-mexico-state.png","NORTHCAROLINA":"070-north-carolina.png","NORTHTEXAS":"071-north-texas.png","NORTHERNILLINOIS":"072-northern-illinois.png","NORTHWESTERN":"073-northwestern.png","NOTREDAME":"074-notre-dame.png","OHIO":"075-ohio.png","OHIOSTATE":"076-ohio-state.png","OKLAHOMA":"077-oklahoma.png","OKLAHOMASTATE":"078-oklahoma-state.png","OLDDOMINION":"079-old-dominion.png","OLEMISS":"080-ole-miss.png","MISSISSIPPI":"080-ole-miss.png","OREGON":"081-oregon.png","OREGONSTATE":"082-oregon-state.png","PENNSTATE":"083-penn-state.png","PENNST":"083-penn-state.png","PITTSBURGH":"084-pittsburgh.png","PITT":"084-pittsburgh.png","PURDUE":"085-purdue.png","RICE":"086-rice.png","RUTGERS":"087-rutgers.png","SANDIEGOSTATE":"088-san-diego-state.png","SANJOSESTATE":"089-san-jose-state.png","SMU":"090-smu.png","SOUTHALABAMA":"091-south-alabama.png","SOUTHCAROLINA":"092-south-carolina.png","SOUTHERNMISS":"093-southern-miss.png","SOUTHERNMISSISSIPPI":"093-southern-miss.png","STANFORD":"094-stanford.png","SYRACUSE":"095-syracuse.png","TCU":"096-tcu.png","TEMPLE":"097-temple.png","TENNESSEE":"098-tennessee.png","TEXAS":"099-texas.png","TEXASAM":"100-texas-a-and-m.png","TEXASAANDM":"100-texas-a-and-m.png","TAMU":"100-texas-a-and-m.png","TEXASSTATE":"101-texas-state.png","TEXASTECH":"102-texas-tech.png","TOLEDO":"103-toledo.png","TROY":"104-troy.png","TULANE":"105-tulane.png","TULSA":"106-tulsa.png","UAB":"107-uab.png","UCF":"108-ucf.png","UCLA":"109-ucla.png","ULMONROE":"110-ul-monroe.png","LOUISIANAMONROE":"110-ul-monroe.png","ULM":"110-ul-monroe.png","MASSACHUSETTS":"111-massachusetts.png","UMASS":"111-massachusetts.png","UNLV":"112-unlv.png","USC":"113-usc.png","USF":"114-usf.png","UTAH":"115-utah.png","UTAHSTATE":"116-utah-state.png","UTEP":"117-utep.png","UTSA":"118-utsa.png","VANDERBILT":"119-vanderbilt.png","VIRGINIA":"120-virginia.png","VIRGINIATECH":"121-virginia-tech.png","WAKEFOREST":"122-wake-forest.png","WASHINGTON":"123-washington.png","WASHINGTONSTATE":"124-washington-state.png","WESTVIRGINIA":"125-west-virginia.png","WVU":"125-west-virginia.png","WKENTUCKY":"126-w-kentucky.png","WESTERNKENTUCKY":"126-w-kentucky.png","WKU":"126-w-kentucky.png","WESTERNMICHIGAN":"127-w-michigan.png","WMICHIGAN":"127-w-michigan.png","WMU":"127-w-michigan.png","WISCONSIN":"128-wisconsin.png","WYOMING":"129-wyoming.png","SAMHOUSTON":"add-sam-houston.png","SAMHOUSTONSTATE":"add-sam-houston.png","SHSU":"add-sam-houston.png","JAMESMADISON":"add-james-madison.png","JMU":"add-james-madison.png","JACKSONVILLESTATE":"add-jacksonville-state.png","JAXSTATE":"add-jacksonville-state.png","JSU":"add-jacksonville-state.png","DELAWARE":"add-delaware.png","KENNESAWSTATE":"add-kennesaw-state.png","KENNESAWST":"add-kennesaw-state.png","NORTHDAKOTASTATE":"add-north-dakota-state.png","NDSU":"add-north-dakota-state.png","MISSOURISTATE":"add-missouri-state.png","MISSOURIST":"add-missouri-state.png","MOSTATE":"add-missouri-state.png","SACRAMENTOSTATE":"add-sacramento-state.png","SACSTATE":"add-sacramento-state.png"};
  var TEAM_LOGO_BASE = "https://raw.githubusercontent.com/CraftyRobott/Retro-Bowl-Modded/main/team-logos/";

  var TEAM_LOGO_BASE = "https://raw.githubusercontent.com/CraftyRobott/Retro-Bowl-Modded/main/team-logos/";

    function normalizeLogoKey(value) {
    return String(value == null ? "" : value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

    function logoFromTeam(team, displayName) {
    var value = teamValue(team, "logo", teamValue(team, "logo_url", ""));
    if (typeof value === "string" && value.trim()) return value.trim();

    var candidates = [
      displayName,
      teamValue(team, "name", ""),
      teamValue(team, "tla", ""),
      teamValue(team, "abbreviation", "")
    ];
    for (var i = 0; i < candidates.length; i++) {
      var key = normalizeLogoKey(candidates[i]);
      var file = key ? TEAM_LOGO_FILES[key] : "";
      if (file) return TEAM_LOGO_BASE + file;
    }
    return "";
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

  function nativeDownDistanceText(inst, other) {
    try {
      if (typeof window.gml_Script_s_get_string_downand === "function") {
        return String(window.gml_Script_s_get_string_downand(inst, other) || "").trim();
      }
    } catch (error) {
      console.warn(TAG, "Native down/distance formatter failed.", error);
    }
    return "";
  }

  function ordinalDown(down) {
    return down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : down === 4 ? "4th" : "";
  }

  function compactDownDistance(nativeText, down) {
    var label = ordinalDown(down);
    var normalized = String(nativeText || "").toLowerCase();
    if (normalized.indexOf("goal") !== -1) return label;
    if (normalized.indexOf("inches") !== -1) return label + " & 1";
    return nativeText || label;
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

  // Team identity and season metadata do not change during an individual play.
  // Keep the last complete values when GameMaker briefly exposes partial team maps.
  var lastKnownTeamInfo = { away: null, home: null };

    function stableTeamInfo(side, name, mascot, rank, record, color, logo) {
    var cache = lastKnownTeamInfo[side];
    var validName = name && name !== "AWAY" && name !== "HOME";
    if (!cache || (validName && cache.name && cache.name !== name)) {
      cache = { name: "", mascot: "", rank: "", record: "", color: "", logo: "" };
      lastKnownTeamInfo[side] = cache;
    }
    if (validName) cache.name = name;
    if (mascot) cache.mascot = mascot;
    if (rank) cache.rank = rank;
    if (record) cache.record = record;
    if (color) cache.color = color;
    if (logo) cache.logo = logo;
    return {
      name: cache.name || name,
      mascot: cache.mascot || mascot,
      rank: cache.rank || rank,
      record: cache.record || record,
      color: cache.color || color,
      logo: cache.logo || logo
    };
  }

  function buildState(inst, other) {
    if (!inst || !inst.gmlteam) return null;
    var awayTeam = safeArray(inst.gmlteam, 0, null);
    var homeTeam = safeArray(inst.gmlteam, 1, null);
    if (!awayTeam || !homeTeam) return null;

    var awayName = asText(teamValue(awayTeam, "name", ""), asText(teamValue(awayTeam, "tla", "AWAY"), "AWAY"));
    var homeName = asText(teamValue(homeTeam, "name", ""), asText(teamValue(homeTeam, "tla", "HOME"), "HOME"));
    var awayMark = asText(teamValue(awayTeam, "tla", ""), "");
    var homeMark = asText(teamValue(homeTeam, "tla", ""), "");

    var awayStable = stableTeamInfo(
      "away", awayName, awayMark,
      rankFromTeam(awayTeam, inst, other), recordFromTeam(awayTeam),
      colorFromTeam(awayTeam, ""), logoFromTeam(awayTeam, awayName)
    );
    var homeStable = stableTeamInfo(
      "home", homeName, homeMark,
      rankFromTeam(homeTeam, inst, other), recordFromTeam(homeTeam),
      colorFromTeam(homeTeam, ""), logoFromTeam(homeTeam, homeName)
    );

    awayName = awayStable.name || awayName;
    homeName = homeStable.name || homeName;
    awayMark = awayStable.mascot || awayMark;
    homeMark = homeStable.mascot || homeMark;

    var awayScore = Number(safeArray(inst.gmlteam_score, 0, 0)) || 0;
    var homeScore = Number(safeArray(inst.gmlteam_score, 1, 0)) || 0;
    var minutes = Math.max(0, Number(inst.gmlminutes) || 0);
    var seconds = Math.max(0, Number(inst.gmlseconds) || 0);
    var clock = minutes + ":" + (seconds < 10 ? "0" : "") + Math.floor(seconds);

    var down = Math.round(gameNumber(inst, "gmldown", 0));
    var yardsToGo = gameNumber(inst, "gmlyards", NaN);
    var yardLine = gameNumber(inst, "gmlx_yards", NaN);
    var nativeDownDistance = nativeDownDistanceText(inst, other);
    var match = getMatch(inst, other);
    var settings = getSettings(inst, other);
    var exhibitionNoPlayer = false;
    try {
      exhibitionNoPlayer = !!(typeof global !== "undefined" && global.gmlexhibition &&
        settings && Number(settings.gmlplayerteamindex) === -1);
    } catch (_) {}

    var awayTimeouts = 3;
    var homeTimeouts = 3;
    if (match) {
      if (exhibitionNoPlayer) {
        awayTimeouts = match.gmltimeouts !== undefined ? Number(match.gmltimeouts) : 3;
        homeTimeouts = match.gmltimeouts_p2 !== undefined ? Number(match.gmltimeouts_p2) : 3;
      } else if (Number(match.gmlhuman_team) === 0) {
        awayTimeouts = match.gmltimeouts !== undefined ? Number(match.gmltimeouts) : 3;
      } else if (Number(match.gmlhuman_team) === 1) {
        homeTimeouts = match.gmltimeouts_p2 !== undefined ? Number(match.gmltimeouts_p2) : 3;
      }
    }
    if (!isFinite(awayTimeouts)) awayTimeouts = 3;
    if (!isFinite(homeTimeouts)) homeTimeouts = 3;

    var possession = Number(inst.gmlpossession) || 0;
    var quarterNumber = gameNumber(inst, "gmlquarter", 0);
    var overtime = !!inst.gmlcollege_overtime;
    var overtimeRound = gameNumber(inst, "gmlcollege_overtime_round", 0);
    var kickoffActive = true;
    if (match) {
      kickoffActive = Number(match.gmldown) === 99 || Number(match.gmlkicking) === 3;
    }

    return {
      away: {
        name: awayName,
        abbreviation: awayMark,
        mascot: awayMark,
        rank: awayStable.rank,
        record: awayStable.record,
        score: awayScore,
        color: awayStable.color || "#8c2d2e",
        logo: awayStable.logo,
        possession: possession === 0,
        timeouts: Math.max(0, Math.min(3, Math.round(awayTimeouts)))
      },
      home: {
        name: homeName,
        abbreviation: homeMark,
        mascot: homeMark,
        rank: homeStable.rank,
        record: homeStable.record,
        score: homeScore,
        color: homeStable.color || "#1e2e45",
        logo: homeStable.logo,
        possession: possession === 1,
        timeouts: Math.max(0, Math.min(3, Math.round(homeTimeouts)))
      },
      game: {
        quarter: quarterText(inst, other),
        quarterNumber: quarterNumber,
        clock: clock,
        playClock: "",
        down: down,
        yardsToGo: isFinite(yardsToGo) ? yardsToGo : null,
        yardLine: isFinite(yardLine) ? yardLine : null,
        downDistance: nativeDownDistance,
        downDistanceDisplay: compactDownDistance(nativeDownDistance, down),
        overtime: overtime,
        overtimeRound: overtimeRound,
        possession: possession === 0 ? "away" : possession === 1 ? "home" : "none",
        kickoffActive: kickoffActive
      }
    };
  }

  function cloneState(state) {
    if (!state) return null;
    return JSON.parse(JSON.stringify(state));
  }

  function notify(state) {
    subscribers.slice().forEach(function (callback) {
      try {
        callback(cloneState(state));
      } catch (error) {
        console.error(TAG, "A scorebug subscriber threw an error.", error);
      }
    });
  }

  function update(inst, other) {
    var state;
    try {
      state = buildState(inst, other);
    } catch (error) {
      console.error(TAG, "Could not read live game state.", error);
      return null;
    }
    if (!state) return null;

    var signature;
    try {
      signature = JSON.stringify(state);
    } catch (_) {
      return null;
    }

    latestState = state;
    if (signature !== lastSignature) {
      lastSignature = signature;
      notify(state);
    }
    return cloneState(state);
  }

  function getState() {
    return cloneState(latestState);
  }

  function subscribe(callback, options) {
    if (typeof callback !== "function") {
      throw new TypeError("RBScorebug.subscribe requires a callback function.");
    }
    subscribers.push(callback);
    if (!options || options.immediate !== false) {
      if (latestState) {
        try { callback(cloneState(latestState)); }
        catch (error) { console.error(TAG, "A scorebug subscriber threw an error.", error); }
      }
    }
    var active = true;
    return function unsubscribe() {
      if (!active) return;
      active = false;
      var index = subscribers.indexOf(callback);
      if (index !== -1) subscribers.splice(index, 1);
    };
  }

  window.RBScorebug = {
    version: VERSION,
    getState: getState,
    subscribe: subscribe,
    update: update,
    isReady: function () { return !!latestState; },
    formatDownDistance: compactDownDistance
  };

  // Standalone use: keep the API fed even when no scorebug mod is installed.
  // Other scorebug mods can simply subscribe and never need their own game hook.
  if (typeof originalScoreboard === "function") {
    window.gml_Script_s_draw_scoreboard = function (inst, other) {
      update(inst, other);
      return originalScoreboard.apply(this, arguments);
    };
    console.log(TAG, "Installed v" + VERSION + " and hooked the native scoreboard update.");
  } else {
    console.warn(TAG, "Installed v" + VERSION + "; scoreboard hook was not available at startup. Call RBScorebug.update(inst, other) from a game hook.");
  }
})();
