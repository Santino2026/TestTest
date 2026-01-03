-- 004_create_traits.sql
-- Traits/badges system

CREATE TABLE IF NOT EXISTS traits (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('scoring', 'playmaking', 'defense', 'rebounding', 'physical', 'mental', 'negative')),
  rarity VARCHAR(15) NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary'))
);

CREATE TABLE IF NOT EXISTS player_traits (
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  trait_id VARCHAR(50) REFERENCES traits(id) ON DELETE CASCADE,
  tier VARCHAR(15) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'hall_of_fame')),
  PRIMARY KEY (player_id, trait_id)
);

CREATE INDEX idx_player_traits_player ON player_traits(player_id);
CREATE INDEX idx_player_traits_trait ON player_traits(trait_id);
