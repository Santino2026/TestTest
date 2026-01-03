import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { api } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
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
    },
  });

  const makePick = useMutation({
    mutationFn: api.makeDraftPick,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draftProspects'] });
      queryClient.invalidateQueries({ queryKey: ['draftOrder'] });
      setSelectedProspect(null);
    },
  });

  // Check if it's user's turn to pick
  const currentPick = draftOrder?.find(p => !p.player_id);
  const isUserPick = currentPick?.team_id === franchise?.team_id;

  // Not offseason - show message
  if (franchise?.phase !== 'offseason') {
    return (
      <PageTemplate title="Draft" subtitle="NBA Draft prospects and selections">
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Draft Available in Offseason</h2>
            <p className="text-slate-500">
              Complete the current season to access the draft.
            </p>
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
          <Button
            onClick={() => generateDraft.mutate()}
            disabled={generateDraft.isPending}
          >
            {generateDraft.isPending ? 'Generating...' : 'Generate Draft Class'}
          </Button>
        )}
        {prospects && prospects.length > 0 && !draftOrder?.length && (
          <Button
            onClick={() => runLottery.mutate()}
            disabled={runLottery.isPending}
          >
            {runLottery.isPending ? 'Running...' : 'Run Draft Lottery'}
          </Button>
        )}
      </div>

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
            {!draftOrder?.length ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Run the lottery to determine draft order
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {draftOrder.map((pick) => (
                  <div
                    key={pick.pick_number}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      pick.team_id === franchise?.team_id && 'bg-blue-50',
                      currentPick?.pick_number === pick.pick_number && !pick.player_id && 'ring-2 ring-blue-500'
                    )}
                  >
                    <span className="w-6 text-center font-bold text-slate-500">
                      {pick.pick_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{pick.team_name}</p>
                      {pick.player_name && (
                        <p className="text-xs text-green-600">{pick.player_name}</p>
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
            <CardTitle className="text-base md:text-lg">
              {isUserPick ? 'Make Your Selection' : 'Draft Prospects'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {prospectsLoading ? (
              <div className="p-8 text-center text-slate-500">Loading prospects...</div>
            ) : !prospects?.length ? (
              <div className="p-8 text-center text-slate-500">
                Generate a draft class to see prospects
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Proj</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Pos</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">OVR</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">POT</th>
                      {isUserPick && <th className="px-3 py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((prospect) => (
                      <tr
                        key={prospect.id}
                        className={cn(
                          'border-t border-slate-100 hover:bg-slate-50 cursor-pointer',
                          selectedProspect === prospect.id && 'bg-blue-50'
                        )}
                        onClick={() => isUserPick && setSelectedProspect(prospect.id)}
                      >
                        <td className="px-3 py-2 text-sm text-slate-500">#{prospect.projected_pick}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm">{prospect.first_name} {prospect.last_name}</p>
                          <p className="text-xs text-slate-500">{prospect.archetype}</p>
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

      {/* Lottery Odds (before lottery is run) */}
      {lotteryOdds && lotteryOdds.length > 0 && !draftOrder?.length && (
        <Card className="mt-4 md:mt-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Lottery Odds</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Team</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Record</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Odds</th>
                  </tr>
                </thead>
                <tbody>
                  {lotteryOdds.map((team) => (
                    <tr
                      key={team.team_id}
                      className={cn(
                        'border-t border-slate-100',
                        team.team_id === franchise?.team_id && 'bg-blue-50'
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-sm">{team.team_name}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{team.record}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{team.odds_pct}%</td>
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
