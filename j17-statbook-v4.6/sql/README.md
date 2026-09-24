# Database (PostgreSQL 13 or later)

Run in this order on a new database:

```bash
psql -d j17 -f 01-base.sql
psql -d j17 -f 02-v46-categories.sql
psql -d j17 -f test-categories.sql                      # optional checks; changes nothing
psql -d j17 -f 03-load-players.sql < players-2026-09-24.csv
```

- **01-base.sql**: the original schema (organizations, players, practices,
  drills). Only change: its example query now uses a fictional name.
- **02-v46-categories.sql**: age groups become categories. Every player and
  session is in exactly one; the column default is Miscellaneous, which can't
  be deleted or renamed; removing another category moves its players to
  Miscellaneous. Jerseys stay text ("0" and "00" differ) and blank is NULL.
  Safe to run twice.
- **03-load-players.sql**: loads the app's players export with the app's own
  rules: new players are added, existing ones only get their blanks filled.
  Players from before v4.2 have short ids like `p1`; `j17_uuid()` gives each a
  UUID, the same one on every load.

The games extension (`j17-schema-games.sql`) is not included. It re-created
`game_sessions`, and its minutes-played and possessions views referred to
columns that don't exist, so it never ran. It will come back with the
substitution screen.

Tested on PostgreSQL 16.
