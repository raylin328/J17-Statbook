# v4.11

Live at https://raylin328.github.io/J17-Statbook/v4.11/ (the latest folder is the same build).

## Drills
- The drill list holds up to 200. Up to 60 can be on at once; only the drills that are on show in practice.
- Each drill has an area: Ball handling, Shooting, Passing, Footwork and body control, Finishing and scoring, Individual defence, Basketball IQ and court awareness, Athleticism and physical development. Standard drills stay under Standard drills; drills with no area go under Other.
- Practice shows the drills grouped by area in collapsible sections. Manage drills lists every drill with an On or Off switch, grouped the same way.
- Importing more than 60 active drills keeps them all: the extras come in switched off, and the report says how many were saved off.
- drills.csv has an `area` column as its last column. Older files without it still import (drills go under Other).
- `drills/development_skills.csv` is the 102-skill development list. It imports switched off; turn on what you're working on in Manage drills (60 at most).

## Pickers
- The drill and player CSV pickers show CSV files only. Restoring a backup still accepts any file.

## Upgrading
- Saved data from v4.10 opens as is. Standard drills gain their area, and existing drills without one go under Other.
