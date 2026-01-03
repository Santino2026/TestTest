import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { api } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { cn, getStatColor } from '@/lib/utils';
import { ArrowLeftRight, Check, X, Clock } from 'lucide-react';

export default function TradesPage() {
  const queryClient = useQueryClient();
  const { franchise } = useFranchise();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [playersOffered, setPlayersOffered] = useState<string[]>([]);
  const [playersRequested, setPlayersRequested] = useState<string[]>([]);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  const { data: myRoster } = useQuery({
    queryKey: ['team', franchise?.team_id],
    queryFn: () => api.getTeam(franchise!.team_id),
    enabled: !!franchise?.team_id,
  });

  const { data: theirRoster } = useQuery({
    queryKey: ['team', selectedTeam],
    queryFn: () => api.getTeam(selectedTeam!),
    enabled: !!selectedTeam,
  });

  const { data: tradeHistory } = useQuery({
    queryKey: ['tradeHistory'],
    queryFn: api.getTradeHistory,
  });

  const { data: pendingTrades } = useQuery({
    queryKey: ['pendingTrades', franchise?.team_id],
    queryFn: () => api.getTradeProposals(franchise!.team_id),
    enabled: !!franchise?.team_id,
  });

  const proposeTrade = useMutation({
    mutationFn: () => api.proposeTrade({
      receiving_team_id: selectedTeam!,
      players_offered: playersOffered,
      players_requested: playersRequested,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrades'] });
      setPlayersOffered([]);
      setPlayersRequested([]);
      alert('Trade proposed!');
    },
  });

  const acceptTrade = useMutation({
    mutationFn: api.acceptTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrades'] });
      queryClient.invalidateQueries({ queryKey: ['tradeHistory'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const rejectTrade = useMutation({
    mutationFn: api.rejectTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingTrades'] });
    },
  });

  // Not the right phase
  if (franchise?.phase !== 'offseason' && franchise?.phase !== 'regular_season') {
    return (
      <PageTemplate title="Trades" subtitle="Trade players with other teams">
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowLeftRight className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Trade Deadline Passed</h2>
            <p className="text-slate-500">
              Trading is available during the regular season and offseason.
            </p>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  const otherTeams = teams?.filter(t => t.id !== franchise?.team_id) || [];

  const togglePlayerOffered = (playerId: string) => {
    setPlayersOffered(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const togglePlayerRequested = (playerId: string) => {
    setPlayersRequested(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  return (
    <PageTemplate title="Trades" subtitle="Trade players with other teams">
      {/* Pending Trades */}
      {pendingTrades && pendingTrades.filter(t => t.status === 'pending').length > 0 && (
        <Card className="mb-4 md:mb-6">
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Trade Offers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {pendingTrades.filter(t => t.status === 'pending').map((trade) => (
                <div key={trade.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">
                      {trade.proposing_team_id === franchise?.team_id
                        ? `To: ${trade.receiving_team_name}`
                        : `From: ${trade.proposing_team_name}`
                      }
                    </p>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">You Send</p>
                      {trade.players_offered.map(p => (
                        <p key={p.id}>{p.name} ({p.overall})</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">You Receive</p>
                      {trade.players_requested.map(p => (
                        <p key={p.id}>{p.name} ({p.overall})</p>
                      ))}
                    </div>
                  </div>
                  {trade.proposing_team_id !== franchise?.team_id && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptTrade.mutate(trade.id)}
                        disabled={acceptTrade.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => rejectTrade.mutate(trade.id)}
                        disabled={rejectTrade.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
        {/* Select Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Select Team</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {otherTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setSelectedTeam(team.id);
                    setPlayersRequested([]);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors',
                    selectedTeam === team.id && 'bg-blue-50'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: team.primary_color }}
                  >
                    {team.abbreviation}
                  </div>
                  <span className="text-sm font-medium">{team.city} {team.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Your Players</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {myRoster?.roster.map((player) => (
              <button
                key={player.id}
                onClick={() => togglePlayerOffered(player.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100',
                  playersOffered.includes(player.id) && 'bg-red-50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{player.first_name} {player.last_name}</p>
                  <p className="text-xs text-slate-500">{player.position}</p>
                </div>
                <span className={cn('text-sm font-bold', getStatColor(player.overall))}>
                  {player.overall}
                </span>
                {playersOffered.includes(player.id) && (
                  <Badge variant="danger">Sending</Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Their Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              {selectedTeam ? theirRoster?.name : 'Their Players'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {!selectedTeam ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Select a team first
              </div>
            ) : theirRoster?.roster.map((player) => (
              <button
                key={player.id}
                onClick={() => togglePlayerRequested(player.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100',
                  playersRequested.includes(player.id) && 'bg-green-50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{player.first_name} {player.last_name}</p>
                  <p className="text-xs text-slate-500">{player.position}</p>
                </div>
                <span className={cn('text-sm font-bold', getStatColor(player.overall))}>
                  {player.overall}
                </span>
                {playersRequested.includes(player.id) && (
                  <Badge variant="success">Receiving</Badge>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Propose Trade Button */}
      {playersOffered.length > 0 && playersRequested.length > 0 && (
        <Card className="mb-4 md:mb-6">
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="font-medium">
                  Trading {playersOffered.length} player{playersOffered.length > 1 ? 's' : ''} for {playersRequested.length} player{playersRequested.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-slate-500">
                  Trade with {theirRoster?.city} {theirRoster?.name}
                </p>
              </div>
              <Button
                onClick={() => proposeTrade.mutate()}
                disabled={proposeTrade.isPending}
                size="lg"
              >
                <ArrowLeftRight className="w-5 h-5 mr-2" />
                {proposeTrade.isPending ? 'Proposing...' : 'Propose Trade'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Trade History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tradeHistory?.length ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No completed trades yet
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tradeHistory.filter(t => t.status === 'accepted').slice(0, 10).map((trade) => (
                <div key={trade.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{trade.proposing_team_name}</span>
                    <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-sm">{trade.receiving_team_name}</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      {trade.players_offered.map(p => p.name).join(', ')}
                    </div>
                    <div>
                      {trade.players_requested.map(p => p.name).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
