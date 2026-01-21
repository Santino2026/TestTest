import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, Button } from '@/components/ui';
import { useAwards, useFranchise } from '@/api/hooks';
import { useFranchise as useFranchiseContext } from '@/context/FranchiseContext';
import { api } from '@/api/client';
import { Trophy, Calculator, Loader2, Play } from 'lucide-react';
import {
  AwardCard,
  StatLeaderCard,
  TeamCard,
  INDIVIDUAL_AWARDS,
  STAT_LEADERS,
  ALL_NBA_TEAMS,
  ALL_DEFENSIVE_TEAMS,
} from '@/components/awards';

export function AwardsContent(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: franchise } = useFranchise();
  const { refreshFranchise } = useFranchiseContext();
  const { data: awards, isLoading } = useAwards(
    franchise?.season_id ? { season_id: franchise.season_id } : undefined
  );

  const calculateAwards = useMutation({
    mutationFn: api.calculateAwards,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
    },
  });

  const startPlayoffs = useMutation({
    mutationFn: api.startPlayoffsFromAwards,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      refreshFranchise();
    },
  });

  const hasAwards = awards && Object.keys(awards).length > 0;

  const individualAwards = INDIVIDUAL_AWARDS
    .filter(type => awards?.[type])
    .map(type => ({ type, award: awards![type][0] }));

  const statLeaders = STAT_LEADERS
    .filter(type => awards?.[type])
    .map(type => ({ type, award: awards![type][0] }));

  const allNbaTeams = ALL_NBA_TEAMS
    .filter(type => awards?.[type])
    .map(type => ({ type, players: awards![type] }));

  const allDefensiveTeams = ALL_DEFENSIVE_TEAMS
    .filter(type => awards?.[type])
    .map(type => ({ type, players: awards![type] }));

  return (
    <>
      {!hasAwards && !isLoading && (
        <Card className="mb-4">
          <CardContent className="py-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">Calculate Season Awards</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Awards are calculated based on regular season performance.
              Players must have played at least 20 games to qualify.
            </p>
            <Button
              onClick={() => calculateAwards.mutate()}
              disabled={calculateAwards.isPending}
              size="lg"
            >
              {calculateAwards.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Calculator className="w-5 h-5 mr-2" />
              )}
              {calculateAwards.isPending ? 'Calculating...' : 'Calculate Awards'}
            </Button>
          </CardContent>
        </Card>
      )}

      {hasAwards && franchise?.phase === 'awards' && (
        <Card className="mb-4 border-amber-500/30 bg-amber-900/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-white">Ready for Playoffs</h3>
                <p className="text-sm text-slate-400">Season {franchise?.season_number} awards have been calculated</p>
              </div>
              <Button
                onClick={() => startPlayoffs.mutate()}
                disabled={startPlayoffs.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                {startPlayoffs.isPending ? 'Starting...' : 'Start Playoffs'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
            Loading awards...
          </CardContent>
        </Card>
      )}

      {hasAwards && (
        <div className="space-y-6">
          {individualAwards.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Individual Awards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {individualAwards.map(({ type, award }) => (
                  <AwardCard key={type} type={type} award={award} />
                ))}
              </div>
            </div>
          )}

          {statLeaders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Statistical Leaders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {statLeaders.map(({ type, award }) => (
                  <StatLeaderCard key={type} type={type} award={award} />
                ))}
              </div>
            </div>
          )}

          {allNbaTeams.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">All-NBA Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allNbaTeams.map(({ type, players }) => (
                  <TeamCard key={type} type={type} players={players} />
                ))}
              </div>
            </div>
          )}

          {allDefensiveTeams.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">All-Defensive Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allDefensiveTeams.map(({ type, players }) => (
                  <TeamCard key={type} type={type} players={players} isDefensive />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
