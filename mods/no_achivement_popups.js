(function () {
    "use strict";

    // Retro Bowl College - Disable achievement popups only.
    // Achievement progress and completion are left untouched.

    if (window.__rbNoAchievementPopupsInstalled) return;

    if (typeof gml_Script_s_notification !== "function") {
        console.error("[No Achievement Popups] s_notification was not found.");
        return;
    }

    var originalNotification = gml_Script_s_notification;

    function isAchievementNotification(_inst, _other, title) {
        try {
            // Use the game's own localized achievement title so this works
            // regardless of the selected game language.
            var achievementTitle = gml_Script_s_str(
                _inst,
                _other,
                "ui_Achievement"
            );

            return String(title) === String(achievementTitle) + "!";
        } catch (error) {
            // English fallback if localization lookup is unavailable.
            return String(title).trim().toLowerCase() === "achievement!";
        }
    }

    gml_Script_s_notification = function (_inst, _other, title, message) {
        if (isAchievementNotification(_inst, _other, title)) {
            console.log("[No Achievement Popups] Suppressed:", message);
            return;
        }

        return originalNotification.apply(this, arguments);
    };

    window.__rbNoAchievementPopupsInstalled = true;
    console.log("[No Achievement Popups] Installed. Achievement progress is unchanged.");
})();