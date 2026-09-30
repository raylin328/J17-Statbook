-- Checks for 02-v46-categories.sql. Changes nothing: everything is rolled back.
--   psql -d j17 -f test-categories.sql
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
  misc uuid := '00000000-0000-4000-8000-000000000000';
  u14  uuid := '00000000-0000-4000-8000-000000001402';
  p uuid; t1 uuid; bad text;
BEGIN
  ASSERT (SELECT count(*) FROM player_categories WHERE org_id = '00000000-0000-4000-8000-000000000017') >= 9,
    'the nine seeded categories belong to J17';
  ASSERT (SELECT is_misc FROM player_categories WHERE id = misc), 'Miscellaneous is marked as the default';

  INSERT INTO players (name) VALUES ('Riley Park') RETURNING id INTO p;
  ASSERT (SELECT category_id FROM players WHERE id = p) = misc, 'a player with no category lands in Miscellaneous';
  BEGIN
    INSERT INTO players (name, category_id) VALUES ('Dana Ortiz', NULL);
    RAISE EXCEPTION 'an explicit NULL category was accepted';
  EXCEPTION WHEN not_null_violation THEN NULL; END;

  INSERT INTO players (name, jersey_number, category_id)
  VALUES ('Ari Kim', '0', u14), ('Jo Moss', '00', u14), ('Sam Lee', NULL, u14);
  ASSERT (SELECT count(DISTINCT jersey_number) FROM players WHERE name IN ('Ari Kim', 'Jo Moss')) = 2,
    '0 and 00 are different jerseys';
  FOREACH bad IN ARRAY ARRAY['', 'TBD', '123', '#4', ' 4'] LOOP
    BEGIN
      INSERT INTO players (name, jersey_number) VALUES ('Lee Ng', bad);
      RAISE EXCEPTION 'jersey "%" was accepted', bad;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  FOREACH bad IN ARRAY ARRAY['', ' Riley', '=HYPERLINK("x")', '-Dash', '+1', '@x', repeat('x', 81)] LOOP
    BEGIN
      INSERT INTO players (name) VALUES (bad);
      RAISE EXCEPTION 'player name "%" was accepted', bad;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;

  BEGIN
    INSERT INTO player_categories (name) VALUES ('u14-rep');
    RAISE EXCEPTION 'a second U14 Rep was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  FOREACH bad IN ARRAY ARRAY['=x', ' Team 1', repeat('x', 41)] LOOP
    BEGIN
      INSERT INTO player_categories (name) VALUES (bad);
      RAISE EXCEPTION 'category name "%" was accepted', bad;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  BEGIN
    INSERT INTO player_categories (name, level) VALUES ('Team 2', 'pro');
    RAISE EXCEPTION 'level "pro" was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO player_categories (name, is_misc) VALUES ('Other', true);
    RAISE EXCEPTION 'a second Miscellaneous was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  INSERT INTO player_categories (name) VALUES ('Team 1') RETURNING id INTO t1;
  ASSERT (SELECT level IS NULL FROM player_categories WHERE id = t1), 'level is optional';
  UPDATE players SET category_id = t1 WHERE name = 'Sam Lee';
  INSERT INTO practice_sessions (category_id, session_date) VALUES (t1, current_date);
  DELETE FROM player_categories WHERE id = t1;
  ASSERT (SELECT category_id FROM players WHERE name = 'Sam Lee') = misc,
    'removing a category moves its players to Miscellaneous';
  ASSERT (SELECT count(*) FROM practice_sessions WHERE category_id = misc) = 1, '...and its sessions';
  INSERT INTO game_sessions (game_date) VALUES (current_date);
  ASSERT (SELECT bool_and(category_id = misc) FROM game_sessions), 'a game with no category is in Miscellaneous';

  BEGIN
    DELETE FROM player_categories WHERE id = misc;
    RAISE EXCEPTION 'Miscellaneous was deleted';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
  BEGIN
    UPDATE player_categories SET name = 'Other' WHERE id = misc;
    RAISE EXCEPTION 'Miscellaneous was renamed';
  EXCEPTION WHEN restrict_violation THEN NULL; END;
  UPDATE player_categories SET sort_order = 1000 WHERE id = misc;   -- other edits are fine
  UPDATE player_categories SET name = 'U14 Rep Black' WHERE id = u14;
  ASSERT (SELECT count(*) FROM players WHERE category_id = u14) = 2, 'renaming a category keeps its players';

  ASSERT j17_uuid('p1') = j17_uuid(' p1 '), 'an old short id maps to the same UUID every time';
  ASSERT j17_uuid('p1') <> j17_uuid('p2'), 'different ids stay different';
  ASSERT j17_uuid('3F2A9C1E-0000-4000-8000-00000000ABCD') = '3f2a9c1e-0000-4000-8000-00000000abcd',
    'UUIDs pass through unchanged, in any case';

  RAISE NOTICE 'categories: all green';
END $$;
ROLLBACK;
