# Retro Bowl Modded

A mod-selection frontend for creating personal Retro Bowl College web-app installations.

## Current status

This is the first website scaffold:
- Responsive mod selector UI.
- Catalog-driven mod list in `mods/catalog.json`.
- Build configuration URL generation.
- Initial service-worker shell cache.

## Important integration work still required

1. Verify the current contents and exact paths of the private `CraftyRobott/RetroBowl_mods` repository, then populate the catalog with every supported mod and its real filename/metadata.
2. Add a private distribution/build pipeline for the game files. Do **not** commit commercial game files to this public repository.
3. Implement the `/install/` flow that fetches the selected mod files during first installation, stores them locally (IndexedDB/Cache Storage), and starts the game from local assets.
4. Update the game loader to use the frozen selected-mod manifest instead of directory auto-discovery.
5. Ensure gameplay code makes no network requests and verify offline launch after installation.

The public repository contains only the website shell and catalog. Keep game assets and any files you are not licensed to redistribute out of this repository.

## Local preview

Serve this folder over HTTP (not `file://`), for example:

```sh
python -m http.server 8000
```

Then open http://localhost:8000.
