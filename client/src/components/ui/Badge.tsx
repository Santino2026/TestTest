import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-slate-700/50 text-slate-300 border border-white/10',
        secondary: 'bg-slate-700/50 text-slate-400 border border-white/10',
        position: 'bg-slate-700/50 text-slate-300 border border-white/10',
        success: 'bg-green-500/20 text-green-400 border border-green-500/30',
        warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
        info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
        // Trait tier badges
        bronze: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
        silver: 'bg-slate-400/20 text-slate-300 border border-slate-400/30',
        gold: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        hall_of_fame: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
