import { useParams } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useTeam } from '@/api/hooks';
import { cn, getStatColor, formatHeight, formatArchetype } from '@/lib/utils';

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: team, isLoading } = useTeam(id || '');

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

  if (!team) {
    return (
      <PageTemplate title="Team Not Found" subtitle="">
        <p>The team you're looking for doesn't exist.</p>
      </PageTemplate>
    );
  }

  // Sort roster by overall
  const roster = [...(team.roster || [])].sort((a, b) => b.overall - a.overall);

  return (
    <PageTemplate
      title={`${team.city} ${team.name}`}
      subtitle={`${team.conference} Conference - ${team.division} Division`}
      breadcrumbs={[
        { label: 'Teams', href: '/basketball/teams' },
        { label: team.name },
      ]}
    >
      {/* Team Header */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6">
            <TeamLogo
              abbreviation={team.abbreviation}
              primaryColor={team.primary_color}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-900 truncate">
                {team.city} {team.name}
              </h2>
              <p className="text-xs md:text-sm lg:text-base text-slate-500 truncate">{team.arena_name}</p>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">{team.championships}</p>
              <p className="text-xs md:text-sm text-slate-500">Championships</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Roster ({roster.length} Players)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 md:w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>POS</TableHead>
                  <TableHead className="hidden md:table-cell">Archetype</TableHead>
                  <TableHead className="hidden sm:table-cell">Age</TableHead>
                  <TableHead className="hidden lg:table-cell">Height</TableHead>
                  <TableHead className="text-right">OVR</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">POT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((player, idx) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium text-slate-500 text-xs md:text-sm">
                      {player.jersey_number}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/basketball/players/${player.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600 text-sm md:text-base"
                      >
                        <span className="hidden sm:inline">{player.first_name} </span>
                        <span className="sm:hidden">{player.first_name.charAt(0)}. </span>
                        {player.last_name}
                      </a>
                      {idx < 5 && (
                        <Badge variant="info" className="ml-1 md:ml-2 text-xs">S</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="position" className="text-xs">{player.position}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm hidden md:table-cell">
                      {formatArchetype(player.archetype)}
                    </TableCell>
                    <TableCell className="text-sm hidden sm:table-cell">{player.age}</TableCell>
                    <TableCell className="text-sm hidden lg:table-cell">{formatHeight(player.height_inches)}</TableCell>
                    <TableCell className="text-right">
                      <span className={cn('font-bold text-sm md:text-base', getStatColor(player.overall))}>
                        {player.overall}
                      </span>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className={cn('font-bold text-sm', getStatColor(player.potential))}>
                        {player.potential}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
