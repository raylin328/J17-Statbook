-- J17 Analytics Database Schema
-- Designed for practice-based player development tracking and regimen analysis
-- Focus: drill performance over time, not game stats

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(100) NOT NULL,  -- "U12", "U14", "U16", etc.
  year_started INTEGER,
  year_ended INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, name)
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  name VARCHAR(255) NOT NULL,
  jersey_number VARCHAR(10),
  aliases TEXT[],  -- ["Riley Park", "Rylee Park"]
  descriptor VARCHAR(255),  -- "tall", "quick", etc.
  date_joined DATE,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),  -- "head coach", "assistant", "strength coach"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DRILLS & REGIMENS
-- ============================================================================

CREATE TABLE drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,  -- "timed", "measured", "counted"
  unit VARCHAR(50),  -- "seconds", "inches", "pounds", "reps", "meters"
  better_direction VARCHAR(50),  -- "lower" (faster sprint), "higher" (higher vert)
  custom BOOLEAN DEFAULT false,  -- true if coach created it, false if standard
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, name)
);

CREATE TABLE training_regimens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,  -- "Speed focus", "Strength building", "Agility block"
  description TEXT,
  date_started DATE,
  date_ended DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regimen_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regimen_id UUID NOT NULL REFERENCES training_regimens(id),
  drill_id UUID NOT NULL REFERENCES drills(id),
  frequency VARCHAR(50),  -- "3x/week", "daily", "2x/week"
  sequence INTEGER,  -- order in which drills are performed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(regimen_id, drill_id)
);

CREATE TABLE player_regimens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id),
  regimen_id UUID NOT NULL REFERENCES training_regimens(id),
  date_started DATE NOT NULL,
  date_ended DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PRACTICE SESSIONS & DRILL ATTEMPTS
-- ============================================================================

CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  coach_id UUID REFERENCES coaches(id),
  session_date DATE NOT NULL,
  session_time TIME,
  location VARCHAR(255),
  title VARCHAR(255),  -- "Speed work", "Strength block", "Scrimmage"
  notes TEXT,
  done BOOLEAN DEFAULT false,  -- session finished/locked?
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE practice_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id),
  player_id UUID NOT NULL REFERENCES players(id),
  attended BOOLEAN DEFAULT true,
  dnp_reason VARCHAR(255),  -- "injured", "sick", "personal"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, player_id)
);

CREATE TABLE drill_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id),
  drill_id UUID NOT NULL REFERENCES drills(id),
  player_id UUID NOT NULL REFERENCES players(id),
  value DECIMAL(10, 2) NOT NULL,  -- 5.2 seconds, 22 inches, 185 pounds, 12 reps
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,  -- "slipped on wet court", "max effort"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- GAME SESSIONS (optional, for context, not for primary analysis)
-- ============================================================================

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  age_group_id UUID NOT NULL REFERENCES age_groups(id),
  game_date DATE NOT NULL,
  opponent VARCHAR(255),
  location VARCHAR(255),
  final_score_us INTEGER,
  final_score_them INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES game_sessions(id),
  player_id UUID NOT NULL REFERENCES players(id),
  played BOOLEAN DEFAULT true,
  minutes_played DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, player_id)
);

-- ============================================================================
-- INDEXES FOR ANALYTICS QUERIES
-- ============================================================================

-- Find all drills for a player in a date range
CREATE INDEX idx_drill_attempts_player_date ON drill_attempts(player_id, timestamp);

-- Find all attempts for a specific drill across players
CREATE INDEX idx_drill_attempts_drill ON drill_attempts(drill_id, timestamp);

-- Find sessions by coach and date
CREATE INDEX idx_practice_sessions_coach_date ON practice_sessions(coach_id, session_date);

-- Find player's regimen at a given time
CREATE INDEX idx_player_regimens_player ON player_regimens(player_id, date_started);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Latest drill attempt for each player (most recent result)
CREATE VIEW v_latest_drill_attempts AS
SELECT DISTINCT ON (player_id, drill_id)
  player_id,
  drill_id,
  value,
  timestamp
FROM drill_attempts
ORDER BY player_id, drill_id, timestamp DESC;

-- Player's improvement on a drill (first vs. latest)
CREATE VIEW v_drill_improvement AS
SELECT
  p.id as player_id,
  p.name,
  d.id as drill_id,
  d.name as drill_name,
  d.better_direction,
  d.unit,
  (SELECT value FROM drill_attempts 
   WHERE player_id = p.id AND drill_id = d.id 
   ORDER BY timestamp ASC LIMIT 1) as first_attempt,
  (SELECT value FROM drill_attempts 
   WHERE player_id = p.id AND drill_id = d.id 
   ORDER BY timestamp DESC LIMIT 1) as latest_attempt,
  (SELECT timestamp FROM drill_attempts 
   WHERE player_id = p.id AND drill_id = d.id 
   ORDER BY timestamp DESC LIMIT 1) as latest_date,
  COUNT(DISTINCT da.id) as total_attempts
FROM players p
CROSS JOIN drills d
LEFT JOIN drill_attempts da ON p.id = da.player_id AND d.id = da.drill_id
WHERE p.active = true
GROUP BY p.id, p.name, d.id, d.name, d.better_direction, d.unit;

-- Regimen effectiveness (avg improvement for players in a regimen)
CREATE VIEW v_regimen_effectiveness AS
SELECT
  tr.id as regimen_id,
  tr.name as regimen_name,
  d.id as drill_id,
  d.name as drill_name,
  COUNT(DISTINCT pr.player_id) as num_players,
  AVG(
    (SELECT value FROM drill_attempts 
     WHERE player_id = pr.player_id AND drill_id = d.id 
     ORDER BY timestamp DESC LIMIT 1)
    -
    (SELECT value FROM drill_attempts 
     WHERE player_id = pr.player_id AND drill_id = d.id 
     ORDER BY timestamp ASC LIMIT 1)
  ) as avg_improvement,
  STDDEV(
    (SELECT value FROM drill_attempts 
     WHERE player_id = pr.player_id AND drill_id = d.id 
     ORDER BY timestamp DESC LIMIT 1)
    -
    (SELECT value FROM drill_attempts 
     WHERE player_id = pr.player_id AND drill_id = d.id 
     ORDER BY timestamp ASC LIMIT 1)
  ) as stddev_improvement
FROM training_regimens tr
JOIN regimen_drills rd ON tr.id = rd.regimen_id
JOIN drills d ON rd.drill_id = d.id
JOIN player_regimens pr ON tr.id = pr.regimen_id
GROUP BY tr.id, tr.name, d.id, d.name;

-- Coach's practice frequency (how often each coach runs drills)
CREATE VIEW v_coach_practice_frequency AS
SELECT
  c.id as coach_id,
  c.name as coach_name,
  COUNT(DISTINCT ps.id) as total_practices,
  COUNT(DISTINCT ps.session_date) as unique_dates,
  AVG(
    (SELECT COUNT(*) FROM drill_attempts da 
     WHERE da.session_id = ps.id)
  )::INT as avg_drills_per_session
FROM coaches c
LEFT JOIN practice_sessions ps ON c.id = ps.coach_id
GROUP BY c.id, c.name;

-- ============================================================================
-- EXAMPLE QUERIES FOR ANALYTICS
-- ============================================================================

/*
1. "Which drill showed the most improvement across all players?"
SELECT
  drill_name,
  AVG(latest_attempt - first_attempt) as avg_improvement,
  COUNT(*) as num_players
FROM v_drill_improvement
WHERE first_attempt IS NOT NULL AND latest_attempt IS NOT NULL
GROUP BY drill_id, drill_name
ORDER BY avg_improvement DESC;

2. "Did the 'Strength Building' regimen work better than 'Speed Focus'?"
SELECT
  regimen_name,
  drill_name,
  num_players,
  avg_improvement,
  stddev_improvement
FROM v_regimen_effectiveness
WHERE regimen_name IN ('Strength Building', 'Speed Focus')
ORDER BY regimen_name, avg_improvement DESC;

3. "How is Riley Park progressing on vertical jump over time?"
SELECT
  DATE_TRUNC('week', timestamp)::DATE as week,
  AVG(value) as weekly_avg,
  MAX(value) as weekly_max,
  MIN(value) as weekly_min,
  COUNT(*) as attempts
FROM drill_attempts da
JOIN players p ON da.player_id = p.id
JOIN drills d ON da.drill_id = d.id
WHERE p.name = 'Riley Park' AND d.name = 'Vertical jump'
GROUP BY DATE_TRUNC('week', timestamp)
ORDER BY week DESC;

4. "Which coach has the most active practices?"
SELECT * FROM v_coach_practice_frequency
ORDER BY total_practices DESC;

5. "Are players who attend practices more often improving faster?"
SELECT
  p.name,
  COUNT(DISTINCT pa.session_id) as practices_attended,
  (SELECT COUNT(*) FROM drill_attempts WHERE player_id = p.id) as total_drills,
  AVG(di.latest_attempt - di.first_attempt) as avg_improvement
FROM players p
LEFT JOIN practice_attendees pa ON p.id = pa.player_id AND pa.attended = true
LEFT JOIN v_drill_improvement di ON p.id = di.player_id
GROUP BY p.id, p.name
HAVING COUNT(DISTINCT pa.session_id) > 0
ORDER BY avg_improvement DESC;
*/
