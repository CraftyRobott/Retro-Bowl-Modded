# Retro Bowl Mod Options Framework

**File:** `mods/mod_options_menu.js`  
**Public repository:** [CraftyRobott/Retro-Bowl-Modded](https://github.com/CraftyRobott/Retro-Bowl-Modded)  
**Framework API:** `window.RetroBowlModOptions`

The Mod Options Framework gives Retro Bowl College mods one shared place to expose configurable options. It adds a **MOD OPTIONS** button to the game's Settings screen and opens a custom HTML/CSS menu. Individual mods register their controls through a JavaScript API instead of each mod building its own menu.

This document describes the implementation currently in `mods/mod_options_menu.js`. It is a guide to the existing code, not a promise that every possible UI feature is already implemented.

---

## 1. What the framework does

- Adds a **MOD OPTIONS** button while the game is in its Settings room.
- Opens a browser-based HTML dialog styled with CSS.
- Lets any compatible mod register settings in the shared dialog.
- Saves setting values in browser `localStorage`, so values persist across game reloads in the same browser profile.
- Gives mods a common API to register, read, change, and unregister settings.
- Calls a setting's `onChange` callback when its value is changed through the menu or through the API's `set()` method.

The framework is a UI and settings-storage layer. It does **not** automatically change game behavior. A mod must use its setting value in its own code or callback to make the option do something.

## 2. How it is built

The framework uses ordinary browser DOM elements, HTML, and CSS. It does not draw the menu through GameMaker's GUI system and does not patch the game's Settings-room drawing code.

The script:

1. Creates the global `window.RetroBowlModOptions` API.
2. Creates the button and modal DOM elements.
3. Adds the framework's CSS to the page.
4. Checks the current GameMaker room on each animation frame.
5. Shows the button only when the current room matches the Settings room.
6. Builds the registered controls when the menu opens.

The current Settings-room check uses the game's internal room asset reference `0x03000012`, along with `g_pBuiltIn.get_current_room()` and `YYASSET_REF()`. These are game-internal details and may need updating if the underlying game build changes.

The button is positioned relative to the game canvas with the DOM element ID `canvas`. If the canvas cannot be found, the room check may still work, but the button will not receive its intended position.

## 3. Installing the framework

### Public mod-builder installation

1. Open the [Retro Bowl Modded builder](https://craftyrobott.github.io/Retro-Bowl-Modded/).
2. Find **Retro Bowl Mod Options Framework** in the public mod list.
3. Select it.
4. Also select every mod that uses settings from this framework.
5. Continue to the installer and complete the offline installation.

The installer copies selected public JavaScript mods into the game's local `engine/mods/` directory. The framework must be included in the same game installation as any mod that depends on it.

If you update the public mod or add a new version, an existing offline installation does not automatically replace its cached files. Rebuild/reinstall using the updated selection.

### Manual installation

Copy `mod_options_menu.js` into:

```text
engine/
  mods/
    mod_options_menu.js
    your_mod.js
```

The framework needs to execute before a dependent mod tries to use the API. The current public filename is `mod_options_menu.js`; do not assume every loader or custom installation will execute it first. If the API is missing when a dependent mod starts, that mod should report the problem clearly rather than silently failing.

## 4. The global API

After the framework script has initialized, other mods can access:

```js
window.RetroBowlModOptions
```

The API currently exposes five methods:

| Method | Purpose |
|---|---|
| `register(definition)` | Adds a setting or section to the menu. |
| `get(id)` | Reads a setting's saved value, or its default if it has no saved value. |
| `set(id, value)` | Saves a value and calls that setting's `onChange` callback, if present. |
| `open()` | Opens the options dialog. |
| `close()` | Closes the options dialog. |
| `unregister(id)` | Removes a setting definition from the current menu. |

The API is also available without the `window.` prefix in ordinary browser scripts if the global name resolves in that script's scope. Using `window.RetroBowlModOptions` explicitly is recommended.

### Check that the framework is available

A dependent mod can guard against a missing framework:

```js
(function () {
  "use strict";

  var options = window.RetroBowlModOptions;
  if (!options) {
    console.error("[My Mod] Mod Options Framework is not installed or has not loaded yet.");
    return;
  }

  // Register this mod's settings here.
})();
```

## 5. Registering a setting

Every registration needs an `id` and a `type`.

```js
options.register({
  id: "my_mod_enabled",
  type: "toggle",
  label: "Enable My Mod",
  description: "Turns this mod's feature on or off.",
  default: true,
  onChange: function (enabled) {
    console.log("My Mod enabled:", enabled);
  }
});
```

### Definition fields

| Field | Required? | Meaning |
|---|---|---|
| `id` | Yes | Unique, stable identifier for this setting. Used by `get()`, `set()`, and `unregister()`. |
| `type` | Yes | One of the supported control types below. |
| `label` | No | Text displayed next to the control. |
| `title` | No | Fallback display text when `label` is not supplied. |
| `description` | No | Smaller explanatory text beneath the label. |
| `default` | No | Initial value used when no saved value exists. |
| `options` | Select only | Array of choices for a dropdown. |
| `min`, `max`, `step` | Numeric controls | Native HTML input bounds and increment. |
| `placeholder` | Text control | Placeholder text for a text input. |
| `buttonText` | Button only | Text displayed on an action button. |
| `onChange` | No | Function called when the setting value changes. |
| `onClick` | Button only | Function called when the action button is clicked. |

Use unique IDs for every setting across all installed mods. Prefix IDs with your mod name to avoid collisions, for example `fox_scorebug_show_clock` or `my_mod_enabled`.

## 6. Supported control types

### Toggle / checkbox

A boolean checkbox.

```js
options.register({
  id: "my_mod_enabled",
  type: "toggle", // "checkbox" works too
  label: "Enable feature",
  default: true,
  onChange: function (enabled) {
    // enabled is true or false
  }
});
```

### Dropdown / select

A dropdown menu. Choices can be plain strings or objects with `label` and `value` properties.

```js
options.register({
  id: "scorebug_position",
  type: "select",
  label: "Scorebug Position",
  description: "Choose where the scorebug appears.",
  default: "top",
  options: [
    { label: "Top", value: "top" },
    { label: "Bottom", value: "bottom" },
    { label: "Compact", value: "compact" }
  ],
  onChange: function (position) {
    console.log("Position:", position);
  }
});
```

The browser's select control returns its selected value as a string.

### Range / slider

A numeric range slider. Supply `min`, `max`, and optionally `step`.

```js
options.register({
  id: "scorebug_scale",
  type: "range", // "slider" is an alias
  label: "Scorebug Scale",
  default: 100,
  min: 50,
  max: 150,
  step: 5,
  onChange: function (scale) {
    // scale is a number
  }
});
```

### Number

A numeric input field.

```js
options.register({
  id: "quarter_length",
  type: "number",
  label: "Quarter Length",
  description: "Length in seconds.",
  default: 75,
  min: 30,
  max: 300,
  step: 15,
  onChange: function (seconds) {
    // seconds is a number
  }
});
```

### Text

A standard text input.

```js
options.register({
  id: "team_label",
  type: "text",
  label: "Custom Team Label",
  default: "MY TEAM",
  placeholder: "Enter a label",
  onChange: function (text) {
    // text is a string
  }
});
```

### Action button

A button that runs code. It does not represent a saved setting value.

```js
options.register({
  id: "reset_scorebug",
  type: "button",
  label: "Reset Scorebug",
  description: "Restore this mod's default display settings.",
  buttonText: "RESET",
  onClick: function () {
    console.log("Reset requested");
  }
});
```

### Section heading

A visual heading that groups related settings. It has no value and does not need a default.

```js
options.register({
  id: "my_mod_display_section",
  type: "section",
  label: "DISPLAY OPTIONS"
});
```

Supported type names in the current implementation are:

- `section`
- `toggle`
- `checkbox`
- `select`
- `range`
- `slider`
- `number`
- `text`
- `button`

## 7. Reading and changing values

Read a setting anywhere in your mod:

```js
var enabled = options.get("my_mod_enabled");
if (enabled) {
  // Run the feature.
}
```

Change a setting from code:

```js
options.set("my_mod_enabled", false);
```

Calling `set()` saves the new value and calls the registered setting's `onChange` callback, if one exists. It also refreshes the visible menu if it is currently open.

A useful pattern is to put the actual feature update in one function and call it both during initialization and whenever the option changes:

```js
(function () {
  "use strict";

  var options = window.RetroBowlModOptions;
  if (!options) {
    console.error("[Example Mod] Options framework is unavailable.");
    return;
  }

  function applyFeature(enabled) {
    if (enabled) {
      console.log("[Example Mod] Feature enabled");
      // Install or enable the feature here.
    } else {
      console.log("[Example Mod] Feature disabled");
      // Disable or restore the feature here.
    }
  }

  options.register({
    id: "example_mod_enabled",
    type: "toggle",
    label: "Enable Example Feature",
    default: true,
    onChange: applyFeature
  });

  // Apply the saved/default value on startup too.
  applyFeature(options.get("example_mod_enabled"));
})();
```

The framework does not automatically call `onChange` just because a setting was registered. A mod that needs to apply its saved value at startup should read it with `get()` and apply it itself, as in the example above.

## 8. Saving and persistence

Values are stored in the browser's `localStorage` under this key:

```text
retroBowlCollege.modOptions.v1
```

This means:

- Values survive page reloads and game restarts in the same browser profile, provided browser storage is retained.
- Values are local to that browser/device. They are not synced to GitHub or automatically shared with another device.
- Removing a mod does not automatically erase its saved values.
- Registering a setting with an ID that already has a saved value uses the saved value rather than overwriting it with the new default.
- Changing a setting through the menu or `set()` saves it automatically.

Keep IDs stable between mod versions if you want existing user settings to carry forward. Change an ID only when you intentionally want a separate setting.

## 9. Registration order and multiple mods

Each mod registers its own definitions. The framework keeps them in one shared list and renders them in registration order. Register a section before the controls that belong under it.

The framework replaces an existing definition if another registration uses the same ID. This is another reason IDs must be unique.

A dependent mod must not call `register()`, `get()`, `set()`, or `open()` before the framework script has initialized. Ensure the framework is selected and loaded before dependent mods. The current public file is named `mod_options_menu.js`; the repository's mod builder orders the displayed catalog by mod name, so do not rely on its current position to guarantee it runs first. If load order is a problem, the framework file should be given an explicit early-load convention (for example, a `00_` prefix) and the installer/loader should preserve that order.

## 10. Current built-in demo entries

The current framework source registers two demonstration entries:

- A section titled **MOD SETTINGS FRAMEWORK**.
- A text input titled **Framework status**, initially set to `Ready`.

These are only there to make the menu visibly demonstrate its rendering before other mods add real settings. The text field is editable; it is not a read-only status indicator. They can be removed from the framework source once the first real settings-enabled mods are ready.

## 11. Current limitations and things to know

This is the first version of the framework. Its current behavior has several limits:

- **Settings-room-specific:** The button is intended to appear only in the Settings room. It is not a general-purpose always-visible menu button.
- **Game-build-dependent room check:** The room asset reference and GameMaker globals are internal game details. A future game build may require a change.
- **Canvas positioning:** The button expects a game canvas with ID `canvas` and positions itself relative to that element.
- **Load order matters:** Dependent mods must execute after the framework.
- **No automatic feature logic:** The framework stores and displays values; each mod must implement what its settings do.
- **No schema validation:** The API checks that a registration has an ID and supported type, but it does not validate that values fall within the declared range or match a dropdown option when changed programmatically.
- **No automatic cleanup of saved values:** `unregister(id)` removes the setting from the current menu but leaves its saved value in `localStorage`.
- **No settings import/export UI:** Values are not currently packaged into a shareable configuration file.
- **Browser storage scope:** Clearing site data or using a different browser profile/device can remove or isolate saved settings.
- **Live testing:** The framework file has been uploaded to the repository, but the button's room detection, visual placement, and interaction still need confirmation in a running game.

## 12. Troubleshooting

### The MOD OPTIONS button does not appear

1. Confirm `mod_options_menu.js` is selected in the builder and included in the installed game.
2. Confirm the framework script executes without a console error.
3. Confirm the game is on its Settings screen.
4. Check whether the current build still exposes `g_pBuiltIn.get_current_room()` and `YYASSET_REF()`.
5. Check whether the game canvas is still named `canvas`.

The framework logs this message when its script initializes:

```text
[Mod Options] Framework loaded. API: window.RetroBowlModOptions
```

### A dependent mod says the API is missing

The framework did not execute before that mod. Include the framework in the same installation and correct the mod load order.

### A setting appears but does not change the game

The UI is only the control. Implement the feature logic in `onChange` and apply the current saved value once during startup.

### A setting keeps its old value after changing its default

That is expected when a saved value already exists for the same ID. Use a new ID for a deliberately new setting, or clear the old key/value from the browser's local storage during development.

---

## 13. Minimal starter template

Copy this into a new mod and replace the example ID, label, default, and callback:

```js
// @name My Settings-Enabled Mod
// @description Example mod using the shared Mod Options Framework.
// @category Utility
(function () {
  "use strict";

  var options = window.RetroBowlModOptions;
  if (!options) {
    console.error("[My Mod] Mod Options Framework is missing or loaded too late.");
    return;
  }

  function updateFeature(enabled) {
    // TODO: connect this setting to the actual mod behavior.
    console.log("[My Mod] Feature enabled:", enabled);
  }

  options.register({
    id: "my_mod_feature_enabled",
    type: "toggle",
    label: "Enable My Feature",
    description: "Turns the feature on or off.",
    default: true,
    onChange: updateFeature
  });

  updateFeature(options.get("my_mod_feature_enabled"));
})();
```

For a complete example, see the framework source: [`mods/mod_options_menu.js`](https://github.com/CraftyRobott/Retro-Bowl-Modded/blob/main/mods/mod_options_menu.js).
