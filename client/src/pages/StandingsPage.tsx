import { Link } from 'react-router-dom';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useStandings } from '@/api/hooks';
import { calculateWinPct } from '@/lib/utils';

export default function StandingsPage() {
  const { data: standings, isLoading } = useStandings();

  // Group by conference and division
  const grouped = standings?.reduce((acc, team) => {
    const key = `${team.conference}-${team.division}`;
    if (!acc[key]) {
      acc[key] = {
        conference: team.conference,
        division: team.division,
        teams: [],
      };
    }
    acc[key].teams.push(team);
    return acc;
  }, {} as Record<string, { conference: string; division: string; teams: typeof standings }>);

  // Sort teams by wins within each division
  if (grouped) {
    Object.values(grouped).forEach(group => {
      group.teams.sort((a, b) => {
        const aWinPct = a.wins / (a.wins + a.losses || 1);
        const bWinPct = b.wins / (b.wins + b.losses || 1);
        return bWinPct - aWinPct;
      });
    });
  }

  const divisionOrder = [
    'Eastern-Atlantic',
    'Eastern-Central',
    'Eastern-Southeast',
    'Western-Northwest',
    'Western-Pacific',
    'Western-Southwest',
  ];

  if (isLoading) {
    return (
      <PageTemplate title="Standings" subtitle="Loading...">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Standings" subtitle="League standings by division">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {divisionOrder.map(key => {
          const group = grouped?.[key];
          if (!group) return null;

          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{group.division} Division</CardTitle>
                <p className="text-sm text-slate-400">{group.conference} Conference</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-6 md:w-8">#</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead className="text-center">W</TableHead>
                        <TableHead className="text-center">L</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">PCT</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Home</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Away</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.teams.map((team, idx) => (
                        <TableRow key={team.team_id}>
                          <TableCell className="font-medium text-slate-500 text-xs md:text-sm">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/basketball/teams/${team.team_id}`}
                              className="flex items-center gap-1.5 md:gap-2 hover:text-blue-400 text-slate-200"
                            >
                              <TeamLogo
                                abbreviation={team.abbreviation}
                                primaryColor={team.primary_color}
                                size="sm"
                              />
                              <span className="font-medium text-sm md:text-base truncate">
                                <span className="hidden sm:inline">{team.city}</span>
                                <span className="sm:hidden">{team.abbreviation}</span>
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-center font-medium text-green-400 text-sm md:text-base">
                            {team.wins}
                          </TableCell>
                          <TableCell className="text-center font-medium text-red-400 text-sm md:text-base">
                            {team.losses}
                          </TableCell>
                          <TableCell className="text-center text-sm text-slate-300 hidden sm:table-cell">
                            {calculateWinPct(team.wins, team.losses)}
                          </TableCell>
                          <TableCell className="text-center text-slate-400 text-sm hidden md:table-cell">
                            {team.home_wins}-{team.home_losses}
                          </TableCell>
                          <TableCell className="text-center text-slate-400 text-sm hidden md:table-cell">
                            {team.away_wins}-{team.away_losses}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageTemplate>
  );
}
