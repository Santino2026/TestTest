import { PoolClient } from 'pg';
import { pool } from '../../db/pool';

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
}

export type DbConnection = PoolClient | typeof pool;
