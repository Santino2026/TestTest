export type Conference = 'Eastern' | 'Western';

export type Division =
  | 'Atlantic' | 'Central' | 'Southeast'  // Eastern
  | 'Northwest' | 'Pacific' | 'Southwest'; // Western

export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: Conference;
  division: Division;
  primary_color: string;
  secondary_color: string;
  arena_name: string;
  championships: number;
  created_at: Date;
}

export interface TeamStanding {
  team_id: string;
  team: Team;
  wins: number;
  losses: number;
  win_pct: number;
  games_behind: number;
  home_record: string;
  away_record: string;
  conference_record: string;
  division_record: string;
  streak: string;
  last_10: string;
}
