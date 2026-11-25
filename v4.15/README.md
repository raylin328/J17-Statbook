# v4.15

Live at https://raylin328.github.io/J17-Statbook/v4.15/ (the latest folder is the same build). Everything in v4.14, plus:

## Opponents survive the spreadsheet files

Opponent teams and their players are kept apart from your roster (since v4.10). The full backup (JSON) always
carried them; the spreadsheet files (Sessions → Export CSVs) now bring them back too.

- **opponents.csv is read back** by Import CSVs: each opponent keeps their id, team, number, name and
  description, so old games and their stats find them again. Re-importing only fills in blanks.
- **opponents.csv is never read as players.csv.** Before, its id and name columns made the import treat it as
  a roster file, which would have put the other team's players on your roster.
- **sessions.csv keeps which opponent team each side was:** two new columns at the end, `team1_opp` and
  `team2_opp`. Older sessions.csv files without them link by team name, when every player on that side is
  one of that team's opponents.
- Import sessions.csv without opponents.csv and the opponent team is still made from the game's row; import
  opponents.csv later and its players join that same team.

Where opponents go out:

| Export | Opponents |
|---|---|
| Full backup (JSON) | everything |
| Export CSVs (Sessions → Spreadsheet files) | `opponents.csv`, and the team link in `sessions.csv` |
| Export opponents CSV (Players → Opponents) | `opponents.csv` |
| Players CSV (your roster) | no, on purpose |
| One game's CSV (Box score) | names on the box score only |

## Tests

1,193 checks in 21 files (23 new in `tests/test-v415.js`), plus `browser-check.js` (27 layout checks).
