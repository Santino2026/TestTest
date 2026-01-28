import { v4 as uuidv4 } from 'uuid';

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  conference: string;
  division: string;
}

interface ScheduledGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  game_date: string;
  game_day: number;
  is_preseason: boolean;
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Generates an 82-game regular season schedule + 8 preseason games for each team.
 *
 * NBA Schedule Rules:
 * - 82 games per team (41 home, 41 away)
 * - Division rivals: 4 games each (16 total) - 2 home, 2 away
 * - Conference non-division: 10 teams × mix of 3-4 games (36 total)
 *   - 6 teams × 4 games = 24
 *   - 4 teams × 3 games = 12
 * - Inter-conference: 15 teams × 2 games (30 total) - 1 home, 1 away
 *
 * Total: 16 + 36 + 30 = 82 games
 */
export function generateSchedule(teams: Team[], seasonId: string): ScheduledGame[] {
  if (teams.length !== 30) {
    throw new Error(`Expected 30 teams, got ${teams.length}`);
  }

  const games: ScheduledGame[] = [];
  const teamGames: Map<string, { home: number; away: number; total: number }> = new Map();

  // Initialize team game counters
  for (const team of teams) {
    teamGames.set(team.id, { home: 0, away: 0, total: 0 });
  }

  // Group teams by conference and division
  const conferences = groupByConference(teams);

  // Generate all matchups
  const matchups: Array<{ home: string; away: string }> = [];

  for (const team of teams) {
    const sameConference = teams.filter(
      (t) => t.conference === team.conference && t.id !== team.id
    );
    const sameDivision = sameConference.filter((t) => t.division === team.division);
    const otherDivision = sameConference.filter((t) => t.division !== team.division);
    const otherConference = teams.filter((t) => t.conference !== team.conference);

    // Division rivals: 4 games each (2 home, 2 away)
    for (const rival of sameDivision) {
      // Add 2 home games against this rival
      matchups.push({ home: team.id, away: rival.id });
      matchups.push({ home: team.id, away: rival.id });
    }

    // Conference non-division: mix of 3-4 games
    // 6 teams get 4 games (2 home, 2 away), 4 teams get 3 games (alternating home/away)
    // Sort by team ID for consistency
    const sortedOtherDiv = [...otherDivision].sort((a, b) => a.id.localeCompare(b.id));

    for (let i = 0; i < sortedOtherDiv.length; i++) {
      const opponent = sortedOtherDiv[i];
      // First 6 teams: 2 home games, last 4 teams: 1-2 home games based on rotation
      if (i < 6) {
        matchups.push({ home: team.id, away: opponent.id });
        matchups.push({ home: team.id, away: opponent.id });
      } else {
        // For teams 7-10, alternate who gets the extra home game
        // Use team ID comparison to determine
        if (team.id < opponent.id) {
          matchups.push({ home: team.id, away: opponent.id });
          matchups.push({ home: team.id, away: opponent.id });
        } else {
          matchups.push({ home: team.id, away: opponent.id });
        }
      }
    }

    // Inter-conference: 2 games each (1 home, 1 away)
    for (const opponent of otherConference) {
      matchups.push({ home: team.id, away: opponent.id });
    }
  }

  // Deduplicate matchups (since we added both directions)
  const uniqueMatchups = deduplicateMatchups(matchups);

  // Assign dates - start regular season on game day 9 (after 8 preseason days)
  const seasonStartDate = new Date();
  seasonStartDate.setMonth(9, 20); // October 20th

  // Generate preseason games (8 games per team = 120 total games)
  const preseasonGames = generatePreseasonGames(teams, seasonId, seasonStartDate);
  games.push(...preseasonGames);

  // Schedule regular season games across ~180 days
  let gameDay = 9; // Start after preseason
  let gamesScheduled = 0;
  const totalRegularGames = uniqueMatchups.length;
  const daysInSeason = 180;
  const gamesPerDay = Math.ceil(totalRegularGames / daysInSeason);

  for (let i = 0; i < uniqueMatchups.length; i++) {
    const matchup = uniqueMatchups[i];
    const gameDate = new Date(seasonStartDate);
    gameDate.setDate(gameDate.getDate() + gameDay - 1);

    games.push({
      id: uuidv4(),
      home_team_id: matchup.home,
      away_team_id: matchup.away,
      game_date: gameDate.toISOString().split('T')[0],
      game_day: gameDay,
      is_preseason: false,
    });

    // Update team counters
    const homeStats = teamGames.get(matchup.home)!;
    homeStats.home++;
    homeStats.total++;

    const awayStats = teamGames.get(matchup.away)!;
    awayStats.away++;
    awayStats.total++;

    gamesScheduled++;

    // Advance to next day periodically
    if (gamesScheduled % gamesPerDay === 0) {
      gameDay++;
    }
  }

  return games;
}

/**
 * Generates 8 preseason games per team (120 total)
 */
function generatePreseasonGames(
  teams: Team[],
  seasonId: string,
  seasonStartDate: Date
): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  const teamPreseasonGames: Map<string, number> = new Map();

  for (const team of teams) {
    teamPreseasonGames.set(team.id, 0);
  }

  // Generate preseason matchups - each team plays 8 games
  for (let round = 0; round < 4; round++) {
    // Shuffle teams for variety
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      const home = shuffled[i];
      const away = shuffled[i + 1];

      const homeGames = teamPreseasonGames.get(home.id)!;
      const awayGames = teamPreseasonGames.get(away.id)!;

      if (homeGames < 8 && awayGames < 8) {
        const gameDay = round * 2 + 1;
        const gameDate = new Date(seasonStartDate);
        gameDate.setDate(gameDate.getDate() - (8 - gameDay)); // Preseason before regular season

        games.push({
          id: uuidv4(),
          home_team_id: home.id,
          away_team_id: away.id,
          game_date: gameDate.toISOString().split('T')[0],
          game_day: gameDay,
          is_preseason: true,
        });

        teamPreseasonGames.set(home.id, homeGames + 1);
        teamPreseasonGames.set(away.id, awayGames + 1);
      }
    }
  }

  return games;
}

/**
 * Groups teams by conference
 */
function groupByConference(teams: Team[]): Map<string, Team[]> {
  const conferences = new Map<string, Team[]>();

  for (const team of teams) {
    const conf = conferences.get(team.conference) || [];
    conf.push(team);
    conferences.set(team.conference, conf);
  }

  return conferences;
}

/**
 * Deduplicates matchups - each pair should only appear once
 */
function deduplicateMatchups(
  matchups: Array<{ home: string; away: string }>
): Array<{ home: string; away: string }> {
  const seen = new Set<string>();
  const unique: Array<{ home: string; away: string }> = [];

  for (const matchup of matchups) {
    const key = [matchup.home, matchup.away].sort().join('-');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(matchup);
    }
  }

  return unique;
}

/**
 * Validates that the generated schedule is correct
 */
export function validateSchedule(schedule: ScheduledGame[], teams: Team[]): ValidationResult {
  const issues: string[] = [];
  const teamStats: Map<string, { home: number; away: number; total: number }> = new Map();

  // Initialize counters
  for (const team of teams) {
    teamStats.set(team.id, { home: 0, away: 0, total: 0 });
  }

  // Count regular season games
  const regularGames = schedule.filter((g) => !g.is_preseason);

  for (const game of regularGames) {
    const homeStats = teamStats.get(game.home_team_id);
    const awayStats = teamStats.get(game.away_team_id);

    if (homeStats) {
      homeStats.home++;
      homeStats.total++;
    }

    if (awayStats) {
      awayStats.away++;
      awayStats.total++;
    }
  }

  // Validate each team has 82 games
  for (const team of teams) {
    const stats = teamStats.get(team.id)!;

    if (stats.total !== 82) {
      issues.push(`${team.abbreviation} has ${stats.total} games instead of 82`);
    }

    if (stats.home !== 41) {
      issues.push(`${team.abbreviation} has ${stats.home} home games instead of 41`);
    }
  }

  // Validate total games
  const expectedTotal = 1230; // 30 teams × 82 / 2
  if (regularGames.length !== expectedTotal) {
    issues.push(`Expected ${expectedTotal} regular season games, got ${regularGames.length}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
