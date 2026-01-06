import { useState } from 'react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useFranchise } from '@/context/FranchiseContext';
import {
  useAllStarState,
  useSelectAllStars,
  useAllStarRosters,
  useSimulateRisingStars,
  useSimulateSkillsChallenge,
  useSimulateThreePointContest,
  useSimulateDunkContest,
  useSimulateAllStarGame,
  useSimulateAllStarWeekend,
  useAllStarResults,
  useCompleteAllStar,
} from '@/api/hooks';
import { cn, getStatColor } from '@/lib/utils';
import { Star, Trophy, Target, Zap, Users, Play, FastForward, ChevronRight } from 'lucide-react';

const EVENT_LABELS: Record<string, { label: string; icon: any; description: string }> = {
  rising_stars: { label: 'Rising Stars Challenge', icon: Users, description: 'Rookies vs Sophomores' },
  skills: { label: 'Skills Challenge', icon: Zap, description: 'Dribbling, Passing, Shooting' },
  three_point: { label: 'Three-Point Contest', icon: Target, description: 'Best Shooters Compete' },
  dunk: { label: 'Slam Dunk Contest', icon: Star, description: 'High-Flying Dunks' },
  game: { label: 'All-Star Game', icon: Trophy, description: 'East vs West' },
};

export default function AllStarPage() {
  const { franchise } = useFranchise();
  const [selectedTab, setSelectedTab] = useState<'events' | 'rosters'>('events');

  const { data: state } = useAllStarState();
  const { data: rosters } = useAllStarRosters();
  const { data: results } = useAllStarResults();

  const selectAllStars = useSelectAllStars();
  const simulateRisingStars = useSimulateRisingStars();
  const simulateSkills = useSimulateSkillsChallenge();
  const simulateThreePoint = useSimulateThreePointContest();
  const simulateDunk = useSimulateDunkContest();
  const simulateGame = useSimulateAllStarGame();
  const simulateAll = useSimulateAllStarWeekend();
  const completeAllStar = useCompleteAllStar();

  const isAnySimulating =
    simulateRisingStars.isPending ||
    simulateSkills.isPending ||
    simulateThreePoint.isPending ||
    simulateDunk.isPending ||
    simulateGame.isPending ||
    simulateAll.isPending;

  // Not All-Star Weekend
  if (franchise?.phase !== 'all_star' && !state?.all_star_complete) {
    return (
      <PageTemplate title="All-Star Weekend" subtitle="The best players compete">
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">All-Star Weekend Coming Soon</h2>
            <p className="text-slate-400">
              Advance to day {state?.all_star_day || 85} to reach the All-Star break.
            </p>
            {franchise && (
              <p className="text-slate-500 text-sm mt-2">
                Current day: {franchise.current_day}
              </p>
            )}
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const getEventSimulator = (eventType: string) => {
    switch (eventType) {
      case 'rising_stars': return simulateRisingStars;
      case 'skills': return simulateSkills;
      case 'three_point': return simulateThreePoint;
      case 'dunk': return simulateDunk;
      case 'game': return simulateGame;
      default: return null;
    }
  };

  const getEventResult = (eventType: string) => {
    return results?.events?.find(e => e.event_type === eventType);
  };

  const renderEventCard = (eventType: string) => {
    const event = EVENT_LABELS[eventType];
    const result = getEventResult(eventType);
    const isComplete = state?.events_complete?.[eventType as keyof typeof state.events_complete];
    const simulator = getEventSimulator(eventType);
    const Icon = event.icon;

    // Check prerequisites
    const canSimulate = eventType === 'game'
      ? state?.selections_made && !isComplete
      : !isComplete;

    return (
      <Card key={eventType} className={cn(isComplete && 'border-green-500/30')}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="w-5 h-5 text-amber-400" />
              {event.label}
            </CardTitle>
            {isComplete ? (
              <Badge variant="success">Complete</Badge>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400">{event.description}</p>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-2">
              {result.winning_team && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Winner:</span>
                  <span className="text-sm font-medium text-white capitalize">
                    {result.winning_team === 'east' ? 'East' :
                     result.winning_team === 'west' ? 'West' :
                     result.winning_team === 'rookies' ? 'Rookies' :
                     result.winning_team === 'sophomores' ? 'Sophomores' :
                     result.winning_team}
                  </span>
                </div>
              )}
              {result.winning_score && result.losing_score && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Score:</span>
                  <span className="text-sm font-medium text-white">
                    {result.winning_score} - {result.losing_score}
                  </span>
                </div>
              )}
              {result.winner_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Champion:</span>
                  <span className="text-sm font-medium text-amber-400">{result.winner_name}</span>
                </div>
              )}
              {result.mvp_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">MVP:</span>
                  <span className="text-sm font-medium text-amber-400">{result.mvp_name}</span>
                </div>
              )}
              {result.runner_up_name && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Runner-up:</span>
                  <span className="text-sm font-medium text-white">{result.runner_up_name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              {canSimulate && simulator ? (
                <Button
                  onClick={() => simulator.mutate()}
                  disabled={isAnySimulating}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Simulate
                </Button>
              ) : eventType === 'game' && !state?.selections_made ? (
                <p className="text-sm text-slate-500">Select All-Stars first</p>
              ) : (
                <p className="text-sm text-slate-500">Waiting...</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRosterTeam = (players: any[], conference: 'east' | 'west') => {
    if (!players?.length) return null;

    const starters = players.filter(p => p.is_starter);
    const reserves = players.filter(p => !p.is_starter);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className={cn(
              'w-3 h-3 rounded-full',
              conference === 'east' ? 'bg-blue-500' : 'bg-red-500'
            )} />
            {conference === 'east' ? 'Team East' : 'Team West'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {/* Starters */}
            {starters.map((player: any) => (
              <div
                key={player.player_id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2',
                  player.is_captain && 'bg-amber-900/20'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-white">
                      {player.first_name} {player.last_name}
                    </span>
                    {player.is_captain && (
                      <Badge variant="warning" className="text-xs">Captain</Badge>
                    )}
                    {player.is_starter && !player.is_captain && (
                      <Badge variant="secondary" className="text-xs">Starter</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{player.team_abbr} - {player.position}</p>
                </div>
                <span className={cn('text-sm font-bold', getStatColor(player.overall))}>
                  {player.overall}
                </span>
              </div>
            ))}
            {/* Reserves header */}
            {reserves.length > 0 && (
              <div className="px-4 py-1 bg-slate-800/50">
                <span className="text-xs font-medium text-slate-400">Reserves</span>
              </div>
            )}
            {/* Reserves */}
            {reserves.map((player: any) => (
              <div key={player.player_id} className="flex items-center gap-3 px-4 py-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-white">
                    {player.first_name} {player.last_name}
                  </span>
                  <p className="text-xs text-slate-400">{player.team_abbr} - {player.position}</p>
                </div>
                <span className={cn('text-sm font-bold', getStatColor(player.overall))}>
                  {player.overall}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageTemplate title="All-Star Weekend" subtitle="The best players compete">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 md:mb-6">
        {!state?.selections_made && (
          <Button
            onClick={() => selectAllStars.mutate()}
            disabled={selectAllStars.isPending}
          >
            <Star className="w-4 h-4 mr-2" />
            {selectAllStars.isPending ? 'Selecting...' : 'Select All-Stars'}
          </Button>
        )}
        {state?.selections_made && !state?.all_events_complete && (
          <Button
            onClick={() => simulateAll.mutate()}
            disabled={isAnySimulating}
            variant="secondary"
          >
            <FastForward className="w-4 h-4 mr-2" />
            {simulateAll.isPending ? 'Simulating...' : 'Sim All Events'}
          </Button>
        )}
        {state?.all_events_complete && franchise?.phase === 'all_star' && (
          <Button
            onClick={() => completeAllStar.mutate()}
            disabled={completeAllStar.isPending}
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            {completeAllStar.isPending ? 'Completing...' : 'Continue Season'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={selectedTab === 'events' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedTab('events')}
        >
          Events
        </Button>
        <Button
          variant={selectedTab === 'rosters' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setSelectedTab('rosters')}
        >
          Rosters
        </Button>
      </div>

      {selectedTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(EVENT_LABELS).map(eventType => renderEventCard(eventType))}
        </div>
      )}

      {selectedTab === 'rosters' && (
        <>
          {!state?.selections_made ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                <p className="text-slate-400">Select All-Stars to view rosters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {renderRosterTeam(rosters?.east || [], 'east')}
              {renderRosterTeam(rosters?.west || [], 'west')}
            </div>
          )}
        </>
      )}

      {/* Progress indicator */}
      {state && (
        <Card className="mt-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Weekend Progress</span>
              <div className="flex items-center gap-2">
                {Object.entries(state.events_complete || {}).map(([event, complete]) => (
                  <div
                    key={event}
                    className={cn(
                      'w-3 h-3 rounded-full',
                      complete ? 'bg-green-500' : 'bg-slate-600'
                    )}
                    title={EVENT_LABELS[event]?.label}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageTemplate>
  );
}
