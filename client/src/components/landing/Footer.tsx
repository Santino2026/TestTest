import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-white/10 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <img
              src="/images/SportsLeagueOffice26.png"
              alt="Sports League Office"
              className="h-8 w-auto opacity-80"
            />
            <div>
              <p className="text-white font-semibold">Modernize Games</p>
              <p className="text-sm">&copy; 2026 Modernize Games. All rights reserved</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm">
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="hover:text-white transition-colors">
              Create Account
            </Link>
            <a href="mailto:support@sportsleagueoffice.com" className="hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
