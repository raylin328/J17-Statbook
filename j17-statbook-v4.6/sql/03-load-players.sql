-- Load a players CSV exported from the app (Players tab, Export players CSV):
--
--   psql -d j17 -f 03-load-players.sql < players-2026-09-24.csv
--
-- Same rules as the app's import: new players are added; existing players
-- (matched by id) only get their blanks filled, with Miscellaneous counting as
-- blank; categories named in the file are created if missing. A blank jersey
-- becomes NULL. It runs as one transaction, so a bad row stops the load with
-- the reason and nothing is written.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE app_players (
  id text, name text, jersey text, category text, descr text, aliases text, notes text
) ON COMMIT DROP;
\copy app_players FROM pstdin WITH (FORMAT csv, HEADER true)

-- categories the database doesn't have yet ("Misc" and similar mean Miscellaneous)
INSERT INTO player_categories (name, sort_order)
SELECT DISTINCT ON (key) btrim(category), 500
FROM (SELECT category, lower(regexp_replace(btrim(category), '[[:space:]_./-]+', '', 'g')) AS key
      FROM app_players WHERE btrim(coalesce(category, '')) <> '') named
WHERE key NOT IN ('misc', 'miscellaneous', 'uncategorized', 'uncategorised', 'unassigned')
  AND NOT EXISTS (SELECT 1 FROM player_categories c WHERE c.name_key = named.key)
ORDER BY key, category;

CREATE TEMP TABLE incoming ON COMMIT DROP AS
SELECT DISTINCT ON (j17_uuid(a.id))
       j17_uuid(a.id)                    AS id,
       btrim(a.name)                     AS name,
       nullif(btrim(a.jersey), '')       AS jersey,        -- blank jersey -> NULL
       coalesce(c.id, '00000000-0000-4000-8000-000000000000') AS category_id,
       nullif(btrim(a.descr), '')        AS descriptor,    -- btrim also undoes the app's formula guard
       nullif(array(SELECT btrim(x) FROM unnest(string_to_array(a.aliases, ';')) x
                    WHERE btrim(x) <> ''), '{}') AS aliases,
       nullif(btrim(a.notes), '')        AS notes
FROM app_players a
LEFT JOIN player_categories c
  ON c.name_key = lower(regexp_replace(btrim(a.category), '[[:space:]_./-]+', '', 'g'))
ORDER BY j17_uuid(a.id);

WITH added AS (
  INSERT INTO players (id, name, jersey_number, category_id, descriptor, aliases, notes)
  SELECT id, name, jersey, category_id, descriptor, aliases, notes FROM incoming i
  WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.id = i.id)
  RETURNING 1
), filled AS (
  UPDATE players p SET
    jersey_number = coalesce(p.jersey_number, i.jersey),
    descriptor    = coalesce(p.descriptor, i.descriptor),
    aliases       = coalesce(p.aliases, i.aliases),
    notes         = coalesce(p.notes, i.notes),
    category_id   = CASE WHEN p.category_id = '00000000-0000-4000-8000-000000000000'
                         THEN i.category_id ELSE p.category_id END,
    updated_at    = CURRENT_TIMESTAMP
  FROM incoming i
  WHERE p.id = i.id
    AND (   (p.jersey_number IS NULL AND i.jersey IS NOT NULL)
         OR (p.descriptor IS NULL AND i.descriptor IS NOT NULL)
         OR (p.aliases IS NULL AND i.aliases IS NOT NULL)
         OR (p.notes IS NULL AND i.notes IS NOT NULL)
         OR (p.category_id = '00000000-0000-4000-8000-000000000000'
             AND i.category_id <> '00000000-0000-4000-8000-000000000000'))
  RETURNING 1
)
SELECT (SELECT count(*) FROM added) AS players_added,
       (SELECT count(*) FROM filled) AS players_filled_in;

COMMIT;
