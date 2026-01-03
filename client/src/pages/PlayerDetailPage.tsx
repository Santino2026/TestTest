import { useParams, Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { StatBar } from '@/components/ui/StatBar';
import { TeamLogo } from '@/components/team/TeamLogo';
import { usePlayer, useTeam } from '@/api/hooks';
import { cn, getStatColor, formatHeight, formatArchetype } from '@/lib/utils';

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: player, isLoading } = usePlayer(id || '');
  const { data: team } = useTeam(player?.team_id || '');

  if (isLoading) {
    return (
      <PageTemplate title="Loading..." subtitle="">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      </PageTemplate>
    );
  }

  if (!player) {
    return (
      <PageTemplate title="Player Not Found" subtitle="">
        <p>The player you're looking for doesn't exist.</p>
      </PageTemplate>
    );
  }

  // Attribute categories
  const scoringAttrs = [
    { label: 'Inside Scoring', value: player.inside_scoring },
    { label: 'Mid-Range', value: player.mid_range },
    { label: 'Three Point', value: player.three_point },
    { label: 'Layup', value: player.layup },
  ].filter(a => a.value !== undefined);

  const playmakingAttrs = [
    { label: 'Ball Handling', value: player.ball_handling },
    { label: 'Passing Accuracy', value: player.passing_accuracy },
    { label: 'Speed', value: player.speed },
  ].filter(a => a.value !== undefined);

  const defenseAttrs = [
    { label: 'Interior Defense', value: player.interior_defense },
    { label: 'Perimeter Defense', value: player.perimeter_defense },
    { label: 'Steal', value: player.steal },
    { label: 'Block', value: player.block },
  ].filter(a => a.value !== undefined);

  const athleticAttrs = [
    { label: 'Strength', value: player.strength },
    { label: 'Vertical', value: player.vertical },
    { label: 'Stamina', value: player.stamina },
  ].filter(a => a.value !== undefined);

  return (
    <PageTemplate
      title={`${player.first_name} ${player.last_name}`}
      subtitle={player.team_name || 'Free Agent'}
      breadcrumbs={[
        { label: 'Players', href: '/basketball/players' },
        { label: `${player.first_name} ${player.last_name}` },
      ]}
    >
      {/* Player Header */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="py-4 md:py-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
            {/* Avatar + Ratings (side by side on mobile) */}
            <div className="flex sm:flex-col items-center gap-4 sm:gap-0">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-slate-200 flex items-center justify-center text-2xl sm:text-3xl font-bold text-slate-500 flex-shrink-0">
                {player.jersey_number}
              </div>

              {/* Ratings - inline on mobile, separate section on desktop */}
              <div className="text-center sm:hidden">
                <div className={cn('text-3xl font-bold', getStatColor(player.overall))}>
                  {player.overall}
                </div>
                <p className="text-xs text-slate-500">OVR</p>
                <div className={cn('text-xl font-bold mt-1', getStatColor(player.potential))}>
                  {player.potential}
                </div>
                <p className="text-xs text-slate-400">POT</p>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                  {player.first_name} {player.last_name}
                </h2>
                <Badge variant="position">{player.position}</Badge>
              </div>

              <p className="text-slate-500 text-sm md:text-base mb-3 md:mb-4">{formatArchetype(player.archetype)}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm">
                <div>
                  <p className="text-slate-400">Team</p>
                  {team ? (
                    <Link to={`/basketball/teams/${team.id}`} className="flex items-center justify-center sm:justify-start gap-1.5 md:gap-2 mt-1 hover:text-blue-600">
                      <TeamLogo abbreviation={team.abbreviation} primaryColor={team.primary_color} size="sm" />
                      <span className="font-medium truncate">{team.city} {team.name}</span>
                    </Link>
                  ) : (
                    <p className="font-medium text-slate-900 mt-1">Free Agent</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-400">Height / Weight</p>
                  <p className="font-medium text-slate-900 mt-1">
                    {formatHeight(player.height_inches)} / {player.weight_lbs} lbs
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Age</p>
                  <p className="font-medium text-slate-900 mt-1">{player.age} years old</p>
                </div>
                <div>
                  <p className="text-slate-400">Experience</p>
                  <p className="font-medium text-slate-900 mt-1">{player.years_pro} years</p>
                </div>
              </div>
            </div>

            {/* Ratings - hidden on mobile (shown next to avatar instead) */}
            <div className="hidden sm:block text-center flex-shrink-0">
              <div className={cn('text-4xl md:text-5xl font-bold', getStatColor(player.overall))}>
                {player.overall}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">Overall</p>
              <div className={cn('text-xl md:text-2xl font-bold mt-2', getStatColor(player.potential))}>
                {player.potential}
              </div>
              <p className="text-xs text-slate-400">Potential</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scoringAttrs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {scoringAttrs.map(attr => (
                <StatBar key={attr.label} label={attr.label} value={attr.value!} />
              ))}
            </CardContent>
          </Card>
        )}

        {playmakingAttrs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Playmaking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {playmakingAttrs.map(attr => (
                <StatBar key={attr.label} label={attr.label} value={attr.value!} />
              ))}
            </CardContent>
          </Card>
        )}

        {defenseAttrs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Defense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {defenseAttrs.map(attr => (
                <StatBar key={attr.label} label={attr.label} value={attr.value!} />
              ))}
            </CardContent>
          </Card>
        )}

        {athleticAttrs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Athletic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {athleticAttrs.map(attr => (
                <StatBar key={attr.label} label={attr.label} value={attr.value!} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
