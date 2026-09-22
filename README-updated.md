# J17 Youth Basketball Stat Book

A self-contained, offline-first web app for tracking player performance in practices and games. Built for youth basketball coaching and analytics.

## Quick Start

Open one of these links on your iPad:
- **Latest (Recommended):** https://raylin328.github.io/J17-Statbook/latest/
- **v4.4 (Current):** https://raylin328.github.io/J17-Statbook/v4.4/
- **v4.3 (Stable Reference):** https://raylin328.github.io/J17-Statbook/v4.3/

Everything works offline. Data saves to your device automatically.

## Features

### Practice Tracking
- Custom drills (speed, strength, agility, shooting, etc.)
- Timed, measured, and counted stats
- Track improvement over time per player
- Multiple drills per session

### Game Stats
- Tap grid for fast stat entry
- Shot chart with coordinates
- Game clock with period tracking
- Substitution tracking (coming v4.5)
- Minutes played (coming v4.5)
- Possessions (coming v4.5)

### Data Management
- Export to CSV (players, sessions, stats, events)
- Import from Google Sheets (players roster)
- Re-import to sync new jersey numbers
- Offline-first: works without internet
- UUID-based player IDs for consistency

## Versions

### v4.4 (Current)
- Excel file detection (Google Sheets exports)
- Add player/stat mid-session (clock-gated)
- Smarter error messages for file imports
- 321 automated tests, all passing

### v4.3
- No file-type filters (iOS fix)
- Binary file rejection (screenshots, PDFs)
- Mixed file import (pick multiple CSVs at once)

### v4.2
- UUID v4 IDs for all players, sessions, events
- Jersey numbers import/export
- Fill-blanks import (add data without overwriting)

### v4.1
- Six stat types: integer, float, time, boolean, text, scale
- Shot chart with coordinates and FG% filter
- Game clock with period support
- Schema v3 migration

## How to Use

### Recording Practice
1. Tap **Practices**
2. Select a drill (or **+ Add stat** to create one)
3. Tap players to record their result
4. When done, mark as finished

### Recording Games
1. Tap **Games**
2. Start a session (pick format: quarters, halves)
3. Add teams and players
4. Tap the stat grid to record scores/rebounds/etc.
5. Use **Shot** view to place made/missed on the court
6. When finished, mark as done

### Exporting Data
- Tap **Export** to download CSVs
- Open in Google Sheets, Excel, or your analytics tool
- Re-import anytime to sync new information

### Importing Players
1. Download your roster from Google Sheets as CSV
2. Tap **Players** → **Import players CSV**
3. Pick the file
4. Players are synced (new IDs, jersey numbers added without overwriting)

## Data

All data is stored in your browser's local storage (`j17.statbook.v2`). 

**Backup your data:**
- Export CSVs regularly
- Copy the CSV files to a cloud drive or email them to yourself

**Current data structure:**
- Players: UUID, name, jersey number, aliases, description
- Sessions: practice or game, date, players, stats recorded
- Events: every stat entry (player, drill/stat, value, timestamp)
- Stats: custom or standard, type, units, improvement direction

## Testing

Run the full test suite locally:
```bash
npm install jsdom
npm test
```

This runs 321 checks covering:
- Player registration and aliases
- Stat recording and export/import
- Custom stats and data types
- Shot chart placement
- Game clock and period logic
- UUID generation and jersey numbers
- File type detection (CSV vs. Excel vs. binary)

See `/tests/README.md` for details.

## Deploying a New Version

On your computer:

```bash
./deploy.sh 4.5
```

This:
1. Takes `j17-statbook-v4_5.html`
2. Copies it to `v4.5/index.html`
3. Updates `latest/index.html`
4. Commits and pushes to GitHub
5. Goes live automatically (1-2 minutes)

No manual file renaming needed.

## Development

The stat book is a single self-contained HTML file:
- No server needed
- No dependencies (except jsdom for testing)
- ~100KB minified
- Works on iOS Safari, Chrome, Firefox

All UI, state management, data export/import, and crypto (for UUIDs) are built in.

## Roadmap

### v4.5 (In Progress)
- Substitution tracking
- Minutes played per player
- Possessions (for advanced stats)
- Possession-level player tracking (roles: handler, passer, shooter, etc.)
- Non-standard lineups (3v3, 4v4)

### v4.6+ (Planned)
- Database backend (PostgreSQL) for centralized analytics
- Coach attribution (who ran this practice?)
- Training regimen tracking (assign groups to different training approaches)
- Regimen effectiveness analysis (which training method works best?)
- API for stat book to sync with central database
- Advanced analytics dashboard (Tableau, Superset, or custom)

### Long-term
- Predictive analytics (when will this player hit their goals?)
- Prescriptive insights (which drills should this player prioritize?)
- Multi-device sync
- Offline PWA support
- Mobile app (iOS)

## FAQ

**Q: Does it work offline?**  
A: Yes. Record everything offline, and it syncs when internet is available (if you add a database backend later).

**Q: Can I see data on my computer?**  
A: Yes. Export CSVs and open in Google Sheets, Excel, or any analytics tool.

**Q: Can multiple coaches use it?**  
A: Currently, each device has its own copy. v4.5+ will support a central database for team-wide access.

**Q: What if I lose my device?**  
A: Export CSVs regularly (tap Export). Restore by importing them on a new device.

**Q: Can I track game-by-game stats AND practice drills?**  
A: Yes. They're separate. Games are for traditional box score stats (points, assists, rebounds). Practices are for skill drills (speed, jump height, agility). Both export to CSV.

## Contact

Built for J17 Youth Basketball Academy.

For questions or feedback, open an issue on GitHub.

---

**Versions stored in:**
- `/v4.3/` — v4.3
- `/v4.4/` — v4.4
- `/latest/` — always points to the current version

**Deploy script:** `deploy.sh`
