# v4.12

Live at https://raylin328.github.io/J17-Statbook/v4.12/ (the latest folder is the same build).

## Free throw misses
- A new FTX column sits right after 1P. Each tap is one missed free throw; it adds no points.
- Saved data from v4.11 gains the column once. If you turn it off or delete it under Stats, it stays that way.
- Possessions are counted as before; a missed free throw does not change them.

## Game grid
- With a lineup set, the players on the court are listed first, then any Team row, then the bench. Order inside each group follows the roster. With no lineup set, the grid is in roster order as before.
- The bench starts with a second header row, so the stat names are next to the rows you tap.
- The top header row stays under the scoreboard while you scroll. This needs the grid to fit the screen width (an iPad); on a phone the grid scrolls sideways instead and the header scrolls with it.
- Tiles view uses the same order.

## Chart
- With Chart shots on, a turnover or block tap asks where it happened. There is no made or missed step, and Save without a spot still works.
- An assist is paired with a basket automatically: the made 2P or 3P a teammate scored just before it, or just after it if you tapped the assist first. The two taps must be the team's nearest taps, in the same period, within a minute. A basket takes one assist.
- The chart on the Box score tab has four views: Shots, Turnovers, Blocks, Assists. The Assists view puts a dot where each assisted basket was shot and lists passer, scorer and count.
- events.csv has a new last column, `assist_for`, holding the id of the basket an assist is paired with.

## Upgrading
- Saved data from v4.11 opens as is. Games recorded earlier have no turnover or block spots and no assist pairs.
