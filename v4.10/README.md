# Stat Book 4.10

## New

- **Opponent teams.** In game setup, each side is either **J17 players** or an
  **Opponent team**. Pick a team you've played before, or type a new one
  ("Richmond Raiders U12"). An opponent side starts empty.
- **Opponents by jersey number, with permanent ids.** On an opponent side, type
  a number and tap **Add**. The same team's #33 is the same player in every
  game, with one id, so his stats build up across games. Players from earlier
  games show as one-tap chips. An unnamed opponent shows as his number; give
  him a name whenever you learn it.
- **Kept apart from your roster.** Opponents never appear in your Players list,
  categories, roster import or roster export, and **Clear all players** leaves
  them alone. They have their own **Opponents** card on the Players tab and
  their own export (`opponents.csv`, also included in Save all CSVs).
- **When a number changes hands.** "New player wearing #33" gives today's #33 a
  new id from this game on; the earlier #33 keeps his earlier stats. If two
  entries turn out to be the same kid, "Same kid as…" on the Opponents card
  merges them in every game.
- **Team rows.** **+ Team row** adds a "Team" line to either side for plays
  where nobody caught the number. Team stats count for the side and for
  possessions, and Team is never offered for the lineup.
- **Add players mid-session from your roster.** **+ Player** (games and
  practices) and **+ Add player to …** open one panel. Search your roster and
  tap a player to add them with their existing id; late arrivals no longer get
  duplicated. Someone new gets name, jersey and category in one go, with a
  warning if the name is already in your roster.
- **Quick edit.** Tap a player's name in the tap grid, or **Edit** next to
  **Clear** in tiles and practice, to change name, jersey, category or
  descriptor without leaving the session. A player with no stats yet in the
  session can be taken out of it.

## Fixed

- **+ Add player to …** used to jump to the Players tab and stop there. It now
  opens the add panel on the game screen.
- **+ Player** used to create a new player even when the kid was already in
  your roster.

## Compatibility

Same saved-data format (schema 3); opponent teams and opponents are new lists
beside the roster. Data from 4.9 opens with both lists empty. Older versions
open 4.10 data but show opponents as "?".
