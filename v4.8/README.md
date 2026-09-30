# Stat Book 4.8

## New

- **Import your drills.** On any practice, tap **Import drills CSV** and pick
  your `drills.csv`. It can be exported from a sheet as CSV, or pasted as
  tab-separated text. Re-importing never duplicates: drills are matched by id,
  or by name, and existing drills only get their blanks filled.
  **Export drills CSV** writes the same format back out.
- **Four measures.** Every drill (and every station of a combine) is one of:
  - time: seconds, lower is better unless the drill says otherwise
  - count: a whole number, optionally within a time limit (makes in 60 s)
  - makes: makes out of a set number of shots (7/10)
  - rating: Beginner, Intermediate, Average, Advanced or Elite
- **Ratings are words, not numbers.** They're stored and exported as the word.
  The order is used only to sort and to see whether someone moved up or down;
  ratings are never averaged. BEG/INT/AVG/ADV/ELT are the short forms, and
  imports accept either form in any case.
- **The whole group in one pass.** For one-value drills, the practice screen
  lists every player with the five level buttons (for ratings) or a number box
  (for everything else). Fill in who ran it, then tap **Save results** once.
- **Notes on every attempt.** Each player's row, and every combine or group
  attempt, has a note box. Notes show in the attempts list and in the CSV.
- **Combines and group drills** still use pick players, enter each station,
  **Record attempt**, now with the right input for each station.

## Checks

- Makes can't exceed the number of shots, and counts and makes must be whole numbers.
- A bad row in the drills file skips only its own drill; the report lists the
  row number and the reason.
- In a combine, stage numbers must run 1, 2, 3 in order.

## Compatibility

Same saved-data format (schema 3). Drills recorded before 4.8 keep working;
the app works out their measure from their unit. Older versions still open 4.8
data but show ratings as plain text.

## Not yet

- Report card views for drills: latest rating, change since the first one,
  best times.
- Substitutions and minutes played (next).
