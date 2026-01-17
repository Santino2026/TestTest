export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function getDefaultTeamTotals(stats: any, gamesPlayed: number): any {
  return {
    minutes: stats.minutes * 5,
    fga: stats.fga * 5,
    fta: stats.fta * 5,
    oreb: stats.oreb * 5,
    dreb: stats.dreb * 5,
    turnovers: stats.turnovers * 5,
    wins: Math.floor(gamesPlayed / 2),
    games: gamesPlayed,
    defensive_rating: 110,
    fgm: stats.fgm * 5
  };
}
