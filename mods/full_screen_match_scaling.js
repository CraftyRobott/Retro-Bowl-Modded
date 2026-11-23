
(function () {
    "use strict";

    var TAG = "[Integer Scaling]";
    var canvas = document.getElementById("canvas");

    if (!canvas) {
        console.error(TAG, "Canvas not found.");
        return;
    }

    if (window.__retroBowlPixelScaleInstalled) {
        console.warn(TAG, "Already installed; skipping duplicate setup.");
        return;
    }
    window.__retroBowlPixelScaleInstalled = true;

    if (typeof gml_Script_s_create_camera !== "function" ||
        typeof display_get_gui_width !== "function" ||
        typeof display_get_gui_height !== "function" ||
        typeof window_set_size !== "function") {
        console.error(TAG, "Required GameMaker functions were not available.");
        return;
    }

    var originalCreateCamera = gml_Script_s_create_camera;
    var originalMouseXToGUI = device_mouse_x_to_gui;
    var originalMouseYToGUI = device_mouse_y_to_gui;
    var lastScale = 0;
    var lastWidth = 0;
    var lastHeight = 0;

    function applyPixelPerfectScale() {
        var guiWidth = Number(display_get_gui_width());
        var guiHeight = Number(display_get_gui_height());
        var dpr = Number(window.devicePixelRatio) || 1;

        var viewportWidth = Number(window.innerWidth) ||
            document.documentElement.clientWidth;
        var viewportHeight = Number(window.innerHeight) ||
            document.documentElement.clientHeight;

        if (!(guiWidth > 0) || !(guiHeight > 0) ||
            !(viewportWidth > 0) || !(viewportHeight > 0)) {
            return;
        }

        // Keep the internal render at an integer scale.
        var scale = Math.floor(Math.min(
            viewportWidth * dpr / guiWidth,
            viewportHeight * dpr / guiHeight
        ));

        scale = Math.max(1, scale);

        var pixelWidth = Math.round(guiWidth * scale);
        var pixelHeight = Math.round(guiHeight * scale);

        // Keep GameMaker's backing-store and surface dimensions unchanged.
        window_set_size(pixelWidth, pixelHeight);

        if (typeof surface_resize === "function" &&
            typeof g_pBuiltIn !== "undefined" &&
            g_pBuiltIn.application_surface !== undefined) {
            surface_resize(
                g_pBuiltIn.application_surface,
                pixelWidth,
                pixelHeight
            );
        }

        // Fit the displayed canvas to the viewport while preserving
        // the original game aspect ratio.
        var displayAspect = guiWidth / guiHeight;
        var viewportAspect = viewportWidth / viewportHeight;

        var displayWidth;
        var displayHeight;

        if (viewportAspect > displayAspect) {
            displayHeight = viewportHeight;
            displayWidth = displayHeight * displayAspect;
        } else {
            displayWidth = viewportWidth;
            displayHeight = displayWidth / displayAspect;
        }

        // Center the canvas. No game content is cropped.
        var style = canvas.style;

        style.position = "absolute";
        style.width = displayWidth + "px";
        style.height = displayHeight + "px";
        style.left = ((viewportWidth - displayWidth) / 2) + "px";
        style.top = ((viewportHeight - displayHeight) / 2) + "px";
        style.right = "";
        style.bottom = "";
        style.margin = "0";
        style.transform = "none";
        style.maxWidth = "none";
        style.maxHeight = "none";
        style.imageRendering = "pixelated";
        style.webkitImageRendering = "pixelated";
        style.touchAction = "none";

        // Refresh GameMaker's cached canvas rectangle.
        if (typeof _ag === "function" && typeof _bg !== "undefined") {
            _ag(canvas, _bg);
            _In1 = _bg.top;
            _Jn1 = _bg.left;
            _Kn1 = _bg.right;
            _Ln1 = _bg.bottom;
        }

        lastScale = scale;
        lastWidth = pixelWidth;
        lastHeight = pixelHeight;

        console.log(TAG, "Applied scaling:", {
            internalScale: scale,
            backingWidth: pixelWidth,
            backingHeight: pixelHeight,
            displayWidth: displayWidth,
            displayHeight: displayHeight
        });
    }

    // Apply scaling after GameMaker establishes its native camera dimensions.
    gml_Script_s_create_camera = function () {
        var result = originalCreateCamera.apply(this, arguments);

        try {
            applyPixelPerfectScale();
        } catch (error) {
            console.error(TAG, "Could not apply scaling:", error);
        }

        return result;
    };

    // Keep touch coordinates aligned with the displayed canvas.
    if (typeof originalMouseXToGUI === "function") {
        device_mouse_x_to_gui = function (device) {
            device = (typeof yyGetInt32 === "function")
                ? yyGetInt32(device)
                : (device | 0);

            var x = 0;

            if (device === 0) {
                x = _vg;
            } else if (typeof _og !== "undefined" && _og[device]) {
                x = _og[device].x;
            }

            var rect = canvas.getBoundingClientRect();
            var guiWidth = Number(display_get_gui_width());

            if (!(rect.width > 0) || !(guiWidth > 0)) return 0;

            return Math.floor((x - rect.left) * (guiWidth / rect.width));
        };
    }

    if (typeof originalMouseYToGUI === "function") {
        device_mouse_y_to_gui = function (device) {
            device = (typeof yyGetInt32 === "function")
                ? yyGetInt32(device)
                : (device | 0);

            var y = 0;

            if (device === 0) {
                y = _wg;
            } else if (typeof _og !== "undefined" && _og[device]) {
                y = _og[device].y;
            }

            var rect = canvas.getBoundingClientRect();
            var guiHeight = Number(display_get_gui_height());

            if (!(rect.height > 0) || !(guiHeight > 0)) return 0;

            return Math.floor((y - rect.top) * (guiHeight / rect.height));
        };
    }

    canvas.style.imageRendering = "pixelated";
    canvas.style.webkitImageRendering = "pixelated";
    canvas.style.touchAction = "none";

    console.log(TAG, "Installed. Waiting for GameMaker's camera setup.");

    // Handle cases where the camera already exists.
    if (display_get_gui_width() > 0 && display_get_gui_height() > 0) {
        try {
            applyPixelPerfectScale();
        } catch (error) {
            console.warn(TAG, "Initial sizing pass deferred:", error);
        }
    }

    window.addEventListener("resize", function () {
        if (lastScale > 0 && lastWidth > 0 && lastHeight > 0) {
            try {
                applyPixelPerfectScale();
            } catch (error) {
                console.warn(TAG, "Resize scaling pass failed:", error);
            }
        }
    });
})();
