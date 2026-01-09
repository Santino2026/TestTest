import { Link } from 'react-router-dom';
import { Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import type { Award } from '@/api/client';
import { getMedalColorClass } from './constants';

interface TeamCardProps {
  type: string;
  players: Award[];
  isDefensive?: boolean;
}

function getTeamTitle(type: string, isDefensive: boolean): string {
  let teamNumber: string;
  if (type.includes('1')) {
    teamNumber = 'First';
  } else if (type.includes('2')) {
    teamNumber = 'Second';
  } else {
    teamNumber = 'Third';
  }

  return isDefensive
    ? `All-Defensive ${teamNumber} Team`
    : `All-NBA ${teamNumber} Team`;
}

export function TeamCard({ type, players, isDefensive = false }: TeamCardProps): JSX.Element {
  const title = getTeamTitle(type, isDefensive);
  const medalColorClass = getMedalColorClass(type);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Medal className={`w-4 h-4 ${medalColorClass}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {players.map((player) => {
            const statDisplay = player.stat_value != null
              ? Number(player.stat_value).toFixed(1)
              : '-';
            const statLabel = isDefensive ? 'SPG+BPG' : 'PPG';
            const statColorClass = isDefensive ? 'text-blue-400' : 'text-amber-400';

            return (
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
                <span className={`text-xs ${statColorClass}`}>
                  {statDisplay} {statLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
