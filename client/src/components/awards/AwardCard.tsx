import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import type { Award } from '@/api/client';
import { AWARD_ICONS, AWARD_COLORS } from './constants';

interface AwardCardProps {
  type: string;
  award: Award;
}

export function AwardCard({ type, award }: AwardCardProps): JSX.Element {
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
