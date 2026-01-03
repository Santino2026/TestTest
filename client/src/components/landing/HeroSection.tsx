import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Play, ChevronRight } from 'lucide-react';

export function HeroSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleCTA = () => {
    navigate(isAuthenticated ? '/games' : '/signup');
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/01-hero.png"
          alt="Basketball player dunking"
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        <div className="max-w-xl lg:max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-400 text-sm font-medium tracking-wide uppercase">
              Basketball Franchise Sim
            </span>
          </div>

          {/* Main Headline - EA Sports style */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6">
            BUILD YOUR
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">
              DYNASTY
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 max-w-lg">
            Take control of your franchise. Draft legends. Dominate seasons.
            Chase championships across 50 years of basketball glory.
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-6 md:gap-10 mb-10">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">30</p>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Teams</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">450+</p>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Players</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">82</p>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Game Season</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-white">50</p>
              <p className="text-sm text-slate-400 uppercase tracking-wider">Seasons</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              onClick={handleCTA}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-8 py-4 h-auto shadow-lg shadow-blue-600/25"
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              {isAuthenticated ? 'Continue Playing' : 'Start Your Franchise'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold text-lg px-8 py-4 h-auto backdrop-blur-sm"
            >
              Learn More
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>

          {/* Price Badge */}
          <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
            <span className="text-2xl font-bold text-white">$10</span>
            <div className="text-left">
              <p className="text-sm text-slate-300 font-medium">One-time purchase</p>
              <p className="text-xs text-slate-500">Lifetime access included</p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
