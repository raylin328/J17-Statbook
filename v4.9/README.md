# Stat Book 4.9

## New

- **Substitutions.** Under the team tabs in a game, a strip shows who's on the
  court. Tap **Set lineup** (then **Subs**) and tap players to put them on or
  take them off. Every change is saved with the period and the game clock.
- **Any number on the court.** Five is usual, but refs miss a sixth player and
  teams play short, so the app shows the count ("6 on court") and never treats
  it as a mistake.
- **On court at a glance.** In the tap grid, players on the court have a dot
  and the bench is faded (still tappable, for fouls and technicals). Tiles
  view marks them the same way.
- **Minutes and plus/minus** in the box score, for any team whose lineup you
  tracked:
  - MIN is game-clock time on the court, so it needs the clock running. If the
    clock never ran, MIN shows a dash rather than a misleading 0:00.
  - +/- is points scored minus points allowed while the player was on. It
    doesn't need the clock.
- **The version is on screen:** in the header ("J17 Stat Book 4.9") and in the
  browser tab title.
- **Clear all players** replaces "Delete all players", and the button now sits
  at the top of the Players tab, next to import and export. It still offers a
  backup download and asks before clearing.
- **Players sheets with team headings import.** A sheet with a heading row per
  team ("Team 1", "U14 Rep", "House League") and its players underneath now
  imports with each heading as that team's category. It works with or without
  an id column. A plain list with no name header still gets the usual help.

## How minutes are counted

When the period changes, each lineup's time stops at the old clock and starts
again at the new one, so no time carries across periods. Changing a lineup
while the clock runs counts from that moment.

## Replaced

The v4.5 substitution helpers (never on screen, one team only, minutes by
whole periods) are gone, along with test-v45.js; test-v49.js covers the new
lineups.

## Compatibility

Same saved-data format (schema 3); lineups are stored with each game. Older
versions open 4.9 data and ignore the lineups.
