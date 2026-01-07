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

  // Group teams by division and conference
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

  // Process unique pairs only once (avoid duplicates)
  const processedPairs = new Set<string>();

  // Helper to get pair key (sorted for consistency)
  const getPairKey = (a: string, b: string) => [a, b].sort().join('-');

  // Helper to add games for a pair
  const addGames = (teamA: Team, teamB: Team, totalGames: number) => {
    const pairKey = getPairKey(teamA.id, teamB.id);
    if (processedPairs.has(pairKey)) return;
    processedPairs.add(pairKey);

    // Split home/away evenly (odd games alternate who gets extra)
    const homeForA = Math.ceil(totalGames / 2);
    const homeForB = totalGames - homeForA;

    for (let i = 0; i < homeForA; i++) {
      matchups.push({ home: teamA.id, away: teamB.id });
    }
    for (let i = 0; i < homeForB; i++) {
      matchups.push({ home: teamB.id, away: teamA.id });
    }
  };

  // For conference non-division, we need consistent 4-game vs 3-game assignments
  // Create a deterministic mapping based on sorted team IDs
  const getConfNonDivGames = (teamA: Team, teamB: Team): number => {
    // Get all conf non-div opponents for teamA (sorted by ID for consistency)
    const confNonDiv = teams
      .filter(t => t.conference === teamA.conference && t.division !== teamA.division)
      .sort((a, b) => a.id.localeCompare(b.id));

    // First 6 get 4 games, last 4 get 3 games
    const idx = confNonDiv.findIndex(t => t.id === teamB.id);
    return idx < 6 ? 4 : 3;
  };

  for (const teamA of teams) {
    for (const teamB of teams) {
      if (teamA.id >= teamB.id) continue; // Process each pair once

      const sameDiv = teamA.division === teamB.division;
      const sameConf = teamA.conference === teamB.conference;

      if (sameDiv) {
        // Division rivals: 4 games each (2 home, 2 away)
        addGames(teamA, teamB, 4);
      } else if (sameConf) {
        // Conference non-division: 3 or 4 games
        // Use consistent assignment based on sorted order
        const games = getConfNonDivGames(teamA, teamB);
        addGames(teamA, teamB, games);
      } else {
        // Inter-conference: 2 games (1 home each)
        addGames(teamA, teamB, 2);
      }
    }
  }

  return matchups;
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
