# Public mods folder

Add only mods you intend to publish.

- JavaScript mods: put `.js` files in this folder (subfolders are also discovered).
- Supporting files: preserve the relative folder structure under this folder. For example, put field images in `mods/fields/` and text overrides in `mods/data/`.
- At install time, selected JavaScript files are copied into the local game path `engine/mods/`. Non-JavaScript files in this folder are copied alongside them, preserving their paths.
- Mod metadata is optional and can be placed in the first 50 lines:

```js
// @name Display name
// @description Short description shown in the installer
// @category Gameplay
```

The installer discovers mods from this repository automatically. Do not put the original game engine or game assets in this folder.
