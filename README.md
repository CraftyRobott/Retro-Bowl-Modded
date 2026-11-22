# Retro Bowl Modded

A mod-selection frontend for creating personal Retro Bowl College web-app installations.

## Current milestone

- Responsive mod selector using the real mod catalog from [CraftyRobott/RetroBowl_mods](https://github.com/CraftyRobott/RetroBowl_mods).
- Ten current root-level mods listed with their filenames and known companion assets.
- Selection is encoded into a shareable configuration URL.
- Configuration receipt page displays the selected mods.
- Initial PWA shell and service-worker caching for the configurator.

## Important: game installer is not connected yet

The current site **does not generate or launch a playable game**. The install page is a configuration receipt only. The next milestone needs to:

1. Integrate a game build in a way that does not publish proprietary game files in this public repository.
2. Package the selected mod JavaScript and all required data/image assets into each build.
3. Change the game loader to read a fixed selected-mod manifest instead of discovering every JavaScript file.
4. Cache all game resources locally on first install and verify offline launch.
5. Audit the game and mods for runtime network requests.

The website itself is not the game. Do not put commercial game assets in this public repository.

## Catalog and dependencies

The catalog is in `mods/catalog.json`. Data-driven mods currently list these companion assets:
- College Competitions: `data/competitions_co.txt`
- Conference Override: `data/conferences_co.txt`
- Custom iOS Fields: `fields/40.png`
- College Team Data: `data/Teams_CO.txt`
- Default College Uniforms: `data/uniforms_default_CO.txt`

The custom-field mod references a specific field image; confirm the complete team/image mapping before packaging.

## Local preview

Run `python -m http.server 8000` from the repository root and visit http://localhost:8000.
