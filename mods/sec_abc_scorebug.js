// @name SEC on ABC Scorebug
// @description SEC on ABC-inspired compact scorebug mod for the Retro Bowl.
// @category presentation
// SEC on ABC-inspired compact scorebug mod for the Retro Bowl wrapper.
// Install as engine/mods/sec_abc_scorebug.js
// Uses Retro Bowl's actual subdivision ranking system.
(function () {
    "use strict";

    console.log("[SEC ON ABC] Initializing broadcast-style scorebug...");

    if (window.__secOnAbcScorebugPatched) {
        console.warn("[SEC ON ABC] Already installed.");
        return;
    }

    var attempts = 0;
    var retryTimer = null;

    // Cache each team's extracted primary shirt color.
    var cachedTeamUniformColors = {};

    function getTeamUniformColor(_inst, _other, _team) {
        try {
            if (!_team) {
                throw new Error("Team data unavailable");
            }

            var shirtHex = ds_map_find_value(_team, "colshirt");

            if (shirtHex === undefined || shirtHex === null) {
                throw new Error("Team colshirt value not found");
            }

            shirtHex = String(shirtHex).trim().replace(/^[$#]/, "");

            if (!/^[0-9a-fA-F]{6}$/.test(shirtHex)) {
                throw new Error("Invalid shirt color: " + shirtHex);
            }

            var teamId = String(ds_map_find_value(_team, "tla"));

            if (
                cachedTeamUniformColors[teamId] &&
                cachedTeamUniformColors[teamId].hex === shirtHex
            ) {
                return cachedTeamUniformColors[teamId].color;
            }

            var rawColor = gml_Script_s_hex_string_to_col(
                _inst, _other, shirtHex
            );

            var convertedColor = gml_Script_s_rgb_to_bgr(
                _inst, _other, rawColor
            );

            cachedTeamUniformColors[teamId] = {
                hex: shirtHex,
                color: convertedColor
            };

            console.log("[SEC ON ABC] Team uniform color found:", {
                team: teamId,
                shirtHex: shirtHex
            });

            return convertedColor;

        } catch (error) {
            if (!window.__secUniformColorErrorLogged) {
                window.__secUniformColorErrorLogged = true;
                console.warn(
                    "[SEC ON ABC] Could not read team shirt color:",
                    error
                );
            }

            return make_color_rgb(119, 119, 119);
        }
    }

    // Get the team's actual in-game ranking within its subdivision.
    // The game's ranking function returns a zero-based position,
    // so add 1 for the displayed ranking.
    function getTeamRank(_inst, _other, team) {
        try {
            if (
                !team ||
                typeof gml_Script_s_get_subdivision !== "function" ||
                typeof gml_Script_s_subdivision_get_team_ranking !== "function"
            ) {
                return null;
            }

            var subdivision = gml_Script_s_get_subdivision(
                _inst,
                _other,
                team
            );

            if (
                subdivision === undefined ||
                subdivision === null ||
                Number(subdivision) < 0
            ) {
                return null;
            }

            var uid = ds_map_find_value(team, "uid");

            if (uid === undefined || uid === null) {
                return null;
            }

            // This is the game's own ranking function.
            // It updates the subdivision rankings before returning
            // the team's position.
            var rankIndex = gml_Script_s_subdivision_get_team_ranking(
                _inst,
                _other,
                subdivision,
                uid
            );

            rankIndex = Number(rankIndex);

            if (!isFinite(rankIndex) || rankIndex < 0) {
                return null;
            }

            return rankIndex + 1;

        } catch (error) {
            if (!window.__secTeamRankErrorLogged) {
                window.__secTeamRankErrorLogged = true;
                console.warn(
                    "[SEC ON ABC] Could not retrieve official team ranking:",
                    error
                );
            }

            return null;
        }
    }

    // Lighten a color while preserving its packed channel layout.
    function lightenColor(color, amount) {
        var r = color & 255;
        var g = (color >> 8) & 255;
        var b = (color >> 16) & 255;

        r = Math.min(255, Math.round(r + (255 - r) * amount));
        g = Math.min(255, Math.round(g + (255 - g) * amount));
        b = Math.min(255, Math.round(b + (255 - b) * amount));

        return r | (g << 8) | (b << 16);
    }

    function install() {
        var original = window.gml_Script_s_draw_scoreboard;

        if (typeof original !== "function") {
            attempts++;

            if (attempts >= 200) {
                clearInterval(retryTimer);
                console.error(
                    "[SEC ON ABC] Could not find scoreboard function."
                );
            }

            return;
        }

        clearInterval(retryTimer);

        window.gml_Script_s_draw_scoreboard = function (_inst, _other) {
            try {
                if (global.gmldebug_aa_hide_ui) {
                    return;
                }

                var w = display_get_gui_width();
                var h = display_get_gui_height();

                // Fit the complete scorebug to BOTH GUI dimensions.
                // 732 x 337.5 is the design reference; the scale can shrink
                // below the old 0.75 floor so smaller viewports never clip it.
                if (!(w > 0) || !(h > 0)) {
                    return;
                }

                var baseScale = Math.min(1.25, w / 732, h / 337.5);
                var scale = baseScale * 0.38;

                // The supplied layout was tuned at the iPhone GUI scale of 0.8.
                // Keep its original text size there, then scale text with the layout.
                var textScaleFactor = baseScale / 0.8;

                // Half-width scoreboard, centered horizontally near the bottom.
                var barW = (w - (36 * baseScale)) * 0.5;
                var barH = 76 * scale;
                var barX = (w - barW) / 2;
                var barY = h - barH - (12 * scale);
                var barRight = barX + barW;

                // Panel proportions.
                var leftEnd = barX + barW * 0.39;
                var centerEnd = barX + barW * 0.61;

                // SEC on ABC-inspired broadcast palette: deep navy, gold, and white.
                var BLACK = 0x000000;
                var DARK = 0x101B2D;
                var LIGHT = 0xffffff;
                var WHITE = 0xffffff;
                var GRAY = 0xffffff;
                var GOLD = make_color_rgb(207, 169, 76);
                var GOLD_DARK = make_color_rgb(139, 105, 35);

                // Live game information.
                var awayTeam = _inst.gmlteam[0];
                var homeTeam = _inst.gmlteam[1];

                var away = ds_map_find_value(awayTeam, "tla");
                var home = ds_map_find_value(homeTeam, "tla");
                var fullaway = ds_map_find_value(awayTeam, "name");
                var fullhome = ds_map_find_value(homeTeam, "name");

                // Retrieve the official in-game subdivision rankings.
                var awayRank = getTeamRank(_inst, _other, awayTeam);
                var homeRank = getTeamRank(_inst, _other, homeTeam);

                var awayRankedName = awayRank && awayRank <= 25
    ? "#" + awayRank + " " + String(fullaway)
    : String(fullaway);

var homeRankedName = homeRank && homeRank <= 25
    ? "#" + homeRank + " " + String(fullhome)
    : String(fullhome);

                var awayWins = ds_map_find_value(awayTeam, "wins");
                var awayLosses = ds_map_find_value(awayTeam, "losses");

                var homeWins = ds_map_find_value(homeTeam, "wins");
                var homeLosses = ds_map_find_value(homeTeam, "losses");

                var awayLabel = String(awayWins) + "-" + String(awayLosses);
                var homeLabel = String(homeWins) + "-" + String(homeLosses);

                var timeouts = gml_Script_s_count_timeouts(_inst, _other);

                var awayScore = String(_inst.gmlteam_score[0]);
                var homeScore = String(_inst.gmlteam_score[1]);

                var clock = gml_Script_s_get_string_time(
                    _inst, _other,
                    _inst.gmlminutes,
                    _inst.gmlseconds
                );

                var quarter = gml_Script_s_str(
                    _inst, _other,
                    "quarter_" + String(_inst.gmlquarter)
                );

                var down = gml_Script_s_get_string_downand(_inst, _other);

                // Get each team's primary shirt color independently.
                var awayPanelColor = getTeamUniformColor(
                    _inst, _other, awayTeam
                );

                var homePanelColor = getTeamUniformColor(
                    _inst, _other, homeTeam
                );

                // BACKGROUND
                draw_set_alpha(0.8);

                // Away panel - away uniform color.
                draw_rectangle_colour(
                    barX, barY,
                    leftEnd, barY + barH,
                    awayPanelColor, awayPanelColor,
                    awayPanelColor, awayPanelColor, 0
                );

                // Center panel.
                draw_rectangle_colour(
                    leftEnd, barY,
                    centerEnd, barY + barH,
                    BLACK, BLACK, BLACK, BLACK, 0
                );

                // Home panel - home uniform color.
                draw_rectangle_colour(
                    centerEnd, barY,
                    barRight, barY + barH,
                    homePanelColor, homePanelColor,
                    homePanelColor, homePanelColor, 0
                );

                draw_set_alpha(0.8);

                // Center panel.
                draw_rectangle_colour(
                    leftEnd - 357.5 * scale, barY - 30 * scale,
                    centerEnd + 357.5 * scale, barY - 79 * scale + barH,
                    BLACK, BLACK, BLACK, BLACK, 0
                );

                draw_set_alpha(1);

                // Text helper matching the game's HD/non-HD font behavior,
                // while scaling the font together with the scorebug geometry.
                function drawResponsiveHudText(_inst, _other, x, y, text) {
                    var fontScale = global.gmlhd_fonts
                        ? 0.25 * textScaleFactor
                        : textScaleFactor;

                    draw_text_transformed(
                        x, y, String(text),
                        fontScale, fontScale, 0
                    );
                }

                // TEXT
                draw_set_font(global.gmlfnt_small_flex);
                draw_set_valign(1);
                draw_set_alpha(1);

                var teamTextY = barY + (barH * 0.52);
                var teamTextYname = barY - (16 * scale);

                // Away team name and ranking.
                var awayTextX = barX + (20 * scale);

                draw_set_halign(0);
                draw_set_color(WHITE);

                drawResponsiveHudText(
                    _inst, _other,
                    awayTextX,
                    teamTextYname,
                    String(awayRankedName)
                );

                // Away score.
                draw_set_halign(2);

                drawResponsiveHudText(
                    _inst, _other,
                    leftEnd - (17 * scale),
                    teamTextY,
                    awayScore
                );

                draw_set_halign(2);

                // Away record - slightly smaller.
textScaleFactor = 1.5;
drawSmallHudText(
    leftEnd - (100 * scale),
    teamTextY,
    awayLabel
);
draw_set_halign(0);
                

                // Home record - 85% size.
// Home record - slightly smaller.
drawSmallHudText(
    centerEnd + (100 * scale),
    teamTextY,
    homeLabel
);
textScaleFactor = 1;
// Home score.
                draw_set_halign(0);

                drawResponsiveHudText(
                    _inst, _other,
                    centerEnd + (17 * scale),
                    teamTextY,
                    homeScore
                );
                // Home team name and ranking.
                var homeTextX = barRight - (20 * scale);

                draw_set_halign(2);

                drawResponsiveHudText(
                    _inst, _other,
                    homeTextX,
                    teamTextYname,
                    String(homeRankedName)
                );

                // Draw smaller HUD text.
                function drawSmallHudText(x, y, text) {
                    var textScale = (global.gmlhd_fonts ? 0.175 : 0.4) * textScaleFactor;

                    draw_text_transformed(
                        x, y, String(text),
                        textScale, textScale, 0
                    );
                }

                // CENTER GAME INFORMATION
                var centerX = (leftEnd + centerEnd) / 2;

                // Down and distance - larger text.
draw_set_halign(1);
draw_set_color(GRAY);

if (down !== "") {
    var downTextScale = (global.gmlhd_fonts ? 0.25 : 0.55);

    draw_text_transformed(
        centerX,
        barY - (15 * scale),
        String(down),
        downTextScale,
        downTextScale,
        0
    );
}

                // Game clock.
                draw_set_color(WHITE);

                drawResponsiveHudText(
                    _inst, _other,
                    centerX,
                    barY + (25 * scale),
                    String(clock)
                );

                // Quarter - larger text.
draw_set_color(GRAY);

var quarterTextScale = (global.gmlhd_fonts ? 0.25 : 0.55);

draw_text_transformed(
    centerX,
    barY + (60 * scale),
    String(quarter),
    quarterTextScale,
    quarterTextScale,
    0
);
                // Restore drawing state.
                draw_set_color(WHITE);
                draw_set_alpha(1);
                draw_set_halign(0);
                draw_set_valign(1);

            } catch (error) {
                if (!window.__secHudErrorLogged) {
                    window.__secHudErrorLogged = true;
                    console.error(
                        "[SEC ON ABC] Drawing error:",
                        error
                    );
                }
            }
        };

        window.__secOnAbcScorebugPatched = true;
        console.log(
            "[SEC ON ABC] Official-ranking broadcast scorebug installed!"
        );
    }

    retryTimer = setInterval(install, 50);
    install();
})();
