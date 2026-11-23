(function () {
    "use strict";

    // Retro Bowl College - Disable achievement and new-record popups only.
    // Achievement progress, record tracking, and record updates are untouched.

    if (window.__rbNoAchievementPopupsInstalled) return;

    if (typeof gml_Script_s_notification !== "function") {
        console.error("[No Achievement Popups] s_notification was not found.");
        return;
    }

    var originalNotification = gml_Script_s_notification;

    function hasLocalizedTitle(_inst, _other, title, stringId, fallback) {
        try {
            // Use the game's localized title so this works in every language.
            var localizedTitle = gml_Script_s_str(_inst, _other, stringId);
            return String(title) === String(localizedTitle) + "!";
        } catch (error) {
            // English fallback if localization lookup is unavailable.
            return String(title).trim().toLowerCase() === fallback;
        }
    }

    function shouldSuppressNotification(_inst, _other, title) {
        return (
            hasLocalizedTitle(_inst, _other, title, "ui_Achievement", "achievement!") ||
            hasLocalizedTitle(_inst, _other, title, "ui_NewRecord", "new record!")
        );
    }

    gml_Script_s_notification = function (_inst, _other, title, message) {
        if (shouldSuppressNotification(_inst, _other, title)) {
            console.log("[No Achievement Popups] Suppressed:", title, message);
            return;
        }

        return originalNotification.apply(this, arguments);
    };

    window.__rbNoAchievementPopupsInstalled = true;
    console.log("[No Achievement Popups] Installed. Achievement progress and record tracking are unchanged.");
})();