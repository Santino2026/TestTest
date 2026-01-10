import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  BarChart3,
  TrendingUp,
  ArrowLeftRight,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFranchise } from '@/context/FranchiseContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/basketball', label: 'SEASON', icon: Calendar },
  { path: '/basketball/roster', label: 'ROSTER', icon: ClipboardList },
  { path: '/basketball/standings', label: 'STANDINGS', icon: BarChart3 },
  { path: '/basketball/stats', label: 'STATS', icon: TrendingUp },
  { path: '/basketball/trades', label: 'TRADES', icon: ArrowLeftRight },
];

type NavItemState = 'enabled' | 'disabled';

function getNavItemState(path: string, phase: string): NavItemState {
  if (path === '/basketball/trades' && phase === 'playoffs') {
    return 'disabled';
  }
  return 'enabled';
}

export function TopNav(): JSX.Element {
  const location = useLocation();
  const { franchise } = useFranchise();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);

  const phaseLabels: Record<string, string> = {
    preseason: 'Preseason',
    regular_season: 'Regular Season',
    all_star: 'All-Star',
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

  function getPhaseDisplay(): string {
    if (!franchise) return 'Preseason';
    if (franchise.phase === 'offseason' && franchise.offseason_phase) {
      return offseasonPhaseLabels[franchise.offseason_phase] || 'Offseason';
    }
    if (franchise.phase === 'preseason') {
      const gameNumber = (franchise.current_day ?? -7) + 8;
      return `Pre G${gameNumber}`;
    }
    return phaseLabels[franchise.phase] || 'Preseason';
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14"
      style={{
        background: 'linear-gradient(180deg, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div className="h-full max-w-[1600px] mx-auto px-4 flex items-center justify-between">
        {/* Left: Team Badge + Record */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setTeamMenuOpen(!teamMenuOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors"
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{
                  backgroundColor: franchise?.primary_color || '#1a56db',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {franchise?.abbreviation || 'TM'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-white leading-tight">
                  {franchise?.abbreviation || 'Team'}
                </p>
                <p className="text-xs text-slate-400">
                  {franchise?.wins || 0}-{franchise?.losses || 0}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {/* Team Dropdown */}
            {teamMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setTeamMenuOpen(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 rounded-lg border border-white/10 shadow-xl z-50 py-1">
                  <Link
                    to="/basketball/franchises"
                    onClick={() => setTeamMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Switch Franchise
                  </Link>
                  <Link
                    to="/basketball/teams"
                    onClick={() => setTeamMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    View All Teams
                  </Link>
                  <Link
                    to="/basketball/players"
                    onClick={() => setTeamMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Player Database
                  </Link>
                  <Link
                    to="/basketball/development"
                    onClick={() => setTeamMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Development
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center: Navigation Items (Desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const state = getNavItemState(item.path, franchise?.phase || 'preseason');
            const isDisabled = state === 'disabled';

            if (isDisabled) {
              return (
                <span
                  key={item.path}
                  className="px-4 py-2 text-sm font-medium text-slate-600 cursor-not-allowed"
                >
                  {item.label}
                </span>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-all relative',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
                style={isActive ? {
                  textShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                } : undefined}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500"
                    style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Phase + Logout */}
        <div className="flex items-center gap-3">
          {/* Phase Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800/50 border border-white/5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              {getPhaseDisplay()}
            </span>
          </div>

          {/* Logout (Desktop) */}
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-slate-300" />
            ) : (
              <Menu className="w-5 h-5 text-slate-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
        >
          <nav className="py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              const state = getNavItemState(item.path, franchise?.phase || 'preseason');
              const isDisabled = state === 'disabled';

              if (isDisabled) {
                return (
                  <span
                    key={item.path}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 cursor-not-allowed"
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </span>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-slate-300 hover:bg-white/5'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}

            {/* Mobile-only links */}
            <div className="border-t border-white/10 mt-2 pt-2">
              <Link
                to="/basketball/franchises"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Switch Franchise
              </Link>
              <Link
                to="/basketball/teams"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                View All Teams
              </Link>
              <Link
                to="/basketball/players"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Player Database
              </Link>
              <Link
                to="/basketball/development"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
              >
                Development
              </Link>
            </div>

            {/* Phase Display (Mobile) */}
            <div className="border-t border-white/10 mt-2 pt-2 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-slate-400">
                  {getPhaseDisplay()}
                </span>
              </div>
            </div>

            {/* Logout (Mobile) */}
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:bg-white/5 border-t border-white/10"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
