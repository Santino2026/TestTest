import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  Trophy,
  Users,
  Calendar,
  BarChart3,
  Zap,
  Star,
  Check,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }

    // Go to game selection (purchase happens there)
    navigate('/games');
  };

  const features = [
    {
      icon: Users,
      title: '450+ Unique Players',
      description: 'Each with realistic attributes, positions, and archetypes',
    },
    {
      icon: Calendar,
      title: 'Full 82-Game Seasons',
      description: 'Complete NBA-style schedule with division matchups',
    },
    {
      icon: Trophy,
      title: 'Playoffs & Championships',
      description: 'Play-in tournament and full 16-team playoff bracket',
    },
    {
      icon: BarChart3,
      title: 'Detailed Statistics',
      description: 'Track every stat from points to plus/minus',
    },
    {
      icon: Zap,
      title: 'Realistic Simulation',
      description: 'Advanced game engine with quarter-by-quarter action',
    },
    {
      icon: Star,
      title: 'Up to 50 Seasons',
      description: 'Build your dynasty across multiple seasons',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <span className="text-lg md:text-xl font-bold text-white">Sports League Office</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {isAuthenticated ? (
              <Button size="md" onClick={() => navigate('/games')}>
                My Games
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="md" onClick={() => navigate('/login')} className="text-slate-300 hover:text-white hover:bg-slate-700 min-h-[44px]">
                  Login
                </Button>
                <Button size="md" onClick={() => navigate('/signup')} className="min-h-[44px]">Sign Up</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-20 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6">
          Build Your Basketball
          <span className="text-orange-500"> Dynasty</span>
        </h1>
        <p className="text-base md:text-xl text-slate-300 mb-6 md:mb-8 max-w-2xl mx-auto px-2">
          Take control of an NBA franchise. Draft players, manage your roster,
          simulate games, and compete for championships across 50 seasons.
        </p>
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleGetStarted}
            className="text-base md:text-lg px-6 md:px-8"
          >
            {isAuthenticated ? 'My Games' : 'Get Started'}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-12">
          Everything You Need
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 md:p-6"
            >
              <feature.icon className="w-8 h-8 md:w-10 md:h-10 text-orange-500 mb-3 md:mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm md:text-base text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3 md:mb-4">
          Simple Pricing
        </h2>
        <p className="text-slate-400 text-center mb-8 md:mb-12 text-sm md:text-base">
          One-time purchase. No subscriptions. No hidden fees.
        </p>

        <div className="max-w-md mx-auto bg-gradient-to-b from-slate-800 to-slate-900 border border-orange-500/50 rounded-2xl p-5 md:p-8">
          <div className="text-center mb-5 md:mb-6">
            <span className="text-sm text-orange-400 font-medium">FULL ACCESS</span>
            <div className="mt-2">
              <span className="text-4xl md:text-5xl font-bold text-white">$10</span>
              <span className="text-slate-400 ml-2">one-time</span>
            </div>
          </div>

          <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8">
            {[
              'All 30 NBA teams',
              'Full 82-game seasons',
              'Complete playoff system',
              'Up to 50 seasons',
              'Detailed player stats',
              'Franchise mode',
              'Lifetime access',
              'Future updates included',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-slate-300 text-sm md:text-base">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            onClick={handleGetStarted}
            className="w-full text-base md:text-lg"
          >
            {isAuthenticated ? 'My Games' : 'Get Started'}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 md:mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 text-center text-slate-500 text-sm">
          <p>&copy; 2024 Sports League Office. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
