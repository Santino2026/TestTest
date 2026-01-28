import { PoolClient } from 'pg';
import { pool } from '../../db/pool';

export interface PlayRecord {
  type: string;
  quarter: number;
  game_clock: number;
  shot_clock: number;
  primary_player_id: string;
  secondary_player_id?: string;
  team_id: string;
  points: number;
  home_score: number;
  away_score: number;
  shot_type?: string;
  shot_made?: boolean;
  shot_distance?: number;
  shot_contested?: boolean;
  description: string;
}

export interface GameResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
  quarters: Array<{ quarter: number; home_points: number; away_points: number }>;
  home_stats: TeamStats;
  away_stats: TeamStats;
  home_player_stats: PlayerGameStats[];
  away_player_stats: PlayerGameStats[];
  plays?: PlayRecord[];
}

export interface TeamStats {
  points: number;
  fgm: number;
  fga: number;
  fg_pct: number;
  three_pm: number;
  three_pa: number;
  three_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  fast_break_points?: number;
  points_in_paint?: number;
  second_chance_points?: number;
}

export interface PlayerGameStats {
  player_id: string;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plus_minus: number;
}

export interface SimulatedTeam {
  id: string;
  starters: Array<{ id: string }>;
}

export interface PlayoffGameResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
  quarters: Array<{ quarter: number; home_points: number; away_points: number }>;
  home_stats: TeamStats;
  away_stats: TeamStats;
  home_player_stats: PlayerGameStats[];
  away_player_stats: PlayerGameStats[];
  plays?: PlayRecord[];
}

export type DbConnection = PoolClient | typeof pool;
