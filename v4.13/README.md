# v4.13

Live at https://raylin328.github.io/J17-Statbook/v4.13/ (the latest folder is the same build).

## Shot zones: the Zones tab

Every charted shot already has a spot on the court. The Zones tab names that spot, so you can see makes,
attempts and FG% by place. Nothing extra is tapped during a game.

### The zones

Left and right are as you face the basket.

| Zone | Where it is |
|---|---|
| At the rim | inside the restricted arc (within 4 ft of the basket), including under it |
| Paint | the rest of the lane, up to the free-throw circle |
| Nail (free-throw line) | the free-throw circle, on both sides of the line |
| Short corner (left, right) | along the baseline, outside the lane and inside the three-point line |
| Wing midrange (left, right) | between the short corner and the elbow |
| Elbow (left, right) | beside and behind the elbow, out to the three-point line |
| Top of the key midrange | straight on, between the circle and the three-point line |
| Corner three (left, right) | a three from the baseline band |
| Wing three (left, right) | a three from the wing band |
| Slot three (left, right) | a three from the slot band |
| Top of the key three | a three from straight on |

Close in, the drawn lines decide the zone. Further out, the angle decides it. Angles are measured at the
basket from the line that runs straight out to half court: 0° is straight on, 90° is level with the basket
along the baseline. There are four bands on each side:

| Band | Angle | Inside the line | A three |
|---|---|---|---|
| Middle | 0-11° | Top of the key midrange | Top of the key three |
| Slot | 11-38° | Elbow | Slot three |
| Wing | 38-68° | Wing midrange | Wing three |
| Baseline | 68° and up | Short corner | Corner three |

The 68° edge is the line through the break of the three-point line, where the straight corner part meets
the arc. The 11° and 38° edges sit halfway between the usual spots: the point, the slots (about 23°) and
the wings (free-throw line extended, about 53°).

Whether a shot is a two or a three comes from the stat you tapped (2P or 3P), not from the spot. A 3P
tapped slightly inside the line is still a three, and a 2P tapped outside it is a long two from that angle.

Distances are read off the app's drawing, which is an NBA-size half court (50 by 47 ft, 23 ft 9 in arc,
22 ft corners, 16 ft lane). On a court with a shorter three-point line the feet are close, not exact.

### What the tab shows

- **Games**: the open game, any other game, or all games together.
- **Whose shots**: for one game, both teams, either team, or one player. For all games, everyone, our
  players, opponents, or one of our players.
- **Zones**: the map, with makes/attempts and FG% in each zone, and a table underneath with FG, FG%, the
  share of shots, and points per shot. Midrange and threes have a subtotal and one line per zone that has
  shots.
- **Angles**: the same shots by angle band only, whatever the distance, with left-side and right-side totals.
- **Dots**: every charted shot as a dot (made) or cross (missed). For one game the two teams have their
  usual colours; across games our players are teal and opponents red.
- **Tap the map** to name a spot: zone, distance from the basket, and angle.
- A zone is shaded by FG% once it has 3 shots: under 25%, 25-39%, 40-54%, 55% and up. With 1 or 2 shots it
  shows the numbers and stays unshaded.
- Under the table: how many shots have no spot (they are not in any zone), and free throws made and
  attempted, counted from the games where misses were recorded.
- **Export shots CSV** saves the shots you are looking at, one row each: date, game, period, clock, team,
  player, jersey, shot, made, points, zone, area, angle, side, distance_ft, angle_deg, x, y, assisted_by,
  and the ids. It is for a spreadsheet; it is not read back in.
- **Print** prints the map and table without the controls.

Misses are only recorded while Chart shots is on, so FG% covers the stretches you charted.

## On the game screen

- The confirmation after a charted shot names the zone: "Home 3 · 2-pointer · Left elbow".
- The Log shows the zone of each charted shot.
- The shot chart on the Box score tab has a button, "See these shots by zone", that opens the Zones tab on
  that game with the same filter.

## Fix

- On a phone, the grid's header row sat on top of the third row of cells, so taps on that row did nothing.
  This came in with the sticky header in v4.12 and is also in v4.12.2. The header now only sticks when the
  grid fits the screen width (an iPad); on a phone it scrolls with the grid. iPads were not affected.

## Data

- Nothing new is saved. Zones are worked out from the spots each time, so every game charted in earlier
  versions has zones already, and earlier versions open the same data unchanged.
- If a boundary is moved in a later version, every shot is re-sorted automatically.
