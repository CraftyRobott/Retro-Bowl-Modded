// @name FOX CFB Scorebug (Native)
// @description Replaces the stock top scoreboard with a FOX-style scorebug drawn by GameMaker.
// @category presentation
(function () {
    "use strict";

    var TAG = "[FOX CFB]";
    var originalDraw = window.gml_Script_s_draw_scoreboard;
    var originalGlobalDraw = window.gml_GlobalScript_s_draw_scoreboard;
    var previousScores = [null, null];
    var scoreAnimations = [null, null];

    function safeMapValue(map, key, fallback) {
        try {
            if (map == null || typeof window.ds_map_find_value !== "function") return fallback;
            var value = window.ds_map_find_value(map, key);
            return value == null || value === -1 ? fallback : value;
        } catch (_) {
            return fallback;
        }
    }

    function safeText(value, fallback) {
        return value === undefined || value === null || value === "" ? fallback : String(value);
    }

    function drawText(inst, other, x, y, value) {
        window.gml_Script_draw_hd_text(inst, other, x, y, String(value));
    }

    function drawScore(inst, other, index, x, y, score) {
        var now = Date.now();
        var last = previousScores[index];
        var animation = scoreAnimations[index];

        if (last === null) {
            previousScores[index] = score;
        } else if (score !== last) {
            scoreAnimations[index] = score > last ? { from: last, to: score, start: now } : null;
            previousScores[index] = score;
        }

        var shown = score;
        animation = scoreAnimations[index];
        if (animation) {
            var progress = Math.max(0, Math.min(1, (now - animation.start) / 650));
            shown = Math.floor(animation.from + (animation.to - animation.from) * progress);
            if (progress >= 1) scoreAnimations[index] = null;
        }
        drawText(inst, other, x, y, shown);
    }

    function drawFoxScorebug(inst, other) {
        if (!inst || !Array.isArray(inst.gmlteam) || inst.gmlteam.length < 2) {
            throw new Error("controller team data is not ready");
        }

        var guiWidth = window.display_get_gui_width();
        var width = 344;
        var height = 36;
        var left = Math.round((guiWidth - width) / 2);
        var top = 7;
        var teams = inst.gmlteam;
        var scores = inst.gmlteam_score || [0, 0];
        var away = safeText(safeMapValue(teams[0], "tla", safeMapValue(teams[0], "name", "AWY")), "AWY").toUpperCase();
        var home = safeText(safeMapValue(teams[1], "tla", safeMapValue(teams[1], "name", "HME")), "HME").toUpperCase();
        away = away.length > 3 ? away.slice(0, 3) : away;
        home = home.length > 3 ? home.slice(0, 3) : home;

        var awayScore = Number(scores[0]) || 0;
        var homeScore = Number(scores[1]) || 0;
        var oldColor = window.draw_get_color();
        var oldAlpha = window.draw_get_alpha();
        var oldHAlign = window.draw_get_halign();
        var oldVAlign = window.draw_get_valign();
        var oldFont = window.draw_get_font();

        try {
            window.draw_set_alpha(1);
            window.draw_set_font(window.global.gmlfnt_small_flex);
            window.draw_set_halign(1);
            window.draw_set_valign(1);

            window.draw_set_color(0x111820);
            window.draw_rectangle(left, top, left + width, top + height, false);
            window.draw_set_color(0xE31837);
            window.draw_rectangle(left, top, left + width, top + 2, false);
            window.draw_set_color(0x0066B3);
            window.draw_rectangle(left, top + 2, left + 49, top + height, false);

            window.draw_set_color(0x53606B);
            window.draw_rectangle(left + 49, top + 5, left + 50, top + height - 4, false);
            window.draw_rectangle(left + 145, top + 5, left + 146, top + height - 4, false);
            window.draw_rectangle(left + 241, top + 5, left + 242, top + height - 4, false);

            window.draw_set_color(0xFFFFFF);
            drawText(inst, other, left + 24, top + 17, "FOX");
            window.draw_set_font(window.global.gmlfnt_small_flex);
            drawText(inst, other, left + 24, top + 29, "CFB");
            window.draw_set_font(window.global.gmlfnt_small_flex);

            window.draw_set_halign(0);
            drawText(inst, other, left + 57, top + 17, away);
            window.draw_set_halign(2);
            drawScore(inst, other, 0, left + 137, top + 17, awayScore);

            window.draw_set_halign(0);
            drawText(inst, other, left + 153, top + 17, home);
            window.draw_set_halign(2);
            drawScore(inst, other, 1, left + 233, top + 17, homeScore);

            window.draw_set_halign(1);
            var quarter = Number(inst.gmlquarter) || 1;
            var quarterText = inst.gmlcollege_overtime ? "OT" : ("Q" + quarter);
            if (inst.gmlcollege_overtime && Number(inst.gmlcollege_overtime_round) > 1) {
                quarterText = "OT " + inst.gmlcollege_overtime_round;
            }
            var clockText = inst.gmlcollege_overtime ? "" : window.gml_Script_s_get_string_time(inst, other, inst.gmlminutes, inst.gmlseconds);
            drawText(inst, other, left + 293, top + 13, quarterText + (clockText ? "  " + clockText : ""));

            var downText = "";
            if (Number(inst.gmldown) >= 1 && Number(inst.gmldown) <= 4 && typeof window.gml_Script_s_get_string_downand === "function") {
                downText = window.gml_Script_s_get_string_downand(inst, other);
            }
            if (downText) drawText(inst, other, left + 293, top + 27, downText);
        } finally {
            window.draw_set_color(oldColor);
            window.draw_set_alpha(oldAlpha);
            window.draw_set_halign(oldHAlign);
            window.draw_set_valign(oldVAlign);
            window.draw_set_font(oldFont);
        }
    }

    function replacement(inst, other) {
        try {
            var practice = !!(inst && inst.gmlgamepractice);
            try {
                if (typeof window.yyInst === "function" && typeof window.YYASSET_REF === "function") {
                    var settings = window.yyInst(inst, other, window.YYASSET_REF(0x00000062));
                    practice = !!(settings && settings.gmlgamepractice);
                }
            } catch (_) {}
            if (practice || (window.global && window.global.gmldebug_aa_hide_ui)) {
                if (typeof originalDraw === "function") return originalDraw(inst, other);
            }
            drawFoxScorebug(inst, other);
        } catch (error) {
            console.error(TAG, "Native scorebug draw failed; restoring stock scoreboard for this frame.", error);
            if (typeof originalDraw === "function") return originalDraw(inst, other);
        }
    }

    if (typeof originalDraw !== "function") {
        console.error(TAG, "Could not find gml_Script_s_draw_scoreboard. No game functions were changed.");
        return;
    }

    // The controller calls this script directly from its DrawGUI event. Replacing
    // this function is reliable; replacing the DrawGUI event global is not,
    // because GameMaker has already stored the event function in its object data.
    window.gml_Script_s_draw_scoreboard = replacement;

    if (typeof originalGlobalDraw === "function") {
        window.gml_GlobalScript_s_draw_scoreboard = function (inst) {
            if (inst) inst.gmls_draw_scoreboard = window.__yy_method ? window.__yy_method(inst, replacement) : replacement;
        };
    }

    console.log(TAG, "Installed native GameMaker scorebug patch.");
})();
