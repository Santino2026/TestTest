import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ScheduledGame, Standing, Franchise } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { useStandings, useTradeDeadlineStatus } from '@/api/hooks';
import {
  FastForward,
  ChevronRight,
  AlertTriangle,
  Calendar,
  TrendingUp,
  ClipboardList,
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
  const { data: standings } = useStandings({ season_id: franchise?.season_id });
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

  const advanceDay = useMutation({
    mutationFn: api.advanceDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  const isSimulating = advanceDay.isPending || advancePreseasonDay.isPending;

  const handleSimDay = () => {
    if (isPreseason) {
      advancePreseasonDay.mutate();
    } else {
      advanceDay.mutate();
    }
  };

  // Get conference rank for a team (with defensive checks)
  const getConferenceRank = (teamId: string, conference: string) => {
    if (!standings || standings.length === 0) return null;

    // Filter by conference
    const confTeams = standings.filter((s: Standing) => s.conference === conference);

    // Defensive check: each conference should have exactly 15 teams
    // If we have more, there's corrupted data - return null
    if (confTeams.length > 15) {
      console.warn(`Corrupted standings: ${confTeams.length} teams in ${conference}`);
      return null;
    }

    // Sort by win percentage (handle 0-0 records)
    confTeams.sort((a: Standing, b: Standing) => {
      const aGames = a.wins + a.losses;
      const bGames = b.wins + b.losses;
      const aWinPct = aGames > 0 ? a.wins / aGames : 0;
      const bWinPct = bGames > 0 ? b.wins / bGames : 0;
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      // Tiebreaker: more wins
      return b.wins - a.wins;
    });

    const rank = confTeams.findIndex((s: Standing) => s.team_id === teamId) + 1;
    // Validate rank is in valid range (1-15)
    return rank > 0 && rank <= 15 ? rank : null;
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
    <div
      className="min-h-[calc(100vh-80px)] p-4 md:p-6"
      style={{
        background: `
          linear-gradient(180deg,
            rgba(15, 23, 42, 1) 0%,
            rgba(20, 30, 50, 1) 50%,
            rgba(15, 23, 42, 1) 100%
          )
        `,
      }}
    >
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Next Game Hero */}
        <div className="lg:col-span-2">
          <NextGamePanel
            nextGame={nextGame}
            franchise={franchise}
            getConferenceRank={getConferenceRank}
            getOpponentData={getOpponentData}
          />
        </div>

        {/* Notifications */}
        <div className="lg:col-span-1">
          <NotificationsPanel
            franchise={franchise}
            tradeDeadline={tradeDeadline}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <ActionButtonsBar
        onSimDay={handleSimDay}
        isSimulating={isSimulating}
      />
    </div>
  );
}

// Panel wrapper with metallic border
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
        boxShadow: `
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 0, 0, 0.3),
          0 4px 20px rgba(0, 0, 0, 0.5)
        `,
      }}
    >
      {/* Top metallic edge */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(100, 150, 200, 0.5) 50%, transparent 100%)',
        }}
      />
      {/* Border */}
      <div className="absolute inset-0 rounded-lg border border-slate-700/50 pointer-events-none" />
      {children}
    </div>
  );
}

// Decorative header with lines
function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center py-4 px-6">
      {/* Left decorative line */}
      <div className="flex-1 flex items-center mr-4">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-slate-600 to-slate-500" />
        <div className="w-2 h-2 rotate-45 border-t border-r border-slate-500 ml-1" />
      </div>

      {/* Title */}
      <h2 className="text-sm md:text-base font-bold tracking-[0.2em] text-slate-300 uppercase">
        {children}
      </h2>

      {/* Right decorative line */}
      <div className="flex-1 flex items-center ml-4">
        <div className="w-2 h-2 rotate-45 border-b border-l border-slate-500 mr-1" />
        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-slate-600 to-slate-500" />
      </div>
    </div>
  );
}

// Next Game Panel
function NextGamePanel({
  nextGame,
  franchise,
  getConferenceRank,
  getOpponentData,
}: {
  nextGame: ScheduledGame | null | undefined;
  franchise: Franchise;
  getConferenceRank: (teamId: string, conference: string) => number | null;
  getOpponentData: (teamId: string) => Standing | undefined;
}) {
  if (!nextGame) {
    return (
      <Panel className="h-full">
        <PanelHeader>Next Game</PanelHeader>
        <div className="p-8 text-center">
          <p className="text-slate-400">No upcoming games scheduled</p>
        </div>
      </Panel>
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
  const dateStr = isToday ? 'TODAY' : gameDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <Panel className="h-full">
      {/* Team color glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 50% 80% at 20% 50%, ${franchise.primary_color}40 0%, transparent 70%),
            radial-gradient(ellipse 50% 80% at 80% 50%, ${opponentColor}40 0%, transparent 70%)
          `,
        }}
      />

      <PanelHeader>Next Game</PanelHeader>

      {/* Matchup */}
      <div className="relative px-4 md:px-8 pb-6">
        <div className="flex items-center justify-between">
          {/* User Team */}
          <TeamDisplay
            name={franchise.team_name}
            abbrev={franchise.abbreviation}
            color={franchise.primary_color}
            wins={franchise.wins}
            losses={franchise.losses}
            rank={userRank}
            conference={franchise.conference}
          />

          {/* VS */}
          <div className="flex-shrink-0 px-2 md:px-6">
            <span
              className="text-3xl md:text-5xl font-black"
              style={{
                color: 'transparent',
                background: 'linear-gradient(180deg, #64748b 0%, #334155 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              VS
            </span>
          </div>

          {/* Opponent Team */}
          <TeamDisplay
            name={opponentName}
            abbrev={opponentAbbrev}
            color={opponentColor}
            wins={opponentData?.wins ?? 0}
            losses={opponentData?.losses ?? 0}
            rank={opponentRank}
            conference={opponentConf}
          />
        </div>

        {/* Game Info */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm md:text-base tracking-wider font-medium">
            {dateStr}
            <span className="mx-3 text-slate-600">|</span>
            {isHome ? 'HOME GAME' : 'AWAY GAME'}
          </p>
        </div>

        {/* View Matchup Button */}
        <div className="flex justify-center mt-5">
          <MetallicButton href={`/basketball/teams/${opponentId}`}>
            VIEW MATCHUP
          </MetallicButton>
        </div>
      </div>
    </Panel>
  );
}

// Team Display Component
function TeamDisplay({
  name,
  abbrev,
  color,
  wins,
  losses,
  rank,
  conference,
}: {
  name: string;
  abbrev: string;
  color: string;
  wins: number;
  losses: number;
  rank: number | null;
  conference: string;
}) {
  return (
    <div className="flex-1 text-center">
      {/* Team Logo/Badge */}
      <div className="relative inline-block mb-3">
        <div
          className="w-20 h-20 md:w-28 md:h-28 rounded-xl flex items-center justify-center text-xl md:text-3xl font-black text-white shadow-2xl"
          style={{
            backgroundColor: color,
            boxShadow: `
              0 0 30px ${color}60,
              inset 0 2px 0 rgba(255,255,255,0.2),
              inset 0 -2px 0 rgba(0,0,0,0.2)
            `,
          }}
        >
          {abbrev}
        </div>
        {/* Glow ring */}
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            boxShadow: `0 0 40px ${color}50`,
          }}
        />
      </div>

      {/* Team Name */}
      <h3
        className="text-lg md:text-2xl font-black uppercase tracking-wide mb-1"
        style={{
          color: color,
          textShadow: `0 0 20px ${color}50`,
        }}
      >
        {name}
      </h3>

      {/* Record */}
      <p className="text-2xl md:text-3xl font-bold text-white mb-1">
        {wins} - {losses}
      </p>

      {/* Conference Rank */}
      <p className="text-xs md:text-sm text-slate-400">
        {rank ? `${getOrdinal(rank)} in ${conference}` : conference}
      </p>
    </div>
  );
}

// Notifications Panel
function NotificationsPanel({
  franchise,
  tradeDeadline,
}: {
  franchise: Franchise;
  tradeDeadline?: { trades_allowed: boolean; days_until_deadline?: number; deadline_day: number; current_day: number; message?: string };
}) {
  const notifications: Array<{
    id: string;
    icon: typeof AlertTriangle;
    iconColor: string;
    borderColor: string;
    title: string;
    description: string;
    href?: string;
  }> = [];

  // Trade Deadline Alert
  if (tradeDeadline && franchise.phase === 'regular_season') {
    if (!tradeDeadline.trades_allowed) {
      notifications.push({
        id: 'trade-deadline-passed',
        icon: AlertTriangle,
        iconColor: 'text-red-400',
        borderColor: 'bg-red-500',
        title: 'Trade Deadline Passed',
        description: 'Trades locked until offseason',
        href: '/basketball/trades',
      });
    } else if (tradeDeadline.days_until_deadline !== undefined && tradeDeadline.days_until_deadline <= 10) {
      notifications.push({
        id: 'trade-deadline',
        icon: Calendar,
        iconColor: 'text-amber-400',
        borderColor: 'bg-amber-500',
        title: 'Trade Deadline',
        description: `${tradeDeadline.days_until_deadline} days remaining`,
        href: '/basketball/trades',
      });
    }
  }

  // Season Phase Info
  notifications.push({
    id: 'phase',
    icon: Calendar,
    iconColor: 'text-blue-400',
    borderColor: 'bg-blue-500',
    title: PHASE_LABELS[franchise.phase] || franchise.phase,
    description: franchise.phase === 'preseason'
      ? `Game ${(franchise.current_day ?? -7) + 8}/8`
      : `Day ${franchise.current_day}`,
  });

  // Team Record
  const winPct = franchise.wins + franchise.losses > 0
    ? ((franchise.wins / (franchise.wins + franchise.losses)) * 100).toFixed(1)
    : '0.0';
  notifications.push({
    id: 'record',
    icon: TrendingUp,
    iconColor: 'text-green-400',
    borderColor: 'bg-green-500',
    title: 'Season Record',
    description: `${franchise.wins}-${franchise.losses} (${winPct}%)`,
    href: '/basketball/standings',
  });

  return (
    <Panel className="h-full">
      <PanelHeader>Notifications</PanelHeader>
      <div className="px-2 pb-4 space-y-2">
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} {...notification} />
        ))}
      </div>
    </Panel>
  );
}

// Notification Card
function NotificationCard({
  icon: Icon,
  iconColor,
  borderColor,
  title,
  description,
  href,
}: {
  icon: typeof AlertTriangle;
  iconColor: string;
  borderColor: string;
  title: string;
  description: string;
  href?: string;
}) {
  const content = (
    <div
      className="relative flex items-center gap-3 p-3 rounded-md transition-all duration-200 group"
      style={{
        background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.8) 0%, rgba(30, 41, 59, 0.4) 100%)',
      }}
    >
      {/* Left border accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor} rounded-l-md`} />

      {/* Icon */}
      <div className="pl-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>

      {/* Chevron */}
      {href && (
        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block hover:scale-[1.02] transition-transform">
        {content}
      </Link>
    );
  }

  return content;
}

// Metallic Button
function MetallicButton({
  children,
  onClick,
  href,
  disabled,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
}) {
  const baseStyles = `
    relative inline-flex items-center justify-center gap-2
    px-8 py-3 rounded-md
    text-sm font-bold tracking-wider uppercase
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantStyles = {
    default: {
      background: 'linear-gradient(180deg, #475569 0%, #334155 50%, #1e293b 100%)',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.1),
        inset 0 -1px 0 rgba(0,0,0,0.2),
        0 2px 8px rgba(0,0,0,0.3)
      `,
      color: '#e2e8f0',
    },
    primary: {
      background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.2),
        inset 0 -1px 0 rgba(0,0,0,0.2),
        0 2px 8px rgba(37, 99, 235, 0.4),
        0 0 20px rgba(37, 99, 235, 0.2)
      `,
      color: '#ffffff',
    },
    secondary: {
      background: 'linear-gradient(180deg, #374151 0%, #1f2937 50%, #111827 100%)',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.05),
        inset 0 -1px 0 rgba(0,0,0,0.2),
        0 2px 8px rgba(0,0,0,0.3)
      `,
      color: '#9ca3af',
    },
  };

  const styles = variantStyles[variant];

  if (href) {
    return (
      <Link
        to={href}
        className={baseStyles}
        style={styles}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={baseStyles}
      style={styles}
    >
      {children}
    </button>
  );
}

// Action Buttons Bar
function ActionButtonsBar({
  onSimDay,
  isSimulating,
}: {
  onSimDay: () => void;
  isSimulating: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Set Lineup / My Roster */}
      <Link
        to="/basketball/roster"
        className="relative flex items-center justify-center gap-2 py-4 rounded-lg text-sm font-bold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(180deg, #374151 0%, #1f2937 50%, #111827 100%)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.05),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 4px 12px rgba(0,0,0,0.4)
          `,
          color: '#9ca3af',
        }}
      >
        <ClipboardList className="w-5 h-5" />
        <span className="hidden sm:inline">SET LINEUP</span>
        <span className="sm:hidden">LINEUP</span>
      </Link>

      {/* Sim Day - Primary Action */}
      <button
        onClick={onSimDay}
        disabled={isSimulating}
        className="relative flex items-center justify-center gap-2 py-4 rounded-lg text-sm font-bold tracking-wider uppercase transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.2),
            inset 0 -1px 0 rgba(0,0,0,0.2),
            0 4px 12px rgba(37, 99, 235, 0.4),
            0 0 30px rgba(37, 99, 235, 0.2)
          `,
          color: '#ffffff',
        }}
      >
        <FastForward className="w-5 h-5" />
        <span>{isSimulating ? 'SIMULATING...' : 'SIM DAY'}</span>
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
