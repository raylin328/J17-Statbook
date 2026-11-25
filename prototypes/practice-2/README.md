# Practice prototype 2: a spreadsheet that knows basketball

A prototype, not a release. It saves to its own storage, so trying it never touches the Stat Book's data.

Open on the iPad: https://raw.githack.com/raylin328/J17-Statbook/prototype-practice-2/prototypes/practice-2/index.html

It opens with invented demo players and last week's sheet, so the comparisons show straight away
(Data → Start clean to begin empty, or Setup → Players → Import players from a Stat Book backup).

## What it is

Players down the side, drills across the top, free text in every cell, like a spreadsheet. On top of that:

- A big entry bar: tap a cell, type or use the keyboard mic; Enter saves and moves to the next player, Tab moves right, N/A in one tap.
- Every entry is read without needing to know the drill: "78 in 42.33s" → 78 · 42.33 s · 1.84/s; "8 right, 6 left"; "7/10" and "7 out of 10" → 70%; "19 1/3" → 19.33; "1:05.3" → 65.3 s; (notes in brackets); N/A = not done; level words (Advanced, ADV). The text is always kept as typed.
- Columns match by name across practices: each cell shows the change since last time and a ★ for a personal best; higher or lower is better per column.
- Stopwatch (drops the time into the cell), 30 and 60 s countdowns with a beep.
- New practice starts with last practice's columns; ＋ Column suggests every name used before.
- Player history: every column, practice by practice, with best and a trend line.
- Every keystroke saves; Undo; a reload returns to the same cell.
- Import a sheet (CSV) as a practice; export the sheet as seen, one row per entry with the numbers read out, or a full backup.
