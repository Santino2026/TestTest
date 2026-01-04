import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { api } from '@/api/client';
import { cn, getStatColor } from '@/lib/utils';

const STAT_CATEGORIES = [
  { key: 'points', label: 'Points' },
  { key: 'rebounds', label: 'Rebounds' },
  { key: 'assists', label: 'Assists' },
  { key: 'steals', label: 'Steals' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'fg_pct', label: 'FG%' },
  { key: 'three_pct', label: '3P%' },
];

export default function StatsPage() {
  const [selectedStat, setSelectedStat] = useState('points');

  const { data: leaders, isLoading } = useQuery({
    queryKey: ['statLeaders', selectedStat],
    queryFn: () => api.getStatLeaders({ stat: selectedStat, limit: 10 }),
  });

  const { data: rankings } = useQuery({
    queryKey: ['teamRankings'],
    queryFn: api.getTeamRankings,
  });

  return (
    <PageTemplate
      title="Statistics"
      subtitle="League leaders and team rankings"
    >
      {/* Stat Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:mb-6 -mx-4 px-4 md:mx-0 md:px-0">
        {STAT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedStat(cat.key)}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap min-h-[44px] transition-colors',
              selectedStat === cat.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-white/5 active:bg-white/10'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* League Leaders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              {STAT_CATEGORIES.find(c => c.key === selectedStat)?.label} Leaders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : leaders?.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No stats available yet. Play some games first!
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {leaders?.map((player, idx) => (
                  <Link
                    key={player.player_id}
                    to={`/basketball/players/${player.player_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <span className={cn(
                      'w-6 text-center font-bold',
                      idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-500' : 'text-slate-500'
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {player.first_name} {player.last_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {player.team_abbrev} · {player.position}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-lg font-bold', getStatColor(player.stat_value))}>
                        {selectedStat.includes('pct')
                          ? `${(player.stat_value * 100).toFixed(1)}%`
                          : player.stat_value.toFixed(1)
                        }
                      </p>
                      <p className="text-xs text-slate-400">{player.games_played} GP</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Team Rankings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!rankings?.length ? (
              <div className="p-8 text-center text-slate-400">
                No team stats available yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Team</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">ORtg</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">DRtg</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((team, idx) => (
                      <tr key={team.team_id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 text-sm text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <Link
                            to={`/basketball/teams/${team.team_id}`}
                            className="flex items-center gap-2 hover:text-blue-400"
                          >
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: team.primary_color }}
                            >
                              {team.abbreviation.slice(0, 2)}
                            </div>
                            <span className="text-sm font-medium text-white truncate">{team.abbreviation}</span>
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-white">{team.offensive_rating.toFixed(1)}</td>
                        <td className="px-3 py-2 text-sm text-right text-white">{team.defensive_rating.toFixed(1)}</td>
                        <td className={cn(
                          'px-3 py-2 text-sm text-right font-medium',
                          team.net_rating > 0 ? 'text-green-400' : team.net_rating < 0 ? 'text-red-400' : 'text-slate-300'
                        )}>
                          {team.net_rating > 0 ? '+' : ''}{team.net_rating.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
