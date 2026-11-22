# Retro Bowl Modded

A GitHub Pages-hosted mod selector for personal Retro Bowl College builds.

## GitHub Pages deployment

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`. In the repository settings, set **Pages → Build and deployment → Source → GitHub Actions**. Every push to `main` deploys the static site.

Expected site URL: https://craftyrobott.github.io/Retro-Bowl-Modded/

## Adding mods

Put each distributable JavaScript mod directly in the root `mods/` directory. The website reads that directory through GitHub's public Contents API and automatically lists every `.js` file. No catalog edit is needed.

Optional metadata can be added near the top of a mod file:

```js
// @name Friendly display name
// @description A short explanation shown in the selector.
// @category Gameplay
```

If metadata is absent, the selector creates a display name from the filename and uses a generic description. Use unique filenames because the filename (without `.js`) is the mod ID.

Only put files here that you intend to make public. The source development repository can remain private.

## Current limitations

- The website discovers mods and creates a configuration link.
- The install page currently displays the selected mod filenames; it does not yet package or run the game.
- The commercial Retro Bowl College game files are not included. They must be supplied separately and must not be committed to this public repository without appropriate rights.
- A complete offline installation still needs a local game package, a loader that applies only the selected mods, and offline storage/testing.
- The selector uses GitHub's public API, so mod discovery requires an internet connection. The static site shell itself is cached by its service worker after first visit.

## Local preview

Run `python -m http.server 8000` from the repository root and visit http://localhost:8000.
