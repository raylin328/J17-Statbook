# Stat Book 4.6

## New

- **Categories.** Every player is in exactly one. U12 to U18 Rep and House League
  come ready-made; add your own, like Team 1. Miscellaneous is the default and
  can't be removed; removing any other category moves its players there.
- **One tap per category** when setting up a session: tap U14 Rep and everyone
  active in it joins the team. Tap again to take them off.
- **Players tab:** filter by category, players grouped under headings, a category
  menu on each player, and a Categories card to add, rename and remove.
- **Smarter players import.** Columns are found by name, in any order ("Player
  Name", "Jersey #", "team", "age group" all work). Only a name is required: the
  app makes missing ids, unknown categories are created, and a blank category
  means Miscellaneous. Re-importing matches players by id, or by name when there
  are no ids, and only fills blanks, so it never duplicates players or overwrites
  what you entered in the app.
- **Import report** listing every skipped or adjusted row by row number.
- **Checks on what you type or import:** jerseys are 0 to 99 ("0", "00" and "07"
  stay distinct); names can't start with = + - @, which spreadsheets run as
  formulas; invisible characters are removed.
- **Delete all players**, with an optional backup download first. Importing that
  backup brings the names back on old box scores.
- The version is shown at the bottom of the Sessions tab.

## Fixed

- The same player could be put on both teams in session setup.
- A custom stat's short name, or a player name in the report card list, could
  insert HTML into the page.

## Bringing a sheet in

1. Put the player names in a column headed `name`.
2. Add a column headed `category` with each player's group (Team 1, U14 Rep...).
3. Remove blank rows and group-label rows, download as CSV, and import it on the
   Players tab.

Players already in the app move out of Miscellaneous into their category;
nothing else about them changes.

## Compatibility

- Same saved-data format (schema 3). Every version folder on the site shares one
  browser storage; v4.5 and earlier still open data saved by 4.6, and
  categories survive a round trip through them.
- The players CSV gains a `category` column; older versions ignore it.
- A blank jersey is "" in the app and NULL in the database.

## Not yet

- Drills with groups and stages (v4.7).
- Substitution screen and minutes played.
