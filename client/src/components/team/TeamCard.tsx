import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui';
import { TeamLogo } from './TeamLogo';
import type { Team } from '@/api/client';

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link to={`/basketball/teams/${team.id}`}>
      <Card className="hover:bg-slate-800/70 transition-all cursor-pointer">
        <CardContent className="flex items-center gap-3 md:gap-4 py-3 md:py-4">
          <TeamLogo
            abbreviation={team.abbreviation}
            primaryColor={team.primary_color}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-sm md:text-base truncate">
              {team.city} {team.name}
            </h3>
            <p className="text-xs md:text-sm text-slate-400 truncate">
              {team.conference} - {team.division}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500 hidden sm:block">Championships</p>
            <p className="text-xs text-slate-500 sm:hidden">Champs</p>
            <p className="text-lg md:text-xl font-bold text-white">{team.championships}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
