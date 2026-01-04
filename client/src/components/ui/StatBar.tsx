import { cn, getStatColor, getStatBgColor } from '@/lib/utils';

interface StatBarProps {
  label: string;
  value: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function StatBar({ label, value, showLabel = true, size = 'md' }: StatBarProps) {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex items-center gap-2 md:gap-3', size === 'sm' ? 'text-xs' : 'text-sm')}>
      {showLabel && (
        <span className="text-slate-400 w-20 md:w-28 lg:w-32 truncate text-xs md:text-sm">{label}</span>
      )}
      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getStatBgColor(value))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn('font-semibold w-8 text-right', getStatColor(value))}>
        {value}
      </span>
    </div>
  );
}
