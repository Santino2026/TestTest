import { useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useGame, useTeams } from '@/api/hooks';
import { cn } from '@/lib/utils';
import type { PlayerGameStats, TeamGameStats } from '@/api/client';

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: game, isLoading } = useGame(id || '');
  const { data: teams } = useTeams();

  if (isLoading) {
    return (
      <PageTemplate title="Loading..." subtitle="">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </PageTemplate>
    );
  }

  if (!game) {
    return (
      <PageTemplate title="Game Not Found" subtitle="">
        <p>The game you're looking for doesn't exist.</p>
      </PageTemplate>
    );
  }

  const homeTeam = teams?.find(t => t.id === game.home_team_id);
  const awayTeam = teams?.find(t => t.id === game.away_team_id);
  const homeStats = game.team_stats?.find((s: TeamGameStats) => s.is_home);
  const awayStats = game.team_stats?.find((s: TeamGameStats) => !s.is_home);

  const homePlayerStats = game.player_stats?.filter(
    (p: PlayerGameStats) => p.team_id === game.home_team_id
  ).sort((a: PlayerGameStats, b: PlayerGameStats) => b.points - a.points);

  const awayPlayerStats = game.player_stats?.filter(
    (p: PlayerGameStats) => p.team_id === game.away_team_id
  ).sort((a: PlayerGameStats, b: PlayerGameStats) => b.points - a.points);

  return (
    <PageTemplate
      title="Game Result"
      subtitle={`${game.home_team_name} vs ${game.away_team_name}`}
      breadcrumbs={[
        { label: 'Games', href: '/basketball/games' },
        { label: 'Box Score' },
      ]}
    >
      {/* Score Header */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="py-4 md:py-6">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <div className="text-center flex-1">
              <TeamLogo
                abbreviation={homeTeam?.abbreviation || ''}
                primaryColor={homeTeam?.primary_color || '#666'}
                size="md"
              />
              <p className="font-bold text-sm md:text-lg mt-1 md:mt-2 truncate">{game.home_team_name}</p>
              <p className={cn(
                'text-3xl md:text-4xl font-bold',
                game.winner_id === game.home_team_id ? 'text-green-600' : 'text-slate-900'
              )}>
                {game.home_score}
              </p>
              {game.winner_id === game.home_team_id && (
                <Badge variant="success" className="mt-1 text-xs">WIN</Badge>
              )}
            </div>

            <div className="text-center flex-shrink-0 px-2 md:px-8">
              <Badge variant={game.is_overtime ? 'warning' : 'secondary'} className="text-sm md:text-lg px-2 md:px-4 py-1">
                {game.is_overtime ? `OT${game.overtime_periods}` : 'FINAL'}
              </Badge>
            </div>

            <div className="text-center flex-1">
              <TeamLogo
                abbreviation={awayTeam?.abbreviation || ''}
                primaryColor={awayTeam?.primary_color || '#666'}
                size="md"
              />
              <p className="font-bold text-sm md:text-lg mt-1 md:mt-2 truncate">{game.away_team_name}</p>
              <p className={cn(
                'text-3xl md:text-4xl font-bold',
                game.winner_id === game.away_team_id ? 'text-green-600' : 'text-slate-900'
              )}>
                {game.away_score}
              </p>
              {game.winner_id === game.away_team_id && (
                <Badge variant="success" className="mt-1 text-xs">WIN</Badge>
              )}
            </div>
          </div>

          {/* Quarter Scores */}
          {game.quarters && (
            <div className="mt-4 md:mt-6 overflow-x-auto">
              <table className="text-xs md:text-sm mx-auto">
                <thead>
                  <tr className="text-slate-500">
                    <th className="px-2 md:px-4 py-2"></th>
                    {game.quarters.map((q: any) => (
                      <th key={q.quarter} className="px-2 md:px-4 py-2 text-center">
                        {q.quarter <= 4 ? `Q${q.quarter}` : `OT${q.quarter - 4}`}
                      </th>
                    ))}
                    <th className="px-2 md:px-4 py-2 text-center font-bold border-l border-slate-200">T</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-2 md:px-4 py-2 font-medium">{homeTeam?.abbreviation}</td>
                    {game.quarters.map((q: any) => (
                      <td key={q.quarter} className="px-2 md:px-4 py-2 text-center">
                        {q.home_points}
                      </td>
                    ))}
                    <td className="px-2 md:px-4 py-2 text-center font-bold border-l border-slate-200">
                      {game.home_score}
                    </td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-2 md:px-4 py-2 font-medium">{awayTeam?.abbreviation}</td>
                    {game.quarters.map((q: any) => (
                      <td key={q.quarter} className="px-2 md:px-4 py-2 text-center">
                        {q.away_points}
                      </td>
                    ))}
                    <td className="px-2 md:px-4 py-2 text-center font-bold border-l border-slate-200">
                      {game.away_score}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Stats Comparison */}
      {homeStats && awayStats && (
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Team Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
              <StatCompare label="FG" home={`${homeStats.fgm}/${homeStats.fga}`} away={`${awayStats.fgm}/${awayStats.fga}`} />
              <StatCompare label="FG%" home={`${(homeStats.fg_pct * 100).toFixed(1)}%`} away={`${(awayStats.fg_pct * 100).toFixed(1)}%`} />
              <StatCompare label="3PT" home={`${homeStats.three_pm}/${homeStats.three_pa}`} away={`${awayStats.three_pm}/${awayStats.three_pa}`} />
              <StatCompare label="3P%" home={`${(homeStats.three_pct * 100).toFixed(1)}%`} away={`${(awayStats.three_pct * 100).toFixed(1)}%`} />
              <StatCompare label="FT" home={`${homeStats.ftm}/${homeStats.fta}`} away={`${awayStats.ftm}/${awayStats.fta}`} />
              <StatCompare label="REB" home={homeStats.rebounds} away={awayStats.rebounds} />
              <StatCompare label="AST" home={homeStats.assists} away={awayStats.assists} />
              <StatCompare label="STL" home={homeStats.steals} away={awayStats.steals} />
              <StatCompare label="BLK" home={homeStats.blocks} away={awayStats.blocks} />
              <StatCompare label="TO" home={homeStats.turnovers} away={awayStats.turnovers} isLowerBetter />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Box Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Home Team Box Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TeamLogo
                abbreviation={homeTeam?.abbreviation || ''}
                primaryColor={homeTeam?.primary_color || '#666'}
                size="sm"
              />
              {game.home_team_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BoxScoreTable players={homePlayerStats || []} />
          </CardContent>
        </Card>

        {/* Away Team Box Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TeamLogo
                abbreviation={awayTeam?.abbreviation || ''}
                primaryColor={awayTeam?.primary_color || '#666'}
                size="sm"
              />
              {game.away_team_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <BoxScoreTable players={awayPlayerStats || []} />
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}

function StatCompare({
  label,
  home,
  away,
  isLowerBetter = false
}: {
  label: string;
  home: string | number;
  away: string | number;
  isLowerBetter?: boolean;
}) {
  const homeNum = typeof home === 'number' ? home : parseFloat(home) || 0;
  const awayNum = typeof away === 'number' ? away : parseFloat(away) || 0;
  const homeWins = isLowerBetter ? homeNum < awayNum : homeNum > awayNum;
  const awayWins = isLowerBetter ? awayNum < homeNum : awayNum > homeNum;

  return (
    <div className="flex items-center justify-between py-1.5 md:py-2 border-b border-slate-100">
      <span className={cn('font-medium text-xs md:text-sm', homeWins && 'text-green-600')}>{home}</span>
      <span className="text-slate-500 text-xs md:text-sm">{label}</span>
      <span className={cn('font-medium text-xs md:text-sm', awayWins && 'text-green-600')}>{away}</span>
    </div>
  );
}

function BoxScoreTable({ players }: { players: PlayerGameStats[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs md:text-sm">Player</TableHead>
            <TableHead className="text-center text-xs md:text-sm hidden sm:table-cell">MIN</TableHead>
            <TableHead className="text-center text-xs md:text-sm">PTS</TableHead>
            <TableHead className="text-center text-xs md:text-sm">REB</TableHead>
            <TableHead className="text-center text-xs md:text-sm">AST</TableHead>
            <TableHead className="text-center text-xs md:text-sm hidden sm:table-cell">FG</TableHead>
            <TableHead className="text-center text-xs md:text-sm hidden md:table-cell">3PT</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((p: PlayerGameStats) => (
            <TableRow key={p.player_id}>
              <TableCell className="py-2">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-xs md:text-sm truncate max-w-[80px] md:max-w-none">
                    {p.first_name?.charAt(0)}. {p.last_name}
                  </span>
                  {p.is_starter && (
                    <Badge variant="info" className="text-xs hidden sm:inline-flex">S</Badge>
                  )}
                </div>
                <span className="text-xs text-slate-500">{p.position}</span>
              </TableCell>
              <TableCell className="text-center text-xs md:text-sm hidden sm:table-cell">{p.minutes?.toFixed(0)}</TableCell>
              <TableCell className="text-center font-bold text-xs md:text-sm">{p.points}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{p.rebounds}</TableCell>
              <TableCell className="text-center text-xs md:text-sm">{p.assists}</TableCell>
              <TableCell className="text-center text-xs hidden sm:table-cell">
                {p.fgm}/{p.fga}
              </TableCell>
              <TableCell className="text-center text-xs hidden md:table-cell">
                {p.three_pm}/{p.three_pa}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
