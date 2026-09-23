# J17 Stat Book — Test Suite

All tests are automated and use **fictional sample data with no PII**. Run them to verify the app works correctly.

## Running Tests

```bash
# Install dependencies (one time)
npm install jsdom

# Run all tests
npm test

# Run a specific test
node test-regress.js
node test-v45.js
node sample-data-test.js
```

## Test Files Overview

### Core Regression Tests

**test-regress.js** (62 checks)
- Player registration and aliases
- Game sessions and team setup
- Scoring (2P, 3P, 1P) and point calculation
- Undo/redo functionality
- Box score and reconciliation
- Session history and restore from JSON

*Use this as the baseline.* If this fails, something fundamental is broken.

---

**test-grid.js** (40 checks)
- Tap grid view (one-tap-per-stat entry)
- Tile view (player cards)
- View preference persistence
- Minus mode (removing incorrect entries)
- Grid cell math and stat totals

---

**test-csv.js** (29 checks)
- Export to CSV (players, sessions, events)
- Re-import and verify no duplicates
- Quoted fields (commas, quotes, line breaks in data)
- Excel-style line endings (CRLF)
- Byte-order marks (BOM)
- Backward compatibility (old CSV format imports correctly)
- Orphan event detection

*Run this if you're worried about data loss during export/import.*

---

**test-custom-stats.js** (21 checks)
- Add a custom stat from the Stats tab
- Record an entry under it
- Export and re-import the custom stat
- Report card shows custom stats

---

**test-v41.js** (108 checks)
- **Data types:** integer, float, time, boolean, text, scale
- **Input widgets:** number box, yes/no buttons, stopwatch, slider, text field
- **Shot chart:** place shots on half-court, filter by team/player, FG%
- **Game clock:** start/stop, set time, period changes, reload mid-game survives
- **Schema migration:** v2 data auto-upgrades to v3 with types applied
- **CSV compatibility:** v4.1 format validates

*This is the biggest test file. Run if you're concerned about data types or shot tracking.*

---

**test-v42.js** (43 checks)
- **UUID v4 generation:** crypto-random IDs for players, sessions, events
- **Jersey numbers:** import from sheet, display on bench, export/re-import
- **Fill-blanks import:** re-importing adds missing data without duplicating
- **v4.1 compatibility:** v4.2 files work in v4.1 (backward compatible)

---

**test-v43.js** (18 checks)
- **No file-type filters:** picker accepts any file, identifies by content
- **Excel detection:** `.xlsx` files detected by magic bytes
- **Mixed file import:** pick multiple CSVs; images/PDFs ignored with message
- **Binary rejection:** screenshots and PDFs show clear "not a CSV" error

---

**test-v45.js** (14 checks)
- **Substitution tracking:** `recordSub()` logs player in/out with time
- **Current lineup:** `currentLineup()` reflects subs mid-game
- **Minutes played:** `minutesPlayed()` calculates total time per player
- **Non-standard lineups:** 3v3, 4v4, or fewer players supported
- **Multiple subs:** sequence of subs handled correctly

*New in v4.5. Run this if substitutions or minutes aren't working.*

---

### Sample Data Test

**sample-data-test.js** (10 checks)
- Initialize app with **fictional players** (Alex Chen, Bailey Rodriguez, etc.)
- Record practice drills (sprints, vertical jump, agility)
- Record game stats (scoring, assists, rebounds)
- Test substitutions and minutes (v4.5)
- Verify CSV export works
- Demonstrate data persistence

**Use this to:**
- See how the app works with realistic data
- Understand the data flow from input to storage
- Verify export/import with non-trivial data
- Demo to others (all data is fictional)

---

## Test Coverage Summary

| Feature | Tests | Status |
|---------|-------|--------|
| Player registration | 10 | ✅ |
| Game scoring | 15 | ✅ |
| Undo/redo | 5 | ✅ |
| View switching | 10 | ✅ |
| CSV round-trip | 29 | ✅ |
| Custom stats | 21 | ✅ |
| Data types | 50 | ✅ |
| Shot chart | 30 | ✅ |
| Game clock | 15 | ✅ |
| UUIDs & jerseys | 43 | ✅ |
| File type detection | 18 | ✅ |
| Substitutions (v4.5) | 14 | ✅ |
| **TOTAL** | **335** | **✅** |

---

## Running Specific Scenarios

### "Does the app handle bad CSV files?"
```bash
node test-v43.js
```

### "Can I track multiple teams?"
```bash
node test-regress.js
```

### "Do custom stats survive export/import?"
```bash
node test-custom-stats.js
```

### "Will my old data migrate to new versions?"
```bash
node test-v41.js
node test-v42.js
```

### "Does the app work with real-looking data?"
```bash
node sample-data-test.js
```

---

## Adding Your Own Tests

If you modify the app, add a test:

1. Create `test-vX.js` (replace X with next version)
2. Use the template from `test-v45.js`
3. Use **fictional names** — never real PII
4. Add to `npm test` in `package.json`

Example fictional data:
```javascript
const samplePlayers = [
  { id: "p001", name: "Alex Chen", num: "1", active: true },
  { id: "p002", name: "Bailey Rodriguez", num: "2", active: true },
  { id: "p003", name: "Casey Johnson", num: "3", active: true }
];
```

---

## CI/CD Integration

These tests are designed to run in GitHub Actions or similar CI:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install jsdom
      - run: npm test
```

Every commit runs all 335 tests. If any fail, the CI job fails and you're notified.

---

## Troubleshooting

**Tests fail: "jsdom not found"**
```bash
npm install jsdom
```

**Tests hang or take forever**
- Probably one test is stuck. Look for infinite loops or missing `process.exit()`.

**Test output is hard to read**
```bash
# Run one test and pipe to a file
node test-regress.js > output.txt
```

**I changed the app and tests broke**
- Read the FAIL message to see which check failed
- Compare to the code change you made
- Update the test assertion or fix the code

---

## No PII in This Suite

All tests use **fictional player names**:
- Alex Chen, Bailey Rodriguez, Casey Johnson, Dakota Lee, Ellis Brown, Finley Williams, Grace Martinez

No real roster data, no real scores, no real performance metrics. This suite is safe to commit to a public repo.

---

## Continuous Improvement

After each version release, update:
1. The test suite to cover new features
2. `sample-data-test.js` to demonstrate new features
3. This README with new test file descriptions

Current totals: **335 checks passing**. Goal: Keep this green.
