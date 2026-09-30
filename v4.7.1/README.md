# Stat Book 4.7.1

## New

- **Possessions and points per possession**, counted from the taps you already
  make. They show under each score on the scoreboard and under each team on
  the box score.
- **Rebounds split:** Off. rebound (OREB) and Def. rebound (DREB) replace
  Rebound. The box score shows OREB, DREB and REB (the total), so games
  recorded before the split keep their rebounds.
- **Turnovers are on by default.** They used to be off, and possessions can't
  be counted without them.

## How possessions are counted

A possession ends on a made basket, a turnover, the other team's defensive
rebound, or the last made free throw of a trip:

    possessions = made baskets + turnovers + opponent's defensive rebounds
                  + half the made free throws

- Missed free throws aren't recorded. A two-shot trip ends the possession only
  when its last shot goes in, which averages out to half the made free throws.
- On a steal, tap STL for the defender. If you also tap TO for the player who
  lost the ball, just before or after, it counts once. A steal on its own
  still counts.
- On an offensive foul, tap TO as well as the foul.
- Tap both teams' rebounds. If the other team's defensive rebounds aren't
  recorded, your possessions read low and your PPP reads high.
- A charted miss doesn't end a possession by itself; its rebound does.
- Games from before 4.7.1 only have plain REB, which counts as defensive, so
  their possession numbers are an estimate, usually a little high.

## Upgrading

The first time 4.7.1 opens your data it switches Rebound off (its history
stays), adds OREB and DREB where Rebound was, and switches Turnover on. This
happens once: anything you switch back off in the Stats tab stays off.

## On a phone

The tap grid fits 2P, 3P, 1P and OREB; DREB and TO are one swipe right.
Tiles view shows every button without swiping.

## Compatibility

Same saved-data format (schema 3). Older versions open 4.7.1 data and show
OREB and DREB as ordinary stats, but they don't have the REB total, so older
games' rebounds are hidden there unless Rebound is switched back on.
