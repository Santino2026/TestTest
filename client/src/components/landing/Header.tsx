import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/images/SportsLeagueOffice26.png"
              alt="Sports League Office"
              className="h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-2 md:gap-4">
            {isAuthenticated ? (
              <Button
                onClick={() => navigate('/games')}
                className="bg-white text-slate-900 hover:bg-slate-100 font-semibold"
              >
                Play Now
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="text-white/90 hover:text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-semibold"
                >
                  Get Started
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
