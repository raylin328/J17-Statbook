# Stat Book tests

443 checks in 11 files. Each file loads the app in a simulated browser (jsdom)
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
| test-v44.js | 1 | Excel detection |
| test-v45.js | 13 | substitution helpers (no screen yet) |
| test-v46.js | 96 | categories, smart import, input checks, markup safety, delete all, v4.5 compatibility |
| sample-data-test.js | 12 | a season in miniature, end to end |

`fixtures/` holds a fictional 20-player roster and three older builds (v4, v4.1,
v4.5) used to prove that older versions still open newer data. Every version
folder on the site shares one browser storage, so this matters.

## Privacy

All names in these files are fictional. Keep real rosters out of this folder.

## Known gap

`minutesPlayed()` from v4.5 is not tested because its numbers are wrong: it
treats periods as minutes and assumes a 5-minute game. Nothing in the app calls
it yet; it will be rebuilt with the substitution screen.
