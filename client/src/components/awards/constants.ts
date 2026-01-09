import { Trophy, Medal, Star } from 'lucide-react';

export const AWARD_ICONS: Record<string, typeof Trophy> = {
  mvp: Trophy,
  fmvp: Trophy,
  dpoy: Medal,
  roy: Star,
  '6moy': Star,
  mip: Star,
};

export const AWARD_COLORS: Record<string, string> = {
  mvp: 'text-amber-400',
  fmvp: 'text-amber-400',
  dpoy: 'text-blue-400',
  roy: 'text-green-400',
  '6moy': 'text-purple-400',
  mip: 'text-orange-400',
  scoring_leader: 'text-red-400',
  rebounds_leader: 'text-cyan-400',
  assists_leader: 'text-emerald-400',
  steals_leader: 'text-yellow-400',
  blocks_leader: 'text-indigo-400',
};

export const INDIVIDUAL_AWARDS = ['mvp', 'fmvp', 'dpoy', 'roy', 'mip', '6moy'];
export const STAT_LEADERS = ['scoring_leader', 'rebounds_leader', 'assists_leader', 'steals_leader', 'blocks_leader'];
export const ALL_NBA_TEAMS = ['all_nba_1', 'all_nba_2', 'all_nba_3'];
export const ALL_DEFENSIVE_TEAMS = ['all_def_1', 'all_def_2'];

export function getMedalColorClass(type: string): string {
  if (type.includes('1')) return 'text-amber-400';
  if (type.includes('2')) return 'text-slate-300';
  return 'text-amber-700';
}
