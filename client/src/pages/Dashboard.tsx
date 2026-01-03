import { Link } from 'react-router-dom';
import { Users, Trophy, Calendar, TrendingUp, Play, ChevronRight } from 'lucide-react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useTeams, useStandings, useSeason, usePlayers } from '@/api/hooks';
import { useFranchise } from '@/context/FranchiseContext';
import { cn, getStatColor } from '@/lib/utils';

export default function Dashboard() {
  const { franchise } = useFranchise();
  const { data: teams } = useTeams();
  const { data: standings } = useStandings();
  const { data: season } = useSeason();
  const { data: playersData } = usePlayers({ limit: 5 });

  // Get top 5 from each conference
  const easternStandings = standings
    ?.filter(s => s.conference === 'Eastern')
    .slice(0, 5);
  const westernStandings = standings
    ?.filter(s => s.conference === 'Western')
    .slice(0, 5);

  // Find user's team conference rank
  const userConferenceRank = standings
    ?.filter(s => s.conference === franchise?.conference)
    .findIndex(s => s.team_id === franchise?.team_id);

  const phaseLabels: Record<string, string> = {
    preseason: 'Preseason',
    regular_season: 'Regular Season',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
  };

  return (
    <PageTemplate
      title={`${franchise?.city} ${franchise?.team_name}`}
      subtitle={`Season ${season?.season_number || 1} - ${phaseLabels[franchise?.phase || 'preseason'] || 'Preseason'}`}
    >
      {/* Franchise Header Card */}
      <Card className="mb-4 md:mb-6">
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Team Logo */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg flex-shrink-0"
              style={{ backgroundColor: franchise?.primary_color || '#1a56db' }}
            >
              {franchise?.abbreviation || 'TM'}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {franchise?.city} {franchise?.team_name}
              </h2>
              <p className="text-sm text-slate-500 truncate">{franchise?.conference} Conference - {franchise?.division} Division</p>
              <div className="flex items-center gap-4 sm:gap-6 mt-2">
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900">{franchise?.wins || 0}</span>
                  <span className="text-lg sm:text-xl text-slate-400"> - </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-900">{franchise?.losses || 0}</span>
                </div>
                {userConferenceRank !== undefined && userConferenceRank >= 0 && (
                  <div className="text-sm text-slate-500">
                    #{userConferenceRank + 1} in {franchise?.conference}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-col gap-2 w-full sm:w-auto">
              <Link
                to="/basketball/schedule"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]"
              >
                <Play className="w-4 h-4" />
                Play Next Game
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to={`/basketball/teams/${franchise?.team_id}`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 active:bg-slate-300 transition-colors min-h-[44px]"
              >
                View Roster
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Season Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-slate-900">{teams?.length || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Teams</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-slate-900">{playersData?.pagination.total || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Players</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-slate-900">Day {season?.current_day || 0}</p>
              <p className="text-xs md:text-sm text-slate-500">Current</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-slate-900 capitalize truncate">{season?.status || 'Preseason'}</p>
              <p className="text-xs md:text-sm text-slate-500">Phase</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Conference Standings */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Eastern Conference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Eastern Conference</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-500">#</th>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-500">Team</th>
                    <th className="px-3 md:px-4 py-2 text-right text-xs font-semibold text-slate-500">W-L</th>
                  </tr>
                </thead>
                <tbody>
                  {easternStandings?.map((team, idx) => (
                    <tr key={team.team_id} className="border-t border-slate-100">
                      <td className="px-3 md:px-4 py-2 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-3 md:px-4 py-2">
                        <Link to={`/basketball/teams/${team.team_id}`} className="flex items-center gap-2 hover:text-blue-600">
                          <TeamLogo abbreviation={team.abbreviation} primaryColor={team.primary_color} size="sm" />
                          <span className="text-sm font-medium truncate">{team.city}</span>
                        </Link>
                      </td>
                      <td className="px-3 md:px-4 py-2 text-sm text-right whitespace-nowrap">{team.wins}-{team.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 md:px-4 py-3 border-t border-slate-100">
                <Link to="/basketball/standings" className="text-sm text-blue-600 hover:text-blue-700">
                  View full standings →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Western Conference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Western Conference</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-500">#</th>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-500">Team</th>
                    <th className="px-3 md:px-4 py-2 text-right text-xs font-semibold text-slate-500">W-L</th>
                  </tr>
                </thead>
                <tbody>
                  {westernStandings?.map((team, idx) => (
                    <tr key={team.team_id} className="border-t border-slate-100">
                      <td className="px-3 md:px-4 py-2 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-3 md:px-4 py-2">
                        <Link to={`/basketball/teams/${team.team_id}`} className="flex items-center gap-2 hover:text-blue-600">
                          <TeamLogo abbreviation={team.abbreviation} primaryColor={team.primary_color} size="sm" />
                          <span className="text-sm font-medium truncate">{team.city}</span>
                        </Link>
                      </td>
                      <td className="px-3 md:px-4 py-2 text-sm text-right whitespace-nowrap">{team.wins}-{team.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 md:px-4 py-3 border-t border-slate-100">
                <Link to="/basketball/standings" className="text-sm text-blue-600 hover:text-blue-700">
                  View full standings →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Top Players</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {playersData?.players.map((player, idx) => (
                <Link
                  key={player.id}
                  to={`/basketball/players/${player.id}`}
                  className="flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-400 w-4">{idx + 1}</span>
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                    {player.jersey_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {player.first_name} {player.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{player.team_abbrev} · {player.position}</p>
                  </div>
                  <span className={cn('text-lg font-bold', getStatColor(player.overall))}>
                    {player.overall}
                  </span>
                </Link>
              ))}
            </div>
            <div className="px-3 md:px-4 py-3 border-t border-slate-100">
              <Link to="/basketball/players" className="text-sm text-blue-600 hover:text-blue-700">
                View all players →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
