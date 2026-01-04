import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TeamCard } from '@/components/team/TeamCard';
import { useTeams } from '@/api/hooks';

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams();

  // Group teams by division
  const divisions = teams?.reduce((acc, team) => {
    const key = `${team.conference} - ${team.division}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(team);
    return acc;
  }, {} as Record<string, typeof teams>);

  const divisionOrder = [
    'Eastern - Atlantic',
    'Eastern - Central',
    'Eastern - Southeast',
    'Western - Northwest',
    'Western - Pacific',
    'Western - Southwest',
  ];

  if (isLoading) {
    return (
      <PageTemplate title="Teams" subtitle="Loading...">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-800/50 rounded-xl" />
          ))}
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="Teams" subtitle="All 30 franchise teams">
      <div className="space-y-8">
        {divisionOrder.map(divisionKey => {
          const divisionTeams = divisions?.[divisionKey];
          if (!divisionTeams) return null;

          const [conference, division] = divisionKey.split(' - ');

          return (
            <Card key={divisionKey}>
              <CardHeader>
                <CardTitle>{division} Division</CardTitle>
                <p className="text-sm text-slate-400">{conference} Conference</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {divisionTeams.map(team => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageTemplate>
  );
}
