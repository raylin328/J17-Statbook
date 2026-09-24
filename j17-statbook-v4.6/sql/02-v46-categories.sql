-- J17 Stat Book v4.6: player categories
-- Run after 01-base.sql. Safe to run more than once.
--
--   * age_groups becomes player_categories: U14 Rep, U12 House League, Team 1...
--   * every player and session is in exactly one category: NOT NULL, and the
--     column DEFAULT is Miscellaneous, a fixed row that can't be deleted or renamed
--   * removing a category moves its players to Miscellaneous (ON DELETE SET DEFAULT)
--   * the seeded categories use the same fixed ids as the app
--   * jersey numbers stay text, since '0' and '00' are different; blank is NULL
--   * j17_uuid(text) turns any id from the app into a UUID, for loading data
--
-- This database holds one organization, J17, with a fixed id; categories belong to it.

BEGIN;
SET LOCAL client_min_messages = warning;   -- hide "already exists, skipping" notes on re-runs

INSERT INTO organizations (id, name)
VALUES ('00000000-0000-4000-8000-000000000017', 'J17 Youth Basketball Academy')
ON CONFLICT (id) DO NOTHING;

-- Age groups become categories. Renames keep every foreign key on the same rows.
ALTER TABLE IF EXISTS age_groups RENAME TO player_categories;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['players', 'practice_sessions', 'game_sessions'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = t AND column_name = 'age_group_id') THEN
      EXECUTE format('ALTER TABLE %I RENAME COLUMN age_group_id TO category_id', t);
    END IF;
  END LOOP;
END $$;

ALTER TABLE player_categories
  ALTER COLUMN org_id SET DEFAULT '00000000-0000-4000-8000-000000000017',
  ADD COLUMN IF NOT EXISTS age_group VARCHAR(3),
  ADD COLUMN IF NOT EXISTS level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_misc BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  -- the app treats "U14 Rep", "u14-rep" and "U14_REP" as one name; so does this key
  ADD COLUMN IF NOT EXISTS name_key TEXT
    GENERATED ALWAYS AS (lower(regexp_replace(name, '[[:space:]_./-]+', '', 'g'))) STORED;

ALTER TABLE player_categories
  DROP CONSTRAINT IF EXISTS player_categories_name_check,
  ADD CONSTRAINT player_categories_name_check
    CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 40 AND name !~ '^[=+@-]'),
  -- a NULL level or age group passes these checks; that's how "optional" is written
  DROP CONSTRAINT IF EXISTS player_categories_level_check,
  ADD CONSTRAINT player_categories_level_check CHECK (level IN ('rep', 'house_league')),
  DROP CONSTRAINT IF EXISTS player_categories_age_group_check,
  ADD CONSTRAINT player_categories_age_group_check CHECK (age_group ~ '^U[0-9]{1,2}$'),
  DROP CONSTRAINT IF EXISTS player_categories_misc_check,
  ADD CONSTRAINT player_categories_misc_check
    CHECK (is_misc = (id = '00000000-0000-4000-8000-000000000000'));

CREATE UNIQUE INDEX IF NOT EXISTS player_categories_org_name_key
  ON player_categories (org_id, name_key);

INSERT INTO player_categories (id, name, age_group, level, is_misc, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000000', 'Miscellaneous',    NULL,  NULL,           true,  999),
  ('00000000-0000-4000-8000-000000001201', 'U12 House League', 'U12', 'house_league', false, 1),
  ('00000000-0000-4000-8000-000000001202', 'U12 Rep',          'U12', 'rep',          false, 2),
  ('00000000-0000-4000-8000-000000001401', 'U14 House League', 'U14', 'house_league', false, 3),
  ('00000000-0000-4000-8000-000000001402', 'U14 Rep',          'U14', 'rep',          false, 4),
  ('00000000-0000-4000-8000-000000001601', 'U16 House League', 'U16', 'house_league', false, 5),
  ('00000000-0000-4000-8000-000000001602', 'U16 Rep',          'U16', 'rep',          false, 6),
  ('00000000-0000-4000-8000-000000001801', 'U18 House League', 'U18', 'house_league', false, 7),
  ('00000000-0000-4000-8000-000000001802', 'U18 Rep',          'U18', 'rep',          false, 8)
ON CONFLICT DO NOTHING;

-- Miscellaneous can't be deleted or renamed. The error code is restrict_violation (23001).
CREATE OR REPLACE FUNCTION j17_protect_misc() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.id = '00000000-0000-4000-8000-000000000000' THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION USING ERRCODE = 'restrict_violation',
        MESSAGE = 'Miscellaneous is the default category and can''t be deleted';
    ELSIF NEW.id IS DISTINCT FROM OLD.id OR NEW.name IS DISTINCT FROM OLD.name THEN
      RAISE EXCEPTION USING ERRCODE = 'restrict_violation',
        MESSAGE = 'Miscellaneous can''t be renamed';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS player_categories_protect_misc ON player_categories;
CREATE TRIGGER player_categories_protect_misc
  BEFORE UPDATE OR DELETE ON player_categories
  FOR EACH ROW EXECUTE FUNCTION j17_protect_misc();

-- Every category column: NOT NULL, defaults to Miscellaneous, and falls back to it
-- when its category is removed.
DO $$
DECLARE t text; c text;
BEGIN
  FOREACH t IN ARRAY ARRAY['players', 'practice_sessions', 'game_sessions'] LOOP
    CONTINUE WHEN to_regclass(t) IS NULL;
    FOR c IN SELECT conname FROM pg_constraint
             WHERE conrelid = to_regclass(t) AND contype = 'f'
               AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                                   WHERE attrelid = to_regclass(t) AND attname = 'category_id')]
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t, c);
    END LOOP;
    EXECUTE format('ALTER TABLE %I ALTER COLUMN category_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN category_id SET DEFAULT %L', t, '00000000-0000-4000-8000-000000000000');
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (category_id) '
                   'REFERENCES player_categories(id) ON DELETE SET DEFAULT', t, t || '_category_id_fkey');
  END LOOP;
END $$;

ALTER TABLE players
  -- text, not a number: '0' and '00' are different jerseys. No jersey is NULL, never ''.
  DROP CONSTRAINT IF EXISTS players_jersey_number_check,
  ADD CONSTRAINT players_jersey_number_check CHECK (jersey_number ~ '^[0-9]{1,2}$'),
  DROP CONSTRAINT IF EXISTS players_name_check,
  ADD CONSTRAINT players_name_check
    CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 80 AND name !~ '^[=+@-]');
CREATE INDEX IF NOT EXISTS players_category_idx ON players (category_id);

-- Players made before v4.2 have short text ids such as 'p1'; everything newer is a
-- UUID. This maps any app id to a UUID, and to the same one every time.
CREATE OR REPLACE FUNCTION j17_uuid(app_id text) RETURNS uuid
LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE
    WHEN btrim(app_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN lower(btrim(app_id))::uuid
    ELSE md5('j17-app-id:' || btrim(app_id))::uuid
  END
$$;

COMMIT;
