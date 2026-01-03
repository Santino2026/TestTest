import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format height from inches to feet'inches"
export function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  return `${feet}'${remainingInches}"`;
}

// Get stat color class based on value (0-99)
export function getStatColor(value: number): string {
  if (value >= 90) return 'text-emerald-600';
  if (value >= 80) return 'text-green-600';
  if (value >= 70) return 'text-blue-600';
  if (value >= 60) return 'text-slate-600';
  if (value >= 50) return 'text-amber-600';
  if (value >= 40) return 'text-orange-600';
  return 'text-red-600';
}

// Get stat background color for bars
export function getStatBgColor(value: number): string {
  if (value >= 90) return 'bg-emerald-500';
  if (value >= 80) return 'bg-green-500';
  if (value >= 70) return 'bg-blue-500';
  if (value >= 60) return 'bg-slate-500';
  if (value >= 50) return 'bg-amber-500';
  if (value >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

// Format position name
export function formatPosition(pos: string): string {
  const positions: Record<string, string> = {
    PG: 'Point Guard',
    SG: 'Shooting Guard',
    SF: 'Small Forward',
    PF: 'Power Forward',
    C: 'Center',
  };
  return positions[pos] || pos;
}

// Format archetype name
export function formatArchetype(archetype: string): string {
  return archetype
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Calculate win percentage
export function calculateWinPct(wins: number, losses: number): string {
  if (wins + losses === 0) return '.000';
  const pct = wins / (wins + losses);
  return pct.toFixed(3).replace('0.', '.');
}

// Calculate games behind leader
export function calculateGB(leaderWins: number, leaderLosses: number, wins: number, losses: number): string {
  const gb = ((leaderWins - wins) + (losses - leaderLosses)) / 2;
  if (gb === 0) return '-';
  return gb.toFixed(1);
}
