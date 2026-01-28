-- =============================================================================
-- Sports League Office - Basketball
-- Consolidated Database Schema
-- =============================================================================

-- TEAMS
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(3) NOT NULL UNIQUE,
  conference VARCHAR(10) NOT NULL CHECK (conference IN ('Eastern', 'Western')),
  division VARCHAR(15) NOT NULL CHECK (division IN ('Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest')),
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  arena_name VARCHAR(100) NOT NULL,
  championships INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_teams_conference ON teams(conference);
CREATE INDEX IF NOT EXISTS idx_teams_division ON teams(division);

-- PLAYERS
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  position VARCHAR(2) NOT NULL CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  secondary_position VARCHAR(2) CHECK (secondary_position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  archetype VARCHAR(20) NOT NULL,
  height_inches INTEGER NOT NULL CHECK (height_inches BETWEEN 66 AND 90),
  weight_lbs INTEGER NOT NULL CHECK (weight_lbs BETWEEN 150 AND 350),
  age INTEGER NOT NULL CHECK (age BETWEEN 18 AND 45),
  jersey_number INTEGER CHECK (jersey_number BETWEEN 0 AND 99),
  years_pro INTEGER DEFAULT 0,
  overall INTEGER NOT NULL CHECK (overall BETWEEN 40 AND 99),
  potential INTEGER NOT NULL CHECK (potential BETWEEN 40 AND 99),
  peak_age INTEGER DEFAULT 27 CHECK (peak_age BETWEEN 24 AND 33),
  durability INTEGER DEFAULT 75 CHECK (durability BETWEEN 40 AND 99),
  coachability INTEGER DEFAULT 70 CHECK (coachability BETWEEN 40 AND 99),
  greed INTEGER DEFAULT 50 CHECK (greed BETWEEN 0 AND 100),
  ego INTEGER DEFAULT 50 CHECK (ego BETWEEN 0 AND 100),
  loyalty INTEGER DEFAULT 50 CHECK (loyalty BETWEEN 0 AND 100),
  leadership INTEGER DEFAULT 50 CHECK (leadership BETWEEN 0 AND 100),
  motor INTEGER DEFAULT 70 CHECK (motor BETWEEN 40 AND 99),
  work_ethic INTEGER DEFAULT 70,
  salary BIGINT DEFAULT 0,
  tradeable_after DATE,
  last_traded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_overall ON players(overall DESC);
CREATE INDEX IF NOT EXISTS idx_players_archetype ON players(archetype);

-- PLAYER ATTRIBUTES
CREATE TABLE IF NOT EXISTS player_attributes (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  inside_scoring INTEGER NOT NULL CHECK (inside_scoring BETWEEN 0 AND 99),
  mid_range INTEGER NOT NULL CHECK (mid_range BETWEEN 0 AND 99),
  three_point INTEGER NOT NULL CHECK (three_point BETWEEN 0 AND 99),
  free_throw INTEGER NOT NULL CHECK (free_throw BETWEEN 0 AND 99),
  shot_iq INTEGER NOT NULL CHECK (shot_iq BETWEEN 0 AND 99),
  offensive_consistency INTEGER NOT NULL CHECK (offensive_consistency BETWEEN 0 AND 99),
  layup INTEGER NOT NULL CHECK (layup BETWEEN 0 AND 99),
  standing_dunk INTEGER NOT NULL CHECK (standing_dunk BETWEEN 0 AND 99),
  driving_dunk INTEGER NOT NULL CHECK (driving_dunk BETWEEN 0 AND 99),
  draw_foul INTEGER NOT NULL CHECK (draw_foul BETWEEN 0 AND 99),
  post_moves INTEGER NOT NULL CHECK (post_moves BETWEEN 0 AND 99),
  ball_handling INTEGER NOT NULL CHECK (ball_handling BETWEEN 0 AND 99),
  passing_accuracy INTEGER NOT NULL CHECK (passing_accuracy BETWEEN 0 AND 99),
  passing_vision INTEGER NOT NULL CHECK (passing_vision BETWEEN 0 AND 99),
  passing_iq INTEGER NOT NULL CHECK (passing_iq BETWEEN 0 AND 99),
  interior_defense INTEGER NOT NULL CHECK (interior_defense BETWEEN 0 AND 99),
  perimeter_defense INTEGER NOT NULL CHECK (perimeter_defense BETWEEN 0 AND 99),
  steal INTEGER NOT NULL CHECK (steal BETWEEN 0 AND 99),
  block INTEGER NOT NULL CHECK (block BETWEEN 0 AND 99),
  defensive_iq INTEGER NOT NULL CHECK (defensive_iq BETWEEN 0 AND 99),
  defensive_consistency INTEGER NOT NULL CHECK (defensive_consistency BETWEEN 0 AND 99),
  offensive_rebound INTEGER NOT NULL CHECK (offensive_rebound BETWEEN 0 AND 99),
  defensive_rebound INTEGER NOT NULL CHECK (defensive_rebound BETWEEN 0 AND 99),
  speed INTEGER NOT NULL CHECK (speed BETWEEN 0 AND 99),
  acceleration INTEGER NOT NULL CHECK (acceleration BETWEEN 0 AND 99),
  strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 99),
  vertical INTEGER NOT NULL CHECK (vertical BETWEEN 0 AND 99),
  stamina INTEGER NOT NULL CHECK (stamina BETWEEN 0 AND 99),
  hustle INTEGER NOT NULL CHECK (hustle BETWEEN 0 AND 99),
  basketball_iq INTEGER NOT NULL CHECK (basketball_iq BETWEEN 0 AND 99),
  clutch INTEGER NOT NULL CHECK (clutch BETWEEN 0 AND 99),
  consistency INTEGER NOT NULL CHECK (consistency BETWEEN 0 AND 99),
  work_ethic INTEGER NOT NULL CHECK (work_ethic BETWEEN 0 AND 99),
  close_shot INTEGER DEFAULT 50 CHECK (close_shot BETWEEN 0 AND 99),
  post_control INTEGER DEFAULT 50 CHECK (post_control BETWEEN 0 AND 99),
  speed_with_ball INTEGER DEFAULT 50 CHECK (speed_with_ball BETWEEN 0 AND 99),
  offensive_iq INTEGER DEFAULT 50 CHECK (offensive_iq BETWEEN 0 AND 99),
  lateral_quickness INTEGER DEFAULT 50 CHECK (lateral_quickness BETWEEN 0 AND 99),
  help_defense_iq INTEGER DEFAULT 50 CHECK (help_defense_iq BETWEEN 0 AND 99),
  box_out INTEGER DEFAULT 50 CHECK (box_out BETWEEN 0 AND 99),
  rebound_timing INTEGER DEFAULT 50 CHECK (rebound_timing BETWEEN 0 AND 99),
  aggression INTEGER DEFAULT 50 CHECK (aggression BETWEEN 0 AND 99),
  streakiness INTEGER DEFAULT 50 CHECK (streakiness BETWEEN 0 AND 99),
  composure INTEGER DEFAULT 50 CHECK (composure BETWEEN 0 AND 99),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRAITS
CREATE TABLE IF NOT EXISTS traits (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('scoring', 'playmaking', 'defense', 'rebounding', 'physical', 'mental', 'negative')),
  rarity VARCHAR(15) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary'))
);

CREATE INDEX IF NOT EXISTS idx_traits_category ON traits(category);

CREATE TABLE IF NOT EXISTS player_traits (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  trait_id VARCHAR(50) REFERENCES traits(id) ON DELETE CASCADE,
  tier VARCHAR(15) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'hall_of_fame')),
  PRIMARY KEY (player_id, trait_id)
);

CREATE INDEX IF NOT EXISTS idx_player_traits_player ON player_traits(player_id);
CREATE INDEX IF NOT EXISTS idx_player_traits_trait ON player_traits(trait_id);

-- SEASONS
CREATE TABLE IF NOT EXISTS seasons (
  id SERIAL PRIMARY KEY,
  season_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'preseason' CHECK (status IN ('preseason', 'regular', 'playoffs', 'offseason', 'completed')),
  current_day INTEGER DEFAULT 0,
  trade_deadline_day INTEGER DEFAULT 100,
  all_star_day INTEGER DEFAULT 85,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STANDINGS
CREATE TABLE IF NOT EXISTS standings (
  id SERIAL PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  home_wins INTEGER DEFAULT 0,
  home_losses INTEGER DEFAULT 0,
  away_wins INTEGER DEFAULT 0,
  away_losses INTEGER DEFAULT 0,
  conference_wins INTEGER DEFAULT 0,
  conference_losses INTEGER DEFAULT 0,
  division_wins INTEGER DEFAULT 0,
  division_losses INTEGER DEFAULT 0,
  points_for INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_10_wins INTEGER DEFAULT 0,
  UNIQUE(season_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_standings_season ON standings(season_id);
CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id);
CREATE INDEX IF NOT EXISTS idx_standings_season_team ON standings(season_id, team_id);

-- GAMES
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES teams(id) NOT NULL,
  away_team_id UUID REFERENCES teams(id) NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES teams(id),
  is_overtime BOOLEAN DEFAULT FALSE,
  overtime_periods INTEGER DEFAULT 0,
  game_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled',
  is_playoff BOOLEAN DEFAULT FALSE,
  playoff_round INTEGER,
  playoff_game_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_season ON games(season_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- GAME QUARTERS
CREATE TABLE IF NOT EXISTS game_quarters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL,
  home_points INTEGER NOT NULL DEFAULT 0,
  away_points INTEGER NOT NULL DEFAULT 0,
  UNIQUE (game_id, quarter)
);

-- PLAYS
CREATE TABLE IF NOT EXISTS plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  play_type VARCHAR(30) NOT NULL,
  quarter INTEGER NOT NULL,
  game_clock INTEGER NOT NULL,
  shot_clock INTEGER,
  primary_player_id UUID REFERENCES players(id),
  secondary_player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  points INTEGER DEFAULT 0,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  shot_type VARCHAR(30),
  shot_made BOOLEAN,
  shot_distance INTEGER,
  shot_contested BOOLEAN,
  description TEXT,
  play_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plays_game ON plays(game_id);
CREATE INDEX IF NOT EXISTS idx_plays_player ON plays(primary_player_id);
CREATE INDEX IF NOT EXISTS idx_plays_team ON plays(team_id);

-- PLAYER GAME STATS
CREATE TABLE IF NOT EXISTS player_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  minutes DECIMAL(4,1) DEFAULT 0,
  points INTEGER DEFAULT 0,
  fgm INTEGER DEFAULT 0,
  fga INTEGER DEFAULT 0,
  three_pm INTEGER DEFAULT 0,
  three_pa INTEGER DEFAULT 0,
  ftm INTEGER DEFAULT 0,
  fta INTEGER DEFAULT 0,
  oreb INTEGER DEFAULT 0,
  dreb INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  plus_minus INTEGER DEFAULT 0,
  is_starter BOOLEAN DEFAULT FALSE,
  UNIQUE(game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_player ON player_game_stats(player_id);

-- TEAM GAME STATS
CREATE TABLE IF NOT EXISTS team_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  is_home BOOLEAN NOT NULL,
  points INTEGER DEFAULT 0,
  fgm INTEGER DEFAULT 0,
  fga INTEGER DEFAULT 0,
  fg_pct DECIMAL(4,3) DEFAULT 0,
  three_pm INTEGER DEFAULT 0,
  three_pa INTEGER DEFAULT 0,
  three_pct DECIMAL(4,3) DEFAULT 0,
  ftm INTEGER DEFAULT 0,
  fta INTEGER DEFAULT 0,
  ft_pct DECIMAL(4,3) DEFAULT 0,
  oreb INTEGER DEFAULT 0,
  dreb INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  fast_break_points INTEGER DEFAULT 0,
  points_in_paint INTEGER DEFAULT 0,
  second_chance_points INTEGER DEFAULT 0,
  UNIQUE(game_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_game_stats_game ON team_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_team_game_stats_team ON team_game_stats(team_id);

-- SCHEDULE
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER REFERENCES seasons(id) NOT NULL,
  game_id UUID REFERENCES games(id),
  home_team_id UUID REFERENCES teams(id) NOT NULL,
  away_team_id UUID REFERENCES teams(id) NOT NULL,
  game_number INTEGER NOT NULL,
  game_date DATE NOT NULL,
  game_day INTEGER,
  status VARCHAR(20) DEFAULT 'scheduled',
  is_user_game BOOLEAN DEFAULT FALSE,
  is_preseason BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_season ON schedule(season_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(game_date);
CREATE INDEX IF NOT EXISTS idx_schedule_home_team ON schedule(home_team_id);
CREATE INDEX IF NOT EXISTS idx_schedule_away_team ON schedule(away_team_id);
CREATE INDEX IF NOT EXISTS idx_schedule_preseason ON schedule(is_preseason);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON schedule(status);
CREATE INDEX IF NOT EXISTS idx_schedule_game_day ON schedule(game_day);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  has_purchased BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP,
  stripe_customer_id VARCHAR(100),
  stripe_payment_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(refresh_token)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);

-- FRANCHISES
CREATE TABLE IF NOT EXISTS franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) NOT NULL,
  season_id INTEGER REFERENCES seasons(id) NOT NULL,
  current_day INTEGER DEFAULT 1,
  phase VARCHAR(20) DEFAULT 'preseason',
  seasons_played INTEGER DEFAULT 0,
  championships INTEGER DEFAULT 0,
  playoff_appearances INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  difficulty VARCHAR(20) DEFAULT 'pro',
  auto_save BOOLEAN DEFAULT TRUE,
  sim_speed VARCHAR(10) DEFAULT 'normal',
  season_number INTEGER DEFAULT 1,
  name VARCHAR(100),
  is_active BOOLEAN DEFAULT FALSE,
  offseason_phase VARCHAR(30),
  all_star_complete BOOLEAN DEFAULT FALSE,
  preseason_wins INTEGER DEFAULT 0,
  preseason_losses INTEGER DEFAULT 0,
  mle_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_played_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT franchises_user_team_unique UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_franchise_team ON franchises(team_id);
CREATE INDEX IF NOT EXISTS idx_franchises_user ON franchises(user_id);
CREATE INDEX IF NOT EXISTS idx_franchises_user_active ON franchises(user_id, is_active) WHERE is_active = TRUE;

-- PLAYOFF SERIES
CREATE TABLE IF NOT EXISTS playoff_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER REFERENCES seasons(id) NOT NULL,
  round INTEGER NOT NULL,
  conference VARCHAR(10),
  series_number INTEGER NOT NULL,
  higher_seed_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  lower_seed_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  higher_seed_wins INTEGER DEFAULT 0,
  lower_seed_wins INTEGER DEFAULT 0,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT playoff_series_season_round_conf_num_key UNIQUE (season_id, round, conference, series_number)
);

CREATE INDEX IF NOT EXISTS idx_playoff_series_season ON playoff_series(season_id);
CREATE INDEX IF NOT EXISTS idx_playoff_series_season_round ON playoff_series(season_id, round);

-- PLAYOFF GAMES
CREATE TABLE IF NOT EXISTS playoff_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES playoff_series(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  UNIQUE(series_id, game_number)
);

-- SEASON HISTORY
CREATE TABLE IF NOT EXISTS season_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER REFERENCES seasons(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  made_playoffs BOOLEAN DEFAULT FALSE,
  playoff_seed INTEGER,
  playoff_result VARCHAR(50),
  mvp_player_id UUID REFERENCES players(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_season_history_season ON season_history(season_id);

-- PLAYER GAME STATE (Hot/Cold)
CREATE TABLE IF NOT EXISTS player_game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  hot_cold_state VARCHAR(20) DEFAULT 'normal' CHECK (hot_cold_state IN ('ice_cold', 'cold', 'normal', 'warm', 'hot', 'on_fire')),
  consecutive_makes INTEGER DEFAULT 0,
  consecutive_misses INTEGER DEFAULT 0,
  state_modifier DECIMAL(4,2) DEFAULT 0.00,
  last_state_change_quarter INTEGER DEFAULT 1,
  times_caught_fire INTEGER DEFAULT 0,
  times_went_cold INTEGER DEFAULT 0,
  UNIQUE(game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_state_lookup ON player_game_state(game_id, player_id);

-- DRAFT PICKS
CREATE TABLE IF NOT EXISTS draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 2),
  pick_number INTEGER NOT NULL CHECK (pick_number BETWEEN 1 AND 60),
  original_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  current_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  was_traded BOOLEAN DEFAULT FALSE,
  traded_from_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, round, pick_number)
);

CREATE INDEX IF NOT EXISTS idx_draft_picks_season ON draft_picks(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_team ON draft_picks(current_team_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_player ON draft_picks(player_id);

-- DRAFT PROSPECTS
CREATE TABLE IF NOT EXISTS draft_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  position VARCHAR(2) NOT NULL CHECK (position IN ('PG', 'SG', 'SF', 'PF', 'C')),
  archetype VARCHAR(50) NOT NULL,
  height_inches INTEGER NOT NULL,
  weight_lbs INTEGER NOT NULL,
  age INTEGER NOT NULL DEFAULT 19,
  overall INTEGER NOT NULL CHECK (overall BETWEEN 40 AND 99),
  potential INTEGER NOT NULL CHECK (potential BETWEEN 50 AND 99),
  scouting_level INTEGER DEFAULT 0 CHECK (scouting_level BETWEEN 0 AND 5),
  mock_draft_position INTEGER,
  big_board_rank INTEGER,
  is_drafted BOOLEAN DEFAULT FALSE,
  drafted_by_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  draft_round INTEGER,
  draft_pick INTEGER,
  peak_age INTEGER DEFAULT 27,
  durability INTEGER DEFAULT 75,
  coachability INTEGER DEFAULT 70,
  motor INTEGER DEFAULT 70,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_draft_prospects_season ON draft_prospects(season_id);
CREATE INDEX IF NOT EXISTS idx_draft_prospects_available ON draft_prospects(season_id, is_drafted);

-- DRAFT PROSPECT ATTRIBUTES
CREATE TABLE IF NOT EXISTS draft_prospect_attributes (
  prospect_id UUID PRIMARY KEY REFERENCES draft_prospects(id) ON DELETE CASCADE,
  inside_scoring INTEGER DEFAULT 50, close_shot INTEGER DEFAULT 50,
  mid_range INTEGER DEFAULT 50, three_point INTEGER DEFAULT 50,
  free_throw INTEGER DEFAULT 50, shot_iq INTEGER DEFAULT 50,
  offensive_consistency INTEGER DEFAULT 50,
  layup INTEGER DEFAULT 50, standing_dunk INTEGER DEFAULT 50,
  driving_dunk INTEGER DEFAULT 50, draw_foul INTEGER DEFAULT 50,
  post_moves INTEGER DEFAULT 50, post_control INTEGER DEFAULT 50,
  ball_handling INTEGER DEFAULT 50, speed_with_ball INTEGER DEFAULT 50,
  passing_accuracy INTEGER DEFAULT 50, passing_vision INTEGER DEFAULT 50,
  passing_iq INTEGER DEFAULT 50, offensive_iq INTEGER DEFAULT 50,
  interior_defense INTEGER DEFAULT 50, perimeter_defense INTEGER DEFAULT 50,
  steal INTEGER DEFAULT 50, block INTEGER DEFAULT 50,
  defensive_iq INTEGER DEFAULT 50, defensive_consistency INTEGER DEFAULT 50,
  lateral_quickness INTEGER DEFAULT 50, help_defense_iq INTEGER DEFAULT 50,
  offensive_rebound INTEGER DEFAULT 50, defensive_rebound INTEGER DEFAULT 50,
  box_out INTEGER DEFAULT 50, rebound_timing INTEGER DEFAULT 50,
  speed INTEGER DEFAULT 50, acceleration INTEGER DEFAULT 50,
  strength INTEGER DEFAULT 50, vertical INTEGER DEFAULT 50,
  stamina INTEGER DEFAULT 50, hustle INTEGER DEFAULT 50,
  basketball_iq INTEGER DEFAULT 50, clutch INTEGER DEFAULT 50,
  consistency INTEGER DEFAULT 50, work_ethic INTEGER DEFAULT 50,
  aggression INTEGER DEFAULT 50, streakiness INTEGER DEFAULT 50,
  composure INTEGER DEFAULT 50
);

-- DRAFT LOTTERY
CREATE TABLE IF NOT EXISTS draft_lottery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pre_lottery_position INTEGER NOT NULL,
  lottery_odds DECIMAL(5,2) NOT NULL,
  post_lottery_position INTEGER,
  lottery_win BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, team_id),
  CONSTRAINT draft_lottery_odds_check CHECK (lottery_odds >= 0 AND lottery_odds <= 100)
);

CREATE INDEX IF NOT EXISTS idx_draft_lottery_season ON draft_lottery(season_id);

-- TEAM SCOUTING
CREATE TABLE IF NOT EXISTS team_scouting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES draft_prospects(id) ON DELETE CASCADE,
  scouting_level INTEGER DEFAULT 0 CHECK (scouting_level BETWEEN 0 AND 5),
  notes TEXT,
  interest_level VARCHAR(20) DEFAULT 'unknown' CHECK (interest_level IN ('unknown', 'low', 'medium', 'high', 'very_high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_team_scouting_team ON team_scouting(team_id);

-- SALARY CAP SETTINGS
CREATE TABLE IF NOT EXISTS salary_cap_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  salary_cap BIGINT NOT NULL DEFAULT 140000000,
  luxury_tax_threshold BIGINT NOT NULL DEFAULT 170000000,
  first_apron BIGINT NOT NULL DEFAULT 178000000,
  second_apron BIGINT NOT NULL DEFAULT 189000000,
  minimum_team_salary BIGINT NOT NULL DEFAULT 126000000,
  rookie_scale_factor DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id)
);

-- CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  total_years INT NOT NULL CHECK (total_years BETWEEN 1 AND 5),
  years_remaining INT NOT NULL CHECK (years_remaining >= 0),
  base_salary BIGINT NOT NULL,
  year_1_salary BIGINT NOT NULL,
  year_2_salary BIGINT,
  year_3_salary BIGINT,
  year_4_salary BIGINT,
  year_5_salary BIGINT,
  player_option_year INT,
  team_option_year INT,
  no_trade_clause BOOLEAN DEFAULT FALSE,
  signing_bonus BIGINT DEFAULT 0,
  trade_bonus BIGINT DEFAULT 0,
  incentive_bonus BIGINT DEFAULT 0,
  contract_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  signed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_season_id INTEGER REFERENCES seasons(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, status)
);

CREATE INDEX IF NOT EXISTS idx_contracts_player ON contracts(player_id);
CREATE INDEX IF NOT EXISTS idx_contracts_team ON contracts(team_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_team_status ON contracts(team_id, status);

-- FREE AGENTS
CREATE TABLE IF NOT EXISTS free_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  fa_type VARCHAR(20) NOT NULL DEFAULT 'unrestricted',
  rights_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  money_priority INT NOT NULL DEFAULT 70,
  winning_priority INT NOT NULL DEFAULT 50,
  role_priority INT NOT NULL DEFAULT 50,
  market_size_priority INT NOT NULL DEFAULT 30,
  asking_salary BIGINT NOT NULL,
  market_value BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  became_free_agent_at TIMESTAMP DEFAULT NOW(),
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_free_agents_season ON free_agents(season_id);
CREATE INDEX IF NOT EXISTS idx_free_agents_status ON free_agents(status);
CREATE INDEX IF NOT EXISTS idx_free_agents_player_season ON free_agents(player_id, season_id);

-- CONTRACT OFFERS
CREATE TABLE IF NOT EXISTS contract_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  years INT NOT NULL CHECK (years BETWEEN 1 AND 5),
  salary_per_year BIGINT NOT NULL,
  total_value BIGINT NOT NULL,
  player_option BOOLEAN DEFAULT FALSE,
  team_option BOOLEAN DEFAULT FALSE,
  no_trade_clause BOOLEAN DEFAULT FALSE,
  signing_bonus BIGINT DEFAULT 0,
  incentive_bonus BIGINT DEFAULT 0,
  is_offer_sheet BOOLEAN DEFAULT FALSE,
  is_matching BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  offered_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_player ON contract_offers(player_id);
CREATE INDEX IF NOT EXISTS idx_offers_team ON contract_offers(team_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON contract_offers(status);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  other_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  details JSONB,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_season ON transactions(season_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- TRADE PROPOSALS
CREATE TABLE IF NOT EXISTS trade_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  team_ids UUID[] NOT NULL,
  proposed_by_team_id UUID NOT NULL REFERENCES teams(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_valid BOOLEAN NOT NULL DEFAULT FALSE,
  validation_errors TEXT[],
  summary TEXT,
  proposed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '48 hours',
  resolved_at TIMESTAMP,
  counter_to_id UUID REFERENCES trade_proposals(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_proposals_status ON trade_proposals(status);
CREATE INDEX IF NOT EXISTS idx_trade_proposals_team ON trade_proposals USING GIN(team_ids);

-- TRADE ASSETS
CREATE TABLE IF NOT EXISTS trade_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trade_proposals(id) ON DELETE CASCADE,
  from_team_id UUID NOT NULL REFERENCES teams(id),
  to_team_id UUID NOT NULL REFERENCES teams(id),
  asset_type VARCHAR(20) NOT NULL,
  player_id UUID REFERENCES players(id),
  pick_year INT,
  pick_round INT,
  pick_original_team_id UUID REFERENCES teams(id),
  is_pick_swap BOOLEAN DEFAULT FALSE,
  cash_amount BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_assets_trade ON trade_assets(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_assets_player ON trade_assets(player_id);

-- EXECUTED TRADES
CREATE TABLE IF NOT EXISTS executed_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_proposal_id UUID NOT NULL REFERENCES trade_proposals(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  details JSONB NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executed_trades_season ON executed_trades(season_id);

-- DRAFT PICK OWNERSHIP
CREATE TABLE IF NOT EXISTS draft_pick_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_year INT NOT NULL,
  round INT NOT NULL CHECK (round IN (1, 2)),
  original_team_id UUID NOT NULL REFERENCES teams(id),
  current_owner_id UUID NOT NULL REFERENCES teams(id),
  is_swapped BOOLEAN DEFAULT FALSE,
  swap_with_team_id UUID REFERENCES teams(id),
  is_protected BOOLEAN DEFAULT FALSE,
  protection_conditions TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  player_selected_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_year, round, original_team_id)
);

CREATE INDEX IF NOT EXISTS idx_pick_ownership_owner ON draft_pick_ownership(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_pick_ownership_year ON draft_pick_ownership(season_year);

-- PLAYER SEASON STATS
CREATE TABLE IF NOT EXISTS player_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  team_id UUID REFERENCES teams(id),
  games_played INT DEFAULT 0,
  games_started INT DEFAULT 0,
  minutes INT DEFAULT 0,
  points INT DEFAULT 0,
  fgm INT DEFAULT 0,
  fga INT DEFAULT 0,
  three_pm INT DEFAULT 0,
  three_pa INT DEFAULT 0,
  ftm INT DEFAULT 0,
  fta INT DEFAULT 0,
  oreb INT DEFAULT 0,
  dreb INT DEFAULT 0,
  assists INT DEFAULT 0,
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,
  turnovers INT DEFAULT 0,
  fouls INT DEFAULT 0,
  per DECIMAL(5,2),
  true_shooting_pct DECIMAL(5,3),
  effective_fg_pct DECIMAL(5,3),
  usage_rate DECIMAL(5,2),
  assist_pct DECIMAL(5,2),
  rebound_pct DECIMAL(5,2),
  offensive_rating DECIMAL(5,1),
  defensive_rating DECIMAL(5,1),
  net_rating DECIMAL(5,1),
  win_shares DECIMAL(5,2),
  box_plus_minus DECIMAL(5,2),
  value_over_replacement DECIMAL(5,2),
  ppg DECIMAL(4,1),
  rpg DECIMAL(4,1),
  apg DECIMAL(4,1),
  spg DECIMAL(4,1),
  bpg DECIMAL(4,1),
  mpg DECIMAL(4,1),
  fg_pct DECIMAL(5,3) DEFAULT 0,
  three_pct DECIMAL(5,3) DEFAULT 0,
  ft_pct DECIMAL(5,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_player_season_stats_season ON player_season_stats(season_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_team ON player_season_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_season_team ON player_season_stats(season_id, team_id);

-- TEAM SEASON STATS
CREATE TABLE IF NOT EXISTS team_season_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  games_played INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  points_for INT DEFAULT 0,
  points_against INT DEFAULT 0,
  avg_point_diff DECIMAL(4,1),
  pace DECIMAL(4,1),
  offensive_rating DECIMAL(5,1),
  defensive_rating DECIMAL(5,1),
  net_rating DECIMAL(5,1),
  fgm INT DEFAULT 0,
  fga INT DEFAULT 0,
  fg_pct DECIMAL(4,3),
  three_pm INT DEFAULT 0,
  three_pa INT DEFAULT 0,
  three_pct DECIMAL(4,3),
  ftm INT DEFAULT 0,
  fta INT DEFAULT 0,
  ft_pct DECIMAL(4,3),
  effective_fg_pct DECIMAL(4,3),
  true_shooting_pct DECIMAL(4,3),
  oreb INT DEFAULT 0,
  dreb INT DEFAULT 0,
  oreb_pct DECIMAL(4,3),
  dreb_pct DECIMAL(4,3),
  assists INT DEFAULT 0,
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,
  turnovers INT DEFAULT 0,
  turnover_pct DECIMAL(4,3),
  minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_team_season_stats_season ON team_season_stats(season_id);

-- PLAYER CAREER STATS
CREATE TABLE IF NOT EXISTS player_career_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  seasons INT DEFAULT 0,
  games_played INT DEFAULT 0,
  games_started INT DEFAULT 0,
  minutes INT DEFAULT 0,
  points INT DEFAULT 0,
  rebounds INT DEFAULT 0,
  assists INT DEFAULT 0,
  steals INT DEFAULT 0,
  blocks INT DEFAULT 0,
  career_ppg DECIMAL(4,1),
  career_rpg DECIMAL(4,1),
  career_apg DECIMAL(4,1),
  career_per DECIMAL(5,2),
  career_win_shares DECIMAL(5,2),
  all_star_appearances INT DEFAULT 0,
  all_nba_selections INT DEFAULT 0,
  championships INT DEFAULT 0,
  mvp_awards INT DEFAULT 0,
  finals_mvp_awards INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS idx_career_stats_player ON player_career_stats(player_id);

-- AWARDS
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  award_type VARCHAR(30) NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  votes INTEGER DEFAULT 0,
  stat_value DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(season_id, award_type, player_id)
);

CREATE INDEX IF NOT EXISTS idx_awards_season ON awards(season_id);
CREATE INDEX IF NOT EXISTS idx_awards_player ON awards(player_id);
CREATE INDEX IF NOT EXISTS idx_awards_type ON awards(award_type);

-- ALL-STAR SELECTIONS
CREATE TABLE IF NOT EXISTS all_star_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  player_id UUID NOT NULL REFERENCES players(id),
  conference VARCHAR(10) NOT NULL CHECK (conference IN ('east', 'west')),
  is_starter BOOLEAN DEFAULT FALSE,
  is_captain BOOLEAN DEFAULT FALSE,
  votes INTEGER DEFAULT 0,
  fan_votes INTEGER DEFAULT 0,
  player_votes INTEGER DEFAULT 0,
  media_votes INTEGER DEFAULT 0,
  selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_all_star_selections_season ON all_star_selections(season_id);
CREATE INDEX IF NOT EXISTS idx_all_star_selections_player ON all_star_selections(player_id);

-- ALL-STAR EVENTS
CREATE TABLE IF NOT EXISTS all_star_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL REFERENCES seasons(id),
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('rising_stars', 'skills', 'three_point', 'dunk', 'game')),
  winner_id UUID REFERENCES players(id),
  runner_up_id UUID REFERENCES players(id),
  mvp_id UUID REFERENCES players(id),
  winning_team VARCHAR(20),
  winning_score INTEGER,
  losing_score INTEGER,
  details JSONB,
  simulated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_all_star_events_season ON all_star_events(season_id);

-- ALL-STAR EVENT PARTICIPANTS
CREATE TABLE IF NOT EXISTS all_star_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id),
  seed INTEGER,
  score NUMERIC(6,2),
  is_eliminated BOOLEAN DEFAULT FALSE,
  round_reached INTEGER DEFAULT 1,
  details JSONB,
  UNIQUE(season_id, event_type, player_id)
);

CREATE INDEX IF NOT EXISTS idx_all_star_participants_season ON all_star_event_participants(season_id, event_type);

-- =============================================================================
-- VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW team_payroll AS
SELECT
  t.id as team_id,
  t.name as team_name,
  t.abbreviation,
  COUNT(c.id) as active_contracts,
  COALESCE(SUM(
    CASE c.years_remaining
      WHEN 5 THEN c.year_1_salary WHEN 4 THEN c.year_2_salary
      WHEN 3 THEN c.year_3_salary WHEN 2 THEN c.year_4_salary
      WHEN 1 THEN c.year_5_salary ELSE c.base_salary
    END
  ), 0) as current_payroll,
  COALESCE(SUM(
    CASE WHEN c.years_remaining >= 1 THEN c.year_1_salary ELSE 0 END +
    CASE WHEN c.years_remaining >= 2 THEN COALESCE(c.year_2_salary, 0) ELSE 0 END +
    CASE WHEN c.years_remaining >= 3 THEN COALESCE(c.year_3_salary, 0) ELSE 0 END +
    CASE WHEN c.years_remaining >= 4 THEN COALESCE(c.year_4_salary, 0) ELSE 0 END +
    CASE WHEN c.years_remaining >= 5 THEN COALESCE(c.year_5_salary, 0) ELSE 0 END
  ), 0) as total_committed
FROM teams t
LEFT JOIN contracts c ON t.id = c.team_id AND c.status = 'active'
GROUP BY t.id, t.name, t.abbreviation;

CREATE OR REPLACE VIEW league_leaders AS
SELECT
  pss.player_id,
  p.first_name || ' ' || p.last_name as player_name,
  t.abbreviation as team,
  p.position,
  pss.games_played,
  pss.ppg, pss.rpg, pss.apg, pss.spg, pss.bpg,
  pss.per, pss.true_shooting_pct, pss.win_shares, pss.box_plus_minus
FROM player_season_stats pss
JOIN players p ON pss.player_id = p.id
LEFT JOIN teams t ON pss.team_id = t.id
WHERE pss.games_played >= 10;
