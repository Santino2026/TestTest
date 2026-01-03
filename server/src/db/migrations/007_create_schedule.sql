-- Schedule and Franchise Tables

-- Scheduled games table (extends games for schedule tracking)
CREATE TABLE IF NOT EXISTS schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id INTEGER REFERENCES seasons(id) NOT NULL,
    game_id UUID REFERENCES games(id),
    home_team_id UUID REFERENCES teams(id) NOT NULL,
    away_team_id UUID REFERENCES teams(id) NOT NULL,
    game_number INTEGER NOT NULL, -- 1-82 for each team
    game_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, simulated
    is_user_game BOOLEAN DEFAULT FALSE, -- if user's team is playing
    created_at TIMESTAMP DEFAULT NOW()
);

-- Franchise save state
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- for future auth
    team_id UUID REFERENCES teams(id) NOT NULL,
    season_id INTEGER REFERENCES seasons(id) NOT NULL,

    -- Current state
    current_day INTEGER DEFAULT 1, -- day of season (1-200)
    phase VARCHAR(20) DEFAULT 'preseason', -- preseason, regular_season, playoffs, offseason

    -- History
    seasons_played INTEGER DEFAULT 0,
    championships INTEGER DEFAULT 0,
    playoff_appearances INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,

    -- Settings
    difficulty VARCHAR(20) DEFAULT 'pro', -- rookie, pro, all_star, superstar, hall_of_fame
    auto_save BOOLEAN DEFAULT TRUE,
    sim_speed VARCHAR(10) DEFAULT 'normal', -- instant, fast, normal, slow

    -- Meta
    created_at TIMESTAMP DEFAULT NOW(),
    last_played_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(team_id) -- One franchise per team for now
);

-- Playoff series tracking
CREATE TABLE IF NOT EXISTS playoff_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id INTEGER REFERENCES seasons(id) NOT NULL,
    round INTEGER NOT NULL, -- 0=play-in, 1=first round, 2=semis, 3=conf finals, 4=finals
    conference VARCHAR(10), -- 'east', 'west', or NULL for finals
    series_number INTEGER NOT NULL, -- which series in the round (1-4 for first round)

    higher_seed_id UUID REFERENCES teams(id) NOT NULL,
    lower_seed_id UUID REFERENCES teams(id) NOT NULL,
    higher_seed_wins INTEGER DEFAULT 0,
    lower_seed_wins INTEGER DEFAULT 0,

    winner_id UUID REFERENCES teams(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed

    created_at TIMESTAMP DEFAULT NOW()
);

-- Playoff game results (linked to series)
CREATE TABLE IF NOT EXISTS playoff_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    series_id UUID REFERENCES playoff_series(id) NOT NULL,
    game_id UUID REFERENCES games(id) NOT NULL,
    game_number INTEGER NOT NULL, -- 1-7

    UNIQUE(series_id, game_number)
);

-- Season history tracking
CREATE TABLE IF NOT EXISTS season_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id INTEGER REFERENCES seasons(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,

    -- Record
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,

    -- Results
    made_playoffs BOOLEAN DEFAULT FALSE,
    playoff_seed INTEGER,
    playoff_result VARCHAR(50), -- 'first_round', 'second_round', 'conf_finals', 'finals', 'champion'

    -- Awards
    mvp_player_id UUID REFERENCES players(id),

    -- Notable
    notes TEXT,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(season_id, team_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedule_season ON schedule(season_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON schedule(game_date);
CREATE INDEX IF NOT EXISTS idx_schedule_home_team ON schedule(home_team_id);
CREATE INDEX IF NOT EXISTS idx_schedule_away_team ON schedule(away_team_id);
CREATE INDEX IF NOT EXISTS idx_franchise_team ON franchises(team_id);
CREATE INDEX IF NOT EXISTS idx_playoff_series_season ON playoff_series(season_id);
CREATE INDEX IF NOT EXISTS idx_season_history_season ON season_history(season_id);
