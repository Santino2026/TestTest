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

// Thresholds for stat color grading
const STAT_THRESHOLDS = [90, 80, 70, 60, 50, 40] as const;
const TEXT_COLORS = ['text-emerald-600', 'text-green-600', 'text-blue-600', 'text-slate-600', 'text-amber-600', 'text-orange-600', 'text-red-600'] as const;
const BG_COLORS = ['bg-emerald-500', 'bg-green-500', 'bg-blue-500', 'bg-slate-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500'] as const;

function getStatTierIndex(value: number): number {
  for (let i = 0; i < STAT_THRESHOLDS.length; i++) {
    if (value >= STAT_THRESHOLDS[i]) return i;
  }
  return STAT_THRESHOLDS.length;
}

// Get stat text color class based on value (0-99)
export function getStatColor(value: number): string {
  return TEXT_COLORS[getStatTierIndex(value)];
}

// Get stat background color for bars
export function getStatBgColor(value: number): string {
  return BG_COLORS[getStatTierIndex(value)];
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

// Format season day for display (handles preseason negative days)
export function formatSeasonDay(currentDay: number, phase: string): string {
  if (phase === 'preseason') {
    const gameNumber = (currentDay ?? -7) + 8;
    return `Preseason Game ${gameNumber}/8`;
  }
  return `Day ${currentDay}`;
}
