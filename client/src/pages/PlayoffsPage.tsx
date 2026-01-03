import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
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
import { Trophy, Play, ChevronRight, ArrowRight } from 'lucide-react';
import type { PlayoffSeries } from '@/api/client';

const ROUND_NAMES: Record<number, string> = {
  0: 'Play-In Tournament',
  1: 'First Round',
  2: 'Conference Semifinals',
  3: 'Conference Finals',
  4: 'Finals',
};

export default function PlayoffsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: franchise } = useFranchise();
  const { refreshFranchise } = useFranchiseContext();
  const { data: playoffs } = usePlayoffs();
  const { data: standings } = usePlayoffStandings();
  const { data: teams } = useTeams();

  // Define mutations locally so we can call refreshFranchise
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

  const finalizePlayoffs = useMutation({
    mutationFn: api.finalizePlayoffs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      refreshFranchise();
      navigate('/basketball/schedule');
    },
  });

  const handleStartPlayoffs = async () => {
    try {
      await startPlayoffs.mutateAsync();
    } catch (error) {
      console.error('Failed to start playoffs:', error);
    }
  };

  const handleSimulateGame = async (seriesId: string) => {
    try {
      await simulateGame.mutateAsync(seriesId);
    } catch (error) {
      console.error('Failed to simulate game:', error);
    }
  };

  // Pre-playoffs: Show standings and start button (no series yet)
  if (!playoffs?.series.length) {
    return (
      <PageTemplate
        title="Playoffs"
        subtitle="Playoff bracket and results"
      >
        {/* Playoff Standings */}
        {standings && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
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
                              isPlayoffTeam && 'bg-green-50',
                              isPlayIn && 'bg-amber-50',
                              team.team_id === franchise?.team_id && 'ring-2 ring-blue-500'
                            )}
                          >
                            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                              <span className="w-5 md:w-6 text-xs md:text-sm font-medium text-slate-500 flex-shrink-0">
                                {idx + 1}
                              </span>
                              <TeamLogo
                                abbreviation={team.abbreviation}
                                primaryColor={teamInfo?.primary_color || '#666'}
                                size="sm"
                              />
                              <span className="font-medium text-sm md:text-base truncate">{team.name}</span>
                            </div>
                            <span className="text-xs md:text-sm text-slate-600 flex-shrink-0">
                              {team.wins}-{team.losses}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 text-xs text-slate-500">
                      <span className="inline-block w-3 h-3 bg-green-50 rounded mr-1" /> Playoff Berth
                      <span className="inline-block w-3 h-3 bg-amber-50 rounded ml-3 mr-1" /> Play-In
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Start Playoffs Button - show when in playoffs phase but no series yet */}
        {franchise?.phase === 'playoffs' && (
          <Card>
            <CardContent className="py-8 text-center">
              <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Start Playoffs</h2>
              <p className="text-slate-500 mb-6">
                Begin the playoff tournament with the Play-In games
              </p>
              <Button
                onClick={handleStartPlayoffs}
                disabled={startPlayoffs.isPending}
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                {startPlayoffs.isPending ? 'Starting...' : 'Start Playoffs'}
              </Button>
            </CardContent>
          </Card>
        )}

        {(franchise?.phase === 'preseason' || franchise?.phase === 'regular_season') && (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Complete the regular season to access playoffs
            </CardContent>
          </Card>
        )}
      </PageTemplate>
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
    <PageTemplate
      title="Playoffs"
      subtitle={playoffs?.isComplete
        ? `Champion: ${playoffs.series.find(s => s.round === 4)?.winner_name}`
        : ROUND_NAMES[currentRound]
      }
    >
      {/* Champion Banner */}
      {playoffs?.isComplete && (
        <Card className="mb-4 md:mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="py-6 md:py-8 text-center">
            <Trophy className="w-14 h-14 md:w-20 md:h-20 mx-auto text-amber-500 mb-3 md:mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-amber-800 mb-2 truncate px-2">
              {playoffs.series.find(s => s.round === 4)?.winner_name}
            </h2>
            <p className="text-amber-600 mb-4 md:mb-6">Champions!</p>
            <Button
              onClick={() => finalizePlayoffs.mutate()}
              disabled={finalizePlayoffs.isPending}
              size="lg"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">{finalizePlayoffs.isPending ? 'Processing...' : 'Continue to Offseason'}</span>
              <span className="sm:hidden">{finalizePlayoffs.isPending ? 'Wait...' : 'Continue'}</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bracket Display */}
      <div className="space-y-4 md:space-y-8">
        {Object.entries(seriesByRound)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([round, roundSeries]) => (
            <Card key={round}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
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
                      <h4 className="text-sm font-medium text-slate-500 mb-3">
                        Eastern Conference
                      </h4>
                      <div className="space-y-3">
                        {roundSeries
                          .filter(s => s.conference === 'Eastern')
                          .map(series => (
                            <SeriesCard
                              key={series.id}
                              series={series}
                              teams={teams || []}
                              franchise={franchise}
                              onSimulate={handleSimulateGame}
                              isSimulating={simulateGame.isPending}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Western Conference */}
                  {parseInt(round) < 4 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-3">
                        Western Conference
                      </h4>
                      <div className="space-y-3">
                        {roundSeries
                          .filter(s => s.conference === 'Western')
                          .map(series => (
                            <SeriesCard
                              key={series.id}
                              series={series}
                              teams={teams || []}
                              franchise={franchise}
                              onSimulate={handleSimulateGame}
                              isSimulating={simulateGame.isPending}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Finals */}
                  {parseInt(round) === 4 && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-slate-500 mb-3 text-center">
                        NBA Finals
                      </h4>
                      <div className="max-w-md mx-auto">
                        {roundSeries.map(series => (
                          <SeriesCard
                            key={series.id}
                            series={series}
                            teams={teams || []}
                            franchise={franchise}
                            onSimulate={handleSimulateGame}
                            isSimulating={simulateGame.isPending}
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
    </PageTemplate>
  );
}

interface SeriesCardProps {
  series: PlayoffSeries;
  teams: any[];
  franchise: any;
  onSimulate: (seriesId: string) => void;
  isSimulating: boolean;
}

function SeriesCard({ series, teams, franchise, onSimulate, isSimulating }: SeriesCardProps) {
  const higherTeam = teams.find(t => t.id === series.higher_seed_id);
  const lowerTeam = teams.find(t => t.id === series.lower_seed_id);
  const isUserSeries = series.higher_seed_id === franchise?.team_id ||
                       series.lower_seed_id === franchise?.team_id;
  const canSimulate = series.status !== 'completed';

  return (
    <div
      className={cn(
        'p-2.5 md:p-3 rounded-lg border',
        series.status === 'completed' && 'bg-slate-50',
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
          <span className="truncate text-sm md:text-base">{series.higher_seed_name}</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 ml-2">
          <span className="text-base md:text-lg font-bold">{series.higher_seed_wins}</span>
          {series.winner_id === series.higher_seed_id && (
            <ChevronRight className="w-4 h-4 text-green-500" />
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
          <span className="truncate text-sm md:text-base">{series.lower_seed_name}</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 ml-2">
          <span className="text-base md:text-lg font-bold">{series.lower_seed_wins}</span>
          {series.winner_id === series.lower_seed_id && (
            <ChevronRight className="w-4 h-4 text-green-500" />
          )}
        </div>
      </div>

      {/* Simulate Button */}
      {canSimulate && (
        <Button
          onClick={() => onSimulate(series.id)}
          disabled={isSimulating}
          variant="secondary"
          size="md"
          className="w-full mt-3 min-h-[44px]"
        >
          <Play className="w-4 h-4 mr-1.5" />
          {isSimulating ? 'Simulating...' : 'Simulate Game'}
        </Button>
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
