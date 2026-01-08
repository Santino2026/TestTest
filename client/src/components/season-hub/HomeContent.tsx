import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { api, ScheduledGame, Standing, Franchise } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { useStandings, useTradeDeadlineStatus } from '@/api/hooks';
import { cn } from '@/lib/utils';
import {
  Play,
  FastForward,
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

const PHASE_LABELS: Record<string, string> = {
  preseason: 'Preseason',
  regular_season: 'Regular Season',
  all_star: 'All-Star Weekend',
  awards: 'Season Awards',
  playoffs: 'Playoffs',
  offseason: 'Offseason',
};

export function HomeContent() {
  const queryClient = useQueryClient();
  const { franchise, refreshFranchise } = useFranchise();
  const { data: standings } = useStandings();
  const { data: tradeDeadline } = useTradeDeadlineStatus();

  const isPreseason = franchise?.phase === 'preseason';

  // Fetch schedule to find next game
  const { data: schedule } = useQuery({
    queryKey: ['schedule', 'full', franchise?.team_id, franchise?.season_id, isPreseason],
    queryFn: () => api.getSchedule({
      team_id: franchise?.team_id,
      season_id: franchise?.season_id,
      include_preseason: isPreseason ? 'true' : undefined,
    }),
    enabled: !!franchise?.team_id && !!franchise?.season_id,
  });

  const nextGame = useMemo(() => {
    if (!schedule) return null;
    return schedule.find((g: ScheduledGame) => g.status === 'scheduled');
  }, [schedule]);

  // Sim mutations
  const advancePreseasonDay = useMutation({
    mutationFn: api.advancePreseasonDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const advancePreseasonAll = useMutation({
    mutationFn: api.advancePreseasonAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const advanceDay = useMutation({
    mutationFn: api.advanceDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const advanceWeek = useMutation({
    mutationFn: api.advanceWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const isSimulating = advanceDay.isPending || advanceWeek.isPending ||
    advancePreseasonDay.isPending || advancePreseasonAll.isPending;

  const handleSimDay = () => {
    if (isPreseason) {
      advancePreseasonDay.mutate();
    } else {
      advanceDay.mutate();
    }
  };

  const handleSimWeek = () => {
    if (isPreseason) {
      advancePreseasonAll.mutate();
    } else {
      advanceWeek.mutate();
    }
  };

  // Get conference rank for a team
  const getConferenceRank = (teamId: string, conference: string) => {
    if (!standings) return null;
    const confTeams = standings.filter((s: Standing) => s.conference === conference);
    confTeams.sort((a: Standing, b: Standing) => {
      const aWinPct = a.wins / (a.wins + a.losses) || 0;
      const bWinPct = b.wins / (b.wins + b.losses) || 0;
      return bWinPct - aWinPct;
    });
    const rank = confTeams.findIndex((s: Standing) => s.team_id === teamId) + 1;
    return rank > 0 ? rank : null;
  };

  // Get opponent data from standings
  const getOpponentData = (teamId: string): Standing | undefined => {
    if (!standings) return undefined;
    return standings.find((s: Standing) => s.team_id === teamId);
  };

  if (!franchise) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Main Grid: Hero + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero - Next Game */}
        <div className="lg:col-span-2">
          <NextGameHero
            nextGame={nextGame}
            franchise={franchise}
            getConferenceRank={getConferenceRank}
            getOpponentData={getOpponentData}
            onSimGame={handleSimDay}
            isSimulating={isSimulating}
          />
        </div>

        {/* Notifications Panel */}
        <div className="lg:col-span-1">
          <NotificationsPanel
            franchise={franchise}
            tradeDeadline={tradeDeadline}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar
        onSimDay={handleSimDay}
        onSimWeek={handleSimWeek}
        isSimulating={isSimulating}
      />
    </div>
  );
}

// Next Game Hero Component
function NextGameHero({
  nextGame,
  franchise,
  getConferenceRank,
  getOpponentData,
  onSimGame,
  isSimulating,
}: {
  nextGame: ScheduledGame | null | undefined;
  franchise: Franchise;
  getConferenceRank: (teamId: string, conference: string) => number | null;
  getOpponentData: (teamId: string) => Standing | undefined;
  onSimGame: () => void;
  isSimulating: boolean;
}) {
  if (!nextGame) {
    return (
      <div className="rounded-xl bg-slate-800/50 border border-white/10 p-8 text-center">
        <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">No Upcoming Games</h2>
        <p className="text-slate-400">Season schedule not available</p>
      </div>
    );
  }

  const isHome = nextGame.home_team_id === franchise.team_id;
  const opponentId = isHome ? nextGame.away_team_id : nextGame.home_team_id;
  const opponentName = isHome ? nextGame.away_team_name : nextGame.home_team_name;
  const opponentAbbrev = isHome ? nextGame.away_abbrev : nextGame.home_abbrev;
  const opponentColor = isHome ? nextGame.away_color : nextGame.home_color;
  const opponentData = getOpponentData(opponentId);
  const opponentConf = opponentData?.conference || franchise.conference;

  const userRank = getConferenceRank(franchise.team_id, franchise.conference);
  const opponentRank = getConferenceRank(opponentId, opponentConf);

  const gameDate = new Date(nextGame.game_date);
  const isToday = new Date().toDateString() === gameDate.toDateString();
  const dateStr = isToday ? 'TODAY' : gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-white/10"
      style={{
        background: `
          radial-gradient(circle at 25% 50%, ${franchise.primary_color}25 0%, transparent 40%),
          radial-gradient(circle at 75% 50%, ${opponentColor}25 0%, transparent 40%),
          linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.9) 100%)
        `
      }}
    >
      {/* Header */}
      <div className="text-center py-4 border-b border-white/10">
        <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Next Game</h2>
      </div>

      {/* Matchup Display */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          {/* User Team */}
          <div className="flex-1 text-center">
            <div
              className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-3"
              style={{ backgroundColor: franchise.primary_color }}
            >
              {franchise.abbreviation}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{franchise.team_name}</h3>
            <p className="text-2xl font-bold text-white">{franchise.wins} - {franchise.losses}</p>
            <p className="text-sm text-slate-400">
              {userRank ? `${getOrdinal(userRank)} in ${franchise.conference}` : franchise.conference}
            </p>
          </div>

          {/* VS Divider */}
          <div className="flex-shrink-0 px-4">
            <span className="text-3xl font-black text-slate-500">VS</span>
          </div>

          {/* Opponent Team */}
          <div className="flex-1 text-center">
            <div
              className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mb-3"
              style={{ backgroundColor: opponentColor }}
            >
              {opponentAbbrev}
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{opponentName}</h3>
            <p className="text-2xl font-bold text-white">
              {opponentData ? `${opponentData.wins} - ${opponentData.losses}` : '0 - 0'}
            </p>
            <p className="text-sm text-slate-400">
              {opponentRank ? `${getOrdinal(opponentRank)} in ${opponentConf}` : opponentConf}
            </p>
          </div>
        </div>

        {/* Game Info */}
        <div className="text-center mt-6">
          <p className="text-slate-300 font-medium">
            {dateStr} <span className="text-slate-500 mx-2">|</span> {isHome ? 'HOME GAME' : 'AWAY GAME'}
          </p>
        </div>

        {/* Action Button */}
        <div className="text-center mt-6">
          <Button
            onClick={onSimGame}
            disabled={isSimulating}
            size="lg"
            className="px-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
          >
            <Play className="w-5 h-5 mr-2" />
            {isSimulating ? 'SIMULATING...' : 'SIM GAME'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Notifications Panel Component
function NotificationsPanel({
  franchise,
  tradeDeadline,
}: {
  franchise: Franchise;
  tradeDeadline?: { trades_allowed: boolean; days_until_deadline?: number; deadline_day: number; current_day: number; message?: string };
}) {
  const notifications = [];

  // Trade Deadline Alert
  if (tradeDeadline && franchise.phase === 'regular_season') {
    if (!tradeDeadline.trades_allowed) {
      notifications.push({
        id: 'trade-deadline-passed',
        type: 'danger' as const,
        title: 'Trade Deadline Passed',
        description: 'Trades locked until offseason',
        href: '/basketball/trades',
      });
    } else if (tradeDeadline.days_until_deadline !== undefined && tradeDeadline.days_until_deadline <= 10) {
      notifications.push({
        id: 'trade-deadline',
        type: 'warning' as const,
        title: 'Trade Deadline',
        description: `${tradeDeadline.days_until_deadline} days remaining`,
        href: '/basketball/trades',
      });
    }
  }

  // Season Phase Info
  notifications.push({
    id: 'phase',
    type: 'info' as const,
    title: PHASE_LABELS[franchise.phase] || franchise.phase,
    description: `Day ${franchise.current_day}`,
    href: undefined,
  });

  // Team Record
  const winPct = franchise.wins + franchise.losses > 0
    ? ((franchise.wins / (franchise.wins + franchise.losses)) * 100).toFixed(1)
    : '0.0';
  notifications.push({
    id: 'record',
    type: 'success' as const,
    title: 'Season Record',
    description: `${franchise.wins}-${franchise.losses} (${winPct}%)`,
    href: '/basketball/standings',
  });

  return (
    <div className="rounded-xl bg-slate-800/50 border border-white/10 overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Notifications</h3>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-white/5">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} {...notification} />
        ))}
      </div>
    </div>
  );
}

// Notification Card Component
function NotificationCard({
  type,
  title,
  description,
  href,
}: {
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  href?: string;
}) {
  const borderColors = {
    danger: 'border-l-red-500',
    warning: 'border-l-amber-500',
    info: 'border-l-blue-500',
    success: 'border-l-green-500',
  };

  const iconColors = {
    danger: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
    success: 'text-green-400',
  };

  const icons = {
    danger: AlertTriangle,
    warning: Calendar,
    info: Calendar,
    success: TrendingUp,
  };

  const Icon = icons[type];
  const content = (
    <div className={cn(
      'flex items-center gap-3 p-4 border-l-4 transition-colors',
      borderColors[type],
      href && 'hover:bg-white/5 cursor-pointer'
    )}>
      <Icon className={cn('w-5 h-5 flex-shrink-0', iconColors[type])} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      {href && <ChevronRight className="w-4 h-4 text-slate-500" />}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

// Quick Actions Bar Component
function QuickActionsBar({
  onSimDay,
  onSimWeek,
  isSimulating,
}: {
  onSimDay: () => void;
  onSimWeek: () => void;
  isSimulating: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Link
        to="/basketball/roster"
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-800/50 border border-white/10 text-white font-medium hover:bg-slate-700/50 transition-colors"
      >
        <Users className="w-5 h-5" />
        <span className="hidden sm:inline">MY ROSTER</span>
        <span className="sm:hidden">ROSTER</span>
      </Link>

      <button
        onClick={onSimDay}
        disabled={isSimulating}
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium transition-colors"
      >
        <Play className="w-5 h-5" />
        <span>{isSimulating ? '...' : 'SIM DAY'}</span>
      </button>

      <button
        onClick={onSimWeek}
        disabled={isSimulating}
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-800/50 border border-white/10 text-white font-medium hover:bg-slate-700/50 disabled:opacity-50 transition-colors"
      >
        <FastForward className="w-5 h-5" />
        <span className="hidden sm:inline">SIM WEEK</span>
        <span className="sm:hidden">WEEK</span>
      </button>
    </div>
  );
}

// Helper function for ordinal numbers
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
