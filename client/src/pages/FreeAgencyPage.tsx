import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { api, FreeAgent } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { cn, getStatColor } from '@/lib/utils';
import { UserPlus, Users } from 'lucide-react';

const POSITIONS = ['All', 'PG', 'SG', 'SF', 'PF', 'C'];

export default function FreeAgencyPage() {
  const queryClient = useQueryClient();
  const { franchise } = useFranchise();
  const [position, setPosition] = useState('All');
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgent | null>(null);
  const [offerYears, setOfferYears] = useState(1);
  const [offerSalary, setOfferSalary] = useState(5);

  const { data: freeAgents, isLoading } = useQuery({
    queryKey: ['freeAgents', position],
    queryFn: () => api.getFreeAgents({ position: position === 'All' ? undefined : position }),
  });

  const { data: teamSalary } = useQuery({
    queryKey: ['teamSalary', franchise?.team_id],
    queryFn: () => api.getTeamSalary(franchise!.team_id),
    enabled: !!franchise?.team_id,
  });

  const { data: transactions } = useQuery({
    queryKey: ['faTransactions'],
    queryFn: api.getFATransactions,
  });

  const signPlayer = useMutation({
    mutationFn: ({ playerId, years, salary }: { playerId: string; years: number; salary: number }) =>
      api.signFreeAgent(playerId, years, salary * 1000000),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freeAgents'] });
      queryClient.invalidateQueries({ queryKey: ['teamSalary'] });
      queryClient.invalidateQueries({ queryKey: ['faTransactions'] });
      setSelectedPlayer(null);
    },
  });

  // Not the right phase
  if (franchise?.phase !== 'offseason' && franchise?.phase !== 'regular_season') {
    return (
      <PageTemplate title="Free Agency" subtitle="Sign free agents to your roster">
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Free Agency Opens Later</h2>
            <p className="text-slate-500">
              Free agency is available during the regular season and offseason.
            </p>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Free Agency" subtitle="Sign free agents to your roster">
      {/* Salary Cap Info */}
      {teamSalary && (
        <Card className="mb-4 md:mb-6">
          <CardContent>
            <div className="flex flex-wrap gap-4 md:gap-8">
              <div>
                <p className="text-xs text-slate-500">Cap Space</p>
                <p className={cn(
                  'text-xl font-bold',
                  teamSalary.cap_space > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  ${(teamSalary.cap_space / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Salary</p>
                <p className="text-xl font-bold text-slate-900">
                  ${(teamSalary.total_salary / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Salary Cap</p>
                <p className="text-xl font-bold text-slate-900">
                  ${(teamSalary.salary_cap / 1000000).toFixed(1)}M
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Roster</p>
                <p className="text-xl font-bold text-slate-900">
                  {teamSalary.roster_count}/15
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Position Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosition(pos)}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap min-h-[44px] transition-colors',
              position === pos
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Free Agents List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Available Free Agents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : !freeAgents?.length ? (
              <div className="p-8 text-center text-slate-500">
                No free agents available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Player</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Pos</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Age</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">OVR</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Asking</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {freeAgents.map((player) => (
                      <tr
                        key={player.id}
                        className={cn(
                          'border-t border-slate-100 hover:bg-slate-50',
                          selectedPlayer?.id === player.id && 'bg-blue-50'
                        )}
                      >
                        <td className="px-3 py-2">
                          <p className="font-medium text-sm">{player.first_name} {player.last_name}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="secondary">{player.position}</Badge>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">{player.age}</td>
                        <td className={cn('px-3 py-2 text-sm text-right font-bold', getStatColor(player.overall))}>
                          {player.overall}
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
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
                            className="min-h-[36px]"
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

        {/* Sign Player / Recent Transactions */}
        <div className="space-y-4 md:space-y-6">
          {/* Sign Player Form */}
          {selectedPlayer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Make Offer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="font-semibold">{selectedPlayer.first_name} {selectedPlayer.last_name}</p>
                  <p className="text-sm text-slate-500">{selectedPlayer.position} · {selectedPlayer.overall} OVR</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Years
                    </label>
                    <select
                      value={offerYears}
                      onChange={(e) => setOfferYears(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg min-h-[44px]"
                    >
                      {[1, 2, 3, 4].map((y) => (
                        <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Salary (per year)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">$</span>
                      <input
                        type="number"
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(Number(e.target.value))}
                        min={1}
                        max={50}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg min-h-[44px]"
                      />
                      <span className="text-slate-500">M</span>
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
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedPlayer(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Recent Signings</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[300px] overflow-y-auto">
              {!transactions?.length ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No transactions yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="px-4 py-3">
                      <p className="font-medium text-sm">{tx.player_name}</p>
                      <p className="text-xs text-slate-500">
                        {tx.type === 'signed' ? 'Signed with' : 'Released by'} {tx.team_name}
                        {tx.salary && ` - $${(tx.salary / 1000000).toFixed(1)}M/${tx.years}yr`}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
