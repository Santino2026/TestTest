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
  total_games: number;
  preseason_games: number;
}

interface Matchup {
  home: string;
  away: string;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  season_start: new Date('2024-10-22'),
  total_games: 82,
  preseason_games: 8,
};

// Helper to create a consistent pair key for two teams
function getPairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('|');
}

// Group teams by a property (division or conference)
function groupTeamsBy(teams: Team[], key: 'division' | 'conference'): Map<string, Team[]> {
  const grouped = new Map<string, Team[]>();
  for (const team of teams) {
    const groupKey = team[key];
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(team);
  }
  return grouped;
}

function initTeamCounters(teams: Team[]): Map<string, number> {
  const counters = new Map<string, number>();
  for (const team of teams) {
    counters.set(team.id, 0);
  }
  return counters;
}

interface ThreeGameMatchup {
  pairKey: string;
  teamA: Team;
  teamB: Team;
}

// Assign home-heavy status for 3-game matchups to balance each team at exactly 2
function assignHomeHeavyStatus(
  teams: Team[],
  threeGameMatchups: ThreeGameMatchup[]
): Map<string, string> {
  const result = new Map<string, string>();
  let bestAttempt: Map<string, string> | null = null;
  let bestImbalance = Infinity;

  for (let attempt = 0; attempt < 50; attempt++) {
    const homeHeavyCount = initTeamCounters(teams);
    const attemptMap = new Map<string, string>();

    // Deterministic shuffle based on attempt number
    const shuffledMatchups = [...threeGameMatchups];
    for (let i = shuffledMatchups.length - 1; i > 0; i--) {
      const j = Math.floor((attempt * 7919 + i * 6529) % (i + 1));
      [shuffledMatchups[i], shuffledMatchups[j]] = [shuffledMatchups[j], shuffledMatchups[i]];
    }

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
        homeHeavyTeam = attempt % 2 === 0 ? matchup.teamA.id : matchup.teamB.id;
      }

      attemptMap.set(matchup.pairKey, homeHeavyTeam);
      homeHeavyCount.set(homeHeavyTeam, (homeHeavyCount.get(homeHeavyTeam) || 0) + 1);
    }

    let imbalance = 0;
    for (const [, count] of homeHeavyCount) {
      imbalance += Math.abs(count - 2);
    }

    if (imbalance === 0) {
      bestAttempt = attemptMap;
      break;
    }

    if (imbalance < bestImbalance) {
      bestImbalance = imbalance;
      bestAttempt = attemptMap;
    }
  }

  for (const [pairKey, teamId] of bestAttempt!) {
    result.set(pairKey, teamId);
  }

  return result;
}

// Fix remaining imbalances in home-heavy assignments using swap strategies
function balanceHomeHeavyAssignments(
  teams: Team[],
  homeHeavyMap: Map<string, string>
): void {
  const homeHeavyCount = initTeamCounters(teams);
  for (const [, teamId] of homeHeavyMap) {
    homeHeavyCount.set(teamId, (homeHeavyCount.get(teamId) || 0) + 1);
  }

  const maxIterations = 200;
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const overTeams: string[] = [];
    const underTeams: string[] = [];

    for (const [teamId, count] of homeHeavyCount) {
      if (count > 2) overTeams.push(teamId);
      if (count < 2) underTeams.push(teamId);
    }

    if (overTeams.length === 0 && underTeams.length === 0) break;

    let swapped = tryDirectSwap(overTeams, underTeams, homeHeavyMap, homeHeavyCount);

    if (!swapped) {
      swapped = tryNeutralSwap(overTeams, underTeams, homeHeavyMap, homeHeavyCount);
    }

    if (!swapped) {
      swapped = tryChainSwap(overTeams, homeHeavyMap, homeHeavyCount);
    }

    if (!swapped) break;
  }
}

function tryDirectSwap(
  overTeams: string[],
  underTeams: string[],
  homeHeavyMap: Map<string, string>,
  homeHeavyCount: Map<string, number>
): boolean {
  for (const overTeam of overTeams) {
    for (const underTeam of underTeams) {
      const pairKey = getPairKey(overTeam, underTeam);
      if (homeHeavyMap.has(pairKey) && homeHeavyMap.get(pairKey) === overTeam) {
        homeHeavyMap.set(pairKey, underTeam);
        homeHeavyCount.set(overTeam, (homeHeavyCount.get(overTeam) || 0) - 1);
        homeHeavyCount.set(underTeam, (homeHeavyCount.get(underTeam) || 0) + 1);
        return true;
      }
    }
  }
  return false;
}

function tryNeutralSwap(
  overTeams: string[],
  underTeams: string[],
  homeHeavyMap: Map<string, string>,
  homeHeavyCount: Map<string, number>
): boolean {
  for (const overTeam of overTeams) {
    for (const underTeam of underTeams) {
      for (const [neutralId, count] of homeHeavyCount) {
        if (count !== 2) continue;

        const overKey = getPairKey(overTeam, neutralId);
        const underKey = getPairKey(underTeam, neutralId);

        if (homeHeavyMap.has(overKey) && homeHeavyMap.has(underKey)) {
          const overHomeHeavy = homeHeavyMap.get(overKey);
          const underHomeHeavy = homeHeavyMap.get(underKey);

          if (overHomeHeavy === overTeam && underHomeHeavy === neutralId) {
            homeHeavyMap.set(overKey, neutralId);
            homeHeavyMap.set(underKey, underTeam);
            homeHeavyCount.set(overTeam, (homeHeavyCount.get(overTeam) || 0) - 1);
            homeHeavyCount.set(underTeam, (homeHeavyCount.get(underTeam) || 0) + 1);
            return true;
          }
        }
      }
    }
  }
  return false;
}

function tryChainSwap(
  overTeams: string[],
  homeHeavyMap: Map<string, string>,
  homeHeavyCount: Map<string, number>
): boolean {
  for (const overTeam of overTeams) {
    for (const [pairKey, homeHeavy] of homeHeavyMap) {
      if (homeHeavy !== overTeam) continue;

      const [t1, t2] = pairKey.split('|');
      const otherTeam = t1 === overTeam ? t2 : t1;
      const otherCount = homeHeavyCount.get(otherTeam) || 0;

      if (otherCount < 2) {
        homeHeavyMap.set(pairKey, otherTeam);
        homeHeavyCount.set(overTeam, (homeHeavyCount.get(overTeam) || 0) - 1);
        homeHeavyCount.set(otherTeam, otherCount + 1);
        return true;
      }
    }
  }
  return false;
}

export function generateSchedule(
  teams: Team[],
  config: ScheduleConfig = DEFAULT_CONFIG
): ScheduledGame[] {
  const allMatchups = generateAllMatchups(teams);
  const teamGamesOnDate = new Map<string, Set<string>>();
  const gameCountByTeam = initTeamCounters(teams);

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

function generateAllMatchups(teams: Team[]): Matchup[] {
  const matchups: Matchup[] = [];
  const teamsByConference = groupTeamsBy(teams, 'conference');
  const processedPairs = new Set<string>();

  // Build conference non-division game counts (3 or 4 games per matchup)
  const confNonDivGameCount = buildConferenceNonDivisionGameCounts(teamsByConference);

  // Collect all 3-game matchups for home-heavy assignment
  const threeGameMatchups: ThreeGameMatchup[] = [];
  for (const [pairKey, games] of confNonDivGameCount) {
    if (games === 3) {
      const [t1Id, t2Id] = pairKey.split('|');
      const t1 = teams.find(t => t.id === t1Id)!;
      const t2 = teams.find(t => t.id === t2Id)!;
      threeGameMatchups.push({ pairKey, teamA: t1, teamB: t2 });
    }
  }

  // Assign and balance home-heavy status for 3-game matchups
  const threeGameHomeHeavyMap = assignHomeHeavyStatus(teams, threeGameMatchups);
  balanceHomeHeavyAssignments(teams, threeGameHomeHeavyMap);

  function addGames(teamA: Team, teamB: Team, totalGames: number, isThreeGameMatchup: boolean = false): void {
    const pairKey = getPairKey(teamA.id, teamB.id);
    if (processedPairs.has(pairKey)) return;
    processedPairs.add(pairKey);

    let homeForA: number;
    let homeForB: number;

    if (isThreeGameMatchup) {
      const aIsHomeHeavy = threeGameHomeHeavyMap.get(pairKey) === teamA.id;
      homeForA = aIsHomeHeavy ? 2 : 1;
      homeForB = aIsHomeHeavy ? 1 : 2;
    } else {
      homeForA = totalGames / 2;
      homeForB = totalGames / 2;
    }

    for (let i = 0; i < homeForA; i++) {
      matchups.push({ home: teamA.id, away: teamB.id });
    }
    for (let i = 0; i < homeForB; i++) {
      matchups.push({ home: teamB.id, away: teamA.id });
    }
  }

  function getConfNonDivGames(teamA: Team, teamB: Team): number {
    const pairKey = getPairKey(teamA.id, teamB.id);
    return confNonDivGameCount.get(pairKey) || 3;
  }

  // Generate matchups for all team pairs
  for (const teamA of teams) {
    for (const teamB of teams) {
      if (teamA.id >= teamB.id) continue;

      const sameDiv = teamA.division === teamB.division;
      const sameConf = teamA.conference === teamB.conference;

      if (sameDiv) {
        addGames(teamA, teamB, 4);
      } else if (sameConf) {
        const games = getConfNonDivGames(teamA, teamB);
        addGames(teamA, teamB, games, games === 3);
      } else {
        addGames(teamA, teamB, 2);
      }
    }
  }

  return matchups;
}

// Build a mapping of conference non-division matchups to game counts (3 or 4)
function buildConferenceNonDivisionGameCounts(
  teamsByConference: Map<string, Team[]>
): Map<string, number> {
  const gameCount = new Map<string, number>();

  for (const [, confTeams] of teamsByConference) {
    const divisions = Array.from(new Set(confTeams.map(t => t.division))).sort();

    for (let d1 = 0; d1 < divisions.length; d1++) {
      for (let d2 = d1 + 1; d2 < divisions.length; d2++) {
        const div1Teams = confTeams
          .filter(t => t.division === divisions[d1])
          .sort((a, b) => a.id.localeCompare(b.id));
        const div2Teams = confTeams
          .filter(t => t.division === divisions[d2])
          .sort((a, b) => a.id.localeCompare(b.id));

        // 5x5 balanced matrix: (i+j) mod 5 < 3 gets 4 games, else 3 games
        for (let i = 0; i < div1Teams.length; i++) {
          for (let j = 0; j < div2Teams.length; j++) {
            const pairKey = getPairKey(div1Teams[i].id, div2Teams[j].id);
            const games = ((i + j) % 5) < 3 ? 4 : 3;
            gameCount.set(pairKey, games);
          }
        }
      }
    }
  }

  return gameCount;
}

export function generatePreseasonSchedule(
  teams: Team[],
  regularSeasonStart: Date = new Date('2024-10-22')
): ScheduledGame[] {
  const preseasonGames: ScheduledGame[] = [];
  const gameCountByTeam = initTeamCounters(teams);

  const dates: Date[] = [];
  for (let i = -7; i <= 0; i++) {
    const date = new Date(regularSeasonStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));
  const teamCount = sortedTeams.length;

  // Round-robin rotation: each team plays 1 game per day for 8 days
  for (let day = 0; day < 8; day++) {
    const date = dates[day];

    const rotation: number[] = [0];
    for (let i = 0; i < teamCount - 1; i++) {
      rotation.push(1 + ((i + day) % (teamCount - 1)));
    }

    for (let i = 0; i < teamCount / 2; i++) {
      const team1Idx = rotation[i];
      const team2Idx = rotation[teamCount - 1 - i];

      const teamA = sortedTeams[team1Idx];
      const teamB = sortedTeams[team2Idx];

      const homeTeam = day % 2 === 0 ? teamA : teamB;
      const awayTeam = day % 2 === 0 ? teamB : teamA;

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

  for (const team of teams) {
    const count = gameCountByTeam.get(team.id) || 0;
    if (count !== 8) {
      throw new Error(`Team ${team.id} has ${count} preseason games (expected 8)`);
    }
  }

  preseasonGames.sort((a, b) => a.game_date.getTime() - b.game_date.getTime());

  return preseasonGames;
}

export function generateFullSchedule(
  teams: Team[],
  config: ScheduleConfig = DEFAULT_CONFIG
): { preseason: ScheduledGame[]; regularSeason: ScheduledGame[] } {
  const preseason = generatePreseasonSchedule(teams, config.season_start);
  const regularSeason = generateSchedule(teams, config);

  return { preseason, regularSeason };
}

export function validateSchedule(schedule: ScheduledGame[], teams: Team[]): boolean {
  const gamesByTeam = initTeamCounters(teams);
  const homeGamesByTeam = initTeamCounters(teams);
  const gamesByTeamByDate = new Map<string, Map<string, number>>();

  for (const game of schedule) {
    gamesByTeam.set(game.home_team_id, (gamesByTeam.get(game.home_team_id) || 0) + 1);
    gamesByTeam.set(game.away_team_id, (gamesByTeam.get(game.away_team_id) || 0) + 1);
    homeGamesByTeam.set(game.home_team_id, (homeGamesByTeam.get(game.home_team_id) || 0) + 1);

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
