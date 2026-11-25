# Retro Bowl Modded

A GitHub Pages mod selector and browser-based offline installer prototype.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys this repository to:

https://craftyrobott.github.io/Retro-Bowl-Modded/

Set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** once.

## Add community mods

Add `.js` files under `mods/`. Subfolders are supported. Add optional metadata comments:

```js
// @name Display name
// @description Short description
// @category Gameplay
```

Put supporting files alongside the mods under `mods/data/`, `mods/fields/`, or another subfolder. At install time, selected JS files and non-JavaScript support files are downloaded into the local game folder under `engine/mods/`.

### Import a local mod folder

The builder also has a **Choose mod folder** control. Select a folder containing at least one `.js` file and any images, audio, JSON, or other files it needs. The importer preserves relative paths and stores the folder in this browser's IndexedDB. The offline installer then copies every file into the installed game cache under `play/engine/mods/custom/<id>/`; the custom folder does not get uploaded to this repository.

Limits: up to 10 custom folders, 25 MB per folder, 300 files per folder, and 2 MB per JavaScript file. Import the folder again on each device where you want to install it.

During a mod's synchronous startup, the loader exposes an asset namespace for that mod. Capture it at the top of the mod script so it remains available to later callbacks:

```js
const assets = window.RetroBowlModAssets.current;
const field = new Image();
field.src = assets.getURL("assets/fields/classic.png");
```

The path is relative to the folder containing that mod's JavaScript file. The namespace also provides `assets.loadImage(path)` and `assets.fetch(path)`.

Only commit mods you intend to publish. Your private development repository remains separate.

## Game installation

The installer downloads the HTML5 game files from the public source repository `ReznorsRevenge1/retro-bowl-college` directly into each visitor's browser Cache Storage. Game files are not copied into this repository. The upstream file list is pinned in `game-manifest.json` to a specific revision for repeatable installs.

The local game wrapper uses a no-op Poki SDK stub and starts GameMaker directly. The service worker serves the cached game files from `/play/`, so gameplay does not need a network connection after a successful installation.

**Rights note:** the upstream repository currently has no declared license. Public visibility does not itself grant permission to make offline copies or redistribute game content. Obtain permission from the relevant rights holder before promoting or distributing this installer.

## Offline and iOS notes

- Keep the installer open until all files finish downloading.
- Add the installed game page (`/play/`) to the iPhone Home Screen for a direct launch icon.
- Browser storage can be evicted by iOS. The installer requests persistent storage where supported, but no browser-only solution can guarantee that iOS will never remove cached data.
- Reinstall while online if local files are removed.
- This is a prototype; test a complete install and launch with Airplane Mode enabled before relying on it.

## Local preview

Run `python -m http.server 8000` from the repository root and visit http://localhost:8000.

## Shared scorebug API

The repository includes a shared live-game data API for broadcast overlays: **mods/00_scorebug_api.js**. Install it alongside scorebug mods to expose team names, scores, clock, quarter, down/distance, possession, timeouts, colors, logos, records, and rankings through **window.RBScorebug**. New scorebugs can subscribe to updates instead of creating their own hooks into Retro Bowl's internal functions.

See [the Scorebug API reference](docs/scorebug-api.md) for the state schema, methods, and a starter example. The FOX CFB scorebug uses the API when it is installed and retains a legacy fallback.

## Shared mod options framework

The repository includes a shared HTML/CSS settings menu for mods: **mods/mod_options_menu.js**. It adds a **MOD OPTIONS** button to the game's Settings screen and exposes **window.RetroBowlModOptions** so other mods can register toggles, dropdowns, sliders, number/text inputs, sections, and action buttons. Settings are saved locally in the browser.

See [the Mod Options Framework guide](docs/mod-options-framework.md) for installation, API methods, setting definitions, examples, load-order requirements, persistence, and troubleshooting.
