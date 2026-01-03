import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { api } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Calendar,
  FastForward,
  Trophy,
  Zap,
  ArrowRight,
} from 'lucide-react';

export default function SchedulePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { franchise, refreshFranchise } = useFranchise();
  const [selectedMonth, setSelectedMonth] = useState('2024-10');
  const [simResult, setSimResult] = useState<any>(null);

  // Fetch schedule
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', franchise?.team_id, selectedMonth],
    queryFn: () => api.getSchedule({ team_id: franchise?.team_id, month: selectedMonth }),
    enabled: !!franchise?.team_id,
  });

  // Fetch season progress
  const { data: progress } = useQuery({
    queryKey: ['seasonProgress'],
    queryFn: api.getSeasonProgress,
    enabled: franchise?.phase === 'regular_season',
    refetchInterval: 5000,
  });

  // Mutations
  const generateSchedule = useMutation({
    mutationFn: api.generateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      refreshFranchise();
    },
  });

  const startSeason = useMutation({
    mutationFn: api.startSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      refreshFranchise();
    },
  });

  const advanceDay = useMutation({
    mutationFn: api.advanceDay,
    onSuccess: (data) => {
      setSimResult({ type: 'day', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['seasonProgress'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const advanceWeek = useMutation({
    mutationFn: api.advanceWeek,
    onSuccess: (data) => {
      setSimResult({ type: 'week', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['seasonProgress'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const advanceToPlayoffs = useMutation({
    mutationFn: api.advanceToPlayoffs,
    onSuccess: (data) => {
      setSimResult({ type: 'playoffs', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const months = [
    { value: '2024-10', label: 'October' },
    { value: '2024-11', label: 'November' },
    { value: '2024-12', label: 'December' },
    { value: '2025-01', label: 'January' },
    { value: '2025-02', label: 'February' },
    { value: '2025-03', label: 'March' },
    { value: '2025-04', label: 'April' },
  ];

  const currentMonthIndex = months.findIndex(m => m.value === selectedMonth);

  // Group schedule by date
  const scheduleByDate: Record<string, typeof schedule> = {};
  schedule?.forEach(game => {
    const date = game.game_date.split('T')[0];
    if (!scheduleByDate[date]) scheduleByDate[date] = [];
    scheduleByDate[date].push(game);
  });

  const phaseLabels: Record<string, string> = {
    preseason: 'Preseason',
    regular_season: 'Regular Season',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
  };

  const isSimulating = advanceDay.isPending || advanceWeek.isPending || advanceToPlayoffs.isPending;

  return (
    <PageTemplate
      title="Season"
      subtitle={franchise ? `${franchise.team_name} - ${phaseLabels[franchise.phase] || franchise.phase}` : 'Loading...'}
    >
      {/* Phase-specific Control Panel */}
      {franchise?.phase === 'preseason' && (
        <PreseasonPanel
          onGenerate={() => generateSchedule.mutate()}
          onStart={() => startSeason.mutate()}
          isGenerating={generateSchedule.isPending}
          isStarting={startSeason.isPending}
          hasSchedule={(schedule?.length || 0) > 0}
        />
      )}

      {franchise?.phase === 'regular_season' && (
        <RegularSeasonPanel
          progress={progress}
          onSimDay={() => advanceDay.mutate()}
          onSimWeek={() => advanceWeek.mutate()}
          onSimToPlayoffs={() => advanceToPlayoffs.mutate()}
          isSimulating={isSimulating}
          simResult={simResult}
          onClearResult={() => setSimResult(null)}
        />
      )}

      {franchise?.phase === 'playoffs' && (
        <PlayoffsPanel onGoToPlayoffs={() => navigate('/basketball/playoffs')} />
      )}

      {franchise?.phase === 'offseason' && (
        <>
          <SeasonSummaryPanel />
          <OffseasonPanel />
        </>
      )}

      {/* Month Navigation - only show for regular season */}
      {franchise?.phase === 'regular_season' && (
        <Card className="mb-6">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => currentMonthIndex > 0 && setSelectedMonth(months[currentMonthIndex - 1].value)}
                disabled={currentMonthIndex === 0}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <h3 className="text-lg font-bold">
                {months[currentMonthIndex]?.label} {selectedMonth.startsWith('2024') ? '2024' : '2025'}
              </h3>

              <Button
                variant="ghost"
                onClick={() => currentMonthIndex < months.length - 1 && setSelectedMonth(months[currentMonthIndex + 1].value)}
                disabled={currentMonthIndex === months.length - 1}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule List */}
      {scheduleLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-200 rounded-xl" />
          <div className="h-20 bg-slate-200 rounded-xl" />
        </div>
      ) : schedule && schedule.length > 0 ? (
        <div className="space-y-4">
          {Object.entries(scheduleByDate).map(([date, games]) => (
            <Card key={date}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-slate-500">
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2">
                  {games?.map(game => {
                    const isHome = game.home_team_id === franchise?.team_id;
                    const opponent = isHome ? game.away_team_name : game.home_team_name;
                    const opponentAbbrev = isHome ? game.away_abbrev : game.home_abbrev;
                    const opponentColor = isHome ? game.away_color : game.home_color;
                    const isCompleted = game.status === 'completed';

                    let result = null;
                    if (isCompleted && game.home_score !== undefined) {
                      const myScore = isHome ? game.home_score : game.away_score;
                      const oppScore = isHome ? game.away_score : game.home_score;
                      const won = game.winner_id === franchise?.team_id;
                      result = { won, myScore, oppScore };
                    }

                    return (
                      <div
                        key={game.id}
                        className={cn(
                          'flex items-center justify-between p-2.5 md:p-3 rounded-lg gap-2 min-h-[48px]',
                          game.is_user_game && 'bg-blue-50'
                        )}
                      >
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <TeamLogo
                            abbreviation={opponentAbbrev}
                            primaryColor={opponentColor}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-sm md:text-base truncate">
                              {isHome ? 'vs' : '@'} <span className="hidden sm:inline">{opponent}</span><span className="sm:hidden">{opponentAbbrev}</span>
                            </p>
                            <p className="text-xs text-slate-500">
                              Game {game.game_number}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                          {isCompleted && result ? (
                            <>
                              <Badge variant={result.won ? 'success' : 'danger'}>
                                {result.won ? 'W' : 'L'}
                              </Badge>
                              <span className="font-mono font-medium text-sm md:text-base">
                                {result.myScore}-{result.oppScore}
                              </span>
                              {game.game_id && (
                                <Link to={`/basketball/games/${game.game_id}`}>
                                  <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                                    <span className="hidden sm:inline">Box Score</span>
                                    <ChevronRight className="w-4 h-4 sm:hidden" />
                                  </Button>
                                </Link>
                              )}
                            </>
                          ) : (
                            <Badge variant="secondary">Scheduled</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-slate-500">
              {franchise?.phase === 'preseason'
                ? 'Generate a schedule to see your games.'
                : 'No games scheduled for this month.'}
            </p>
          </CardContent>
        </Card>
      )}
    </PageTemplate>
  );
}

// Preseason Panel Component
function PreseasonPanel({
  onGenerate,
  onStart,
  isGenerating,
  isStarting,
  hasSchedule,
}: {
  onGenerate: () => void;
  onStart: () => void;
  isGenerating: boolean;
  isStarting: boolean;
  hasSchedule: boolean;
}) {
  return (
    <Card className="mb-4 md:mb-6 border-2 border-blue-200 bg-blue-50">
      <CardContent className="py-4 md:py-6">
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Welcome to the Preseason!</h2>
          <p className="text-sm md:text-base text-slate-600 mb-4 md:mb-6">
            Follow these steps to start your season:
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
            <div className={cn(
              'flex flex-col items-center p-3 md:p-4 rounded-lg w-full sm:w-auto',
              hasSchedule ? 'bg-green-100 text-green-800' : 'bg-white'
            )}>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-2 text-sm md:text-base">
                1
              </div>
              <Button
                onClick={onGenerate}
                disabled={isGenerating || hasSchedule}
                variant={hasSchedule ? 'secondary' : 'primary'}
                className="w-full sm:w-auto"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {hasSchedule ? 'Schedule Ready' : isGenerating ? 'Generating...' : 'Generate Schedule'}
              </Button>
            </div>

            <div className="flex items-center">
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-slate-400 rotate-90 sm:rotate-0" />
            </div>

            <div className="flex flex-col items-center p-3 md:p-4 rounded-lg bg-white w-full sm:w-auto">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-2 text-sm md:text-base">
                2
              </div>
              <Button
                onClick={onStart}
                disabled={isStarting || !hasSchedule}
                className="w-full sm:w-auto"
              >
                <Play className="w-4 h-4 mr-2" />
                {isStarting ? 'Starting...' : 'Start Season'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Regular Season Panel Component
function RegularSeasonPanel({
  progress,
  onSimDay,
  onSimWeek,
  onSimToPlayoffs,
  isSimulating,
  simResult,
  onClearResult,
}: {
  progress: any;
  onSimDay: () => void;
  onSimWeek: () => void;
  onSimToPlayoffs: () => void;
  isSimulating: boolean;
  simResult: any;
  onClearResult: () => void;
}) {
  const progressPct = progress ? (progress.current_day / progress.total_days) * 100 : 0;
  const gamesProgressPct = progress ? (progress.user_games_completed / progress.user_games_total) * 100 : 0;

  return (
    <Card className="mb-6">
      <CardContent className="py-4">
        {/* Progress Bar */}
        {progress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Season Progress</span>
              <span>Day {progress.current_day} of {progress.total_days}</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Your Games: {progress.user_games_completed} of {progress.user_games_total}</span>
              <span>{Math.round(gamesProgressPct)}% complete</span>
            </div>
          </div>
        )}

        {/* Sim Result */}
        {simResult && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                {simResult.type === 'day' && (
                  <p className="text-green-800">
                    Simulated Day {simResult.data.day}: {simResult.data.games_played} games played
                  </p>
                )}
                {simResult.type === 'week' && (
                  <p className="text-green-800">
                    Simulated {simResult.data.days_simulated} days: {simResult.data.games_played} games played
                  </p>
                )}
                {simResult.type === 'playoffs' && (
                  <p className="text-green-800 font-bold">
                    Regular Season Complete! Your Record: {simResult.data.user_record.wins}-{simResult.data.user_record.losses}
                  </p>
                )}
              </div>
              <button onClick={onClearResult} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Simulation Controls */}
        <div className="flex flex-wrap gap-2 md:gap-3">
          <Button onClick={onSimDay} disabled={isSimulating} variant="secondary" className="min-h-[44px] flex-1 sm:flex-none">
            <FastForward className="w-4 h-4 mr-1.5 md:mr-2" />
            <span className="text-sm md:text-base">{isSimulating ? 'Simulating...' : 'Sim Day'}</span>
          </Button>

          <Button onClick={onSimWeek} disabled={isSimulating} variant="secondary" className="min-h-[44px] flex-1 sm:flex-none">
            <Zap className="w-4 h-4 mr-1.5 md:mr-2" />
            <span className="text-sm md:text-base">Sim Week</span>
          </Button>

          <Button onClick={onSimToPlayoffs} disabled={isSimulating} className="min-h-[44px] w-full sm:w-auto">
            <Trophy className="w-4 h-4 mr-1.5 md:mr-2" />
            <span className="text-sm md:text-base">Sim to Playoffs</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Playoffs Panel Component
function PlayoffsPanel({ onGoToPlayoffs }: { onGoToPlayoffs: () => void }) {
  return (
    <Card className="mb-4 md:mb-6 border-2 border-amber-200 bg-amber-50">
      <CardContent className="py-5 md:py-6 text-center">
        <Trophy className="w-10 h-10 md:w-12 md:h-12 text-amber-600 mx-auto mb-2 md:mb-3" />
        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Playoffs Time!</h2>
        <p className="text-sm md:text-base text-slate-600 mb-3 md:mb-4 px-2">
          The regular season is over. Continue to the playoffs!
        </p>
        <Button onClick={onGoToPlayoffs} size="lg" className="w-full sm:w-auto">
          <Trophy className="w-5 h-5 mr-2" />
          Go to Playoffs
        </Button>
      </CardContent>
    </Card>
  );
}

// Season Summary Panel Component (shows after playoffs complete)
function SeasonSummaryPanel() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['seasonSummary'],
    queryFn: api.getSeasonSummary,
  });

  if (isLoading) {
    return (
      <Card className="mb-4 md:mb-6 border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-50">
        <CardContent className="py-6 md:py-8 text-center">
          <div className="animate-pulse text-sm md:text-base">Loading season summary...</div>
        </CardContent>
      </Card>
    );
  }

  if (!summary?.playoffs_complete) {
    return null;
  }

  const isChampion = summary.user_team?.is_champion;

  return (
    <Card className={cn(
      "mb-4 md:mb-6 border-2",
      isChampion
        ? "border-yellow-400 bg-gradient-to-b from-yellow-50 via-amber-50 to-orange-50"
        : "border-slate-200 bg-slate-50"
    )}>
      <CardContent className="py-5 md:py-8 text-center">
        {/* Champion Banner */}
        <div className="mb-4 md:mb-6">
          <Trophy className={cn(
            "w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-3",
            isChampion ? "text-yellow-500" : "text-slate-400"
          )} />
          <h2 className={cn(
            "text-xl md:text-2xl font-bold mb-2",
            isChampion ? "text-yellow-700" : "text-slate-700"
          )}>
            Season {summary.season_number} Complete
          </h2>
        </div>

        {/* Champion Info */}
        {summary.champion && (
          <div className={cn(
            "p-4 md:p-6 rounded-xl mb-4 md:mb-6",
            isChampion ? "bg-yellow-100" : "bg-white"
          )}>
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">
              {isChampion ? 'CONGRATULATIONS!' : 'NBA CHAMPIONS'}
            </p>
            <h3 className={cn(
              "text-2xl md:text-3xl font-bold mb-2 truncate",
              isChampion ? "text-yellow-700" : "text-slate-900"
            )}>
              {summary.champion.city} {summary.champion.name}
            </h3>
            <p className="text-sm md:text-base text-slate-600">
              Won NBA Finals {summary.champion.series_score}
            </p>
          </div>
        )}

        {/* User Team Summary */}
        <div className="bg-white p-3 md:p-4 rounded-xl mb-4 md:mb-6">
          <h4 className="font-bold text-slate-900 mb-2 md:mb-3 text-sm md:text-base">Your Season</h4>
          <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
            <div>
              <p className="text-xl md:text-2xl font-bold text-slate-900">
                {summary.user_team?.wins}-{summary.user_team?.losses}
              </p>
              <p className="text-xs md:text-sm text-slate-500">Regular Season</p>
            </div>
            <div>
              <p className={cn(
                "text-base md:text-lg font-bold truncate",
                isChampion ? "text-yellow-600" : "text-slate-900"
              )}>
                {summary.user_team?.playoff_finish}
              </p>
              <p className="text-xs md:text-sm text-slate-500">Playoff Result</p>
            </div>
          </div>
        </div>

        {/* Top Teams */}
        <div className="bg-white p-3 md:p-4 rounded-xl">
          <h4 className="font-bold text-slate-900 mb-2 md:mb-3 text-sm md:text-base">Final Standings (Top 8)</h4>
          <div className="space-y-1 text-xs md:text-sm">
            {summary.top_standings?.map((team, idx) => (
              <div
                key={team.abbreviation}
                className={cn(
                  "flex justify-between px-2 py-1 rounded",
                  team.abbreviation === summary.user_team?.abbreviation && "bg-blue-50"
                )}
              >
                <span className="truncate">{idx + 1}. {team.name}</span>
                <span className="text-slate-500 flex-shrink-0 ml-2">{team.wins}-{team.losses}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Offseason Panel Component
function OffseasonPanel() {
  const queryClient = useQueryClient();
  const { refreshFranchise } = useFranchise();

  const processOffseason = useMutation({
    mutationFn: api.processOffseason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      refreshFranchise();
    },
  });

  const startNewSeason = useMutation({
    mutationFn: api.startNewSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      queryClient.invalidateQueries({ queryKey: ['seasonSummary'] });
      refreshFranchise();
    },
  });

  return (
    <Card className="mb-4 md:mb-6 border-2 border-purple-200 bg-purple-50">
      <CardContent className="py-5 md:py-6 text-center">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-2">Offseason</h2>
        <p className="text-sm md:text-base text-slate-600 mb-3 md:mb-4 px-2">
          Process player development, aging, and prepare for the next season.
        </p>

        {processOffseason.data ? (
          <div className="mb-4 p-3 md:p-4 bg-white rounded-lg text-left">
            <h3 className="font-bold mb-2 text-sm md:text-base">Offseason Summary</h3>
            <ul className="text-xs md:text-sm text-slate-600 space-y-1">
              <li>Players improved: {processOffseason.data.summary.improved}</li>
              <li>Players declined: {processOffseason.data.summary.declined}</li>
              <li>Retirements: {processOffseason.data.summary.retirements}</li>
              <li>Contracts expired: {processOffseason.data.summary.contracts_expired}</li>
            </ul>
          </div>
        ) : null}

        <div className="flex justify-center gap-3">
          {!processOffseason.data ? (
            <Button
              onClick={() => processOffseason.mutate()}
              disabled={processOffseason.isPending}
              className="w-full sm:w-auto"
            >
              {processOffseason.isPending ? 'Processing...' : 'Process Offseason'}
            </Button>
          ) : (
            <Button
              onClick={() => startNewSeason.mutate()}
              disabled={startNewSeason.isPending}
              className="w-full sm:w-auto"
            >
              <Play className="w-4 h-4 mr-2" />
              {startNewSeason.isPending ? 'Starting...' : 'Start New Season'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
