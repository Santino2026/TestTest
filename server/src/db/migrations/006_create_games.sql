-- Games and Play-by-Play Tables

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id INTEGER REFERENCES seasons(id),
    home_team_id UUID REFERENCES teams(id) NOT NULL,
    away_team_id UUID REFERENCES teams(id) NOT NULL,
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    winner_id UUID REFERENCES teams(id),
    is_overtime BOOLEAN DEFAULT FALSE,
    overtime_periods INTEGER DEFAULT 0,
    game_date DATE,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed
    is_playoff BOOLEAN DEFAULT FALSE,
    playoff_round INTEGER,
    playoff_game_number INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Quarter scores
CREATE TABLE IF NOT EXISTS game_quarters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    quarter INTEGER NOT NULL,
    home_points INTEGER NOT NULL DEFAULT 0,
    away_points INTEGER NOT NULL DEFAULT 0
);

-- Play-by-play
CREATE TABLE IF NOT EXISTS plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    play_type VARCHAR(30) NOT NULL,
    quarter INTEGER NOT NULL,
    game_clock INTEGER NOT NULL, -- seconds remaining
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

-- Player game stats
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

-- Team game stats
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_season ON games(season_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_plays_game ON plays(game_id);
CREATE INDEX IF NOT EXISTS idx_plays_player ON plays(primary_player_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_game ON player_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_player ON player_game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_team_game_stats_game ON team_game_stats(game_id);
