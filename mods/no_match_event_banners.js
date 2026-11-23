// @name No Match Event Banners
// @description Hides the large touchdown, incomplete-pass, interception, safety, and field-goal banners during gameplay.
// @category Presentation

(function () {
    "use strict";

    const TAG = "[No Match Event Banners]";

    if (window.__rbNoMatchEventBannersInstalled) {
        console.log(TAG, "Already installed.");
        return;
    }

    // The match-event banner is created as obj_match_msg (asset 0x71).
    // Its text is drawn by the object's Draw GUI event. Suppressing that event
    // hides the banner without changing scoring, turnovers, stats, or game flow.
    const gameData = window.JSON_game;
    const objects = gameData && gameData.GMObjects;

    if (!Array.isArray(objects)) {
        console.error(TAG, "Could not find JSON_game.GMObjects. The mod must load after RetroBowl.js.");
        return;
    }

    const messageObject = objects.find(function (object) {
        return object && object.pName === "obj_match_msg";
    });

    if (!messageObject) {
        console.error(TAG, "Could not find obj_match_msg in the GameMaker object table.");
        return;
    }

    if (typeof messageObject.DrawGUI !== "function") {
        console.error(TAG, "obj_match_msg.DrawGUI was not a function; no changes made.");
        return;
    }

    if (messageObject.__rbNoMatchEventBannersPatched) {
        window.__rbNoMatchEventBannersInstalled = true;
        console.log(TAG, "Draw GUI event was already suppressed.");
        return;
    }

    messageObject.__rbOriginalDrawGUI = messageObject.DrawGUI;
    messageObject.DrawGUI = function () {
        // Intentionally do not draw the full-screen match-event banner.
    };

    messageObject.__rbNoMatchEventBannersPatched = true;
    window.__rbNoMatchEventBannersInstalled = true;

    console.log(TAG, "Successfully suppressed obj_match_msg.DrawGUI.");
})();
