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
 * Generates an 82-game regular season schedule + 8 preseason games per team.
 *
 * NBA Schedule Rules:
 * - 82 games per team (41 home, 41 away)
 * - Division rivals: 4 games each (16 total) - 2 home, 2 away
 * - Conference non-division: 10 teams × mix of 3-4 games (36 total)
 *   - 6 teams × 4 games = 24 (2 home, 2 away)
 *   - 4 teams × 3 games = 12 (alternating 2-1 or 1-2)
 * - Inter-conference: 15 teams × 2 games (30 total) - 1 home, 1 away
 *
 * Total: 16 + 36 + 30 = 82 games per team
 * Total games: 30 teams × 82 / 2 = 1230 games
 */
export function generateSchedule(teams: Team[], seasonId: string): ScheduledGame[] {
  if (teams.length !== 30) {
    throw new Error(`Expected 30 teams, got ${teams.length}`);
  }

  const games: ScheduledGame[] = [];

  // Generate regular season matchups by iterating through team pairs
  const matchups = generateMatchups(teams);

  // Assign dates - start regular season on game day 9 (after 8 preseason days)
  const seasonStartDate = new Date();
  seasonStartDate.setMonth(9, 20); // October 20th

  // Generate preseason games first
  const preseasonGames = generatePreseasonGames(teams, seasonStartDate);
  games.push(...preseasonGames);

  // Schedule regular season games across ~180 days
  let gameDay = 9;
  const daysInSeason = 180;
  const gamesPerDay = Math.ceil(matchups.length / daysInSeason);

  for (let i = 0; i < matchups.length; i++) {
    const matchup = matchups[i];
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

    if ((i + 1) % gamesPerDay === 0) {
      gameDay++;
    }
  }

  return games;
}

/**
 * Generates all regular season matchups by iterating through team pairs.
 * Each pair gets the appropriate number of games based on their relationship.
 */
function generateMatchups(teams: Team[]): Array<{ home: string; away: string }> {
  const matchups: Array<{ home: string; away: string }> = [];

  // Sort teams for consistent ordering
  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));

  // Track 3-game opponents for each team (for conference non-division)
  const threeGameOpponents: Map<string, Set<string>> = new Map();
  for (const team of teams) {
    threeGameOpponents.set(team.id, new Set());
  }

  // Assign 3-game opponents for conference non-division
  // Each team plays 4 teams only 3 times (from the other 2 divisions in their conference)
  assignThreeGameOpponents(sortedTeams, threeGameOpponents);

  // Iterate through all unique team pairs
  for (let i = 0; i < sortedTeams.length; i++) {
    for (let j = i + 1; j < sortedTeams.length; j++) {
      const teamA = sortedTeams[i];
      const teamB = sortedTeams[j];

      const sameConference = teamA.conference === teamB.conference;
      const sameDivision = sameConference && teamA.division === teamB.division;

      if (sameDivision) {
        // Division rivals: 4 games (2 home each)
        matchups.push({ home: teamA.id, away: teamB.id });
        matchups.push({ home: teamA.id, away: teamB.id });
        matchups.push({ home: teamB.id, away: teamA.id });
        matchups.push({ home: teamB.id, away: teamA.id });
      } else if (sameConference) {
        // Conference non-division: 3 or 4 games
        const isThreeGame =
          threeGameOpponents.get(teamA.id)!.has(teamB.id) ||
          threeGameOpponents.get(teamB.id)!.has(teamA.id);

        if (isThreeGame) {
          // 3 games: one team gets 2 home, other gets 1
          // Use ID comparison for consistency
          if (teamA.id < teamB.id) {
            matchups.push({ home: teamA.id, away: teamB.id });
            matchups.push({ home: teamA.id, away: teamB.id });
            matchups.push({ home: teamB.id, away: teamA.id });
          } else {
            matchups.push({ home: teamA.id, away: teamB.id });
            matchups.push({ home: teamB.id, away: teamA.id });
            matchups.push({ home: teamB.id, away: teamA.id });
          }
        } else {
          // 4 games: 2 home each
          matchups.push({ home: teamA.id, away: teamB.id });
          matchups.push({ home: teamA.id, away: teamB.id });
          matchups.push({ home: teamB.id, away: teamA.id });
          matchups.push({ home: teamB.id, away: teamA.id });
        }
      } else {
        // Inter-conference: 2 games (1 home each)
        matchups.push({ home: teamA.id, away: teamB.id });
        matchups.push({ home: teamB.id, away: teamA.id });
      }
    }
  }

  return matchups;
}

/**
 * Assigns which conference non-division opponents each team plays only 3 times.
 * Each team plays 4 opponents (from the other 2 divisions) only 3 times.
 */
function assignThreeGameOpponents(
  teams: Team[],
  threeGameOpponents: Map<string, Set<string>>
): void {
  // Group teams by conference and division
  const conferences = new Map<string, Map<string, Team[]>>();

  for (const team of teams) {
    if (!conferences.has(team.conference)) {
      conferences.set(team.conference, new Map());
    }
    const divs = conferences.get(team.conference)!;
    if (!divs.has(team.division)) {
      divs.set(team.division, []);
    }
    divs.get(team.division)!.push(team);
  }

  // For each conference, assign 3-game matchups
  for (const [, divisions] of conferences) {
    const divNames = Array.from(divisions.keys()).sort();

    // Each division has 5 teams, conference has 3 divisions = 15 teams
    // Each team plays 10 non-division conference opponents
    // 6 get 4 games, 4 get 3 games

    for (const divName of divNames) {
      const divTeams = divisions.get(divName)!;
      const otherDivTeams: Team[] = [];

      for (const [otherDiv, otherTeams] of divisions) {
        if (otherDiv !== divName) {
          otherDivTeams.push(...otherTeams);
        }
      }

      // Sort for consistency
      otherDivTeams.sort((a, b) => a.id.localeCompare(b.id));

      // Each team in this division picks 4 opponents from other divisions for 3-game series
      // We rotate which opponents to ensure balance
      for (let i = 0; i < divTeams.length; i++) {
        const team = divTeams[i];
        // Pick 4 opponents starting at offset based on team index
        for (let j = 0; j < 4; j++) {
          const opponentIdx = (i * 2 + j) % otherDivTeams.length;
          const opponent = otherDivTeams[opponentIdx];
          threeGameOpponents.get(team.id)!.add(opponent.id);
        }
      }
    }
  }
}

/**
 * Generates 8 preseason games per team (120 total games)
 */
function generatePreseasonGames(teams: Team[], seasonStartDate: Date): ScheduledGame[] {
  const games: ScheduledGame[] = [];
  const teamGames: Map<string, number> = new Map();

  for (const team of teams) {
    teamGames.set(team.id, 0);
  }

  // 4 rounds, each team plays 2 games per round = 8 total
  for (let round = 0; round < 4; round++) {
    const shuffled = [...teams].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      const home = shuffled[i];
      const away = shuffled[i + 1];

      if (teamGames.get(home.id)! < 8 && teamGames.get(away.id)! < 8) {
        const gameDay = round * 2 + 1;
        const gameDate = new Date(seasonStartDate);
        gameDate.setDate(gameDate.getDate() - (8 - gameDay));

        games.push({
          id: uuidv4(),
          home_team_id: home.id,
          away_team_id: away.id,
          game_date: gameDate.toISOString().split('T')[0],
          game_day: gameDay,
          is_preseason: true,
        });

        teamGames.set(home.id, teamGames.get(home.id)! + 1);
        teamGames.set(away.id, teamGames.get(away.id)! + 1);
      }
    }
  }

  return games;
}

/**
 * Validates that the generated schedule is correct
 */
export function validateSchedule(schedule: ScheduledGame[], teams: Team[]): ValidationResult {
  const issues: string[] = [];
  const teamStats: Map<string, { home: number; away: number; total: number }> = new Map();

  for (const team of teams) {
    teamStats.set(team.id, { home: 0, away: 0, total: 0 });
  }

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

  for (const team of teams) {
    const stats = teamStats.get(team.id)!;

    if (stats.total !== 82) {
      issues.push(`${team.abbreviation} has ${stats.total} games instead of 82`);
    }

    if (stats.home !== 41) {
      issues.push(`${team.abbreviation} has ${stats.home} home games instead of 41`);
    }
  }

  const expectedTotal = 1230;
  if (regularGames.length !== expectedTotal) {
    issues.push(`Expected ${expectedTotal} regular season games, got ${regularGames.length}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
