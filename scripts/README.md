# generate-uuids.js

Makes UUID v4 ids for the Stat Book, the same kind the app creates itself.
Needs Node 16 or later and nothing else.

```bash
node generate-uuids.js 20 players > players-template.csv   # a players.csv to fill in
node generate-uuids.js 10                                   # ten ids, one per line
node generate-uuids.js 10 json                              # a JSON array
```

The players template has the same columns the app exports:

```
id,name,jersey number,category,desc,aliases,notes
3022b76b-b077-4dcd-81f8-b3caa688616f,,,,,,
```

Fill in a name (and a category such as `U14 Rep`) on the rows you need. Rows
left with only an id are skipped on import, so extra rows do no harm.

## You usually don't need this

The app makes an id for any player imported without one. The report after the
import tells you how many it made; export the players CSV and copy its `id`
column back into your sheet so later imports match those players exactly.

## Rules for ids

- An id belongs to one player forever. Never give an existing player a new id:
  their stats are linked by it, and a new id would orphan them.
- Ids are plain UUIDs, with no `p_` or `s_` prefix.
- Only data is printed to standard output, so `> file.csv` gives a clean file.
  Messages go to standard error.

## Changes in v4.6

The earlier version of this script added `p_`/`s_` prefixes (so its ids weren't
UUIDs), printed a banner and usage notes into redirected files, filled template
rows with the placeholder `PLAYER_NAME` (which would have been imported as a real
player), and had a sessions template whose dates the app read as 1970. All four
are fixed; the sessions template is gone, since sessions are created in the app.
The old three-argument form, such as `node generate-uuids.js 20 players player`,
still works.
