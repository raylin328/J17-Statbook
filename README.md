# J17 Youth Basketball Stat Book

A self-contained, offline-first web app for tracking player performance in practices and games. Built for youth basketball coaching and analytics.

## Quick Start

Open one of these links on your iPad:
- **Latest (recommended):** https://raylin328.github.io/J17-Statbook/latest/ (currently v4.10)
- **v4.10:** https://raylin328.github.io/J17-Statbook/v4.10/
- Older versions, for reference: [v4.9](https://raylin328.github.io/J17-Statbook/v4.9/) · [v4.8](https://raylin328.github.io/J17-Statbook/v4.8/) · [v4.7.1](https://raylin328.github.io/J17-Statbook/v4.7.1/) · [v4.7](https://raylin328.github.io/J17-Statbook/v4.7/) · [v4.6](https://raylin328.github.io/J17-Statbook/v4.6/) · [v4.5](https://raylin328.github.io/J17-Statbook/v4.5/) · [v4.4](https://raylin328.github.io/J17-Statbook/v4.4/) · [v4.3](https://raylin328.github.io/J17-Statbook/v4.3/)

Everything works offline. Data saves to your device automatically, and every
version on this site shares the same saved data on that device.

## Features

### Practice Tracking
- Timed, measured, and counted drills per player (vertical jump, sprints, free throws, or your own)
- Group drills: one entry for the whole group (3-Man Weave: three players, one time)
- Multi-stage drills: one player, a time for each stage (Defender to Shot)
- Your own drill catalog, imported from a CSV (`drills/drills.csv`)
- Four measures: time, count, makes out of N, and rating (Beginner to Elite, never averaged)
- A whole group in one pass, with a note for every result
- Track improvement over time per player

### Game Stats
- Tap grid or Tiles for fast stat entry
- Offensive and defensive rebounds
- Possessions and points per possession, counted from the taps you already make
- Shot chart with coordinates
- Game clock with period tracking
- Substitutions: any number on the court, minutes played and plus/minus
- Opponent teams: their players by jersey number, the same id in every game
- Team rows for plays nobody caught the number for

### Players
- Categories: U12–U18 Rep and House League, or your own, such as Team 1
- One tap adds a whole category to a session
- Roster import from Google Sheets, with columns in any order
- UUID-based player IDs for consistency
- Add players mid-session from your roster, and edit them without leaving the game

### Data Management
- Export to CSV (players, sessions, stats, events, drills, attempts)
- Re-import fills in blanks without overwriting what you entered
- Backup and restore
- Offline-first: works without internet

## Versions

### v4.10 (Current)
- Opponent teams and players with permanent ids, kept apart from your roster
- New player wearing an old number; merge two entries that are the same kid
- Team rows
- Add players mid-session from your roster; quick edit

### v4.9
- Substitutions, minutes played (from the game clock) and plus/minus
- Version shown in the header and tab title
- Clear all players, at the top of the Players tab
- Players sheets with team headings import

### v4.8
- Drills import; time, count, makes and rating measures
- Ratings from Beginner to Elite, stored as words
- One-pass entry for a practice group; notes on every attempt

### v4.7.1
- Possessions and points per possession, on the scoreboard and box score
- Rebounds split into offensive and defensive; turnovers on by default

### v4.7
- Group and multi-stage drills (3-Man Weave, Defender to Shot)
- Drills and attempts in the CSV export

### v4.6
- Player categories, and a one-tap category picker for sessions
- Smarter players import with a row-by-row report
- Delete all players, with a backup first
- Fix: the same player could be put on both teams

### v4.5
- Groundwork for substitutions (no screen yet)

### v4.4
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
1. On **Sessions**, choose **Practice**, pick the players, and tap **Start practice**
2. Solo stats (vertical jump, sprints): pick the stat, tap a player, enter the result
3. In **Drills**, pick a drill. One-value drills list every player: tap a level or type
   a result for each, add notes, and tap **Save results** once
4. Combines and group drills: tap the players who ran it, enter each station, and tap
   **Record attempt**
5. To add drills, tap **Import drills CSV** and pick `drills.csv`. The club's copy is at
   https://raylin328.github.io/J17-Statbook/drills/drills.csv
6. When done, finish the session

### Recording Games
1. On **Sessions**, choose **Game** and set the format. For each side, choose **J17 players**
   (pick them, or tap a category to add everyone in it) or **Opponent team** (pick or name one)
2. On an opponent side, type each player's jersey number and tap **Add**. Players from
   earlier games show as one-tap chips
3. Tap the grid (or use **Tiles**) to record points, rebounds, assists, steals, turnovers and fouls
4. Tap **Set lineup** under the team tabs, then **Subs** whenever players change (any number can be on)
5. Run the game clock if you want minutes played; plus/minus works either way
6. Turn on **Chart shots** to place makes and misses on the court
7. Possessions and points per possession appear under each score and on the **Box score** tab
8. When finished, tap **Finish**

For accurate possessions: tap both teams' rebounds; on a steal, tap STL (and TO
for the player who lost the ball, if you like; it still counts once); on an
offensive foul, tap TO as well as the foul.

### Exporting Data
- Tap **Export** to download CSVs
- Open in Google Sheets, Excel, or your analytics tool
- Re-import anytime to sync new information

### Importing Players
1. Download your roster from Google Sheets as CSV (a `name` column is all it needs;
   `jersey number` and `category` are optional, in any order)
2. Tap **Players** → **Import players CSV**
3. Pick the file
4. New players are added; existing players only get their blanks filled in

A sheet with a heading row per team ("U12 Team 1") and its players underneath also works:
each heading becomes that team's category.

## Data

All data is stored in your browser's local storage (`j17.statbook.v2`).

**Backup your data:**
- Export CSVs regularly
- Copy the CSV files to a cloud drive or email them to yourself

**Current data structure:**
- Players: UUID, name, jersey number, category, aliases, description
- Opponent teams and opponents: UUIDs, team, jersey number, optional name; kept apart from the roster
- Categories: U12–U18 Rep and House League, plus your own; Miscellaneous is the default
- Sessions: practice or game, date, players, and every stat entry (player, stat, value, timestamp)
- Drills and attempts: which players ran a drill together, and their time or times
- Stats: custom or standard, type, units, improvement direction

## Testing

The test suite is in `tests/` (747 checks in 15 files):
```bash
cd tests
npm install
npm test
```

See `tests/README.md` for what each file covers.

## Deploying a New Version

1. Unzip the release and open the folder inside
2. On GitHub: **Add file** → **Upload files**
3. Drag in everything *inside* that folder (not the folder itself), then commit
4. The site updates in 1–2 minutes

Each release holds the new version twice: in its own folder (`v4.7.1/`) and in `latest/`.

## Development

The stat book is a single self-contained HTML file:
- No server needed
- No dependencies (except jsdom for testing)
- Works on iOS Safari, Chrome, Firefox

Also in this repository:
- `tests/`: the automated test suite
- `scripts/`: a UUID generator for preparing roster sheets
- `drills/drills.csv`: the club's drill catalog, ready to import
- `sql/`: PostgreSQL schema, the categories migration, and a loader for the app's players export

## Roadmap

### Next
- Drill analytics: fastest group, progress over weeks
- Editing a drill attempt after saving
- Database tables for drills and attempts

### Planned
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
A: Currently, each device has its own copy. A central database is planned; its PostgreSQL schema is in `sql/`.

**Q: What if I lose my device?**  
A: Export CSVs regularly (tap Export). Restore by importing them on a new device.

**Q: Can I track game-by-game stats AND practice drills?**  
A: Yes. They're separate. Games are for traditional box score stats (points, assists, rebounds). Practices are for skill drills (speed, jump height, agility). Both export to CSV.

## Contact

Built for J17 Youth Basketball Academy.

For questions or feedback, open an issue on GitHub.

---

**Versions stored in:**
- `/v4.3/` through `/v4.10/`: each version, frozen
- `/latest/`: always the current version
