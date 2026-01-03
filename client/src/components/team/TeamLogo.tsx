import { cn } from '@/lib/utils';

interface TeamLogoProps {
  abbreviation: string;
  primaryColor: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

export function TeamLogo({ abbreviation, primaryColor, size = 'md', className }: TeamLogoProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white',
        sizes[size],
        className
      )}
      style={{ backgroundColor: primaryColor }}
    >
      {abbreviation}
    </div>
  );
}
