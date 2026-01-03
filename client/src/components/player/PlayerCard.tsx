import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { cn, getStatColor } from '@/lib/utils';
import type { Player } from '@/api/client';

interface PlayerCardProps {
  player: Player;
  showTeam?: boolean;
}

export function PlayerCard({ player, showTeam = true }: PlayerCardProps) {
  return (
    <Link
      to={`/basketball/players/${player.id}`}
      className="flex items-center gap-3 md:gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors min-h-[56px]"
    >
      {/* Avatar placeholder */}
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm md:text-base flex-shrink-0">
        {player.jersey_number}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 md:gap-2">
          <span className="font-semibold text-slate-900 text-sm md:text-base truncate">
            {player.first_name} {player.last_name}
          </span>
          <Badge variant="position" className="text-xs flex-shrink-0">{player.position}</Badge>
        </div>
        <div className="text-xs md:text-sm text-slate-500 truncate">
          {showTeam && player.team_abbrev && (
            <span>{player.team_abbrev} · </span>
          )}
          <span>{player.age} yrs · {player.years_pro} yr pro</span>
        </div>
      </div>

      {/* Overall rating */}
      <div className="text-right flex-shrink-0">
        <span className={cn('text-xl md:text-2xl font-bold', getStatColor(player.overall))}>
          {player.overall}
        </span>
        <p className="text-xs text-slate-400">OVR</p>
      </div>
    </Link>
  );
}
