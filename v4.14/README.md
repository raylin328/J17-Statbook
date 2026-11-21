# v4.14

Live at https://raylin328.github.io/J17-Statbook/v4.14/ (the latest folder is the same build).

Quick fixes for practices, ahead of the bigger practice redesign planned for v5.

## Nothing typed is lost

- **The one-value list (everyone's result for a drill) saves as you go.** A level saves on the tap, a number as it's typed, and a note goes onto the same result. The Save results button is gone.
- **What you typed stays in its row** when you switch to another drill and back, reload, or Safari closes. Changing a value updates the same result instead of adding a second one; clearing it removes the result.
- **Impossible values are held back with the reason** (for example "can't be more than 10") and stay in the row to fix.
- **A note typed before a result is kept** and saves as soon as the result is entered.
- **Start another round** clears the rows for a second try; the saved results stay in the list below.
- **Group and multi-stage drills** (picked players, stage values, the note) keep their draft per drill, so switching drills mid-entry loses nothing.

In v4.13 the one-value list held results in memory until Save results was tapped, so switching drills or closing Safari first lost them without a warning.

## Results CSV

One row per player per value: practice stats and drill attempts together, with the date, practice, time, drill, area, stage, measure, player, jersey, who else was in the group, the value, its "out of", unit, and the note. Ready for a spreadsheet or for analysis.

- **Export results CSV** on a practice's Box score
- **Results CSV** on each practice in Sessions
- **All practice results (CSV)** at the top of Sessions: every practice in one file

## Finding things during practice

- **Find a player:** a search box above the players (name, jersey number or nickname). It filters the player grid and the one-value list together, and keeps the keyboard up while you type, so the iPad mic works too.
- **Sort players:** Practice order, A–Z, or jersey number. The choice is remembered.
- **Find a drill:** a search box above the drills (name, area or description). Hyphens and spaces count the same, so "free throw" finds "Free-throw accuracy".
- **A–Z drills:** sorts the drills alphabetically inside each area.

## Level: Beginner to Elite for practice stats

A custom practice stat can now be a **Level** (Stats tab → Add a custom stat → Level). One tap on a word records it, saved as the word and never averaged; the grid shows the latest level (BEG, INT, AVG, ADV, ELT). It uses the same five words as drill ratings.

## Tests

1,171 checks in 20 files (64 new in `tests/test-v414.js`), plus `browser-check.js` (27 layout checks).
