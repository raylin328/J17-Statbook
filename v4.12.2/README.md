# v4.12.2

Live at https://raylin328.github.io/J17-Statbook/v4.12.2/ (the latest folder is the same build).

## Full court
- A **Full court** switch sits next to Chart shots on the game screen (it shows while Chart shots is on). The same switch is in the spot sheet and on the chart; all three are one setting.
- With it on, a turnover or block tap opens a full court instead of the half court. Shots always use the half court.
- The full court lies on its side. The team you are recording is always attacking the basket on the right, whichever end it is really shooting at; the sheet names the team. A backcourt turnover goes on the left half. A block usually goes near the left basket, the one the team defends.
- On the Box score tab, the Turnovers, Blocks and Assists views draw on the full court when the switch is on. Both teams are shown attacking to the right. The Shots view stays on the half court.

## Older spots
- Spots charted on the half court are kept as they are and are placed on the full court for you: a turnover goes in the attacking half, a block at the defended end, an assist where its basket was shot.
- With the switch off, the half court shows what fits on it and says how many spots are in the other half.

## Data
- A full-court spot is saved with `court: "full"`. Its x runs across the floor; its y runs along it, 0 at the baseline the team attacks and 1 at the baseline it defends.
- events.csv has a new last column, `court` ("full" or blank). Files from v4.12 without it import as half court.
- v4.12 can open data saved by v4.12.2, but it would draw a full-court spot as if it were a half-court one. Use the latest build to view games charted on the full court.
