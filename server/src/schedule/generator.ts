// 82-Game Schedule Generator + 8 Preseason Games
// Following NBA scheduling patterns

interface Team {
  id: string;
  conference: string;
  division: string;
}

interface ScheduledGame {
  home_team_id: string;
  away_team_id: string;
  game_date: Date;
  game_number_home: number;
  game_number_away: number;
  is_preseason?: boolean;
}

interface ScheduleConfig {
  season_start: Date;
  total_games: number; // 82
  preseason_games: number; // 8
}

const DEFAULT_CONFIG: ScheduleConfig = {
  season_start: new Date('2024-10-22'), // typical NBA start
  total_games: 82,
  preseason_games: 8,
};

export function generateSchedule(
  teams: Team[],
  config: ScheduleConfig = DEFAULT_CONFIG
): ScheduledGame[] {
  // Generate all required matchups for 82 games per team
  const allMatchups = generateAllMatchups(teams);

  // Track games per team per date to prevent double-booking
  const teamGamesOnDate: Map<string, Set<string>> = new Map();
  const gameCountByTeam: Map<string, number> = new Map();

  // Initialize counters
  teams.forEach(t => {
    gameCountByTeam.set(t.id, 0);
  });

  const schedule: ScheduledGame[] = [];
  const seasonDays = 174;

  // Create date list
  const dates: Date[] = [];
  const startDate = new Date(config.season_start);
  for (let i = 0; i < seasonDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
    teamGamesOnDate.set(date.toISOString().split('T')[0], new Set());
  }

  // Shuffle matchups for variety
  shuffleArray(allMatchups);

  // Schedule each matchup on a valid date
  for (const matchup of allMatchups) {
    const homeTeamId = matchup.home;
    const awayTeamId = matchup.away;

    // Find a date where neither team is playing
    let scheduled = false;

    // Try to spread games evenly - find date with fewest total games
    // and where neither team is playing
    const availableDates = dates.filter(date => {
      const dateKey = date.toISOString().split('T')[0];
      const teamsOnDate = teamGamesOnDate.get(dateKey)!;
      return !teamsOnDate.has(homeTeamId) && !teamsOnDate.has(awayTeamId);
    });

    if (availableDates.length > 0) {
      // Pick a random date from available dates for better distribution
      const dateIndex = Math.floor(Math.random() * availableDates.length);
      const gameDate = availableDates[dateIndex];
      const dateKey = gameDate.toISOString().split('T')[0];

      const homeGameNum = (gameCountByTeam.get(homeTeamId) || 0) + 1;
      const awayGameNum = (gameCountByTeam.get(awayTeamId) || 0) + 1;

      schedule.push({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        game_date: new Date(gameDate),
        game_number_home: homeGameNum,
        game_number_away: awayGameNum,
      });

      // Mark both teams as playing on this date
      teamGamesOnDate.get(dateKey)!.add(homeTeamId);
      teamGamesOnDate.get(dateKey)!.add(awayTeamId);

      gameCountByTeam.set(homeTeamId, homeGameNum);
      gameCountByTeam.set(awayTeamId, awayGameNum);
      scheduled = true;
    }

    if (!scheduled) {
      console.warn(`Could not schedule game: ${homeTeamId} vs ${awayTeamId}`);
    }
  }

  // Sort by date
  schedule.sort((a, b) => a.game_date.getTime() - b.game_date.getTime());

  return schedule;
}

interface Matchup {
  home: string;
  away: string;
}

function generateAllMatchups(teams: Team[]): Matchup[] {
  const matchups: Matchup[] = [];

  // Group teams
  const teamsByDivision: Map<string, Team[]> = new Map();
  const teamsByConference: Map<string, Team[]> = new Map();

  for (const team of teams) {
    if (!teamsByDivision.has(team.division)) {
      teamsByDivision.set(team.division, []);
    }
    teamsByDivision.get(team.division)!.push(team);

    if (!teamsByConference.has(team.conference)) {
      teamsByConference.set(team.conference, []);
    }
    teamsByConference.get(team.conference)!.push(team);
  }

  for (const team of teams) {
    const myConf = team.conference;
    const myDiv = team.division;

    // Get related teams
    const divisionRivals = teams.filter(
      t => t.division === myDiv && t.id !== team.id
    );
    const confNonDiv = teams.filter(
      t => t.conference === myConf && t.division !== myDiv
    );
    const otherConf = teams.filter(t => t.conference !== myConf);

    // Division rivals: 4 games each (2 home, 2 away)
    // 4 rivals x 4 games = 16 games
    for (const rival of divisionRivals) {
      // 2 home games
      matchups.push({ home: team.id, away: rival.id });
      matchups.push({ home: team.id, away: rival.id });
    }

    // Conference non-division: 36 games total
    // 10 teams: 6 teams get 4 games (2 home), 4 teams get 3 games (1 or 2 home)
    const confShuffled = [...confNonDiv];
    shuffleArray(confShuffled);

    for (let i = 0; i < confShuffled.length; i++) {
      const opponent = confShuffled[i];
      const gamesVs = i < 6 ? 4 : 3;
      const homeGames = Math.ceil(gamesVs / 2); // Give home advantage

      for (let g = 0; g < homeGames; g++) {
        matchups.push({ home: team.id, away: opponent.id });
      }
    }

    // Other conference: 30 games (2 vs each)
    // 15 teams x 2 games = 30 games (1 home each)
    for (const opponent of otherConf) {
      matchups.push({ home: team.id, away: opponent.id });
    }
  }

  // Filter to unique matchups by tracking pairs
  // Since each team generates their home games, we need to avoid duplicates
  const uniqueMatchups: Matchup[] = [];
  const pairCount: Map<string, number> = new Map();

  // First pass: count how many times each pair appears
  for (const m of matchups) {
    // Create a canonical key (smaller id first)
    const [t1, t2] = [m.home, m.away].sort();
    const pairKey = `${t1}-${t2}`;
    const currentCount = pairCount.get(pairKey) || 0;
    pairCount.set(pairKey, currentCount + 1);
  }

  // Second pass: add matchups respecting the count
  const addedCount: Map<string, number> = new Map();

  for (const m of matchups) {
    const [t1, t2] = [m.home, m.away].sort();
    const pairKey = `${t1}-${t2}`;
    const maxGames = pairCount.get(pairKey) || 0;
    const added = addedCount.get(pairKey) || 0;

    // Only add up to half (rounded up) of the total games for this pair
    // This ensures we get the right number of games
    if (added < Math.ceil(maxGames / 2)) {
      uniqueMatchups.push(m);
      addedCount.set(pairKey, added + 1);
    }
  }

  return uniqueMatchups;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Generate 8 preseason games per team (days -7 to 0)
export function generatePreseasonSchedule(
  teams: Team[],
  regularSeasonStart: Date = new Date('2024-10-22')
): ScheduledGame[] {
  const preseasonGames: ScheduledGame[] = [];
  const gamesPerTeam = 8;

  // Track games per team
  const gameCountByTeam: Map<string, number> = new Map();
  const teamGamesOnDate: Map<string, Set<string>> = new Map();

  teams.forEach(t => gameCountByTeam.set(t.id, 0));

  // Create 8 preseason days (days -7 to 0)
  const dates: Date[] = [];
  for (let i = -7; i <= 0; i++) {
    const date = new Date(regularSeasonStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
    teamGamesOnDate.set(date.toISOString().split('T')[0], new Set());
  }

  // Generate matchups - each team plays 8 games
  // Mix of division, conference, and inter-conference opponents
  for (const team of teams) {
    const opponents = teams.filter(t => t.id !== team.id);
    shuffleArray(opponents);

    let gamesScheduled = gameCountByTeam.get(team.id) || 0;

    for (const opponent of opponents) {
      if (gamesScheduled >= gamesPerTeam) break;

      const opponentGames = gameCountByTeam.get(opponent.id) || 0;
      if (opponentGames >= gamesPerTeam) continue;

      // Find available date
      const availableDate = dates.find(date => {
        const dateKey = date.toISOString().split('T')[0];
        const teamsOnDate = teamGamesOnDate.get(dateKey)!;
        return !teamsOnDate.has(team.id) && !teamsOnDate.has(opponent.id);
      });

      if (availableDate) {
        const dateKey = availableDate.toISOString().split('T')[0];

        // Alternate home/away
        const isHome = gamesScheduled % 2 === 0;

        preseasonGames.push({
          home_team_id: isHome ? team.id : opponent.id,
          away_team_id: isHome ? opponent.id : team.id,
          game_date: new Date(availableDate),
          game_number_home: (gameCountByTeam.get(isHome ? team.id : opponent.id) || 0) + 1,
          game_number_away: (gameCountByTeam.get(isHome ? opponent.id : team.id) || 0) + 1,
          is_preseason: true,
        });

        teamGamesOnDate.get(dateKey)!.add(team.id);
        teamGamesOnDate.get(dateKey)!.add(opponent.id);

        gameCountByTeam.set(team.id, gamesScheduled + 1);
        gameCountByTeam.set(opponent.id, opponentGames + 1);
        gamesScheduled++;
      }
    }
  }

  // Sort by date
  preseasonGames.sort((a, b) => a.game_date.getTime() - b.game_date.getTime());

  return preseasonGames;
}

// Generate full schedule (preseason + regular season)
export function generateFullSchedule(
  teams: Team[],
  config: ScheduleConfig = DEFAULT_CONFIG
): { preseason: ScheduledGame[]; regularSeason: ScheduledGame[] } {
  const preseason = generatePreseasonSchedule(teams, config.season_start);
  const regularSeason = generateSchedule(teams, config);

  return { preseason, regularSeason };
}

// Validate schedule meets requirements
export function validateSchedule(schedule: ScheduledGame[], teams: Team[]): boolean {
  const gamesByTeam = new Map<string, number>();
  const homeGamesByTeam = new Map<string, number>();
  const gamesByTeamByDate = new Map<string, Map<string, number>>();

  teams.forEach(t => {
    gamesByTeam.set(t.id, 0);
    homeGamesByTeam.set(t.id, 0);
  });

  for (const game of schedule) {
    gamesByTeam.set(game.home_team_id, (gamesByTeam.get(game.home_team_id) || 0) + 1);
    gamesByTeam.set(game.away_team_id, (gamesByTeam.get(game.away_team_id) || 0) + 1);
    homeGamesByTeam.set(game.home_team_id, (homeGamesByTeam.get(game.home_team_id) || 0) + 1);

    // Check for double-booking on same date
    const dateKey = game.game_date.toISOString().split('T')[0];
    if (!gamesByTeamByDate.has(dateKey)) {
      gamesByTeamByDate.set(dateKey, new Map());
    }
    const dateMap = gamesByTeamByDate.get(dateKey)!;

    dateMap.set(game.home_team_id, (dateMap.get(game.home_team_id) || 0) + 1);
    dateMap.set(game.away_team_id, (dateMap.get(game.away_team_id) || 0) + 1);

    if ((dateMap.get(game.home_team_id) || 0) > 1) {
      console.error(`Team ${game.home_team_id} has multiple games on ${dateKey}`);
      return false;
    }
    if ((dateMap.get(game.away_team_id) || 0) > 1) {
      console.error(`Team ${game.away_team_id} has multiple games on ${dateKey}`);
      return false;
    }
  }

  // Check all teams have reasonable game counts
  for (const team of teams) {
    const total = gamesByTeam.get(team.id) || 0;
    const home = homeGamesByTeam.get(team.id) || 0;

    if (total < 70 || total > 90) {
      console.error(`Team ${team.id} has ${total} games (expected ~82)`);
      return false;
    }

    if (home < 30 || home > 50) {
      console.error(`Team ${team.id} has ${home} home games (expected ~41)`);
      return false;
    }
  }

  return true;
}
