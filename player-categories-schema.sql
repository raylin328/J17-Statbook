-- J17 Stat Book: Player Categories Schema
-- Enforces NOT NULL with DEFAULT to Miscellaneous

-- ========================================
-- Step 1: Create Categories Table
-- ========================================

CREATE TABLE player_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  age_group VARCHAR(50),                -- "U12", "U14", "U16", "U18", NULL for Misc
  level VARCHAR(50),                    -- "rep", "house_league", NULL for Misc
  season INTEGER NOT NULL,              -- 2026, 2027, etc.
  is_miscellaneous BOOLEAN DEFAULT false,
  description TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 99,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_category_per_season 
    UNIQUE(org_id, name, season),
  CONSTRAINT valid_level 
    CHECK(level IN ('rep', 'house_league', NULL)),
  CONSTRAINT valid_age_group 
    CHECK(age_group IN ('U12', 'U14', 'U16', 'U18', NULL))
);

CREATE INDEX idx_categories_org_season ON player_categories(org_id, season);
CREATE INDEX idx_categories_active ON player_categories(org_id, active);

-- ========================================
-- Step 2: Create Players Table
-- ========================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  jersey_number INTEGER,
  category_id UUID NOT NULL REFERENCES player_categories(id),
  aliases TEXT[],                       -- Array of alternate names
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_org ON players(org_id);
CREATE INDEX idx_players_category ON players(category_id);
CREATE INDEX idx_players_active ON players(org_id, active);

-- ========================================
-- Step 3: Add Constraint with Foreign Key
-- ========================================

-- Ensure category_id always references a valid category
ALTER TABLE players 
  ADD CONSTRAINT fk_players_category 
  FOREIGN KEY (category_id) 
  REFERENCES player_categories(id) 
  ON UPDATE CASCADE 
  ON DELETE RESTRICT;

-- Don't allow deleting a category if players still use it
-- ON DELETE RESTRICT prevents accidental category removal

-- ========================================
-- Step 4: Bootstrap Standard Categories (Per Season)
-- ========================================

-- For 2026 Season
INSERT INTO player_categories 
  (org_id, name, age_group, level, season, is_miscellaneous, display_order, active)
VALUES
  ('org_j17', 'U12 House League', 'U12', 'house_league', 2026, false, 1, true),
  ('org_j17', 'U12 Rep', 'U12', 'rep', 2026, false, 2, true),
  ('org_j17', 'U14 House League', 'U14', 'house_league', 2026, false, 3, true),
  ('org_j17', 'U14 Rep', 'U14', 'rep', 2026, false, 4, true),
  ('org_j17', 'U16 House League', 'U16', 'house_league', 2026, false, 5, true),
  ('org_j17', 'U16 Rep', 'U16', 'rep', 2026, false, 6, true),
  ('org_j17', 'U18 House League', 'U18', 'house_league', 2026, false, 7, true),
  ('org_j17', 'U18 Rep', 'U18', 'rep', 2026, false, 8, true),
  ('org_j17', 'Miscellaneous', NULL, NULL, 2026, true, 99, true)
ON CONFLICT (org_id, name, season) DO NOTHING;

-- ========================================
-- Step 5: Create View for Easy Queries
-- ========================================

CREATE VIEW v_players_with_categories AS
  SELECT
    p.id,
    p.org_id,
    p.name,
    p.jersey_number,
    p.category_id,
    pc.name as category_name,
    pc.age_group,
    pc.level,
    pc.season,
    pc.is_miscellaneous,
    p.aliases,
    p.notes,
    p.active,
    p.created_at
  FROM players p
  LEFT JOIN player_categories pc ON p.category_id = pc.id;

-- ========================================
-- Step 6: Create Stored Procedure: Add Player
-- ========================================

CREATE OR REPLACE FUNCTION add_player(
  p_org_id UUID,
  p_name VARCHAR,
  p_jersey_number INTEGER,
  p_category_id UUID DEFAULT NULL,
  p_aliases TEXT[] DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_player_id UUID;
  v_category_id UUID;
BEGIN
  -- If category_id not provided, use Miscellaneous
  IF p_category_id IS NULL THEN
    SELECT id INTO v_category_id
    FROM player_categories
    WHERE org_id = p_org_id 
      AND is_miscellaneous = true
      AND active = true
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
      RAISE EXCEPTION 'No Miscellaneous category found for org %', p_org_id;
    END IF;
  ELSE
    v_category_id := p_category_id;
  END IF;

  -- Verify category exists and belongs to this org
  PERFORM 1 FROM player_categories 
  WHERE id = v_category_id 
    AND org_id = p_org_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid category_id % for org %', p_category_id, p_org_id;
  END IF;

  -- Insert player
  INSERT INTO players 
    (org_id, name, jersey_number, category_id, aliases, notes, active)
  VALUES 
    (p_org_id, p_name, p_jersey_number, v_category_id, p_aliases, p_notes, true)
  RETURNING id INTO v_player_id;

  RETURN v_player_id;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- SELECT add_player('org_j17', 'Marc He', 23, 'cat_u14_rep', ARRAY['Marc'], NULL);
-- SELECT add_player('org_j17', 'Unknown', 99);  -- auto-assigns to Misc

-- ========================================
-- Step 7: Create Stored Procedure: Reassign Player
-- ========================================

CREATE OR REPLACE FUNCTION reassign_player_category(
  p_player_id UUID,
  p_new_category_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE players
  SET category_id = p_new_category_id,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_player_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- SELECT reassign_player_category('p001', 'cat_u14_rep');

-- ========================================
-- Step 8: Create Helper Queries
-- ========================================

-- Get all players in a category
CREATE OR REPLACE FUNCTION get_players_by_category(
  p_org_id UUID,
  p_category_id UUID
)
RETURNS TABLE (
  player_id UUID,
  player_name VARCHAR,
  jersey_number INTEGER,
  category_name VARCHAR,
  aliases TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.jersey_number,
    pc.name,
    p.aliases
  FROM players p
  JOIN player_categories pc ON p.category_id = pc.id
  WHERE p.org_id = p_org_id
    AND p.category_id = p_category_id
    AND p.active = true
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- Get all Miscellaneous players (need reassignment)
CREATE OR REPLACE FUNCTION get_miscellaneous_players(
  p_org_id UUID
)
RETURNS TABLE (
  player_id UUID,
  player_name VARCHAR,
  jersey_number INTEGER,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.jersey_number,
    p.created_at
  FROM players p
  JOIN player_categories pc ON p.category_id = pc.id
  WHERE p.org_id = p_org_id
    AND pc.is_miscellaneous = true
    AND p.active = true
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get player count by category
CREATE OR REPLACE FUNCTION get_player_counts_by_category(
  p_org_id UUID,
  p_season INTEGER
)
RETURNS TABLE (
  category_name VARCHAR,
  age_group VARCHAR,
  level VARCHAR,
  player_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.name,
    pc.age_group,
    pc.level,
    COUNT(p.id)
  FROM player_categories pc
  LEFT JOIN players p ON p.category_id = pc.id AND p.active = true
  WHERE pc.org_id = p_org_id
    AND pc.season = p_season
    AND pc.active = true
  GROUP BY pc.id, pc.name, pc.age_group, pc.level
  ORDER BY pc.display_order, pc.name;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Step 9: Example Usage
-- ========================================

/*
-- Create an organization
INSERT INTO organizations (name) VALUES ('J17 Youth Basketball Academy')
RETURNING id;  -- org_j17

-- Create categories (already done in Step 4)

-- Add players (auto-assigns to Miscellaneous if no category)
SELECT add_player('org_j17', 'Marc He', 23, 'cat_u14_rep', ARRAY['Marc']);
SELECT add_player('org_j17', 'Jasper', 12, 'cat_u14_rep', ARRAY['Jas']);
SELECT add_player('org_j17', 'Unknown Kid', 99);  -- Goes to Misc

-- Reassign from Miscellaneous
SELECT reassign_player_category('p003', 'cat_u12_hl');

-- Get all U14 Rep players
SELECT * FROM get_players_by_category('org_j17', 'cat_u14_rep');

-- Find players that need assignment
SELECT * FROM get_miscellaneous_players('org_j17');

-- Count players by category
SELECT * FROM get_player_counts_by_category('org_j17', 2026);
*/
