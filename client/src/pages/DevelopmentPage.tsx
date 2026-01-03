import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { api } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { cn, getStatColor } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Star, Clock, Zap } from 'lucide-react';

export default function DevelopmentPage() {
  const { franchise } = useFranchise();

  const { data: players, isLoading } = useQuery({
    queryKey: ['teamDevelopment', franchise?.team_id],
    queryFn: () => api.getTeamDevelopment(franchise!.team_id),
    enabled: !!franchise?.team_id,
  });

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'development':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'peak':
        return <Star className="w-4 h-4 text-yellow-600" />;
      case 'decline':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case 'development':
        return <Badge variant="success">Developing</Badge>;
      case 'peak':
        return <Badge variant="warning">Peak</Badge>;
      case 'decline':
        return <Badge variant="danger">Declining</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getHiddenStatBar = (value: number, label: string) => {
    const percentage = value;
    let color = 'bg-slate-200';
    if (value >= 80) color = 'bg-green-500';
    else if (value >= 60) color = 'bg-blue-500';
    else if (value >= 40) color = 'bg-yellow-500';
    else color = 'bg-red-500';

    return (
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">{label}</span>
          <span className="font-medium">{value}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', color)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Group players by phase
  const developing = players?.filter(p => p.phase === 'development') || [];
  const peaking = players?.filter(p => p.phase === 'peak') || [];
  const declining = players?.filter(p => p.phase === 'decline') || [];

  return (
    <PageTemplate title="Player Development" subtitle="Track player growth and potential">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold text-green-600">{developing.length}</p>
            <p className="text-xs text-slate-500">Developing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Star className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">{peaking.length}</p>
            <p className="text-xs text-slate-500">In Prime</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <TrendingDown className="w-8 h-8 mx-auto text-red-600 mb-2" />
            <p className="text-2xl font-bold text-red-600">{declining.length}</p>
            <p className="text-xs text-slate-500">Declining</p>
          </CardContent>
        </Card>
      </div>

      {/* Players Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Roster Development
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : !players?.length ? (
            <div className="p-8 text-center text-slate-500">No players on roster</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Player</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Age</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">OVR</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">POT</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Peak</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Phase</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Hidden Stats</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Projection</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-3">
                        <Link
                          to={`/basketball/players/${player.id}`}
                          className="hover:text-blue-600"
                        >
                          <p className="font-medium text-sm">
                            {player.first_name} {player.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {player.position} - {player.archetype.replace(/_/g, ' ')}
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn(
                          'text-sm font-medium',
                          player.phase === 'development' && 'text-green-600',
                          player.phase === 'peak' && 'text-yellow-600',
                          player.phase === 'decline' && 'text-red-600'
                        )}>
                          {player.age}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn('text-sm font-bold', getStatColor(player.overall))}>
                          {player.overall}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={cn('text-sm font-bold', getStatColor(player.potential))}>
                          {player.potential}
                        </span>
                        {player.potential > player.overall && (
                          <span className="text-xs text-green-600 ml-1">
                            (+{player.potential - player.overall})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-sm">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {player.peak_age}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getPhaseIcon(player.phase)}
                          {getPhaseBadge(player.phase)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2 min-w-[200px]">
                          {getHiddenStatBar(player.work_ethic, 'Work')}
                          {getHiddenStatBar(player.coachability, 'Coach')}
                          {getHiddenStatBar(player.durability, 'Dura')}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-600 max-w-[200px]">
                          {player.projection}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Development Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Development Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-green-600 flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" />
                Development Phase
              </h4>
              <p className="text-slate-600">
                Players improve toward their potential. Work ethic and playing time affect growth rate.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-yellow-600 flex items-center gap-2 mb-2">
                <Star className="w-4 h-4" />
                Peak Phase
              </h4>
              <p className="text-slate-600">
                Players at peak age (varies by player). Small fluctuations but overall stable performance.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-red-600 flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4" />
                Decline Phase
              </h4>
              <p className="text-slate-600">
                Physical attributes decline faster. IQ may improve. Durability affects decline rate.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="font-medium mb-3">Hidden Stats Explained</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
              <div>
                <span className="font-medium text-slate-900">Work Ethic:</span> Affects development speed during growth phase. Higher = faster improvement.
              </div>
              <div>
                <span className="font-medium text-slate-900">Coachability:</span> Multiplies development gains. More coachable players learn faster.
              </div>
              <div>
                <span className="font-medium text-slate-900">Durability:</span> Affects decline rate. Higher durability = slower aging decline.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
