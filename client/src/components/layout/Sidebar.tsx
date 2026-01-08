import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Calendar,
  BarChart3,
  User,
  LogOut,
  X,
  TrendingUp,
  ArrowLeftRight,
  FolderOpen,
  Zap,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFranchise } from '@/context/FranchiseContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/basketball', label: 'Season', icon: Calendar },
  { path: '/basketball/roster', label: 'My Roster', icon: ClipboardList },
  { path: '/basketball/franchises', label: 'My Franchises', icon: FolderOpen },
  { path: '/basketball/teams', label: 'Teams', icon: Users },
  { path: '/basketball/players', label: 'Players', icon: User },
  { path: '/basketball/development', label: 'Development', icon: Zap },
  { path: '/basketball/standings', label: 'Standings', icon: BarChart3 },
  { path: '/basketball/stats', label: 'Stats', icon: TrendingUp },
  { path: '/basketball/trades', label: 'Trades', icon: ArrowLeftRight },
];

// Determines if a nav item should be enabled based on current phase
type NavItemState = 'enabled' | 'disabled';

function getNavItemState(
  path: string,
  phase: string
): NavItemState {
  // Trades disabled during playoffs (after deadline)
  if (path === '/basketball/trades' && phase === 'playoffs') {
    return 'disabled';
  }
  return 'enabled';
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { franchise } = useFranchise();
  const { logout } = useAuth();

  const phaseLabels: Record<string, string> = {
    preseason: 'Preseason',
    regular_season: 'Regular Season',
    all_star: 'All-Star Weekend',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
  };

  const offseasonPhaseLabels: Record<string, string> = {
    review: 'Season Review',
    lottery: 'Draft Lottery',
    draft: 'NBA Draft',
    free_agency: 'Free Agency',
    training_camp: 'Training Camp',
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    onClose();
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-white/10 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:w-60',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Mobile Close Button */}
      <div className="md:hidden absolute top-2 right-2">
        <button
          onClick={onClose}
          className="p-3 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      {/* Team Header */}
      <div className="px-4 py-4 border-b border-white/10">
        <Link to="/basketball" className="flex items-center gap-3" onClick={handleNavClick}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-lg"
            style={{ backgroundColor: franchise?.primary_color || '#1a56db' }}
          >
            {franchise?.abbreviation || 'TM'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">
              {franchise?.city} {franchise?.team_name}
            </p>
            <p className="text-xs text-slate-400">
              {franchise?.wins || 0}-{franchise?.losses || 0}
            </p>
          </div>
        </Link>
      </div>

      {/* Season Info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="bg-slate-800/50 rounded-lg px-3 py-2 border border-white/5">
          <p className="text-xs text-slate-500">Current Phase</p>
          <p className="text-sm font-semibold text-white">
            {franchise?.phase === 'offseason' && franchise?.offseason_phase
              ? offseasonPhaseLabels[franchise.offseason_phase] || 'Offseason'
              : franchise?.phase === 'preseason'
                ? `Preseason - Game ${(franchise?.current_day ?? -7) + 8}/8`
                : `${phaseLabels[franchise?.phase || 'preseason'] || 'Preseason'} - Day ${franchise?.current_day || 1}`}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            const state = getNavItemState(
              item.path,
              franchise?.phase || 'preseason'
            );
            const isDisabled = state === 'disabled';

            return (
              <li key={item.path}>
                {isDisabled ? (
                  // Disabled state - no link, dimmed appearance
                  <div
                    className="flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium min-h-[44px] text-slate-600 cursor-not-allowed"
                  >
                    <Icon className="w-5 h-5 text-slate-700" />
                    <span className="opacity-50">{item.label}</span>
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 active:bg-white/10'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5',
                        isActive ? 'text-blue-400' : 'text-slate-500'
                      )}
                    />
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 active:bg-white/10 transition-colors min-h-[44px]"
        >
          <LogOut className="w-5 h-5 text-slate-500" />
          Logout
        </button>
      </div>
    </aside>
  );
}
