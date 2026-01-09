import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import type { Award } from '@/api/client';
import { AWARD_COLORS } from './constants';

interface StatLeaderCardProps {
  type: string;
  award: Award;
}

export function StatLeaderCard({ type, award }: StatLeaderCardProps): JSX.Element {
  const colorClass = AWARD_COLORS[type] || 'text-slate-400';
  const statDisplay = award.stat_value != null ? Number(award.stat_value).toFixed(1) : '-';

  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
          {award.label}
        </p>
        <div className={`text-3xl font-bold mb-2 ${colorClass}`}>
          {statDisplay}
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
