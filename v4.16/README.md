# v4.16

Live at https://raylin328.github.io/J17-Statbook/v4.16/ (the latest folder is the same build). Everything in v4.15, plus:

## Drag to rearrange, everywhere

Every list you keep in your own order now has a handle (≡). Press the handle and drag. Tapping the rest of
the item does what it always did, and tapping the handle by itself does nothing, so you can't set off a stat
or open an editor by accident.

| Where | What you can drag | Notes |
|---|---|---|
| Game, tap grid | player rows | Inside the court group or inside the bench, never across (subs still do that). The Team row stays where it is. |
| Game, tiles | player tiles | Same order as the grid. |
| Practice, player tiles | players | In Practice order only. While the list is A–Z, by jersey, or narrowed by a search, the handles hide. |
| Practice, one-value drill list | player rows | The same order as the tiles. Results you've typed stay with their player. |
| Practice, Manage drills | drills inside an area, and the areas themselves | Areas keep your order even with drills A–Z. Drill handles hide while drills are A–Z. |
| Players | players inside their category | Each category is its own list. |
| Players, Categories | categories | Miscellaneous always stays last. |
| Stats | stats inside In game and inside Practice | The game order is the tap grid's column order. |

- **Lineup at the top, subs at the bottom:** the grid already puts players on the court first. Now you
  choose the order inside each group, and it lasts through subs.
- **Long lists scroll by themselves.** Hold the item near the top (just under the scoreboard) or the bottom
  of the screen and the page keeps scrolling, faster the closer you are to the edge.
- **Saved straight away**, like everything else. The order goes into the backup and the CSV files the way it
  did before (sessions keep their players in order; the roster, stats and drills keep theirs).
- Works with a finger, Apple Pencil or a mouse.

## Tests

1,238 checks in 22 files (46 new in `tests/test-v416.js`), plus `browser-check.js` (27 layout checks) and
the new `drag-check.js` (44 checks: real drags in Chromium at iPad landscape size, with a mouse and with a
finger).
