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
