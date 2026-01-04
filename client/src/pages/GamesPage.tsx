import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useTeams, useGames, useSimulateGame } from '@/api/hooks';
import { cn } from '@/lib/utils';

export default function GamesPage() {
  const { data: teams } = useTeams();
  const { data: games, isLoading } = useGames({ limit: 20 });
  const simulateMutation = useSimulateGame();

  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [lastResult, setLastResult] = useState<any>(null);

  const handleSimulate = async () => {
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return;

    try {
      const result = await simulateMutation.mutateAsync({ homeTeamId, awayTeamId });
      setLastResult(result);
    } catch (error) {
      console.error('Simulation failed:', error);
    }
  };

  const getTeamById = (id: string) => teams?.find(t => t.id === id);

  return (
    <PageTemplate
      title="Games"
      subtitle="Simulate and view game results"
    >
      {/* Simulate Game Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Simulate Game</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 md:space-y-0 md:flex md:flex-wrap md:items-end md:gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Home Team
              </label>
              <select
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white"
              >
                <option value="">Select home team...</option>
                {teams?.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.city} {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 font-bold text-center md:text-left">vs</div>

            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Away Team
              </label>
              <select
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white"
              >
                <option value="">Select away team...</option>
                {teams?.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.city} {team.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              onClick={handleSimulate}
              disabled={!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || simulateMutation.isPending}
              className="w-full md:w-auto"
            >
              {simulateMutation.isPending ? 'Simulating...' : 'Simulate Game'}
            </Button>
          </div>

          {/* Quick Result Display */}
          {lastResult && (
            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-center gap-4 md:gap-8">
                <div className="text-center flex-1">
                  <TeamLogo
                    abbreviation={getTeamById(lastResult.home_team_id)?.abbreviation || ''}
                    primaryColor={getTeamById(lastResult.home_team_id)?.primary_color || '#666'}
                    size="sm"
                  />
                  <p className="font-medium mt-1 md:mt-2 text-sm md:text-base truncate text-white">{getTeamById(lastResult.home_team_id)?.name}</p>
                  <p className={cn(
                    'text-2xl md:text-3xl font-bold',
                    lastResult.home_score > lastResult.away_score ? 'text-green-400' : 'text-white'
                  )}>
                    {lastResult.home_score}
                  </p>
                </div>

                <div className="text-center flex-shrink-0">
                  <Badge variant={lastResult.is_overtime ? 'warning' : 'secondary'}>
                    {lastResult.is_overtime ? `OT${lastResult.overtime_periods}` : 'FINAL'}
                  </Badge>
                  <Link
                    to={`/basketball/games/${lastResult.id}`}
                    className="block mt-2 text-xs md:text-sm text-blue-400 hover:underline"
                  >
                    Box Score
                  </Link>
                </div>

                <div className="text-center flex-1">
                  <TeamLogo
                    abbreviation={getTeamById(lastResult.away_team_id)?.abbreviation || ''}
                    primaryColor={getTeamById(lastResult.away_team_id)?.primary_color || '#666'}
                    size="sm"
                  />
                  <p className="font-medium mt-1 md:mt-2 text-sm md:text-base truncate text-white">{getTeamById(lastResult.away_team_id)?.name}</p>
                  <p className={cn(
                    'text-2xl md:text-3xl font-bold',
                    lastResult.away_score > lastResult.home_score ? 'text-green-400' : 'text-white'
                  )}>
                    {lastResult.away_score}
                  </p>
                </div>
              </div>

              {/* Quarter Scores */}
              <div className="mt-3 md:mt-4 overflow-x-auto">
                <table className="text-xs md:text-sm mx-auto">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="px-2 md:px-3 py-1"></th>
                      {lastResult.quarters.map((q: any) => (
                        <th key={q.quarter} className="px-2 md:px-3 py-1 text-center">
                          {q.quarter <= 4 ? `Q${q.quarter}` : `OT${q.quarter - 4}`}
                        </th>
                      ))}
                      <th className="px-2 md:px-3 py-1 text-center font-bold">T</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    <tr>
                      <td className="px-2 md:px-3 py-1 font-medium">
                        {getTeamById(lastResult.home_team_id)?.abbreviation}
                      </td>
                      {lastResult.quarters.map((q: any) => (
                        <td key={q.quarter} className="px-2 md:px-3 py-1 text-center">
                          {q.home_points}
                        </td>
                      ))}
                      <td className="px-2 md:px-3 py-1 text-center font-bold">
                        {lastResult.home_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2 md:px-3 py-1 font-medium">
                        {getTeamById(lastResult.away_team_id)?.abbreviation}
                      </td>
                      {lastResult.quarters.map((q: any) => (
                        <td key={q.quarter} className="px-2 md:px-3 py-1 text-center">
                          {q.away_points}
                        </td>
                      ))}
                      <td className="px-2 md:px-3 py-1 text-center font-bold">
                        {lastResult.away_score}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading games...</div>
          ) : games && games.length > 0 ? (
            <div className="divide-y divide-white/5">
              {games.map(game => (
                <Link
                  key={game.id}
                  to={`/basketball/games/${game.id}`}
                  className="flex items-center justify-between p-3 md:p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <div className="text-right flex-1 min-w-0">
                      <p className={cn(
                        'font-medium text-sm md:text-base truncate',
                        game.winner_id === game.home_team_id ? 'text-green-400' : 'text-white'
                      )}>
                        <span className="md:hidden">{game.home_abbrev}</span>
                        <span className="hidden md:inline">{game.home_team_name}</span>
                      </p>
                    </div>

                    <div className="text-center flex-shrink-0">
                      <p className="font-bold text-base md:text-lg text-white">
                        {game.home_score} - {game.away_score}
                      </p>
                      <Badge variant={game.is_overtime ? 'warning' : 'secondary'} className="text-xs">
                        {game.is_overtime ? `OT${game.overtime_periods}` : 'FINAL'}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-medium text-sm md:text-base truncate',
                        game.winner_id === game.away_team_id ? 'text-green-400' : 'text-white'
                      )}>
                        <span className="md:hidden">{game.away_abbrev}</span>
                        <span className="hidden md:inline">{game.away_team_name}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-slate-400 text-xs md:text-sm ml-2 flex-shrink-0">View</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              No games played yet. Simulate your first game above!
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
