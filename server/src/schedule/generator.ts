// 82-Game Schedule Generator + 8 Preseason Games

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
  game_day?: number;
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

interface ThreeGameMatchup {
  pairKey: string;
  teamA: Team;
  teamB: Team;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  season_start: new Date('2024-10-22'),
  total_games: 82,
  preseason_games: 8,
};

function getPairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('|');
}

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

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

function createTeamCounterMap(teams: Team[]): Map<string, number> {
  const counters = new Map<string, number>();
  for (const team of teams) {
    counters.set(team.id, 0);
  }
  return counters;
}

function assignHomeHeavyStatus(
  teams: Team[],
  threeGameMatchups: ThreeGameMatchup[]
): Map<string, string> {
  let bestAttempt: Map<string, string> | null = null;
  let bestImbalance = Infinity;

  for (let attempt = 0; attempt < 50; attempt++) {
    const homeHeavyCount = createTeamCounterMap(teams);
    const attemptMap = new Map<string, string>();

    const shuffledMatchups = [...threeGameMatchups];
    for (let i = shuffledMatchups.length - 1; i > 0; i--) {
      const j = Math.floor((attempt * 7919 + i * 6529) % (i + 1));
      [shuffledMatchups[i], shuffledMatchups[j]] = [shuffledMatchups[j], shuffledMatchups[i]];
    }

    for (const matchup of shuffledMatchups) {
      const aCount = homeHeavyCount.get(matchup.teamA.id)!;
      const bCount = homeHeavyCount.get(matchup.teamB.id)!;

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
      homeHeavyCount.set(homeHeavyTeam, homeHeavyCount.get(homeHeavyTeam)! + 1);
    }

    let imbalance = 0;
    for (const [, count] of homeHeavyCount) {
      imbalance += Math.abs(count - 2);
    }

    if (imbalance === 0) {
      return attemptMap;
    }

    if (imbalance < bestImbalance) {
      bestImbalance = imbalance;
      bestAttempt = attemptMap;
    }
  }

  return bestAttempt!;
}

function balanceHomeHeavyAssignments(
  teams: Team[],
  homeHeavyMap: Map<string, string>
): void {
  const homeHeavyCount = createTeamCounterMap(teams);
  for (const [, teamId] of homeHeavyMap) {
    homeHeavyCount.set(teamId, homeHeavyCount.get(teamId)! + 1);
  }

  for (let iteration = 0; iteration < 200; iteration++) {
    const overTeams: string[] = [];
    const underTeams: string[] = [];

    for (const [teamId, count] of homeHeavyCount) {
      if (count > 2) overTeams.push(teamId);
      if (count < 2) underTeams.push(teamId);
    }

    if (overTeams.length === 0 && underTeams.length === 0) return;

    let swapped = false;

    // Try direct swap between over and under teams
    for (const overTeam of overTeams) {
      if (swapped) break;
      for (const underTeam of underTeams) {
        const pairKey = getPairKey(overTeam, underTeam);
        if (homeHeavyMap.get(pairKey) === overTeam) {
          homeHeavyMap.set(pairKey, underTeam);
          homeHeavyCount.set(overTeam, homeHeavyCount.get(overTeam)! - 1);
          homeHeavyCount.set(underTeam, homeHeavyCount.get(underTeam)! + 1);
          swapped = true;
          break;
        }
      }
    }

    // Try neutral swap (swap through a balanced team)
    if (!swapped) {
      for (const overTeam of overTeams) {
        if (swapped) break;
        for (const underTeam of underTeams) {
          if (swapped) break;
          for (const [neutralId, count] of homeHeavyCount) {
            if (count !== 2) continue;

            const overKey = getPairKey(overTeam, neutralId);
            const underKey = getPairKey(underTeam, neutralId);

            if (homeHeavyMap.get(overKey) === overTeam && homeHeavyMap.get(underKey) === neutralId) {
              homeHeavyMap.set(overKey, neutralId);
              homeHeavyMap.set(underKey, underTeam);
              homeHeavyCount.set(overTeam, homeHeavyCount.get(overTeam)! - 1);
              homeHeavyCount.set(underTeam, homeHeavyCount.get(underTeam)! + 1);
              swapped = true;
              break;
            }
          }
        }
      }
    }

    // Try chain swap (find any under-balanced partner)
    if (!swapped) {
      for (const overTeam of overTeams) {
        if (swapped) break;
        for (const [pairKey, homeHeavy] of homeHeavyMap) {
          if (homeHeavy !== overTeam) continue;

          const [t1, t2] = pairKey.split('|');
          const otherTeam = t1 === overTeam ? t2 : t1;
          const otherCount = homeHeavyCount.get(otherTeam)!;

          if (otherCount < 2) {
            homeHeavyMap.set(pairKey, otherTeam);
            homeHeavyCount.set(overTeam, homeHeavyCount.get(overTeam)! - 1);
            homeHeavyCount.set(otherTeam, otherCount + 1);
            swapped = true;
            break;
          }
        }
      }
    }

    if (!swapped) return;
  }
}

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

function generateAllMatchups(teams: Team[]): Matchup[] {
  const matchups: Matchup[] = [];
  const teamsByConference = groupTeamsBy(teams, 'conference');
  const processedPairs = new Set<string>();

  const confNonDivGameCount = buildConferenceNonDivisionGameCounts(teamsByConference);

  const threeGameMatchups: ThreeGameMatchup[] = [];
  for (const [pairKey, games] of confNonDivGameCount) {
    if (games === 3) {
      const [t1Id, t2Id] = pairKey.split('|');
      const t1 = teams.find(t => t.id === t1Id)!;
      const t2 = teams.find(t => t.id === t2Id)!;
      threeGameMatchups.push({ pairKey, teamA: t1, teamB: t2 });
    }
  }

  const threeGameHomeHeavyMap = assignHomeHeavyStatus(teams, threeGameMatchups);
  balanceHomeHeavyAssignments(teams, threeGameHomeHeavyMap);

  for (const teamA of teams) {
    for (const teamB of teams) {
      if (teamA.id >= teamB.id) continue;

      const pairKey = getPairKey(teamA.id, teamB.id);
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const sameDiv = teamA.division === teamB.division;
      const sameConf = teamA.conference === teamB.conference;

      let totalGames: number;
      let isThreeGameMatchup = false;

      if (sameDiv) {
        totalGames = 4;
      } else if (sameConf) {
        totalGames = confNonDivGameCount.get(pairKey) || 3;
        isThreeGameMatchup = totalGames === 3;
      } else {
        totalGames = 2;
      }

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
  }

  return matchups;
}

export function generateSchedule(
  teams: Team[],
  config: ScheduleConfig = DEFAULT_CONFIG
): ScheduledGame[] {
  const allMatchups = generateAllMatchups(teams);
  const teamGamesOnDate = new Map<string, Set<string>>();
  const gameCountByTeam = createTeamCounterMap(teams);
  const lastMatchupDay = new Map<string, number>(); // pairKey -> last day index scheduled

  const schedule: ScheduledGame[] = [];
  const seasonDays = 174;
  const MIN_MATCHUP_GAP = 10; // Minimum days between games vs same opponent

  const dates: Date[] = [];
  const startDate = new Date(config.season_start);
  for (let i = 0; i < seasonDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
    teamGamesOnDate.set(getDateKey(date), new Set());
  }

  // Schedule games day-by-day, prioritizing teams with fewest games
  // This ensures all teams stay within 1-2 games of each other throughout the season
  const unscheduledMatchups = [...allMatchups];

  for (let dayIndex = 0; dayIndex < seasonDays && unscheduledMatchups.length > 0; dayIndex++) {
    const date = dates[dayIndex];
    const dateKey = getDateKey(date);
    const teamsOnDate = teamGamesOnDate.get(dateKey)!;

    // Calculate games per day dynamically to spread across full 174 days
    const remainingDays = seasonDays - dayIndex;
    const gamesPerDay = Math.ceil(unscheduledMatchups.length / remainingDays);

    // Sort unscheduled matchups by priority: teams with fewer games first
    unscheduledMatchups.sort((a, b) => {
      const aTotal = gameCountByTeam.get(a.home)! + gameCountByTeam.get(a.away)!;
      const bTotal = gameCountByTeam.get(b.home)! + gameCountByTeam.get(b.away)!;
      return aTotal - bTotal;
    });

    // Schedule up to gamesPerDay games for this day
    let gamesScheduledToday = 0;
    const matchupsToRemove: number[] = [];

    for (let i = 0; i < unscheduledMatchups.length && gamesScheduledToday < gamesPerDay; i++) {
      const matchup = unscheduledMatchups[i];
      const { home: homeTeamId, away: awayTeamId } = matchup;

      // Check if both teams are available and haven't played each other recently
      const pairKey = getPairKey(homeTeamId, awayTeamId);
      const lastDay = lastMatchupDay.get(pairKey) ?? -MIN_MATCHUP_GAP;
      if (!teamsOnDate.has(homeTeamId) && !teamsOnDate.has(awayTeamId) && (dayIndex - lastDay) >= MIN_MATCHUP_GAP) {
        const homeGameNum = gameCountByTeam.get(homeTeamId)! + 1;
        const awayGameNum = gameCountByTeam.get(awayTeamId)! + 1;

        schedule.push({
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          game_date: new Date(date),
          game_number_home: homeGameNum,
          game_number_away: awayGameNum,
        });

        teamsOnDate.add(homeTeamId);
        teamsOnDate.add(awayTeamId);
        gameCountByTeam.set(homeTeamId, homeGameNum);
        gameCountByTeam.set(awayTeamId, awayGameNum);
        lastMatchupDay.set(pairKey, dayIndex);
        matchupsToRemove.push(i);
        gamesScheduledToday++;
      }
    }

    // Remove scheduled matchups (in reverse order to preserve indices)
    for (let i = matchupsToRemove.length - 1; i >= 0; i--) {
      unscheduledMatchups.splice(matchupsToRemove[i], 1);
    }
  }

  // Handle any remaining matchups (shouldn't happen with 174 days)
  if (unscheduledMatchups.length > 0) {
    throw new Error(`Failed to schedule ${unscheduledMatchups.length} games - not enough days`);
  }

  schedule.sort((a, b) => a.game_date.getTime() - b.game_date.getTime());

  // Assign game_day based on actual calendar date (all games on same date = same game_day)
  // This ensures all teams have proportional games played at any point in the season
  const uniqueDates = [...new Set(schedule.map(g => getDateKey(g.game_date)))].sort();
  const dateToGameDay = new Map<string, number>();
  uniqueDates.forEach((dateKey, index) => {
    dateToGameDay.set(dateKey, index + 1);
  });

  schedule.forEach((game) => {
    game.game_day = dateToGameDay.get(getDateKey(game.game_date))!;
  });

  return schedule;
}

export function generatePreseasonSchedule(
  teams: Team[],
  regularSeasonStart: Date = new Date('2024-10-22')
): ScheduledGame[] {
  const preseasonGames: ScheduledGame[] = [];
  const gameCountByTeam = createTeamCounterMap(teams);

  const dates: Date[] = [];
  for (let i = -7; i <= 0; i++) {
    const date = new Date(regularSeasonStart);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  const sortedTeams = [...teams].sort((a, b) => a.id.localeCompare(b.id));
  const teamCount = sortedTeams.length;

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

      const homeGameNum = gameCountByTeam.get(homeTeam.id)! + 1;
      const awayGameNum = gameCountByTeam.get(awayTeam.id)! + 1;

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
    const count = gameCountByTeam.get(team.id)!;
    if (count !== 8) {
      throw new Error(`Team ${team.id} has ${count} preseason games (expected 8)`);
    }
  }

  preseasonGames.sort((a, b) => a.game_date.getTime() - b.game_date.getTime());

  // Assign game_day for preseason: negative values based on actual calendar date
  // -8 for first day, -7 for second day, ..., -1 for last day before regular season
  const uniqueDates = [...new Set(preseasonGames.map(g => getDateKey(g.game_date)))].sort();
  const dateToGameDay = new Map<string, number>();
  uniqueDates.forEach((dateKey, index) => {
    // Days count from -8 to -1 (8 preseason days before day 1 of regular season)
    dateToGameDay.set(dateKey, index - uniqueDates.length);
  });

  preseasonGames.forEach((game) => {
    game.game_day = dateToGameDay.get(getDateKey(game.game_date))!;
  });

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
  const gamesByTeam = createTeamCounterMap(teams);
  const homeGamesByTeam = createTeamCounterMap(teams);
  const gamesByTeamByDate = new Map<string, Map<string, number>>();

  for (const game of schedule) {
    gamesByTeam.set(game.home_team_id, gamesByTeam.get(game.home_team_id)! + 1);
    gamesByTeam.set(game.away_team_id, gamesByTeam.get(game.away_team_id)! + 1);
    homeGamesByTeam.set(game.home_team_id, homeGamesByTeam.get(game.home_team_id)! + 1);

    const dateKey = getDateKey(game.game_date);
    if (!gamesByTeamByDate.has(dateKey)) {
      gamesByTeamByDate.set(dateKey, new Map());
    }
    const dateMap = gamesByTeamByDate.get(dateKey)!;

    dateMap.set(game.home_team_id, (dateMap.get(game.home_team_id) || 0) + 1);
    dateMap.set(game.away_team_id, (dateMap.get(game.away_team_id) || 0) + 1);

    if (dateMap.get(game.home_team_id)! > 1) {
      console.error(`Team ${game.home_team_id} has multiple games on ${dateKey}`);
      return false;
    }
    if (dateMap.get(game.away_team_id)! > 1) {
      console.error(`Team ${game.away_team_id} has multiple games on ${dateKey}`);
      return false;
    }
  }

  for (const team of teams) {
    const total = gamesByTeam.get(team.id)!;
    const home = homeGamesByTeam.get(team.id)!;

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
