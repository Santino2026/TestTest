// 82-Game Schedule Generator
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
}

interface ScheduleConfig {
  season_start: Date;
  games_per_week: number; // average ~3.5 games per team per week
  total_games: number; // 82
}

const DEFAULT_CONFIG: ScheduleConfig = {
  season_start: new Date('2024-10-22'), // typical NBA start
  games_per_week: 3.5,
  total_games: 82,
};

export function generateSchedule(
  teams: Team[],
  config: ScheduleConfig = DEFAULT_CONFIG
): ScheduledGame[] {
  const schedule: ScheduledGame[] = [];
  const gameCountByTeam: Map<string, number> = new Map();
  const homeGamesByTeam: Map<string, number> = new Map();

  // Initialize counters
  teams.forEach(t => {
    gameCountByTeam.set(t.id, 0);
    homeGamesByTeam.set(t.id, 0);
  });

  // Group teams by conference and division
  const conferences = groupBy(teams, 'conference');
  const divisions = groupBy(teams, 'division');

  // Generate matchups following NBA rules
  const matchups = generateMatchups(teams, conferences, divisions);

  // Shuffle matchups for variety
  shuffleArray(matchups);

  // Distribute games across season (~174 days for 82 games)
  const seasonDays = 174; // Late October to mid-April
  const gamesPerDay = Math.ceil(matchups.length / seasonDays);

  let currentDate = new Date(config.season_start);
  let gameIndex = 0;

  for (let day = 0; day < seasonDays && gameIndex < matchups.length; day++) {
    // Determine games for this day (3-8 games typically)
    const gamesThisDay = Math.min(
      randomInt(4, 8),
      matchups.length - gameIndex
    );

    for (let g = 0; g < gamesThisDay && gameIndex < matchups.length; g++) {
      const matchup = matchups[gameIndex];

      // Assign game numbers
      const homeGameNum = (gameCountByTeam.get(matchup.home) || 0) + 1;
      const awayGameNum = (gameCountByTeam.get(matchup.away) || 0) + 1;

      // Only schedule if both teams have games left
      if (homeGameNum <= config.total_games && awayGameNum <= config.total_games) {
        schedule.push({
          home_team_id: matchup.home,
          away_team_id: matchup.away,
          game_date: new Date(currentDate),
          game_number_home: homeGameNum,
          game_number_away: awayGameNum,
        });

        gameCountByTeam.set(matchup.home, homeGameNum);
        gameCountByTeam.set(matchup.away, awayGameNum);
        homeGamesByTeam.set(matchup.home, (homeGamesByTeam.get(matchup.home) || 0) + 1);
      }

      gameIndex++;
    }

    // Move to next day (skip some days for realism)
    currentDate.setDate(currentDate.getDate() + (Math.random() > 0.3 ? 1 : 2));
  }

  return schedule;
}

interface Matchup {
  home: string;
  away: string;
}

function generateMatchups(
  teams: Team[],
  conferences: Map<string, Team[]>,
  divisions: Map<string, Team[]>
): Matchup[] {
  const matchups: Matchup[] = [];

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

    // Conference non-division: 36 games total (3 or 4 vs each)
    // 10 teams, need to distribute 36 games
    // 6 teams get 4 games, 4 teams get 3 games
    const confShuffled = [...confNonDiv];
    shuffleArray(confShuffled);

    for (let i = 0; i < confShuffled.length; i++) {
      const opponent = confShuffled[i];
      const gamesVs = i < 6 ? 4 : 3;
      const homeGames = Math.floor(gamesVs / 2);

      for (let g = 0; g < homeGames; g++) {
        matchups.push({ home: team.id, away: opponent.id });
      }
    }

    // Other conference: 30 games (2 vs each)
    // 15 teams x 2 games = 30 games (1 home, 1 away)
    for (const opponent of otherConf) {
      matchups.push({ home: team.id, away: opponent.id });
    }
  }

  // Remove duplicates (since we generate from both sides)
  const uniqueMatchups: Matchup[] = [];
  const seen = new Set<string>();

  for (const m of matchups) {
    const key1 = `${m.home}-${m.away}`;
    const key2 = `${m.away}-${m.home}`;

    if (!seen.has(key1) && !seen.has(key2)) {
      uniqueMatchups.push(m);
      seen.add(key1);
    }
  }

  return uniqueMatchups;
}

function groupBy<T>(items: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = String(item[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Validate schedule meets requirements
export function validateSchedule(schedule: ScheduledGame[], teams: Team[]): boolean {
  const gamesByTeam = new Map<string, number>();
  const homeGamesByTeam = new Map<string, number>();

  teams.forEach(t => {
    gamesByTeam.set(t.id, 0);
    homeGamesByTeam.set(t.id, 0);
  });

  for (const game of schedule) {
    gamesByTeam.set(game.home_team_id, (gamesByTeam.get(game.home_team_id) || 0) + 1);
    gamesByTeam.set(game.away_team_id, (gamesByTeam.get(game.away_team_id) || 0) + 1);
    homeGamesByTeam.set(game.home_team_id, (homeGamesByTeam.get(game.home_team_id) || 0) + 1);
  }

  // Check all teams have ~82 games and ~41 home games
  for (const team of teams) {
    const total = gamesByTeam.get(team.id) || 0;
    const home = homeGamesByTeam.get(team.id) || 0;

    if (total < 80 || total > 84) {
      console.error(`Team ${team.id} has ${total} games (expected ~82)`);
      return false;
    }

    if (home < 38 || home > 44) {
      console.error(`Team ${team.id} has ${home} home games (expected ~41)`);
      return false;
    }
  }

  return true;
}
