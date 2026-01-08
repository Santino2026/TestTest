import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { api, ScheduledGame } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  FastForward,
  Trophy,
  Zap,
} from 'lucide-react';

// Phase-specific content components
import { AllStarContent } from '@/components/season-hub/AllStarContent';
import { AwardsContent } from '@/components/season-hub/AwardsContent';
import { PlayoffsContent } from '@/components/season-hub/PlayoffsContent';
import { OffseasonContent } from '@/components/season-hub/OffseasonContent';

export default function SchedulePage() {
  const { franchise } = useFranchise();

  // Render phase-specific content
  const renderPhaseContent = () => {
    switch (franchise?.phase) {
      case 'preseason':
      case 'regular_season':
        return <CalendarContent />;
      case 'all_star':
        return <AllStarContent />;
      case 'awards':
        return <AwardsContent />;
      case 'playoffs':
        return <PlayoffsContent />;
      case 'offseason':
        return <OffseasonContent offseasonPhase={franchise.offseason_phase ?? undefined} />;
      default:
        return <CalendarContent />;
    }
  };

  // No PageTemplate wrapper - content fills the main area directly
  return (
    <div className="p-4 md:p-6">
      {renderPhaseContent()}
    </div>
  );
}

// Calendar Content (for preseason and regular season)
function CalendarContent() {
  const queryClient = useQueryClient();
  const { franchise, refreshFranchise } = useFranchise();
  const [selectedMonth, setSelectedMonth] = useState('2024-10');
  const [simResult, setSimResult] = useState<any>(null);

  const isPreseason = franchise?.phase === 'preseason';
  const isRegularSeason = franchise?.phase === 'regular_season';

  // Fetch schedule
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['schedule', franchise?.team_id, franchise?.season_id, selectedMonth, isPreseason],
    queryFn: () => api.getSchedule({
      team_id: franchise?.team_id,
      season_id: franchise?.season_id,
      month: selectedMonth,
      include_preseason: isPreseason ? 'true' : undefined,
    }),
    enabled: !!franchise?.team_id && !!franchise?.season_id,
  });

  // Fetch all schedule for finding next game
  const { data: fullSchedule } = useQuery({
    queryKey: ['schedule', 'full', franchise?.team_id, franchise?.season_id, isPreseason],
    queryFn: () => api.getSchedule({
      team_id: franchise?.team_id,
      season_id: franchise?.season_id,
      include_preseason: isPreseason ? 'true' : undefined,
    }),
    enabled: !!franchise?.team_id && !!franchise?.season_id,
  });

  // Find next scheduled game
  const nextGame = useMemo(() => {
    if (!fullSchedule) return null;
    return fullSchedule.find((g: ScheduledGame) => g.status === 'scheduled');
  }, [fullSchedule]);

  // Preseason mutations
  const advancePreseasonDay = useMutation({
    mutationFn: api.advancePreseasonDay,
    onSuccess: (data) => {
      setSimResult({ type: 'preseason_day', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      refreshFranchise();
    },
    onError: (error: Error) => {
      alert(`Failed to advance preseason: ${error.message}`);
    },
  });

  const advancePreseasonAll = useMutation({
    mutationFn: api.advancePreseasonAll,
    onSuccess: (data) => {
      setSimResult({ type: 'preseason_all', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['season'] });
      refreshFranchise();
    },
    onError: (error: Error) => {
      alert(`Failed to simulate preseason: ${error.message}`);
    },
  });

  // Regular season mutations
  const advanceDay = useMutation({
    mutationFn: api.advanceDay,
    onSuccess: (data) => {
      setSimResult({ type: 'day', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
    onError: (error: Error) => {
      alert(`Failed to advance day: ${error.message}`);
    },
  });

  const advanceWeek = useMutation({
    mutationFn: api.advanceWeek,
    onSuccess: (data) => {
      setSimResult({ type: 'week', data });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
    onError: (error: Error) => {
      alert(`Failed to advance week: ${error.message}`);
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
    onError: (error: Error) => {
      alert(`Failed to simulate to playoffs: ${error.message}`);
    },
  });

  const months = [
    { value: '2024-10', label: 'October', year: 2024 },
    { value: '2024-11', label: 'November', year: 2024 },
    { value: '2024-12', label: 'December', year: 2024 },
    { value: '2025-01', label: 'January', year: 2025 },
    { value: '2025-02', label: 'February', year: 2025 },
    { value: '2025-03', label: 'March', year: 2025 },
    { value: '2025-04', label: 'April', year: 2025 },
  ];

  const currentMonthIndex = months.findIndex(m => m.value === selectedMonth);
  const currentMonth = months[currentMonthIndex];

  const isSimulating = advanceDay.isPending || advanceWeek.isPending ||
    advanceToPlayoffs.isPending || advancePreseasonDay.isPending || advancePreseasonAll.isPending;

  return (
    <>
      {/* Sim Controls */}
      <SimControlsBar
        isSimulating={isSimulating}
        simResult={simResult}
        onClearResult={() => setSimResult(null)}
        onSimDay={() => isPreseason ? advancePreseasonDay.mutate() : advanceDay.mutate()}
        onSimWeek={() => isPreseason ? advancePreseasonAll.mutate() : advanceWeek.mutate()}
        onSimToPlayoffs={isRegularSeason ? () => advanceToPlayoffs.mutate() : undefined}
      />

      {/* Next Game Banner */}
      {nextGame && (
        <NextGameBanner
          game={nextGame}
          userTeamId={franchise?.team_id}
          onSimDay={() => isPreseason ? advancePreseasonDay.mutate() : advanceDay.mutate()}
          isSimulating={isSimulating}
        />
      )}

      {/* Month Navigation */}
      <Card className="mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => currentMonthIndex > 0 && setSelectedMonth(months[currentMonthIndex - 1].value)}
              disabled={currentMonthIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <h3 className="text-lg font-bold text-white">
              {currentMonth?.label} {currentMonth?.year}
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

      {/* Calendar Grid */}
      {scheduleLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-800/50 rounded" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <MonthCalendar
          month={selectedMonth}
          games={schedule || []}
          userTeamId={franchise?.team_id}
          nextGameId={nextGame?.id}
        />
      )}
    </>
  );
}

// Sim Controls Bar - compact controls with result display
function SimControlsBar({
  isSimulating,
  simResult,
  onClearResult,
  onSimDay,
  onSimWeek,
  onSimToPlayoffs,
}: {
  isSimulating: boolean;
  simResult: any;
  onClearResult: () => void;
  onSimDay: () => void;
  onSimWeek: () => void;
  onSimToPlayoffs?: () => void;
}) {
  return (
    <>
      {/* Sim Result Banner */}
      {simResult && (
        <div className="mb-3 p-2 bg-green-900/30 border border-green-500/30 rounded-lg">
          <div className="flex justify-between items-center">
            <p className="text-sm text-green-400">
              {simResult.type === 'preseason_day' && `Day simulated: ${simResult.data.games_played || 0} games`}
              {simResult.type === 'preseason_all' && `Preseason complete!`}
              {simResult.type === 'day' && `Day ${simResult.data.day}: ${simResult.data.games_played} games`}
              {simResult.type === 'week' && `${simResult.data.days_simulated} days: ${simResult.data.games_played} games`}
              {simResult.type === 'playoffs' && `Season Complete! ${simResult.data.user_record?.wins}-${simResult.data.user_record?.losses}`}
            </p>
            <button onClick={onClearResult} className="text-slate-400 hover:text-slate-300 px-2">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Compact Sim Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          onClick={onSimDay}
          disabled={isSimulating}
          variant="secondary"
          size="sm"
        >
          <FastForward className="w-4 h-4 mr-1" />
          {isSimulating ? '...' : 'Sim Day'}
        </Button>

        <Button
          onClick={onSimWeek}
          disabled={isSimulating}
          variant="secondary"
          size="sm"
        >
          <Zap className="w-4 h-4 mr-1" />
          Sim Week
        </Button>

        {onSimToPlayoffs && (
          <Button
            onClick={onSimToPlayoffs}
            disabled={isSimulating}
            size="sm"
          >
            <Trophy className="w-4 h-4 mr-1" />
            Sim to Playoffs
          </Button>
        )}
      </div>
    </>
  );
}

// Next Game Banner
function NextGameBanner({
  game,
  userTeamId,
  onSimDay,
  isSimulating,
}: {
  game: ScheduledGame;
  userTeamId?: string;
  onSimDay: () => void;
  isSimulating: boolean;
}) {
  const isHome = game.home_team_id === userTeamId;
  const opponent = isHome ? game.away_team_name : game.home_team_name;
  const opponentAbbrev = isHome ? game.away_abbrev : game.home_abbrev;
  const opponentColor = isHome ? game.away_color : game.home_color;
  const gameDate = new Date(game.game_date);

  return (
    <Card className="mb-4 border-2 border-blue-500/50 bg-blue-900/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <TeamLogo abbreviation={opponentAbbrev} primaryColor={opponentColor} size="md" />
            <div className="min-w-0">
              <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Next Game</p>
              <p className="font-bold text-white truncate">
                {isHome ? 'vs' : '@'} {opponent}
              </p>
              <p className="text-sm text-slate-400">
                {gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' '}&bull;{' '}
                {isHome ? 'Home' : 'Away'}
              </p>
            </div>
          </div>

          <Button
            onClick={onSimDay}
            disabled={isSimulating}
            size="lg"
            className="flex-shrink-0"
          >
            <Play className="w-5 h-5 mr-2" />
            {isSimulating ? 'Playing...' : 'Play'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Month Calendar Grid
function MonthCalendar({
  month,
  games,
  userTeamId,
  nextGameId,
}: {
  month: string;
  games: ScheduledGame[];
  userTeamId?: string;
  nextGameId?: string;
}) {
  const [year, monthNum] = month.split('-').map(Number);

  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const gamesByDate = useMemo(() => {
    const map = new Map<number, ScheduledGame[]>();
    games.forEach(game => {
      const date = new Date(game.game_date);
      if (date.getFullYear() === year && date.getMonth() === monthNum - 1) {
        const day = date.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(game);
      }
    });
    return map;
  }, [games, year, monthNum]);

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, idx) => {
            if (day === null) {
              return <div key={idx} className="min-h-[70px] md:min-h-[80px] bg-slate-900/30 rounded" />;
            }

            const dayGames = gamesByDate.get(day) || [];
            const game = dayGames[0];

            return (
              <CalendarDay
                key={idx}
                day={day}
                game={game}
                userTeamId={userTeamId}
                isNextGame={game?.id === nextGameId}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Calendar Day Cell
function CalendarDay({
  day,
  game,
  userTeamId,
  isNextGame,
}: {
  day: number;
  game?: ScheduledGame;
  userTeamId?: string;
  isNextGame: boolean;
}) {
  if (!game) {
    return (
      <div className="min-h-[70px] md:min-h-[80px] p-1 bg-slate-800/30 rounded">
        <span className="text-xs text-slate-600">{day}</span>
      </div>
    );
  }

  const isHome = game.home_team_id === userTeamId;
  const opponentAbbrev = isHome ? game.away_abbrev : game.home_abbrev;
  const opponentColor = isHome ? game.away_color : game.home_color;
  const isCompleted = game.status === 'completed';

  let result: { won: boolean; myScore: number; oppScore: number } | null = null;
  if (isCompleted && game.home_score !== undefined && game.away_score !== undefined) {
    const myScore = isHome ? game.home_score : game.away_score;
    const oppScore = isHome ? game.away_score : game.home_score;
    result = { won: game.winner_id === userTeamId, myScore, oppScore };
  }

  const cellContent = (
    <div
      className={cn(
        'min-h-[70px] md:min-h-[80px] p-1 rounded transition-colors flex flex-col',
        isNextGame && 'ring-2 ring-blue-500 bg-blue-900/40',
        !isNextGame && isCompleted && result?.won && 'bg-green-900/30',
        !isNextGame && isCompleted && !result?.won && 'bg-red-900/30',
        !isNextGame && !isCompleted && 'bg-slate-800/50 hover:bg-slate-800/70'
      )}
    >
      <span className={cn(
        'text-xs',
        isNextGame ? 'text-blue-400 font-bold' : 'text-slate-500'
      )}>
        {day}
      </span>

      <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">{isHome ? 'vs' : '@'}</span>
          <div
            className="w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: opponentColor }}
          >
            {opponentAbbrev.slice(0, 2)}
          </div>
        </div>

        {isCompleted && result ? (
          <div className="text-center">
            <Badge
              variant={result.won ? 'success' : 'danger'}
              className="text-[10px] px-1 py-0"
            >
              {result.won ? 'W' : 'L'}
            </Badge>
            <p className="text-[10px] text-slate-400 font-mono">
              {result.myScore}-{result.oppScore}
            </p>
          </div>
        ) : isNextGame ? (
          <Badge variant="default" className="text-[10px] px-1 py-0 bg-blue-600">
            NEXT
          </Badge>
        ) : (
          <span className="text-[10px] text-slate-500">Sched</span>
        )}
      </div>
    </div>
  );

  if (isCompleted && game.game_id) {
    return (
      <Link to={`/basketball/games/${game.game_id}`} className="block">
        {cellContent}
      </Link>
    );
  }

  return cellContent;
}
