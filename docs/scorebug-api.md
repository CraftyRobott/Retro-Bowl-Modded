# Retro Bowl Scorebug API

The shared scorebug API provides normalized live game data to broadcast overlays and scorebug mods. Install **00_scorebug_api.js** alongside any scorebug that uses it. The **00_** prefix makes it load before other mods when the mod loader sorts files alphabetically.

## Basic usage

The API is available at **window.RBScorebug**.

~~~js
const game = window.RBScorebug.getState();
if (!game) return;

console.log(game.away.score, game.home.score);
console.log(game.game.quarter, game.game.clock);
console.log(game.game.downDistance);
~~~

For live updates, subscribe instead of creating another Retro Bowl game hook:

~~~js
const unsubscribe = window.RBScorebug.subscribe(function (game) {
  document.querySelector("#away-score").textContent = game.away.score;
  document.querySelector("#home-score").textContent = game.home.score;
  document.querySelector("#clock").textContent = game.game.clock;
  document.querySelector("#down-distance").textContent =
    game.game.downDistanceDisplay;
});

// Call unsubscribe() when your overlay is removed.
~~~

Subscribers receive an immediate snapshot when one is already available. The callback runs again when the normalized state changes. Callback errors are isolated so one broken overlay cannot stop other subscribers.

## State reference

| Path | Type | Description |
|---|---|---|
| away.name, home.name | string | Full team display names |
| away.abbreviation, home.abbreviation | string | Team abbreviation / short mark |
| away.mascot, home.mascot | string | Team short mark (currently same source as abbreviation) |
| away.score, home.score | number | Current score |
| away.rank, home.rank | string | Ranking number, or empty string |
| away.record, home.record | string | Season record, or empty string |
| away.color, home.color | string | Primary team color as hex |
| away.logo, home.logo | string | Logo URL, or empty string |
| away.possession, home.possession | boolean | Whether that team has possession |
| away.timeouts, home.timeouts | number | Available timeouts |
| game.quarter | string | Formatted quarter label |
| game.quarterNumber | number | Numeric quarter |
| game.clock | string | Game clock formatted as M:SS |
| game.playClock | string | Empty when the game does not expose a reliable play clock |
| game.down | number | Current down |
| game.yardsToGo | number or null | Raw yards-to-go value |
| game.yardLine | number or null | Game's raw yard-line coordinate |
| game.downDistance | string | Native Retro Bowl down-and-distance text (for example, 4th & Inches) |
| game.downDistanceDisplay | string | Compact presentation value: Goal becomes 1st; Inches becomes 1st & 1 |
| game.overtime | boolean | Whether the game is in overtime |
| game.overtimeRound | number | Overtime round |
| game.possession | string | away, home, or none |
| game.kickoffActive | boolean | Whether the game is in a kickoff state |

The API intentionally exposes both native and compact down/distance text. Use **downDistance** when you want the game's wording; use **downDistanceDisplay** when you want the compact broadcast treatment.

## Methods

- **getState()** — returns the latest state snapshot, or null before the first live game update.
- **subscribe(callback, options?)** — registers a callback and returns an unsubscribe function. Pass { immediate: false } to suppress the initial callback.
- **update(inst, other)** — advanced/manual update method. Normal scorebug mods should use subscribe(), not call this themselves.
- **isReady()** — returns whether a live snapshot is available.
- **formatDownDistance(nativeText, down)** — applies the compact Goal/Inches display treatment.

## Minimal mod template

~~~js
// @name My Custom Scorebug
// @description Example consumer of the shared scorebug API.
// @category presentation
(function () {
  "use strict";

  function start() {
    if (!window.RBScorebug) {
      console.error("[My Scorebug] RBScorebug API is missing. Install 00_scorebug_api.js.");
      return;
    }

    window.RBScorebug.subscribe(function (game) {
      // Render your HTML, canvas, or DOM scorebug from this snapshot.
      // No direct GameMaker variables or scoreboard hook is needed here.
      renderScorebug(game);
    });
  }

  function renderScorebug(game) {
    // Your design-specific rendering code goes here.
  }

  start();
})();
~~~

## Compatibility

- API version currently: 1.0.0.
- The API uses one shared native scoreboard hook and distributes plain JavaScript snapshots.
- Scorebug consumers should not overwrite gml_Script_s_draw_scoreboard just to read game data.
- The FOX CFB scorebug uses the API when present and retains its previous reader as a fallback.
- Optional data can be empty or null; consumers should handle missing logos, records, ranks, and play-clock values.
