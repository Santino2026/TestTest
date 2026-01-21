import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { api, FreeAgent } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { useDraftState, useTeamNeeds } from '@/api/hooks';
import { cn, getStatColor } from '@/lib/utils';
import { Trophy, Users, Play, UserPlus, ChevronRight } from 'lucide-react';

interface OffseasonContentProps {
  offseasonPhase?: string;
}

export function OffseasonContent({ offseasonPhase }: OffseasonContentProps) {
  switch (offseasonPhase) {
    case 'review':
      return <ReviewContent />;
    case 'lottery':
      return <LotteryContent />;
    case 'draft':
      return <DraftContent />;
    case 'free_agency':
      return <FreeAgencyContent />;
    case 'training_camp':
      return <TrainingCampContent />;
    default:
      return <ReviewContent />;
  }
}

// Review Content - Season summary
function ReviewContent() {
  const queryClient = useQueryClient();
  const { refreshFranchise } = useFranchise();

  const advancePhase = useMutation({
    mutationFn: api.advanceOffseasonPhase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offseason'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      refreshFranchise();
    },
  });

  return (
    <Card>
      <CardContent className="py-8 text-center">
        <Trophy className="w-16 h-16 mx-auto text-slate-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Season Review</h2>
        <p className="text-slate-400 mb-6">
          Review your season performance before continuing to the draft lottery.
        </p>
        <Button
          onClick={() => advancePhase.mutate()}
          disabled={advancePhase.isPending}
        >
          <ChevronRight className="w-4 h-4 mr-2" />
          {advancePhase.isPending ? 'Loading...' : 'Continue to Draft Lottery'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Lottery Content
function LotteryContent() {
  const queryClient = useQueryClient();
  const { franchise, refreshFranchise } = useFranchise();

  const { data: lotteryOdds } = useQuery({
    queryKey: ['lotteryOdds'],
    queryFn: api.getLotteryOdds,
  });

  const { data: draftOrder } = useQuery({
    queryKey: ['draftOrder'],
    queryFn: api.getDraftOrder,
  });

  const runLottery = useMutation({
    mutationFn: api.runLottery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      queryClient.invalidateQueries({ queryKey: ['lotteryOdds'] });
    },
  });

  const advancePhase = useMutation({
    mutationFn: api.advanceOffseasonPhase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      refreshFranchise();
    },
  });

  const lotteryComplete = (draftOrder?.length ?? 0) > 0;

  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {!lotteryComplete && (
          <Button
            onClick={() => runLottery.mutate()}
            disabled={runLottery.isPending}
          >
            {runLottery.isPending ? 'Running...' : 'Run Draft Lottery'}
          </Button>
        )}
        {lotteryComplete && (
          <Button
            onClick={() => advancePhase.mutate()}
            disabled={advancePhase.isPending}
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            {advancePhase.isPending ? 'Loading...' : 'Continue to Draft'}
          </Button>
        )}
      </div>

      {/* Lottery Results / Odds */}
      {lotteryComplete ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Draft Order
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            <div className="divide-y divide-white/5">
              {draftOrder?.slice(0, 14).map((pick) => (
                <div
                  key={pick.pick_number}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    pick.team_id === franchise?.team_id && 'bg-blue-900/30'
                  )}
                >
                  <span className="w-6 text-center font-bold text-slate-400">
                    {pick.pick_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white">{pick.team_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : lotteryOdds && lotteryOdds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lottery Odds</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Team</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Record</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Odds</th>
                  </tr>
                </thead>
                <tbody>
                  {lotteryOdds.map((team) => (
                    <tr
                      key={team.team_id}
                      className={cn(
                        'border-t border-white/5',
                        team.team_id === franchise?.team_id && 'bg-blue-900/30'
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-sm text-white">{team.team_name}</td>
                      <td className="px-3 py-2 text-sm text-slate-400">{team.record}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium text-white">{team.odds_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// Draft Content
function DraftContent() {
  const queryClient = useQueryClient();
  const { franchise, refreshFranchise } = useFranchise();
  const [selectedProspect, setSelectedProspect] = useState<string | null>(null);

  const { data: prospects, isLoading: prospectsLoading } = useQuery({
    queryKey: ['draftProspects'],
    queryFn: api.getDraftProspects,
  });

  const { data: draftOrder } = useQuery({
    queryKey: ['draftOrder'],
    queryFn: api.getDraftOrder,
  });

  const { data: draftState } = useDraftState();
  const { data: teamNeeds } = useTeamNeeds();

  const generateDraft = useMutation({
    mutationFn: api.generateDraftClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftProspects'] });
    },
  });

  const makePick = useMutation({
    mutationFn: api.makeDraftPick,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftProspects'] });
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      queryClient.invalidateQueries({ queryKey: ['draft'] });
      setSelectedProspect(null);
    },
  });

  const advancePhase = useMutation({
    mutationFn: api.advanceOffseasonPhase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      refreshFranchise();
    },
  });

  const autoDraft = useMutation({
    mutationFn: api.autoDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftProspects'] });
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      queryClient.invalidateQueries({ queryKey: ['draft'] });
    },
  });

  const runLottery = useMutation({
    mutationFn: api.runLottery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      queryClient.invalidateQueries({ queryKey: ['draft'] });
    },
  });

  const currentPick = draftOrder?.find(p => !p.player_id);
  const isUserPick = currentPick?.team_id === franchise?.team_id;
  const hasDraftOrder = Array.isArray(draftOrder) && draftOrder.length > 0;
  const isDraftComplete = draftState?.is_draft_complete === true;

  return (
    <>
      {/* Draft Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {!prospects?.length && (
          <Button
            onClick={() => generateDraft.mutate()}
            disabled={generateDraft.isPending}
          >
            {generateDraft.isPending ? 'Generating...' : 'Generate Draft Class'}
          </Button>
        )}
        {prospects && prospects.length > 0 && !hasDraftOrder && (
          <Button
            onClick={() => runLottery.mutate()}
            disabled={runLottery.isPending}
          >
            {runLottery.isPending ? 'Running...' : 'Run Draft Lottery'}
          </Button>
        )}
        {hasDraftOrder && !isDraftComplete && (
          <Button
            onClick={() => autoDraft.mutate()}
            disabled={autoDraft.isPending}
            variant="secondary"
          >
            {autoDraft.isPending ? 'Simulating...' : 'Simulate Draft'}
          </Button>
        )}
        {isDraftComplete && (
          <>
            <Badge variant="success" className="text-sm px-3 py-1.5">Draft Complete</Badge>
            <Button
              onClick={() => advancePhase.mutate()}
              disabled={advancePhase.isPending}
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              {advancePhase.isPending ? 'Loading...' : 'Continue to Free Agency'}
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Draft Order */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Draft Order
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            {!draftOrder?.length ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Waiting for draft order
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {draftOrder.map((pick) => (
                  <div
                    key={pick.pick_number}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      pick.team_id === franchise?.team_id && 'bg-blue-900/30',
                      currentPick?.pick_number === pick.pick_number && !pick.player_id && 'ring-2 ring-blue-500'
                    )}
                  >
                    <span className="w-6 text-center font-bold text-slate-400">
                      {pick.pick_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-white">{pick.team_name}</p>
                      {pick.player_name && (
                        <p className="text-xs text-green-400">{pick.player_name}</p>
                      )}
                    </div>
                    {currentPick?.pick_number === pick.pick_number && !pick.player_id && (
                      <Badge variant="info">On Clock</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prospects */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {isUserPick ? 'Make Your Selection' : 'Draft Prospects'}
              </CardTitle>
              {draftState && !draftState.is_draft_complete && (
                <Badge variant="secondary" className="text-xs">
                  Round {draftState.current_round} - Pick {draftState.pick_in_round}
                </Badge>
              )}
            </div>
            {isUserPick && teamNeeds?.needs && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs font-medium text-slate-400 mb-2">Team Needs:</p>
                <div className="flex flex-wrap gap-2">
                  {teamNeeds.needs
                    .sort((a: any, b: any) => b.need_score - a.need_score)
                    .map((need: any) => (
                      <div
                        key={need.position}
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          need.need_score >= 70 ? 'bg-red-900/50 text-red-300' :
                          need.need_score >= 40 ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-green-900/50 text-green-300'
                        )}
                      >
                        {need.position}: {Math.round(need.need_score)}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {prospectsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading prospects...</div>
            ) : !prospects?.length ? (
              <div className="p-8 text-center text-slate-400">
                Generate a draft class to see prospects
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Proj</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Pos</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">OVR</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">POT</th>
                      {isUserPick && <th className="px-3 py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((prospect) => (
                      <tr
                        key={prospect.id}
                        className={cn(
                          'border-t border-white/5 hover:bg-white/5 cursor-pointer',
                          selectedProspect === prospect.id && 'bg-blue-900/30'
                        )}
                        onClick={() => isUserPick && setSelectedProspect(prospect.id)}
                      >
                        <td className="px-3 py-2 text-sm text-slate-400">#{prospect.projected_pick}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm text-white">{prospect.first_name} {prospect.last_name}</p>
                          <p className="text-xs text-slate-400">{prospect.archetype}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{prospect.position}</Badge>
                        </td>
                        <td className={cn('px-3 py-2 text-sm text-right font-bold', getStatColor(prospect.overall))}>
                          {prospect.overall}
                        </td>
                        <td className={cn('px-3 py-2 text-sm text-right font-bold', getStatColor(prospect.potential))}>
                          {prospect.potential}
                        </td>
                        {isUserPick && (
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                makePick.mutate(prospect.id);
                              }}
                              disabled={makePick.isPending}
                            >
                              Draft
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Free Agency Content
function FreeAgencyContent() {
  const queryClient = useQueryClient();
  const { franchise, refreshFranchise } = useFranchise();
  const [position, setPosition] = useState('All');
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgent | null>(null);
  const [offerYears, setOfferYears] = useState(1);
  const [offerSalary, setOfferSalary] = useState(5);

  const POSITIONS = ['All', 'PG', 'SG', 'SF', 'PF', 'C'];

  const { data: freeAgents, isLoading } = useQuery({
    queryKey: ['freeAgents', position],
    queryFn: () => api.getFreeAgents({ position: position === 'All' ? undefined : position }),
  });

  const { data: teamSalary } = useQuery({
    queryKey: ['teamSalary', franchise?.team_id],
    queryFn: () => api.getTeamSalary(franchise!.team_id),
    enabled: !!franchise?.team_id,
  });

  const signPlayer = useMutation({
    mutationFn: ({ playerId, years, salary }: { playerId: string; years: number; salary: number }) =>
      api.signFreeAgent(playerId, years, salary * 1000000),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freeAgents'] });
      queryClient.invalidateQueries({ queryKey: ['teamSalary'] });
      setSelectedPlayer(null);
    },
  });

  const advancePhase = useMutation({
    mutationFn: api.advanceOffseasonPhase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      refreshFranchise();
    },
  });

  return (
    <>
      {/* Salary Cap Info + Continue Button */}
      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {teamSalary && (
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-slate-400">Cap Space</p>
                  <p className={cn(
                    'text-xl font-bold',
                    teamSalary.cap_space > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    ${(teamSalary.cap_space / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Roster</p>
                  <p className="text-xl font-bold text-white">{teamSalary.roster_count}/15</p>
                </div>
              </div>
            )}
            <Button
              onClick={() => advancePhase.mutate()}
              disabled={advancePhase.isPending}
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              {advancePhase.isPending ? 'Loading...' : 'Continue to Training Camp'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Position Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosition(pos)}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap min-h-[44px] transition-colors',
              position === pos
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-300 hover:bg-white/5'
            )}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Free Agents List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Free Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : !freeAgents?.length ? (
              <div className="p-8 text-center text-slate-400">No free agents available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Player</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400">Pos</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Age</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">OVR</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400">Asking</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {freeAgents.map((player) => (
                      <tr
                        key={player.id}
                        className={cn(
                          'border-t border-white/5 hover:bg-white/5',
                          selectedPlayer?.id === player.id && 'bg-blue-900/30'
                        )}
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm text-white">{player.first_name} {player.last_name}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{player.position}</Badge>
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-white">{player.age}</td>
                        <td className={cn('px-3 py-2 text-sm text-right font-bold', getStatColor(player.overall))}>
                          {player.overall}
                        </td>
                        <td className="px-3 py-2 text-sm text-right text-white">
                          ${(player.asking_salary / 1000000).toFixed(1)}M/{player.asking_years}yr
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedPlayer(player);
                              setOfferSalary(Math.round(player.asking_salary / 1000000));
                              setOfferYears(player.asking_years);
                            }}
                          >
                            Offer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Player Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedPlayer ? 'Make Offer' : 'Select a Player'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPlayer ? (
              <>
                <div className="mb-4">
                  <p className="font-semibold text-white">{selectedPlayer.first_name} {selectedPlayer.last_name}</p>
                  <p className="text-sm text-slate-400">{selectedPlayer.position} · {selectedPlayer.overall} OVR</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Years</label>
                    <select
                      value={offerYears}
                      onChange={(e) => setOfferYears(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg min-h-[44px] text-white"
                    >
                      {[1, 2, 3, 4].map((y) => (
                        <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Salary (per year)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(Number(e.target.value))}
                        min={1}
                        max={50}
                        className="flex-1 px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg min-h-[44px] text-white"
                      />
                      <span className="text-slate-400">M</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => signPlayer.mutate({
                        playerId: selectedPlayer.id,
                        years: offerYears,
                        salary: offerSalary,
                      })}
                      disabled={signPlayer.isPending}
                      className="flex-1"
                    >
                      {signPlayer.isPending ? 'Signing...' : 'Sign Player'}
                    </Button>
                    <Button variant="secondary" onClick={() => setSelectedPlayer(null)}>
                      Cancel
                    </Button>
                  </div>
                  {signPlayer.error && (
                    <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                      {(signPlayer.error as any)?.message || 'Failed to sign player'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a free agent to make an offer</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Training Camp Content
function TrainingCampContent() {
  const queryClient = useQueryClient();
  const { refreshFranchise } = useFranchise();

  const startNewSeason = useMutation({
    mutationFn: api.startNewSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      refreshFranchise();
    },
  });

  return (
    <Card>
      <CardContent className="py-8 text-center">
        <Trophy className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Training Camp</h2>
        <p className="text-slate-400 mb-6">
          Your roster is set. Start the new season when you're ready!
        </p>
        <Button
          onClick={() => startNewSeason.mutate()}
          disabled={startNewSeason.isPending}
          size="lg"
        >
          <Play className="w-5 h-5 mr-2" />
          {startNewSeason.isPending ? 'Starting...' : 'Start New Season'}
        </Button>
      </CardContent>
    </Card>
  );
}
