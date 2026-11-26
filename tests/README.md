# Stat Book tests

1,238 checks in 22 files. Needs Node 22 or later (jsdom 30). Each file loads the app in a simulated browser (jsdom)
and drives it through its own functions and buttons.

## Run

```bash
cd tests
npm install
npm test                                   # tests ../latest/index.html
STATBOOK=../v4.6/index.html npm test       # or any build
node test-v46.js                           # one file
```

## Files

| File | Checks | Covers |
|---|---|---|
| test-regress.js | 62 | players, a full game, practice drills, box score, v1 migration |
| test-grid.js | 40 | tap grid, tiles, view switch |
| test-csv.js | 29 | CSV export/import round trips |
| test-custom-stats.js | 21 | stats you define yourself |
| test-v41.js | 108 | typed stats, shot chart, misses, game clock, file formats |
| test-v42.js | 43 | jersey numbers, filling blanks on re-import, compatibility with v4.1 |
| test-v43.js | 18 | iPad file picking, screenshots and PDFs refused |
| test-v44.js | 4 | Excel detection |
| test-v46.js | 96 | categories, smart import, input checks, markup safety, delete all, v4.5 compatibility |
| test-v47.js | 75 | drill catalog, group and multi-stage attempts, caps, drills and attempts CSV |
| test-v471.js | 49 | possessions and points per possession, O/D rebound split, one-time upgrade |
| test-v48.js | 63 | drills import (the real drills.csv), time/count/makes/rating, notes, one-pass entry, export round trip |
| test-v49.js | 56 | lineups of any size, minutes across periods and pauses, plus/minus, version on screen, Clear all players, team-heading imports (replaces test-v45) |
| test-v410.js | 71 | opponent teams and players across games, new player wearing, merge, Team rows, add-player panel, quick edit |
| test-v411.js | 50 | drill catalog of 200 with 60 on, on/off switches, areas and collapsible sections, 102-skill import, area column round trip, CSV-only picker |
| test-v412.js | 89 | free throw misses and the one-time upgrade, on-court players first, bench header, sticky header hooks, turnover and block spots, assist pairing, assist_for in the events CSV |
| test-v4122.js | 65 | full court: the two coordinate frames and the mapping between them, the Full court switch in all three places, tap-to-spot on the lying-down court, chart views on full and half court, the court column in the events CSV |
| test-v413.js | 155 | shot zones: which spot is which zone, the angle bands, distance and angle, left/right mirroring, the tally, the Zones tab (map, table, angles, dots, tap-to-name), games and filters, the zone in the toast and the log, the shots CSV, the link from the box score, the sticky-header rule |
| test-v414.js | 63 | autosaved one-value list, drafts across drills and reloads, results CSV, find a player or drill, A–Z and jersey sorts, the Level type |
| test-v415.js | 22 | opponents.csv read back (never as players.csv), the team link in sessions.csv |
| test-v416.js | 46 | drag to rearrange: the order rules for every list, where the handles are and aren't, a handle tap isn't an item tap, redraws wait for a drag to end, the order is saved |
| sample-data-test.js | 12 | a season in miniature, end to end |

`fixtures/` holds a fictional 20-player roster and three older builds (v4, v4.1,
v4.5) used to prove that older versions still open newer data. Every version
folder on the site shares one browser storage, so this matters.

## Privacy

All names in these files are fictional. Keep real rosters out of this folder.

## Browser checks

`browser-check.js` is separate from `npm test`. jsdom has no layout, so the files above can't tell where
anything lands on a screen. This one opens the app in real Chromium at phone, iPad portrait and iPad
landscape sizes (27 checks):

- the game grid's header row sits at the top of the grid and never covers a row of cells;
- the header sticks under the scoreboard when the grid fits the screen, and scrolls away when it doesn't;
- the zone map's drawn shapes agree with `zoneAt()` at 37,600 points (a handful right on a boundary may
  differ, because outlines are drawn to a tenth of a unit);
- the Zones tab is no wider than the screen.

```bash
node browser-check.js        # needs Playwright with Chromium; it skips itself if Playwright is missing
```

It was added after v4.12 and v4.12.2 shipped a grid header that covered the third row of cells on a phone.
The jsdom suite passed both times, because it can't see that. Run this whenever a change touches layout.

## Drag checks

`drag-check.js` is also separate from `npm test`. It drags every reorderable list in real Chromium at iPad
landscape size, once with a mouse and once with a finger (44 checks): the game grid inside the court and
inside the bench (and never across), tiles, practice players, the one-value drill list, areas, drills, the
roster a long way down with the page scrolling, categories (Miscellaneous stays last) and stats. It also
checks that a drag never selects, opens or switches anything, that the order survives a reload, and that no
page scrolls sideways.

```bash
node drag-check.js           # needs Playwright with Chromium; it skips itself if Playwright is missing
```
