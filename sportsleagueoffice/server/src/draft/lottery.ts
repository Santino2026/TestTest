export interface LotteryTeam {
  team_id: string;
  team_name: string;
  pre_lottery_position: number;
  lottery_odds: number;
  post_lottery_position?: number;
  lottery_win?: boolean;
}

const LOTTERY_ODDS: Record<number, number> = {
  1: 14.0,
  2: 14.0,
  3: 14.0,
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

function generateLotteryBalls(): number[] {
  const balls: number[] = [];

  for (let position = 1; position <= 14; position++) {
    const combinations = Math.round(LOTTERY_ODDS[position] * 10);
    for (let i = 0; i < combinations; i++) {
      balls.push(position);
    }
  }

  return balls;
}

function drawLotteryPick(balls: number[], excludePositions: number[]): number {
  const availableBalls = balls.filter(p => !excludePositions.includes(p));
  if (availableBalls.length === 0) {
    throw new Error('No available lottery balls');
  }
  return availableBalls[Math.floor(Math.random() * availableBalls.length)];
}

export function simulateLottery(teams: LotteryTeam[]): LotteryTeam[] {
  if (teams.length !== 14) {
    throw new Error('Lottery requires exactly 14 teams');
  }

  const sortedTeams = [...teams].sort((a, b) => a.pre_lottery_position - b.pre_lottery_position);
  const balls = generateLotteryBalls();
  const lotteryWinners: number[] = [];

  for (let pick = 1; pick <= 4; pick++) {
    const winningPosition = drawLotteryPick(balls, lotteryWinners);
    lotteryWinners.push(winningPosition);
  }

  const result: LotteryTeam[] = [];
  const usedPositions = new Set<number>();

  for (let pick = 1; pick <= 4; pick++) {
    const winningPrePosition = lotteryWinners[pick - 1];
    const team = sortedTeams.find(t => t.pre_lottery_position === winningPrePosition)!;

    result.push({
      ...team,
      post_lottery_position: pick,
      lottery_win: pick < winningPrePosition
    });
    usedPositions.add(winningPrePosition);
  }

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

  return result.sort((a, b) => (a.post_lottery_position || 99) - (b.post_lottery_position || 99));
}

export function getLotteryOdds(position: number): number {
  return LOTTERY_ODDS[position] || 0;
}

export function formatLotteryOdds(position: number): string {
  return `${getLotteryOdds(position).toFixed(1)}%`;
}

export function calculatePickProbability(prePosition: number, targetPick: number): number {
  const odds = getLotteryOdds(prePosition) / 100;

  if (targetPick <= 4) {
    return odds;
  }
  return prePosition === targetPick ? 0.8 : 0.1;
}

function getChangeIndicator(change: number): string {
  if (change > 0) return `↑${change}`;
  if (change < 0) return `↓${Math.abs(change)}`;
  return '→';
}

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
    summary += `Pick #${team.post_lottery_position}: ${team.team_name} ${getChangeIndicator(change)}\n`;
  }

  if (movedUp.length > 0) {
    summary += `\n${movedUp.length} team(s) moved up in the lottery.`;
    if (biggestJump >= 10) {
      summary += ` Biggest jump: ${biggestJump} spots!`;
    }
  }

  return summary;
}
