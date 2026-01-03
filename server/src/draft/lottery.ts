// Draft Lottery Simulation
// Based on NBA lottery odds system

export interface LotteryTeam {
  team_id: string;
  team_name: string;
  pre_lottery_position: number; // Standings rank (worst = 1)
  lottery_odds: number;         // Percentage chance at #1
  post_lottery_position?: number;
  lottery_win?: boolean;
}

// NBA-style lottery odds (2019 reform: flattened odds for bottom 3)
// Bottom 3 teams each have 14% chance at #1
const LOTTERY_ODDS: Record<number, number> = {
  1: 14.0,   // Worst record
  2: 14.0,   // 2nd worst
  3: 14.0,   // 3rd worst
  4: 12.5,
  5: 10.5,
  6: 9.0,
  7: 7.5,
  8: 6.0,
  9: 4.5,
  10: 3.0,
  11: 2.0,
  12: 1.5,
  13: 1.0,
  14: 0.5
};

// Generate lottery combinations for each team
// NBA uses 1000 combinations, we'll simulate proportionally
function generateLotteryBalls(): number[] {
  const balls: number[] = [];

  for (let position = 1; position <= 14; position++) {
    const odds = LOTTERY_ODDS[position];
    const combinations = Math.round(odds * 10); // Scale to ~1000 total

    for (let i = 0; i < combinations; i++) {
      balls.push(position);
    }
  }

  return balls;
}

// Draw a winning position from the lottery balls
function drawLotteryPick(balls: number[], excludePositions: number[]): number {
  const availableBalls = balls.filter(p => !excludePositions.includes(p));
  if (availableBalls.length === 0) {
    throw new Error('No available lottery balls');
  }
  const index = Math.floor(Math.random() * availableBalls.length);
  return availableBalls[index];
}

// Simulate the draft lottery
// Returns teams ordered by their draft position (1-14)
export function simulateLottery(teams: LotteryTeam[]): LotteryTeam[] {
  if (teams.length !== 14) {
    throw new Error('Lottery requires exactly 14 teams');
  }

  // Ensure teams are sorted by pre-lottery position
  const sortedTeams = [...teams].sort((a, b) => a.pre_lottery_position - b.pre_lottery_position);

  // Generate lottery balls
  const balls = generateLotteryBalls();

  // Draw top 4 picks (only top 4 are determined by lottery)
  const lotteryWinners: number[] = [];

  for (let pick = 1; pick <= 4; pick++) {
    const winningPosition = drawLotteryPick(balls, lotteryWinners);
    lotteryWinners.push(winningPosition);
  }

  // Assign post-lottery positions
  const result: LotteryTeam[] = [];
  const usedPositions = new Set<number>();

  // First, assign the lottery winners (picks 1-4)
  for (let pick = 1; pick <= 4; pick++) {
    const winningPrePosition = lotteryWinners[pick - 1];
    const team = sortedTeams.find(t => t.pre_lottery_position === winningPrePosition)!;

    result.push({
      ...team,
      post_lottery_position: pick,
      lottery_win: pick < winningPrePosition // They moved up
    });
    usedPositions.add(winningPrePosition);
  }

  // Remaining teams (5-14) maintain relative order based on record
  let nextPick = 5;
  for (const team of sortedTeams) {
    if (!usedPositions.has(team.pre_lottery_position)) {
      result.push({
        ...team,
        post_lottery_position: nextPick,
        lottery_win: false
      });
      nextPick++;
    }
  }

  // Sort by post-lottery position
  return result.sort((a, b) => (a.post_lottery_position || 99) - (b.post_lottery_position || 99));
}

// Get the lottery odds for a given standing position
export function getLotteryOdds(position: number): number {
  return LOTTERY_ODDS[position] || 0;
}

// Format lottery odds for display
export function formatLotteryOdds(position: number): string {
  const odds = getLotteryOdds(position);
  return `${odds.toFixed(1)}%`;
}

// Calculate the probability of getting a specific pick
export function calculatePickProbability(
  prePosition: number,
  targetPick: number
): number {
  // This is a simplified calculation
  // Full NBA lottery math is more complex with combinations
  const odds = getLotteryOdds(prePosition) / 100;

  if (targetPick <= 4) {
    // Lottery pick - use base odds
    return odds;
  } else {
    // Non-lottery - depends on if higher teams move up
    // Simplified: assume you keep your position
    return prePosition === targetPick ? 0.8 : 0.1;
  }
}

// Generate lottery results summary
export function generateLotterySummary(results: LotteryTeam[]): string {
  const movedUp = results.filter(t => t.lottery_win);
  const biggestJump = movedUp.reduce((max, t) => {
    const jump = t.pre_lottery_position - (t.post_lottery_position || t.pre_lottery_position);
    return jump > max ? jump : max;
  }, 0);

  let summary = `Draft Lottery Results:\n`;
  summary += `------------------------\n`;

  for (const team of results.slice(0, 4)) {
    const change = team.pre_lottery_position - (team.post_lottery_position || 0);
    const indicator = change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : '→';
    summary += `Pick #${team.post_lottery_position}: ${team.team_name} ${indicator}\n`;
  }

  if (movedUp.length > 0) {
    summary += `\n${movedUp.length} team(s) moved up in the lottery.`;
    if (biggestJump >= 10) {
      summary += ` Biggest jump: ${biggestJump} spots!`;
    }
  }

  return summary;
}
