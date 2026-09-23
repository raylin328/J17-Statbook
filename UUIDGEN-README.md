# UUID Generator for J17 Stat Book

Generate UUID v4 identifiers for players, sessions, events, and drills in bulk.

## Quick Start

```bash
# Generate 20 player IDs (plain list)
node generate-uuids.js 20 players

# Generate 5 session IDs as CSV template
node generate-uuids.js 5 sessions session

# Generate 10 event IDs as JSON array
node generate-uuids.js 10 events json
```

## Usage

```
node generate-uuids.js [count] [type] [format]
```

### Arguments

**count** (1-1000, default: 1)
- How many IDs to generate

**type** (default: "id")
- `player`, `players` — generate player IDs (prefix: p)
- `session`, `sessions` — generate session IDs (prefix: s)
- `event`, `events` — generate event IDs (prefix: e)
- `drill`, `drills` — generate drill IDs (prefix: d)
- `id`, `uuid` — generate bare UUIDs (no prefix)

**format** (default: "plain")
- `plain`, `csv` — one ID per line
- `json` — JSON array format
- `player` — CSV template for player import
- `session` — CSV template for session import

## Examples

### Generate Players for Import

```bash
node generate-uuids.js 20 players player
```

Output:
```
id,name,jersey number,desc,aliases,notes
p_550e8400-e29b-41d4-a716-446655440000,PLAYER_NAME,,,,
p_6ba7b810-9dad-11d1-80b4-00c04fd430c8,PLAYER_NAME,,,,
...
```

Fill in the player names, jersey numbers, and descriptions, then import via the app.

### Generate Sessions for Bulk Import

```bash
node generate-uuids.js 10 sessions session
```

Output:
```
id,date,kind,format,title,team1_name,team1_players,team2_name,team2_players,final_score_1,final_score_2,period_min,done,notes
s_550e8400-e29b-41d4-a716-446655440000,2026-09-23,game,quarters,GAME_TITLE,Team A,,Team B,,,,8,false,
s_6ba7b810-9dad-11d1-80b4-00c04fd430c8,2026-09-23,game,quarters,GAME_TITLE,Team A,,Team B,,,,8,false,
...
```

Edit the dates, titles, and team names, then import.

### Generate Event IDs for Data Migration

```bash
node generate-uuids.js 100 events json
```

Output:
```json
[
  "e_550e8400-e29b-41d4-a716-446655440000",
  "e_6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "e_dc94b5a6-d7bf-4eb1-b54e-7dba79ae7a53",
  ...
]
```

Use in your migration script to assign to old events.

### Generate Raw UUIDs (No Prefix)

```bash
node generate-uuids.js 50 uuid json
```

Output:
```json
[
  "550e8400-e29b-41d4-a716-446655440000",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  ...
]
```

## Use Cases

### Migrating Old Data to UUID Format

You have players with short IDs (p1, p2, p3) and want to migrate to UUIDs:

```bash
# Generate 20 UUIDs for players
node generate-uuids.js 20 players > migration_players.csv

# Edit the CSV, mapping old IDs to new UUIDs
# p1 -> p_550e8400...
# p2 -> p_6ba7b810...
# etc.

# Import via the app's Players tab
```

### Pre-Generating IDs for a New Season

```bash
# Generate IDs for 30 expected new players
node generate-uuids.js 30 players player > new_season_players.csv

# Share with coaching staff to fill in names and numbers
# Import all at once when ready
```

### Creating a Bulk Session Import File

```bash
# Generate 15 game sessions
node generate-uuids.js 15 sessions session > season_games.csv

# Fill in dates, opponents, results
# Import all at once to bootstrap the season
```

## As a Node Module

You can also use the generator in your own scripts:

```javascript
const { generateUUIDs, formatPlayerCSV } = require('./generate-uuids.js');

// Generate 10 player IDs
const playerIds = generateUUIDs(10, 'p');
console.log(playerIds);

// Generate CSV-formatted player template
const csv = formatPlayerCSV(playerIds);
console.log(csv);
```

## Notes

- UUIDs are generated using Node.js's built-in `crypto.randomUUID()` (v15+)
- All UUIDs are cryptographically random and guaranteed unique
- The prefix (p_, s_, e_, d_) is optional and just for readability
- Generated IDs are safe to use immediately in the app
- No external dependencies required

## Troubleshooting

**Error: "count must be between 1 and 1000"**
- You requested too many IDs at once. Keep it under 1000 per run.

**"Cannot find module 'crypto'"**
- You need Node.js v15 or higher. Update Node.js.

**Copy-paste issues with long output**
- Redirect to a file: `node generate-uuids.js 100 players > ids.csv`
- Then open ids.csv in a text editor to copy/paste

## Examples of Generated IDs

Player IDs (with prefix):
```
p_550e8400-e29b-41d4-a716-446655440000
p_6ba7b810-9dad-11d1-80b4-00c04fd430c8
p_f47ac10b-58cc-4372-a567-0e02b2c3d479
```

Session IDs (with prefix):
```
s_550e8400-e29b-41d4-a716-446655440000
s_6ba7b810-9dad-11d1-80b4-00c04fd430c8
```

Raw UUIDs (no prefix):
```
550e8400-e29b-41d4-a716-446655440000
6ba7b810-9dad-11d1-80b4-00c04fd430c8
f47ac10b-58cc-4372-a567-0e02b2c3d479
```

All are valid UUID v4 format.
