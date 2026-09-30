# Stat Book 4.7

## New

- **Group and multi-stage drills.** One attempt, one entry, however many
  players share it. 3-Man Weave records three players and one time in one
  tap; Defender-to-Shot records one player with beat/sprint/shoot times as
  three separate values in one attempt. The whole point: for practices, this
  is the shape a spreadsheet handles badly.
- **Drill catalog.** Seeded with 3-Man Weave, Defender-to-Shot, and the
  earlier practice measurements (vertical jump, full-court sprints, lane
  agility, free throws /10) as solo drills. Standard drills use fixed ids so
  they mean the same thing in the app and in an export.
- **Per-session attempts list** on the practice view: each drill attempt
  shows its drill, participants, and the value (or stage-by-stage values)
  with units. Remove any attempt with one button.
- **CSV export includes drills and attempts.** `drills.csv` has a row per
  drill (per stage for multi-stage drills). `attempts.csv` has a row per
  attempt per stage — the participants stay together in a `|`-joined column
  so a group of three round-trips as one attempt.
- Caps: a drill has at most 4 stages and at most 5 participants; an attempt
  therefore holds at most 20 values. Kept low on purpose — beyond that,
  what's being recorded is a game scenario, not a drill.

## Also in v4.6 (carried forward)

Categories (every player and session in exactly one), one-tap session picker,
smart imports that recognise column headers in any order, delete-all-players
with a backup, formula and jersey checks on typed input.

## Compatibility

Same saved-data format (schema 3). v4.6 and earlier still open data saved by
4.7: they don't see the drill catalog or attempts, but nothing they use is
touched. A v4.7 export of players.csv is byte-compatible with v4.6.

## Bringing it in on a practice

1. Start a practice as usual (Sessions → new).
2. On the practice view, scroll past the solo drills to
   **Group and multi-stage drills**.
3. Tap a drill (3-Man Weave, say), tap the three players, type the time,
   Record attempt. Repeat for the next trio.

## Not yet

- Editing an attempt after saving (remove and re-record instead).
- Drill categories or search in the picker.
- Analytics: fastest trio for a drill; per-player progression across weeks.
- The SQL side: 01-base.sql and 02-v46-categories.sql still apply, but the
  drill schema for arrays of participants and values will come next.
