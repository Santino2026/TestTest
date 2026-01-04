import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Check, Zap, Shield, Infinity } from 'lucide-react';

const includedFeatures = [
  'All 30 NBA-style teams',
  'Full 82-game seasons',
  'Playoffs with play-in tournament',
  'Up to 50 seasons per franchise',
  'Multiple save files',
  'Complete player statistics',
  'Draft & free agency systems',
  'Trade negotiations',
  'Player development',
  'Lifetime access',
  'All future updates',
];

export function PricingSection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleCTA = () => {
    navigate(isAuthenticated ? '/games' : '/signup');
  };

  return (
    <section className="py-20 md:py-28 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            Simple Pricing
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            One Price. Complete Access.
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            No subscriptions. No microtransactions. No hidden fees. Just basketball.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-lg mx-auto">
          <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-white/10 overflow-hidden">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">
                    Full Game Access
                  </p>
                  <p className="text-white text-sm mt-0.5">
                    Everything included, forever
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  <span className="text-white text-sm font-medium">Best Value</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="px-6 pt-8 pb-6 text-center border-b border-white/10">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl md:text-6xl font-black text-white">$10</span>
                <span className="text-slate-400 font-medium">USD</span>
              </div>
              <p className="text-slate-400 mt-2">One-time payment</p>
            </div>

            {/* Features */}
            <div className="px-6 py-8">
              <ul className="space-y-3">
                {includedFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div className="px-6 pb-8">
              <Button
                size="lg"
                onClick={handleCTA}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 h-auto shadow-lg shadow-blue-600/25"
              >
                {isAuthenticated ? 'Go to My Games' : 'Get Started Now'}
              </Button>
              <p className="text-center text-sm text-slate-500 mt-4">
                Secure payment via Stripe
              </p>
            </div>

            {/* Guarantees */}
            <div className="bg-slate-900/50 px-6 py-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Infinity className="w-4 h-4 text-slate-500" />
                  <span>Lifetime access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
