// @name Top-Right Game Decision Buttons
// @description Removes the white decision popup and moves fourth-down and 1PT/2PT choices to the top-right.
// @category presentation
(function () {
    "use strict";

    if (window.__rbTopRightDecisionMenusInstalled) return;

    // IDs confirmed from RetroBowl.js.
    var ACTION_KICK_NO = 100999;
    var ACTION_PUNT_YES = 101001;
    var ACTION_ONE_POINT = 101005;
    var ACTION_TWO_POINT = 101007;

    function getInstance(owner, other, id) {
        if (id === undefined || id === null || typeof window.yyInst !== "function") return null;
        try {
            return window.yyInst(owner, other, id);
        } catch (error) {
            console.warn("[Top-Right Decisions] Could not resolve instance", id, error);
            return null;
        }
    }

    function isTargetDecision(args) {
        // s_create_message signature:
        // (_inst, _other, title, message, button1, button2, action1, action2, colour, alpha)
        // arguments[0] and [1] are _inst/_other, so action IDs are [6]/[7].
        if (args[8] !== 16777215 || args[9] !== 0.7) return false;

        var action1 = args[6];
        var action2 = args[7];
        return (
            (action1 === ACTION_KICK_NO && action2 === ACTION_PUNT_YES) ||
            (action1 === ACTION_ONE_POINT && action2 === ACTION_TWO_POINT)
        );
    }

    function applyLayout(owner, other, popup) {
        if (!popup || !popup.__rbTopRightDecisionMenu) return;

        var width = typeof window.display_get_gui_width === "function"
            ? window.display_get_gui_width()
            : 640;

        var background = getInstance(owner, other, popup.gmlinst_bg);
        var title = getInstance(owner, other, popup.gmlinst_title);
        var message = getInstance(owner, other, popup.gmlinst_msg);
        var button1 = getInstance(owner, other, popup.gmlinst_btn_1);
        var button2 = getInstance(owner, other, popup.gmlinst_btn_2);

        // Hide the dimming layer and centered title/message, not the buttons.
        if (background) {
            background.visible = false;
            background.gmlalpha = 0;
        }
        if (title) title.visible = false;
        if (message) {
            message.visible = false;
            message.gmldraw_box = false;
        }

        // Keep the game's original button instances and click-action IDs.
        var buttons = [button1, button2];
        var y = 12;
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            if (!button || button.visible === false) continue;

            var buttonWidth = Number(button.sprite_width) || 90;
            var buttonHeight = Number(button.sprite_height) || 34;
            button.x = width - buttonWidth - 12;
            button.y = y;
            y += buttonHeight + 7;
        }
    }

    var originalCreateMessage = window.gml_Script_s_create_message;
    if (typeof originalCreateMessage !== "function") {
        console.error("[Top-Right Decisions] s_create_message was not found; mod not installed.");
        return;
    }

    window.gml_Script_s_create_message = function () {
        var args = arguments;
        var result = originalCreateMessage.apply(this, args);

        if (isTargetDecision(args)) {
            var popup = getInstance(args[0], args[1], result);
            if (popup) {
                popup.__rbTopRightDecisionMenu = true;
                applyLayout(args[0], args[1], popup);
                console.log("[Top-Right Decisions] Matched decision menu and applied layout.");
            } else {
                console.warn("[Top-Right Decisions] Matched menu, but could not resolve popup instance.");
            }
        }

        return result;
    };

    // The game's own recenter function resets button X positions after a resize.
    var originalRecenter = window.gml_Script_s_message_recenter;
    if (typeof originalRecenter === "function") {
        window.gml_Script_s_message_recenter = function (_inst, _other) {
            var result = originalRecenter.apply(this, arguments);
            applyLayout(_inst, _other, _inst);
            return result;
        };
    }

    window.__rbTopRightDecisionMenusInstalled = true;
    console.log("[Top-Right Decisions] Mod installed; waiting for punt or conversion menu.");
})();