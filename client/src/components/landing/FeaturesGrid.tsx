import {
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Zap,
  TrendingUp,
  Shuffle,
  UserPlus,
  Medal,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Full Roster Management',
    description: '450+ unique players with authentic attributes, positions, and playstyles. Build your perfect lineup.',
    color: 'blue',
  },
  {
    icon: Calendar,
    title: '82-Game Seasons',
    description: 'Experience a complete NBA-style schedule with division rivalries and conference matchups.',
    color: 'green',
  },
  {
    icon: Trophy,
    title: 'Playoffs & Championships',
    description: 'Battle through the play-in tournament and 16-team bracket to claim your title.',
    color: 'amber',
  },
  {
    icon: Zap,
    title: 'Advanced Simulation',
    description: 'Possession-by-possession game engine with realistic shot charts and player tendencies.',
    color: 'purple',
  },
  {
    icon: BarChart3,
    title: 'Deep Statistics',
    description: 'Track every stat from basic box scores to advanced metrics like PER and true shooting.',
    color: 'cyan',
  },
  {
    icon: TrendingUp,
    title: 'Player Development',
    description: 'Watch young talent grow into stars. Manage peak years and veteran decline.',
    color: 'emerald',
  },
  {
    icon: UserPlus,
    title: 'Draft & Free Agency',
    description: 'Scout prospects, win the lottery, and sign free agents to build your dynasty.',
    color: 'orange',
  },
  {
    icon: Shuffle,
    title: 'Trade System',
    description: 'Negotiate trades with AI teams. Evaluate deals with smart trade analysis.',
    color: 'pink',
  },
  {
    icon: Medal,
    title: '50 Season Dynasty',
    description: 'Build a legacy across decades. Track championships, retired numbers, and franchise history.',
    color: 'yellow',
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string }> = {
  blue: { bg: 'bg-blue-500/20', icon: 'text-blue-400', border: 'group-hover:border-blue-500/30' },
  green: { bg: 'bg-green-500/20', icon: 'text-green-400', border: 'group-hover:border-green-500/30' },
  amber: { bg: 'bg-amber-500/20', icon: 'text-amber-400', border: 'group-hover:border-amber-500/30' },
  purple: { bg: 'bg-purple-500/20', icon: 'text-purple-400', border: 'group-hover:border-purple-500/30' },
  cyan: { bg: 'bg-cyan-500/20', icon: 'text-cyan-400', border: 'group-hover:border-cyan-500/30' },
  emerald: { bg: 'bg-emerald-500/20', icon: 'text-emerald-400', border: 'group-hover:border-emerald-500/30' },
  orange: { bg: 'bg-orange-500/20', icon: 'text-orange-400', border: 'group-hover:border-orange-500/30' },
  pink: { bg: 'bg-pink-500/20', icon: 'text-pink-400', border: 'group-hover:border-pink-500/30' },
  yellow: { bg: 'bg-yellow-500/20', icon: 'text-yellow-400', border: 'group-hover:border-yellow-500/30' },
};

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-28 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-3">
            Complete Experience
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need to Dominate
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From draft day to championship parade, every tool you need to build a basketball empire.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature) => {
            const colors = colorClasses[feature.color];
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className={`group relative bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:bg-slate-800/70 hover:-translate-y-1 ${colors.border}`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 md:w-14 md:h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon className={`w-6 h-6 md:w-7 md:h-7 ${colors.icon}`} />
                </div>

                {/* Content */}
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
