import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import {
  useFranchise,
  usePlayoffs,
  usePlayoffStandings,
  useTeams,
} from '@/api/hooks';
import { useFranchise as useFranchiseContext } from '@/context/FranchiseContext';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { Trophy, Play, ChevronRight, ArrowRight, FastForward, SkipForward } from 'lucide-react';
import type { PlayoffSeries } from '@/api/client';

const ROUND_NAMES: Record<number, string> = {
  0: 'Play-In Tournament',
  1: 'First Round',
  2: 'Conference Semifinals',
  3: 'Conference Finals',
  4: 'Finals',
};

export function PlayoffsContent() {
  const queryClient = useQueryClient();
  const { data: franchise } = useFranchise();
  const { refreshFranchise } = useFranchiseContext();
  const { data: playoffs } = usePlayoffs();
  const { data: standings } = usePlayoffStandings();
  const { data: teams } = useTeams();

  const startPlayoffs = useMutation({
    mutationFn: api.startPlayoffs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      refreshFranchise();
    },
  });

  const simulateGame = useMutation({
    mutationFn: (seriesId: string) => api.simulatePlayoffGame(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      refreshFranchise();
    },
  });

  const simulateSeries = useMutation({
    mutationFn: (seriesId: string) => api.simulatePlayoffSeries(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      refreshFranchise();
    },
  });

  const simulateRound = useMutation({
    mutationFn: api.simulatePlayoffRound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      refreshFranchise();
    },
  });

  const simulateAll = useMutation({
    mutationFn: api.simulatePlayoffAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      refreshFranchise();
    },
  });

  const finalizePlayoffs = useMutation({
    mutationFn: api.finalizePlayoffs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      refreshFranchise();
    },
  });

  const isAnySimulating = simulateGame.isPending || simulateSeries.isPending ||
                          simulateRound.isPending || simulateAll.isPending;

  // Pre-playoffs: Show standings and start button
  if (!playoffs?.series.length) {
    return (
      <>
        {/* Playoff Standings */}
        {standings && (
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {['Eastern', 'Western'].map(conf => {
              const confTeams = conf === 'Eastern' ? standings.eastern : standings.western;
              return (
                <Card key={conf}>
                  <CardHeader>
                    <CardTitle>{conf} Conference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {confTeams?.slice(0, 10).map((team, idx) => {
                        const teamInfo = teams?.find(t => t.id === team.team_id);
                        const isPlayoffTeam = idx < 6;
                        const isPlayIn = idx >= 6 && idx < 10;

                        return (
                          <div
                            key={team.team_id}
                            className={cn(
                              'flex items-center justify-between p-2 rounded gap-2',
                              isPlayoffTeam && 'bg-green-900/30',
                              isPlayIn && 'bg-amber-900/30',
                              team.team_id === franchise?.team_id && 'ring-2 ring-blue-500'
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-6 text-sm font-medium text-slate-400 flex-shrink-0">
                                {idx + 1}
                              </span>
                              <TeamLogo
                                abbreviation={team.abbreviation}
                                primaryColor={teamInfo?.primary_color || '#666'}
                                size="sm"
                              />
                              <span className="font-medium text-sm truncate text-white">{team.name}</span>
                            </div>
                            <span className="text-sm text-slate-300 flex-shrink-0">
                              {team.wins}-{team.losses}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-xs text-slate-400">
                      <span className="inline-block w-3 h-3 bg-green-900/30 rounded mr-1" /> Playoff Berth
                      <span className="inline-block w-3 h-3 bg-amber-900/30 rounded ml-3 mr-1" /> Play-In
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Start Playoffs Button */}
        {franchise?.phase === 'playoffs' && (
          <Card>
            <CardContent className="py-8 text-center">
              <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-white">Start Playoffs</h2>
              <p className="text-slate-400 mb-6">
                Begin the playoff tournament with the Play-In games
              </p>
              <Button
                onClick={() => startPlayoffs.mutate()}
                disabled={startPlayoffs.isPending}
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                {startPlayoffs.isPending ? 'Starting...' : 'Start Playoffs'}
              </Button>
            </CardContent>
          </Card>
        )}
      </>
    );
  }

  // Group series by round
  const seriesByRound: Record<number, PlayoffSeries[]> = {};
  playoffs?.series.forEach(s => {
    if (!seriesByRound[s.round]) seriesByRound[s.round] = [];
    seriesByRound[s.round].push(s);
  });

  const currentRound = playoffs?.round || 0;

  return (
    <>
      {/* Quick Actions Bar */}
      {!playoffs?.isComplete && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-400">
                <span className="font-medium text-white">{ROUND_NAMES[currentRound]}</span>
                {' · '}
                {seriesByRound[currentRound]?.filter(s => s.status === 'completed').length || 0}/
                {seriesByRound[currentRound]?.length || 0} series complete
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => simulateRound.mutate()}
                  disabled={isAnySimulating}
                  variant="secondary"
                  size="md"
                >
                  <FastForward className="w-4 h-4 mr-1.5" />
                  {simulateRound.isPending ? 'Simulating...' : 'Sim Round'}
                </Button>
                <Button
                  onClick={() => simulateAll.mutate()}
                  disabled={isAnySimulating}
                  variant="primary"
                  size="md"
                >
                  <SkipForward className="w-4 h-4 mr-1.5" />
                  {simulateAll.isPending ? 'Simulating...' : 'Sim All'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Champion Banner */}
      {playoffs?.isComplete && (
        <Card className="mb-4 bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border-amber-500/30">
          <CardContent className="py-8 text-center">
            <Trophy className="w-20 h-20 mx-auto text-amber-500 mb-4" />
            <h2 className="text-3xl font-bold text-amber-400 mb-2">
              {playoffs.series.find(s => s.round === 4)?.winner_name}
            </h2>
            <p className="text-amber-300 mb-6">Champions!</p>
            <Button
              onClick={() => finalizePlayoffs.mutate()}
              disabled={finalizePlayoffs.isPending}
              size="lg"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              {finalizePlayoffs.isPending ? 'Processing...' : 'Continue to Offseason'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bracket Display */}
      <div className="space-y-4">
        {Object.entries(seriesByRound)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([round, roundSeries]) => (
            <Card key={round}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {ROUND_NAMES[parseInt(round)]}
                  {parseInt(round) === currentRound && !playoffs?.isComplete && (
                    <Badge variant="info">Current</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Eastern Conference */}
                  {parseInt(round) < 4 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Eastern Conference</h4>
                      <div className="space-y-3">
                        {roundSeries
                          .filter(s => s.conference === 'Eastern')
                          .map(series => (
                            <SeriesCard
                              key={series.id}
                              series={series}
                              teams={teams || []}
                              franchise={franchise}
                              onSimulateGame={(id) => simulateGame.mutate(id)}
                              onSimulateSeries={(id) => simulateSeries.mutate(id)}
                              isSimulating={isAnySimulating}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Western Conference */}
                  {parseInt(round) < 4 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-3">Western Conference</h4>
                      <div className="space-y-3">
                        {roundSeries
                          .filter(s => s.conference === 'Western')
                          .map(series => (
                            <SeriesCard
                              key={series.id}
                              series={series}
                              teams={teams || []}
                              franchise={franchise}
                              onSimulateGame={(id) => simulateGame.mutate(id)}
                              onSimulateSeries={(id) => simulateSeries.mutate(id)}
                              isSimulating={isAnySimulating}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Finals */}
                  {parseInt(round) === 4 && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-slate-400 mb-3 text-center">NBA Finals</h4>
                      <div className="max-w-md mx-auto">
                        {roundSeries.map(series => (
                          <SeriesCard
                            key={series.id}
                            series={series}
                            teams={teams || []}
                            franchise={franchise}
                            onSimulateGame={(id) => simulateGame.mutate(id)}
                            onSimulateSeries={(id) => simulateSeries.mutate(id)}
                            isSimulating={isAnySimulating}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </>
  );
}

function SeriesCard({
  series,
  teams,
  franchise,
  onSimulateGame,
  onSimulateSeries,
  isSimulating,
}: {
  series: PlayoffSeries;
  teams: any[];
  franchise: any;
  onSimulateGame: (seriesId: string) => void;
  onSimulateSeries: (seriesId: string) => void;
  isSimulating: boolean;
}) {
  const higherTeam = teams.find(t => t.id === series.higher_seed_id);
  const lowerTeam = teams.find(t => t.id === series.lower_seed_id);
  const isUserSeries = series.higher_seed_id === franchise?.team_id ||
                       series.lower_seed_id === franchise?.team_id;
  const canSimulate = series.status !== 'completed';

  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-white/10',
        series.status === 'completed' && 'bg-slate-800/50',
        isUserSeries && 'ring-2 ring-blue-500'
      )}
    >
      {/* Higher Seed */}
      <div className={cn(
        'flex items-center justify-between mb-2',
        series.winner_id === series.higher_seed_id && 'font-bold'
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamLogo
            abbreviation={series.higher_abbrev}
            primaryColor={higherTeam?.primary_color || '#666'}
            size="sm"
          />
          <span className="truncate text-sm text-white">{series.higher_seed_name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-lg font-bold text-white">{series.higher_seed_wins}</span>
          {series.winner_id === series.higher_seed_id && (
            <ChevronRight className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>

      {/* Lower Seed */}
      <div className={cn(
        'flex items-center justify-between',
        series.winner_id === series.lower_seed_id && 'font-bold'
      )}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TeamLogo
            abbreviation={series.lower_abbrev}
            primaryColor={lowerTeam?.primary_color || '#666'}
            size="sm"
          />
          <span className="truncate text-sm text-white">{series.lower_seed_name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-lg font-bold text-white">{series.lower_seed_wins}</span>
          {series.winner_id === series.lower_seed_id && (
            <ChevronRight className="w-4 h-4 text-green-400" />
          )}
        </div>
      </div>

      {/* Simulate Buttons */}
      {canSimulate && (
        <div className="flex gap-2 mt-3">
          <Button
            onClick={() => onSimulateGame(series.id)}
            disabled={isSimulating}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-1" />
            Game
          </Button>
          <Button
            onClick={() => onSimulateSeries(series.id)}
            disabled={isSimulating}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <FastForward className="w-4 h-4 mr-1" />
            Series
          </Button>
        </div>
      )}

      {/* Series Complete */}
      {series.status === 'completed' && (
        <div className="text-center mt-2">
          <Badge variant="success">{series.winner_name} wins</Badge>
        </div>
      )}
    </div>
  );
}
