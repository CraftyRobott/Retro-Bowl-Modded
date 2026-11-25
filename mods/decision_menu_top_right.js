// @name Top-Right Game Decision Buttons
// @description Hides the white decision popup and moves fourth-down and 1PT/2PT choices to the top-right.
// @category presentation
(function () {
    "use strict";

    var BUILD = "2026-11-24-fix3";
    if (window.__rbTopRightDecisionMenusBuild === BUILD) return;
    window.__rbTopRightDecisionMenusBuild = BUILD;

    var ACTION_KICK_NO = 100999;
    var ACTION_PUNT_YES = 101001;
    var ACTION_ONE_POINT = 101005;
    var ACTION_TWO_POINT = 101007;

    function getInstance(owner, other, id) {
        if (id === undefined || id === null || typeof window.yyInst !== "function") return null;
        try {
            return window.yyInst(owner, other, id);
        } catch (error) {
            console.warn("[Top-Right Decisions " + BUILD + "] yyInst failed for", id, error);
            return null;
        }
    }

    function isTargetDecision(args) {
        // Confirmed from gml_Script_s_create_message:
        // args[0..1] = _inst/_other
        // args[2..5] = title/message/button labels/action IDs
        // args[6..7] = popup colour/alpha
        var action1 = args[4];
        var action2 = args[5];
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

        if (background) {
            background.visible = false;
            background.gmlalpha = 0;
        }
        if (title) title.visible = false;
        if (message) {
            message.visible = false;
            message.gmldraw_box = false;
        }

        var y = 12;
        [button1, button2].forEach(function (button) {
            if (!button || button.visible === false) return;
            var buttonWidth = Number(button.sprite_width) || 90;
            var buttonHeight = Number(button.sprite_height) || 34;
            button.x = width - buttonWidth - 12;
            button.y = y;
            y += buttonHeight + 7;
        });
    }

    var originalCreate = window.gml_Script_s_create_message;
    if (typeof originalCreate !== "function") {
        console.error("[Top-Right Decisions " + BUILD + "] s_create_message not found.");
        return;
    }

    window.gml_Script_s_create_message = function () {
        var args = arguments;
        var result = originalCreate.apply(this, args);

        if (isTargetDecision(args)) {
            console.log("[Top-Right Decisions " + BUILD + "] Correctly detected target menu.", {
                action1: args[4],
                action2: args[5],
                colour: args[6],
                alpha: args[7],
                popupId: result
            });

            var popup = getInstance(args[0], args[1], result);
            if (popup) {
                popup.__rbTopRightDecisionMenu = true;
                applyLayout(args[0], args[1], popup);
                console.log("[Top-Right Decisions " + BUILD + "] Layout applied.");
            } else {
                console.warn("[Top-Right Decisions " + BUILD + "] Menu detected, but popup instance lookup failed.");
            }
        }
        return result;
    };

    var originalRecenter = window.gml_Script_s_message_recenter;
    if (typeof originalRecenter === "function") {
        window.gml_Script_s_message_recenter = function (_inst, _other) {
            var result = originalRecenter.apply(this, arguments);
            applyLayout(_inst, _other, _inst);
            return result;
        };
    }

    console.log("[Top-Right Decisions " + BUILD + "] Loaded. This build uses action args[4]/args[5].");
})();