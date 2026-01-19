import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { api } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { useDraftState, useTeamNeeds } from '@/api/hooks';
import { cn, getStatColor } from '@/lib/utils';
import { Trophy, Users } from 'lucide-react';

export default function DraftPage() {
  const queryClient = useQueryClient();
  const { franchise } = useFranchise();
  const [selectedProspect, setSelectedProspect] = useState<string | null>(null);

  const { data: prospects, isLoading: prospectsLoading } = useQuery({
    queryKey: ['draftProspects'],
    queryFn: api.getDraftProspects,
  });

  const { data: draftOrder } = useQuery({
    queryKey: ['draftOrder'],
    queryFn: api.getDraftOrder,
  });

  const { data: lotteryOdds } = useQuery({
    queryKey: ['lotteryOdds'],
    queryFn: api.getLotteryOdds,
  });

  const { data: draftState } = useDraftState();
  const { data: teamNeeds } = useTeamNeeds();

  const generateDraft = useMutation({
    mutationFn: api.generateDraftClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftProspects'] });
    },
  });

  const runLottery = useMutation({
    mutationFn: api.runLottery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      queryClient.invalidateQueries({ queryKey: ['lotteryOdds'] });
      queryClient.invalidateQueries({ queryKey: ['draft'] });
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

  const autoDraft = useMutation({
    mutationFn: api.autoDraft,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftProspects'] });
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      queryClient.invalidateQueries({ queryKey: ['draft'] });
    },
  });

  // Simple checks
  const currentPick = draftOrder?.find(p => !p.player_id);
  const isUserPick = currentPick?.team_id === franchise?.team_id;
  const hasDraftOrder = Array.isArray(draftOrder) && draftOrder.length > 0;
  const isDraftComplete = draftState?.is_draft_complete === true;

  if (franchise?.phase !== 'offseason') {
    return (
      <PageTemplate title="Draft" subtitle="NBA Draft prospects and selections">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Draft Available in Offseason</h2>
            <p className="text-slate-400">Complete the current season to access the draft.</p>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Draft" subtitle="NBA Draft prospects and selections">
      {/* Draft Controls */}
      <div className="flex flex-wrap gap-3 mb-4 md:mb-6">
        {!prospects?.length && (
          <Button onClick={() => generateDraft.mutate()} disabled={generateDraft.isPending}>
            {generateDraft.isPending ? 'Generating...' : 'Generate Draft Class'}
          </Button>
        )}
        {prospects && prospects.length > 0 && !hasDraftOrder && (
          <Button onClick={() => runLottery.mutate()} disabled={runLottery.isPending}>
            {runLottery.isPending ? 'Running...' : 'Run Draft Lottery'}
          </Button>
        )}
        {/* Simple simulate button - shows when draft has started and not complete */}
        {true && (
          <Button onClick={() => autoDraft.mutate()} disabled={autoDraft.isPending} variant="secondary">
            {autoDraft.isPending ? 'Simulating...' : 'RUN DRAFT NOW'}
          </Button>
        )}
        {isDraftComplete && (
          <Badge variant="success" className="text-sm px-3 py-1.5">Draft Complete</Badge>
        )}
      </div>

      {/* Error Messages */}
      {(generateDraft.error || runLottery.error || makePick.error || autoDraft.error) && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {generateDraft.error?.message || runLottery.error?.message || makePick.error?.message || autoDraft.error?.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Draft Order */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Draft Order
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto">
            {!hasDraftOrder ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Run the lottery to determine draft order
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
                    <span className="w-6 text-center font-bold text-slate-400">{pick.pick_number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-white">{pick.team_name}</p>
                      {pick.player_name && <p className="text-xs text-green-400">{pick.player_name}</p>}
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
              <CardTitle className="text-base md:text-lg">
                {isUserPick ? 'Make Your Selection' : 'Draft Prospects'}
              </CardTitle>
              {draftState && !isDraftComplete && (
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
              <div className="p-8 text-center text-slate-400">Generate a draft class to see prospects</div>
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
                              className="min-h-[36px]"
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

      {/* Lottery Odds */}
      {lotteryOdds && lotteryOdds.length > 0 && !hasDraftOrder && (
        <Card className="mt-4 md:mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Lottery Odds</CardTitle>
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
                      className={cn('border-t border-white/5', team.team_id === franchise?.team_id && 'bg-blue-900/30')}
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
    </PageTemplate>
  );
}
