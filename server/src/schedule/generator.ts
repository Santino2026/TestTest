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

  // Sort matchups deterministically for consistent scheduling
  allMatchups.sort((a, b) => {
    // Primary sort: by home team ID
    const homeCompare = a.home.localeCompare(b.home);
    if (homeCompare !== 0) return homeCompare;
    // Secondary sort: by away team ID
    return a.away.localeCompare(b.away);
  });

  // Schedule each matchup on a valid date - deterministic sequential approach
  for (const matchup of allMatchups) {
    const homeTeamId = matchup.home;
    const awayTeamId = matchup.away;

    let scheduled = false;

    // Try each date sequentially until we find one that works
    for (const date of dates) {
      const dateKey = date.toISOString().split('T')[0];
      const teamsOnDate = teamGamesOnDate.get(dateKey)!;

      // Check if neither team is playing on this date
      if (!teamsOnDate.has(homeTeamId) && !teamsOnDate.has(awayTeamId)) {
        const homeGameNum = (gameCountByTeam.get(homeTeamId) || 0) + 1;
        const awayGameNum = (gameCountByTeam.get(awayTeamId) || 0) + 1;

        schedule.push({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          game_date: new Date(date),
          game_number_home: homeGameNum,
          game_number_away: awayGameNum,
        });

        // Mark both teams as playing on this date
        teamsOnDate.add(homeTeamId);
        teamsOnDate.add(awayTeamId);

        gameCountByTeam.set(homeTeamId, homeGameNum);
        gameCountByTeam.set(awayTeamId, awayGameNum);
        scheduled = true;
        break;
      }
    }

    if (!scheduled) {
      throw new Error(`Failed to schedule game: ${homeTeamId} vs ${awayTeamId} - no available dates`);
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

  // Helper to get pair key (sorted for consistency, using | as separator to avoid conflicts with UUIDs)
  const getPairKey = (a: string, b: string) => [a, b].sort().join('|');

  // Pre-computed home-heavy assignments for 3-game matchups (filled in after confNonDivGameCount)
  const threeGameHomeHeavyMap = new Map<string, string>(); // pairKey -> teamId who is home-heavy

  // Helper to add games for a pair
  const addGames = (teamA: Team, teamB: Team, totalGames: number, isThreeGameMatchup = false) => {
    const pairKey = getPairKey(teamA.id, teamB.id);
    if (processedPairs.has(pairKey)) return;
    processedPairs.add(pairKey);

    let homeForA: number;
    let homeForB: number;

    if (isThreeGameMatchup) {
      // For 3-game matchups, use the pre-computed home-heavy assignment
      const pairKey = getPairKey(teamA.id, teamB.id);
      const aIsHomeHeavy = threeGameHomeHeavyMap.get(pairKey) === teamA.id;

      if (aIsHomeHeavy) {
        homeForA = 2;
        homeForB = 1;
      } else {
        homeForA = 1;
        homeForB = 2;
      }
    } else {
      // For even-game matchups (2 or 4), split evenly
      homeForA = totalGames / 2;
      homeForB = totalGames / 2;
    }

    for (let i = 0; i < homeForA; i++) {
      matchups.push({ home: teamA.id, away: teamB.id });
    }
    for (let i = 0; i < homeForB; i++) {
      matchups.push({ home: teamB.id, away: teamA.id });
    }
  };

  // Pre-compute conference non-division game assignments using a balanced matrix
  // For each pair of divisions, we need 15 four-game and 10 three-game matchups (5x5 = 25 total)
  // Each team needs 3 four-game and 2 three-game opponents from each other division

  // Build a mapping from pair key to game count
  const confNonDivGameCount = new Map<string, number>();

  // For each conference, process inter-division pairs
  for (const [conference, confTeams] of teamsByConference) {
    const divisions = Array.from(new Set(confTeams.map(t => t.division))).sort();

    // Process each pair of divisions
    for (let d1 = 0; d1 < divisions.length; d1++) {
      for (let d2 = d1 + 1; d2 < divisions.length; d2++) {
        const div1Teams = confTeams.filter(t => t.division === divisions[d1]).sort((a, b) => a.id.localeCompare(b.id));
        const div2Teams = confTeams.filter(t => t.division === divisions[d2]).sort((a, b) => a.id.localeCompare(b.id));

        // 5x5 balanced matrix: each row/col has exactly 3 fours and 2 threes
        // Pattern: position (i+j) mod 5 < 3 gets 4 games, else 3 games
        for (let i = 0; i < div1Teams.length; i++) {
          for (let j = 0; j < div2Teams.length; j++) {
            const pairKey = getPairKey(div1Teams[i].id, div2Teams[j].id);
            const games = ((i + j) % 5) < 3 ? 4 : 3;
            confNonDivGameCount.set(pairKey, games);
          }
        }
      }
    }
  }

  const getConfNonDivGames = (teamA: Team, teamB: Team): number => {
    const pairKey = getPairKey(teamA.id, teamB.id);
    return confNonDivGameCount.get(pairKey) || 3;
  };

  // Pre-compute home-heavy assignments for all 3-game matchups
  // Each team needs exactly 2 home-heavy matchups (2H+1A) out of their 4 three-game matchups
  const threeGameMatchups: Array<{ pairKey: string; teamA: Team; teamB: Team }> = [];
  for (const [pairKey, games] of confNonDivGameCount) {
    if (games === 3) {
      const [t1Id, t2Id] = pairKey.split('|');
      const t1 = teams.find(t => t.id === t1Id)!;
      const t2 = teams.find(t => t.id === t2Id)!;
      threeGameMatchups.push({ pairKey, teamA: t1, teamB: t2 });
    }
  }

  // Assign home-heavy status to balance each team at exactly 2
  // Try multiple random orderings to find a valid assignment
  let bestAttempt: Map<string, string> | null = null;
  let bestImbalance = Infinity;

  for (let attempt = 0; attempt < 50; attempt++) {
    const homeHeavyCount = new Map<string, number>();
    teams.forEach(t => homeHeavyCount.set(t.id, 0));
    const attemptMap = new Map<string, string>();

    // Shuffle matchups differently each attempt
    const shuffledMatchups = [...threeGameMatchups];
    for (let i = shuffledMatchups.length - 1; i > 0; i--) {
      const j = Math.floor((attempt * 7919 + i * 6529) % (i + 1)); // Deterministic shuffle based on attempt
      [shuffledMatchups[i], shuffledMatchups[j]] = [shuffledMatchups[j], shuffledMatchups[i]];
    }

    // Process matchups with greedy assignment
    for (const matchup of shuffledMatchups) {
      const aCount = homeHeavyCount.get(matchup.teamA.id) || 0;
      const bCount = homeHeavyCount.get(matchup.teamB.id) || 0;

      let homeHeavyTeam: string;
      if (aCount >= 2) {
        homeHeavyTeam = matchup.teamB.id;
      } else if (bCount >= 2) {
        homeHeavyTeam = matchup.teamA.id;
      } else if (aCount < bCount) {
        homeHeavyTeam = matchup.teamA.id;
      } else if (bCount < aCount) {
        homeHeavyTeam = matchup.teamB.id;
      } else {
        // Alternate tie-breaker based on attempt
        homeHeavyTeam = attempt % 2 === 0 ? matchup.teamA.id : matchup.teamB.id;
      }

      attemptMap.set(matchup.pairKey, homeHeavyTeam);
      homeHeavyCount.set(homeHeavyTeam, (homeHeavyCount.get(homeHeavyTeam) || 0) + 1);
    }

    // Calculate imbalance
    let imbalance = 0;
    for (const [teamId, count] of homeHeavyCount) {
      imbalance += Math.abs(count - 2);
    }

    if (imbalance === 0) {
      // Perfect! Use this assignment
      bestAttempt = attemptMap;
      break;
    }

    if (imbalance < bestImbalance) {
      bestImbalance = imbalance;
      bestAttempt = attemptMap;
    }
  }

  // Use the best attempt found
  for (const [pairKey, teamId] of bestAttempt!) {
    threeGameHomeHeavyMap.set(pairKey, teamId);
  }

  // Rebuild homeHeavyCount from the chosen assignment
  const homeHeavyCount = new Map<string, number>();
  teams.forEach(t => homeHeavyCount.set(t.id, 0));
  for (const [pairKey, teamId] of threeGameHomeHeavyMap) {
    homeHeavyCount.set(teamId, (homeHeavyCount.get(teamId) || 0) + 1);
  }

  // Post-processing: fix any remaining imbalances using swap strategies
  let iterations = 0;
  const maxIterations = 200;

  while (iterations < maxIterations) {
    iterations++;

    const overTeams: string[] = [];
    const underTeams: string[] = [];

    for (const [teamId, count] of homeHeavyCount) {
      if (count > 2) overTeams.push(teamId);
      if (count < 2) underTeams.push(teamId);
    }

    if (overTeams.length === 0 && underTeams.length === 0) break; // Balanced!

    // Strategy 1: Direct swap between over-team and under-team
    let swapped = false;
    for (const overTeam of overTeams) {
      for (const underTeam of underTeams) {
        const pairKey = getPairKey(overTeam, underTeam);
        if (threeGameHomeHeavyMap.has(pairKey)) {
          const currentHomeHeavy = threeGameHomeHeavyMap.get(pairKey);
          if (currentHomeHeavy === overTeam) {
            threeGameHomeHeavyMap.set(pairKey, underTeam);
            homeHeavyCount.set(overTeam, (homeHeavyCount.get(overTeam) || 0) - 1);
            homeHeavyCount.set(underTeam, (homeHeavyCount.get(underTeam) || 0) + 1);
            swapped = true;
            break;
          }
        }
      }
      if (swapped) break;
    }

    // Strategy 2: Find a neutral team (count=2) that can trade with both
    if (!swapped) {
      for (const overTeam of overTeams) {
        for (const underTeam of underTeams) {
          // Find any team with count=2 that has matchups with both
          for (const [neutralId, count] of homeHeavyCount) {
            if (count !== 2) continue;

            const overKey = getPairKey(overTeam, neutralId);
            const underKey = getPairKey(underTeam, neutralId);

            if (threeGameHomeHeavyMap.has(overKey) && threeGameHomeHeavyMap.has(underKey)) {
              const overHomeHeavy = threeGameHomeHeavyMap.get(overKey);
              const underHomeHeavy = threeGameHomeHeavyMap.get(underKey);

              // Check if we can swap: over gives to neutral, neutral gives to under
              if (overHomeHeavy === overTeam && underHomeHeavy === neutralId) {
                threeGameHomeHeavyMap.set(overKey, neutralId);
                threeGameHomeHeavyMap.set(underKey, underTeam);
                homeHeavyCount.set(overTeam, (homeHeavyCount.get(overTeam) || 0) - 1);
                homeHeavyCount.set(underTeam, (homeHeavyCount.get(underTeam) || 0) + 1);
                // neutralId: gains 1, loses 1 = net 0
                swapped = true;
                break;
              }
            }
          }
          if (swapped) break;
        }
        if (swapped) break;
      }
    }

    // Strategy 3: Chain swap through multiple teams
    if (!swapped) {
      for (const overTeam of overTeams) {
        // Find any matchup where overTeam is home-heavy
        for (const [pairKey, homeHeavy] of threeGameHomeHeavyMap) {
          if (homeHeavy !== overTeam) continue;

          const [t1, t2] = pairKey.split('|');
          const otherTeam = t1 === overTeam ? t2 : t1;
          const otherCount = homeHeavyCount.get(otherTeam) || 0;

          // If the other team is under (or would still be valid after), do the swap
          if (otherCount < 2) {
            threeGameHomeHeavyMap.set(pairKey, otherTeam);
            homeHeavyCount.set(overTeam, (homeHeavyCount.get(overTeam) || 0) - 1);
            homeHeavyCount.set(otherTeam, otherCount + 1);
            swapped = true;
            break;
          }
        }
        if (swapped) break;
      }
    }

    if (!swapped) break; // Can't make any more swaps
  }

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
        addGames(teamA, teamB, games, games === 3);
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

  // Track games per team
  const gameCountByTeam: Map<string, number> = new Map();
  teams.forEach(t => gameCountByTeam.set(t.id, 0));

  // Create 8 preseason days (days -7 to 0)
  const dates: Date[] = [];
  for (let i = -7; i <= 0; i++) {
    const date = new Date(regularSeasonStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  // Sort teams deterministically
  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));
  const n = sortedTeams.length; // 30 teams

  // Simple rotation schedule: each day pair adjacent teams with rotation
  // Day 0: 0v1, 2v3, 4v5, ..., 28v29 (15 games, all 30 teams play)
  // Day 1: 0v2, 1v3, 4v6, 5v7, ..., rotate pairings
  // This ensures each team plays exactly 1 game per day for 8 days = 8 games total

  for (let day = 0; day < 8; day++) {
    const date = dates[day];

    // Create rotation array: keep first team fixed, rotate the rest
    const rotation: number[] = [0];
    for (let i = 0; i < n - 1; i++) {
      rotation.push(1 + ((i + day) % (n - 1)));
    }

    // Pair teams: first with last, second with second-to-last, etc.
    for (let i = 0; i < n / 2; i++) {
      const team1Idx = rotation[i];
      const team2Idx = rotation[n - 1 - i];

      const teamA = sortedTeams[team1Idx];
      const teamB = sortedTeams[team2Idx];

      // Alternate home/away based on day
      const isHome = day % 2 === 0;
      const homeTeam = isHome ? teamA : teamB;
      const awayTeam = isHome ? teamB : teamA;

      const homeGameNum = (gameCountByTeam.get(homeTeam.id) || 0) + 1;
      const awayGameNum = (gameCountByTeam.get(awayTeam.id) || 0) + 1;

      preseasonGames.push({
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        game_date: new Date(date),
        game_number_home: homeGameNum,
        game_number_away: awayGameNum,
        is_preseason: true,
      });

      gameCountByTeam.set(homeTeam.id, homeGameNum);
      gameCountByTeam.set(awayTeam.id, awayGameNum);
    }
  }

  // Verify all teams have 8 games
  for (const team of teams) {
    const count = gameCountByTeam.get(team.id) || 0;
    if (count !== 8) {
      throw new Error(`Team ${team.id} has ${count} preseason games (expected 8)`);
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

  // Check all teams have exactly 82 games and 41 home games
  for (const team of teams) {
    const total = gamesByTeam.get(team.id) || 0;
    const home = homeGamesByTeam.get(team.id) || 0;

    if (total !== 82) {
      console.error(`Team ${team.id} has ${total} games (expected exactly 82)`);
      return false;
    }

    if (home !== 41) {
      console.error(`Team ${team.id} has ${home} home games (expected exactly 41)`);
      return false;
    }
  }

  return true;
}
