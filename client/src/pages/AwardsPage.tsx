import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useAwards, useCalculateAwards, useFranchise, useSeason } from '@/api/hooks';
import { Trophy, Medal, Star, Calculator, Loader2 } from 'lucide-react';
import type { Award } from '@/api/client';

const AWARD_ICONS: Record<string, typeof Trophy> = {
  mvp: Trophy,
  fmvp: Trophy,
  dpoy: Medal,
  roy: Star,
  '6moy': Star,
  mip: Star,
};

const AWARD_COLORS: Record<string, string> = {
  mvp: 'text-amber-400',
  fmvp: 'text-amber-400',
  dpoy: 'text-blue-400',
  roy: 'text-green-400',
  '6moy': 'text-purple-400',
  mip: 'text-orange-400',
  scoring_leader: 'text-red-400',
  rebounds_leader: 'text-cyan-400',
  assists_leader: 'text-emerald-400',
  steals_leader: 'text-yellow-400',
  blocks_leader: 'text-indigo-400',
};

const INDIVIDUAL_AWARDS = ['mvp', 'fmvp', 'dpoy', 'roy', 'mip', '6moy'];
const STAT_LEADERS = ['scoring_leader', 'rebounds_leader', 'assists_leader', 'steals_leader', 'blocks_leader'];
const ALL_NBA_TEAMS = ['all_nba_1', 'all_nba_2', 'all_nba_3'];
const ALL_DEFENSIVE_TEAMS = ['all_def_1', 'all_def_2'];

export default function AwardsPage() {
  const { data: franchise } = useFranchise();
  const { data: season } = useSeason();
  const { data: awards, isLoading } = useAwards(
    franchise?.season_id ? { season_id: franchise.season_id } : undefined
  );
  const calculateAwards = useCalculateAwards();

  const hasAwards = awards && Object.keys(awards).length > 0;

  const handleCalculateAwards = async () => {
    try {
      await calculateAwards.mutateAsync();
    } catch (error) {
      console.error('Failed to calculate awards:', error);
    }
  };

  // Group awards by category
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
      {/* Calculate Awards Button (if no awards yet) */}
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
          {/* Individual Awards */}
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

          {/* Statistical Leaders */}
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

          {/* All-NBA Teams */}
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

          {/* All-Defensive Teams */}
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

interface AwardCardProps {
  type: string;
  award: Award;
}

function AwardCard({ type, award }: AwardCardProps) {
  const Icon = AWARD_ICONS[type] || Trophy;
  const colorClass = AWARD_COLORS[type] || 'text-amber-400';

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center ${colorClass}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              {award.label}
            </p>
            <Link
              to={`/basketball/players/${award.player_id}`}
              className="text-lg font-bold text-white hover:text-blue-400 block truncate"
            >
              {award.first_name} {award.last_name}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <TeamLogo
                abbreviation={award.team_abbrev}
                primaryColor={award.primary_color || '#666'}
                size="sm"
              />
              <span className="text-sm text-slate-400">{award.team_abbrev}</span>
              <span className="text-sm text-slate-500">·</span>
              <span className="text-sm text-slate-400">{award.position}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatLeaderCardProps {
  type: string;
  award: Award;
}

function StatLeaderCard({ type, award }: StatLeaderCardProps) {
  const colorClass = AWARD_COLORS[type] || 'text-slate-400';

  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          {award.label}
        </p>
        <div className={`text-3xl font-bold mb-2 ${colorClass}`}>
          {award.stat_value != null ? Number(award.stat_value).toFixed(1) : '-'}
        </div>
        <Link
          to={`/basketball/players/${award.player_id}`}
          className="text-sm font-medium text-white hover:text-blue-400 block truncate"
        >
          {award.first_name} {award.last_name}
        </Link>
        <div className="flex items-center justify-center gap-1 mt-1">
          <TeamLogo
            abbreviation={award.team_abbrev}
            primaryColor={award.primary_color || '#666'}
            size="sm"
          />
          <span className="text-xs text-slate-500">{award.team_abbrev}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamCardProps {
  type: string;
  players: Award[];
  isDefensive?: boolean;
}

function TeamCard({ type, players, isDefensive }: TeamCardProps) {
  const teamNumber = type.includes('1') ? 'First' : type.includes('2') ? 'Second' : 'Third';
  const title = isDefensive ? `All-Defensive ${teamNumber} Team` : `All-NBA ${teamNumber} Team`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Medal className={`w-4 h-4 ${type.includes('1') ? 'text-amber-400' : type.includes('2') ? 'text-slate-300' : 'text-amber-700'}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {players.map((player) => (
            <Link
              key={player.player_id}
              to={`/basketball/players/${player.player_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <TeamLogo
                abbreviation={player.team_abbrev}
                primaryColor={player.primary_color || '#666'}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {player.first_name} {player.last_name}
                </p>
                <p className="text-xs text-slate-500">{player.position}</p>
              </div>
              {isDefensive ? (
                <span className="text-xs text-blue-400">
                  {player.stat_value != null ? Number(player.stat_value).toFixed(1) : '-'} SPG+BPG
                </span>
              ) : (
                <span className="text-xs text-amber-400">
                  {player.stat_value != null ? Number(player.stat_value).toFixed(1) : '-'} PPG
                </span>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
