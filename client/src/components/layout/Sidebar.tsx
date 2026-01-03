import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  User,
  Play,
  LogOut,
  X,
  TrendingUp,
  GraduationCap,
  UserPlus,
  ArrowLeftRight,
  FolderOpen,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFranchise } from '@/context/FranchiseContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/basketball', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/basketball/franchises', label: 'My Franchises', icon: FolderOpen },
  { path: '/basketball/games', label: 'Games', icon: Play },
  { path: '/basketball/teams', label: 'Teams', icon: Users },
  { path: '/basketball/players', label: 'Players', icon: User },
  { path: '/basketball/development', label: 'Development', icon: Zap },
  { path: '/basketball/standings', label: 'Standings', icon: BarChart3 },
  { path: '/basketball/stats', label: 'Stats', icon: TrendingUp },
  { path: '/basketball/schedule', label: 'Schedule', icon: Calendar },
  { path: '/basketball/playoffs', label: 'Playoffs', icon: Trophy },
  { path: '/basketball/draft', label: 'Draft', icon: GraduationCap },
  { path: '/basketball/free-agency', label: 'Free Agency', icon: UserPlus },
  { path: '/basketball/trades', label: 'Trades', icon: ArrowLeftRight },
];

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
    playoffs: 'Playoffs',
    offseason: 'Offseason',
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigating
    onClose();
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 md:w-60',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Mobile Close Button */}
      <div className="md:hidden absolute top-2 right-2">
        <button
          onClick={onClose}
          className="p-3 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-6 h-6 text-slate-600" />
        </button>
      </div>

      {/* Team Header */}
      <div className="px-4 py-4 border-b border-slate-100">
        <Link to="/basketball" className="flex items-center gap-3" onClick={handleNavClick}>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow"
            style={{ backgroundColor: franchise?.primary_color || '#1a56db' }}
          >
            {franchise?.abbreviation || 'TM'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">
              {franchise?.city} {franchise?.team_name}
            </p>
            <p className="text-xs text-slate-500">
              {franchise?.wins || 0}-{franchise?.losses || 0}
            </p>
          </div>
        </Link>
      </div>

      {/* Season Info */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="bg-slate-50 rounded-lg px-3 py-2">
          <p className="text-xs text-slate-500">Current Phase</p>
          <p className="text-sm font-semibold text-slate-900">
            {phaseLabels[franchise?.phase || 'preseason'] || 'Preseason'} - Day {franchise?.current_day || 1}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isActive ? 'text-blue-600' : 'text-slate-400'
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors min-h-[44px]"
        >
          <LogOut className="w-5 h-5 text-slate-400" />
          Logout
        </button>
      </div>
    </aside>
  );
}
