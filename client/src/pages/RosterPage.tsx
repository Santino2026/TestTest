import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from '@/components/ui';
import { useTeam } from '@/api/hooks';
import { useFranchise } from '@/context/FranchiseContext';
import { cn, getStatColor, formatHeight } from '@/lib/utils';

export default function RosterPage() {
  const { franchise } = useFranchise();
  const { data: team, isLoading } = useTeam(franchise?.team_id || '');

  if (isLoading || !franchise) {
    return (
      <PageTemplate title="My Roster" subtitle="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-800/50 rounded-xl" />
        </div>
      </PageTemplate>
    );
  }

  if (!team) {
    return (
      <PageTemplate title="My Roster" subtitle="">
        <p className="text-slate-400">Team not found.</p>
      </PageTemplate>
    );
  }

  // Sort roster by position
  const positionOrder = ['PG', 'SG', 'SF', 'PF', 'C'];
  const sortedRoster = [...(team.roster || [])].sort((a, b) => {
    const posA = positionOrder.indexOf(a.position);
    const posB = positionOrder.indexOf(b.position);
    if (posA !== posB) return posA - posB;
    return b.overall - a.overall;
  });

  // Split into starters and bench (top 5 by position are "starters")
  const startersByPosition: Record<string, typeof sortedRoster[0]> = {};
  const bench: typeof sortedRoster = [];

  sortedRoster.forEach(player => {
    if (!startersByPosition[player.position]) {
      startersByPosition[player.position] = player;
    } else {
      bench.push(player);
    }
  });

  const starters = positionOrder
    .map(pos => startersByPosition[pos])
    .filter(Boolean);

  // Sort bench by overall
  bench.sort((a, b) => b.overall - a.overall);

  return (
    <PageTemplate
      title="My Roster"
      subtitle={`${franchise.city} ${franchise.team_name}`}
    >
      {/* Team Overview */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg"
              style={{ backgroundColor: franchise.primary_color }}
            >
              {franchise.abbreviation}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">
                {franchise.city} {franchise.team_name}
              </h2>
              <p className="text-slate-400">
                {franchise.wins}-{franchise.losses} | {franchise.conference} Conference
              </p>
            </div>
            <div className="sm:ml-auto flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{team.roster?.length || 0}</p>
                <p className="text-xs text-slate-500">Players</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {starters.length > 0
                    ? Math.round(starters.reduce((sum, p) => sum + p.overall, 0) / starters.length)
                    : 0}
                </p>
                <p className="text-xs text-slate-500">Avg OVR</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Starters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Starting Lineup</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">POS</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">OVR</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Age</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Height</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Exp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {starters.map(player => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Badge variant="position">{player.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/basketball/players/${player.id}`}
                        className="font-medium hover:text-blue-400 text-slate-200"
                      >
                        {player.first_name} {player.last_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('font-bold', getStatColor(player.overall))}>
                        {player.overall}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hidden sm:table-cell">
                      {player.age}
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hidden md:table-cell">
                      {formatHeight(player.height_inches)}
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hidden md:table-cell">
                      {player.years_pro} yrs
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bench */}
      <Card>
        <CardHeader>
          <CardTitle>Bench ({bench.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">POS</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">OVR</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Age</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Height</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Exp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bench.map(player => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Badge variant="position">{player.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/basketball/players/${player.id}`}
                        className="font-medium hover:text-blue-400 text-slate-200"
                      >
                        {player.first_name} {player.last_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn('font-bold', getStatColor(player.overall))}>
                        {player.overall}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hidden sm:table-cell">
                      {player.age}
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hidden md:table-cell">
                      {formatHeight(player.height_inches)}
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hidden md:table-cell">
                      {player.years_pro} yrs
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
