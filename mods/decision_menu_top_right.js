// @name Top-Right Game Decision Buttons
// @description Removes the in-game decision overlay and moves fourth-down and conversion choices to the top-right corner.
// @category Presentation
(function () {
    "use strict";

    if (window.__rbTopRightDecisionMenusInstalled) return;
    window.__rbTopRightDecisionMenusInstalled = true;

    // These are the engine action IDs passed by the game's own decision menus.
    // Keeping the original button instances and click actions preserves gameplay.
    var ACTION_KICK_NO = 100999;
    var ACTION_PUNT_YES = 101001;
    var ACTION_ONE_POINT = 101005;
    var ACTION_TWO_POINT = 101007;

    function getInstance(owner, other, id) {
        if (id === undefined || id === null || typeof window.yyInst !== "function") {
            return null;
        }

        try {
            return window.yyInst(owner, other, id);
        } catch (error) {
            return null;
        }
    }

    function isTargetDecision(args) {
        // Only affect the punt/go-for-it menu and the standard 1PT/2PT menu.
        // Other dialogs (field goals, timeouts, purchases, etc.) remain unchanged.
        if (args[6] !== 16777215 || args[7] !== 0.7) return false;

        var firstAction = args[4];
        var secondAction = args[5];

        return (
            (firstAction === ACTION_KICK_NO && secondAction === ACTION_PUNT_YES) ||
            (firstAction === ACTION_ONE_POINT && secondAction === ACTION_TWO_POINT)
        );
    }

    function applyCompactLayout(owner, other, popup) {
        if (!popup || !popup.__rbTopRightDecisionMenu) return;

        var width = typeof window.display_get_gui_width === "function"
            ? window.display_get_gui_width()
            : 640;

        var background = popup.gmlinst_bg !== undefined
            ? getInstance(owner, other, popup.gmlinst_bg)
            : null;
        var title = popup.gmlinst_title !== undefined
            ? getInstance(owner, other, popup.gmlinst_title)
            : null;
        var message = popup.gmlinst_msg !== undefined
            ? getInstance(owner, other, popup.gmlinst_msg)
            : null;
        var button1 = popup.gmlinst_btn_1 !== undefined
            ? getInstance(owner, other, popup.gmlinst_btn_1)
            : null;
        var button2 = popup.gmlinst_btn_2 !== undefined
            ? getInstance(owner, other, popup.gmlinst_btn_2)
            : null;

        // Remove the full-screen popup layer and the centered prompt.
        if (background) {
            background.visible = false;
            background.gmlalpha = 0;
        }
        if (title) title.visible = false;
        if (message) {
            message.visible = false;
            message.gmldraw_box = false;
        }

        // Keep the original buttons and callbacks; only change their positions.
        var buttons = [button1, button2];
        var nextY = 12;
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            if (!button || button.visible === false) continue;

            var buttonWidth = Number(button.sprite_width) || 90;
            var buttonHeight = Number(button.sprite_height) || 34;

            button.x = Math.max(4, width - buttonWidth - 12);
            button.y = nextY;
            nextY += buttonHeight + 7;
        }
    }

    var originalCreateMessage = window.gml_Script_s_create_message;
    if (typeof originalCreateMessage === "function") {
        window.gml_Script_s_create_message = function () {
            var args = arguments;
            var result = originalCreateMessage.apply(this, args);

            if (isTargetDecision(args)) {
                var popup = getInstance(args[0], args[1], result);
                if (popup) {
                    popup.__rbTopRightDecisionMenu = true;
                    applyCompactLayout(args[0], args[1], popup);
                }
            }

            return result;
        };
    } else {
        console.warn("[Top-Right Decisions] Could not find s_create_message; mod was not installed.");
        window.__rbTopRightDecisionMenusInstalled = false;
        return;
    }

    // The game's camera resize/recenter routine resets button X positions.
    // Reapply our layout after the original routine so the choices stay put.
    var originalRecenter = window.gml_Script_s_message_recenter;
    if (typeof originalRecenter === "function") {
        window.gml_Script_s_message_recenter = function (owner, other) {
            var result = originalRecenter.apply(this, arguments);
            applyCompactLayout(owner, other, owner);
            return result;
        };
    }

    console.log("[Top-Right Decisions] Installed. Punt and conversion choices now appear in the top-right.");
})();