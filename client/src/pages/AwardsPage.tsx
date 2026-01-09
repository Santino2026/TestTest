import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, Button } from '@/components/ui';
import { useAwards, useCalculateAwards, useFranchise, useSeason } from '@/api/hooks';
import { Trophy, Calculator, Loader2 } from 'lucide-react';
import {
  AwardCard,
  StatLeaderCard,
  TeamCard,
  INDIVIDUAL_AWARDS,
  STAT_LEADERS,
  ALL_NBA_TEAMS,
  ALL_DEFENSIVE_TEAMS,
} from '@/components/awards';

export default function AwardsPage(): JSX.Element {
  const { data: franchise } = useFranchise();
  const { data: season } = useSeason();
  const { data: awards, isLoading } = useAwards(
    franchise?.season_id ? { season_id: franchise.season_id } : undefined
  );
  const calculateAwards = useCalculateAwards();

  const hasAwards = awards && Object.keys(awards).length > 0;

  const handleCalculateAwards = async (): Promise<void> => {
    try {
      await calculateAwards.mutateAsync();
    } catch (error) {
      console.error('Failed to calculate awards:', error);
    }
  };

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
    <PageTemplate
      title="Season Awards"
      subtitle={`Season ${season?.season_number || 1}`}
    >
      {!hasAwards && !isLoading && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-white">Calculate Season Awards</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Awards are calculated based on regular season performance.
              Players must have played at least 20 games to qualify.
            </p>
            <Button
              onClick={handleCalculateAwards}
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
    </PageTemplate>
  );
}
