// Playoffs Engine
// Handles play-in tournament and 16-team playoffs

import { pool } from '../db/pool';
import { PoolClient } from 'pg';

interface TeamStanding {
  team_id: string;
  name: string;
  abbreviation: string;
  conference: string;
  wins: number;
  losses: number;
}

interface PlayoffSeries {
  id?: string;
  season_id: string;
  round: number;
  conference: string | null;
  series_number: number;
  higher_seed_id: string;
  lower_seed_id: string;
  higher_seed_wins: number;
  lower_seed_wins: number;
  winner_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

interface PlayInResults {
  eastern7: string;
  eastern8: string;
  western7: string;
  western8: string;
}

// Home court follows 2-2-1-1-1 pattern: higher seed hosts games 1, 2, 5, 7
const HIGHER_SEED_HOME_GAMES = [0, 1, 4, 6];

// Determine which team has home court for a given game number
export function getHomeTeamIds(
  gamesPlayed: number,
  higherSeedId: string,
  lowerSeedId: string
): { homeTeamId: string; awayTeamId: string } {
  const homeIsHigherSeed = HIGHER_SEED_HOME_GAMES.includes(gamesPlayed);
  return {
    homeTeamId: homeIsHigherSeed ? higherSeedId : lowerSeedId,
    awayTeamId: homeIsHigherSeed ? lowerSeedId : higherSeedId
  };
}

// Get wins needed to complete a series (play-in is single game, others best of 7)
export function getWinsNeeded(round: number): number {
  return round === 0 ? 1 : 4;
}

// Extract play-in winners to generate first round
export function extractPlayInWinners(playInSeries: any[]): PlayInResults | null {
  if (playInSeries.length !== 6) {
    return null;
  }

  const allComplete = playInSeries.every((s: any) => s.status === 'completed');
  if (!allComplete) {
    return null;
  }

  const findWinner = (conf: string, seriesNum: number): string | undefined =>
    playInSeries.find((s: any) => s.conference === conf && s.series_number === seriesNum)?.winner_id;

  const eastern7 = findWinner('Eastern', 1);
  const eastern8 = findWinner('Eastern', 3);
  const western7 = findWinner('Western', 1);
  const western8 = findWinner('Western', 3);

  if (!eastern7 || !eastern8 || !western7 || !western8) {
    return null;
  }

  return { eastern7, eastern8, western7, western8 };
}

// Get standings sorted by conference
export async function getPlayoffStandings(seasonId: string): Promise<{
  eastern: TeamStanding[];
  western: TeamStanding[];
}> {
  const result = await pool.query(
    `SELECT s.team_id, t.name, t.abbreviation, t.conference, s.wins, s.losses
     FROM standings s
     JOIN teams t ON s.team_id = t.id
     WHERE s.season_id = $1
     ORDER BY t.conference, s.wins DESC, (s.points_for - s.points_against) DESC`,
    [seasonId]
  );

  const eastern = result.rows.filter((t: TeamStanding) => t.conference === 'Eastern');
  const western = result.rows.filter((t: TeamStanding) => t.conference === 'Western');

  return { eastern, western };
}

// Generate play-in tournament matchups
export async function generatePlayIn(seasonId: string): Promise<PlayoffSeries[]> {
  const { eastern, western } = await getPlayoffStandings(seasonId);

  // Validate we have enough teams for play-in (need seeds 7-10 = indices 6-9)
  if (eastern.length < 10) {
    throw new Error(
      `Insufficient Eastern Conference standings: found ${eastern.length} teams, need 10 for play-in seeding`
    );
  }
  if (western.length < 10) {
    throw new Error(
      `Insufficient Western Conference standings: found ${western.length} teams, need 10 for play-in seeding`
    );
  }

  const series: PlayoffSeries[] = [];

  for (const [conf, teams] of [['Eastern', eastern], ['Western', western]] as const) {
    const confTeams = teams as TeamStanding[];

    // 7 vs 8 (winner gets 7 seed)
    series.push({
      season_id: seasonId,
      round: 0,
      conference: conf,
      series_number: 1,
      higher_seed_id: confTeams[6].team_id, // 7th seed
      lower_seed_id: confTeams[7].team_id, // 8th seed
      higher_seed_wins: 0,
      lower_seed_wins: 0,
      winner_id: null,
      status: 'pending'
    });

    // 9 vs 10 (winner plays loser of 7v8)
    series.push({
      season_id: seasonId,
      round: 0,
      conference: conf,
      series_number: 2,
      higher_seed_id: confTeams[8].team_id, // 9th seed
      lower_seed_id: confTeams[9].team_id, // 10th seed
      higher_seed_wins: 0,
      lower_seed_wins: 0,
      winner_id: null,
      status: 'pending'
    });
  }

  return series;
}

// Generate 3rd play-in game (loser of 7v8 vs winner of 9v10)
// This should be called after both initial play-in games are complete
export async function generatePlayInGame3(
  seasonId: string,
  conference: string,
  loser7v8: string,
  winner9v10: string
): Promise<PlayoffSeries> {
  return {
    season_id: seasonId,
    round: 0,
    conference: conference,
    series_number: 3, // Third game in play-in
    higher_seed_id: loser7v8, // Originally higher seed (7 or 8)
    lower_seed_id: winner9v10, // Winner of 9v10
    higher_seed_wins: 0,
    lower_seed_wins: 0,
    winner_id: null,
    status: 'pending'
  };
}

// Check if play-in games 1 and 2 are complete for a conference
export async function checkPlayInGames12Complete(
  seasonId: string,
  conference: string
): Promise<{
  complete: boolean;
  loser7v8: string | null;
  winner9v10: string | null;
  winner7v8: string | null;
}> {
  const result = await pool.query(
    `SELECT * FROM playoff_series
     WHERE season_id = $1 AND round = 0 AND conference = $2
     ORDER BY series_number`,
    [seasonId, conference]
  );

  const series = result.rows;
  const game1 = series.find((s: any) => s.series_number === 1); // 7 vs 8
  const game2 = series.find((s: any) => s.series_number === 2); // 9 vs 10
  const game3 = series.find((s: any) => s.series_number === 3); // Exists if already generated

  // If game3 already exists, games 1&2 are complete but we've already generated game 3
  if (game3) {
    return { complete: false, loser7v8: null, winner9v10: null, winner7v8: null };
  }

  if (!game1 || !game2 || game1.status !== 'completed' || game2.status !== 'completed') {
    return { complete: false, loser7v8: null, winner9v10: null, winner7v8: null };
  }

  const winner7v8 = game1.winner_id;
  const loser7v8 = game1.winner_id === game1.higher_seed_id
    ? game1.lower_seed_id
    : game1.higher_seed_id;
  const winner9v10 = game2.winner_id;

  return { complete: true, loser7v8, winner9v10, winner7v8 };
}

// Generate first round matchups (after play-in complete)
export async function generateFirstRound(
  seasonId: string,
  playInResults: PlayInResults
): Promise<PlayoffSeries[]> {
  const standings = await getPlayoffStandings(seasonId);
  const series: PlayoffSeries[] = [];

  // First round matchups: 1v8, 2v7, 3v6, 4v5
  const FIRST_ROUND_MATCHUPS = [[0, 7], [1, 6], [2, 5], [3, 4]];

  const conferences: Array<{
    name: 'Eastern' | 'Western';
    teams: TeamStanding[];
    seed7: string;
    seed8: string;
  }> = [
    { name: 'Eastern', teams: standings.eastern, seed7: playInResults.eastern7, seed8: playInResults.eastern8 },
    { name: 'Western', teams: standings.western, seed7: playInResults.western7, seed8: playInResults.western8 }
  ];

  for (const conf of conferences) {
    // Seeds 1-6 from standings, 7-8 from play-in results
    const seeds = [
      conf.teams[0].team_id, conf.teams[1].team_id, conf.teams[2].team_id,
      conf.teams[3].team_id, conf.teams[4].team_id, conf.teams[5].team_id,
      conf.seed7, conf.seed8
    ];

    FIRST_ROUND_MATCHUPS.forEach(([higher, lower], idx) => {
      series.push({
        season_id: seasonId,
        round: 1,
        conference: conf.name,
        series_number: idx + 1,
        higher_seed_id: seeds[higher],
        lower_seed_id: seeds[lower],
        higher_seed_wins: 0,
        lower_seed_wins: 0,
        winner_id: null,
        status: 'pending'
      });
    });
  }

  return series;
}

// Get matchup indices for a given round
// Semis (round 2): 1v4, 2v3 - highest remaining seed vs lowest
// Conf Finals (round 3): Only 2 teams remain
function getConferenceMatchups(round: number): number[][] {
  if (round === 2) {
    return [[0, 3], [1, 2]];
  }
  return [[0, 1]];
}

// Generate next round matchups based on previous round winners
export async function generateNextRound(seasonId: string, round: number): Promise<PlayoffSeries[]> {
  const prevRoundResult = await pool.query(
    `SELECT * FROM playoff_series
     WHERE season_id = $1 AND round = $2 AND winner_id IS NOT NULL
     ORDER BY conference, series_number`,
    [seasonId, round - 1]
  );

  const prevSeries = prevRoundResult.rows;
  const series: PlayoffSeries[] = [];

  // Finals - conference champions face off
  if (round === 4) {
    const easternWinner = prevSeries.find((s: any) => s.conference === 'Eastern')?.winner_id;
    const westernWinner = prevSeries.find((s: any) => s.conference === 'Western')?.winner_id;

    if (easternWinner && westernWinner) {
      series.push({
        season_id: seasonId,
        round: 4,
        conference: null,
        series_number: 1,
        higher_seed_id: easternWinner,
        lower_seed_id: westernWinner,
        higher_seed_wins: 0,
        lower_seed_wins: 0,
        winner_id: null,
        status: 'pending'
      });
    }
    return series;
  }

  // Conference Semifinals and Finals
  const matchups = getConferenceMatchups(round);

  for (const conf of ['Eastern', 'Western']) {
    const confSeries = prevSeries.filter((s: any) => s.conference === conf);

    matchups.forEach(([idx1, idx2], seriesNum) => {
      if (confSeries[idx1]?.winner_id && confSeries[idx2]?.winner_id) {
        series.push({
          season_id: seasonId,
          round: round,
          conference: conf,
          series_number: seriesNum + 1,
          higher_seed_id: confSeries[idx1].winner_id,
          lower_seed_id: confSeries[idx2].winner_id,
          higher_seed_wins: 0,
          lower_seed_wins: 0,
          winner_id: null,
          status: 'pending'
        });
      }
    });
  }

  return series;
}

// Save series to database
export async function saveSeries(series: PlayoffSeries[], client?: PoolClient): Promise<void> {
  const db = client || pool;
  for (const s of series) {
    await db.query(
      `INSERT INTO playoff_series
       (season_id, round, conference, series_number, higher_seed_id, lower_seed_id,
        higher_seed_wins, lower_seed_wins, winner_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [s.season_id, s.round, s.conference, s.series_number, s.higher_seed_id,
       s.lower_seed_id, s.higher_seed_wins, s.lower_seed_wins, s.winner_id, s.status]
    );
  }
}

// Update series result after a game
export async function updateSeriesResult(
  seriesId: string,
  winnerId: string,
  gameId: string
): Promise<{ seriesComplete: boolean; seriesWinner: string | null }> {
  // Get current series state
  const seriesResult = await pool.query(
    'SELECT * FROM playoff_series WHERE id = $1',
    [seriesId]
  );

  if (seriesResult.rows.length === 0) {
    throw new Error('Series not found');
  }

  const series = seriesResult.rows[0];
  const isHigherSeedWin = winnerId === series.higher_seed_id;

  // Determine game number
  const currentGame = series.higher_seed_wins + series.lower_seed_wins + 1;

  // Record the game in playoff_games
  await pool.query(
    `INSERT INTO playoff_games (series_id, game_id, game_number)
     VALUES ($1, $2, $3)
     ON CONFLICT (series_id, game_number) DO NOTHING`,
    [seriesId, gameId, currentGame]
  );

  // Update wins
  let higherWins = series.higher_seed_wins;
  let lowerWins = series.lower_seed_wins;

  if (isHigherSeedWin) {
    higherWins++;
  } else {
    lowerWins++;
  }

  // Check if series is complete
  const winsNeeded = getWinsNeeded(series.round);
  let seriesWinner: string | null = null;
  let newStatus = 'in_progress';

  if (higherWins >= winsNeeded) {
    seriesWinner = series.higher_seed_id;
    newStatus = 'completed';
  } else if (lowerWins >= winsNeeded) {
    seriesWinner = series.lower_seed_id;
    newStatus = 'completed';
  }

  // Update series
  await pool.query(
    `UPDATE playoff_series
     SET higher_seed_wins = $1, lower_seed_wins = $2, winner_id = $3, status = $4
     WHERE id = $5`,
    [higherWins, lowerWins, seriesWinner, newStatus, seriesId]
  );

  return {
    seriesComplete: newStatus === 'completed',
    seriesWinner
  };
}

// Get current playoff state
export async function getPlayoffState(seasonId: string): Promise<{
  round: number;
  series: any[];
  isComplete: boolean;
  champion: string | null;
}> {
  const result = await pool.query(
    `SELECT ps.*,
            ht.name as higher_seed_name, ht.abbreviation as higher_abbrev,
            lt.name as lower_seed_name, lt.abbreviation as lower_abbrev,
            wt.name as winner_name, wt.abbreviation as winner_abbrev
     FROM playoff_series ps
     JOIN teams ht ON ps.higher_seed_id = ht.id
     JOIN teams lt ON ps.lower_seed_id = lt.id
     LEFT JOIN teams wt ON ps.winner_id = wt.id
     WHERE ps.season_id = $1
     ORDER BY ps.round, ps.conference, ps.series_number`,
    [seasonId]
  );

  const series = result.rows;

  if (series.length === 0) {
    return { round: 0, series: [], isComplete: false, champion: null };
  }

  // Find highest round with non-completed series
  const maxRound = Math.max(...series.map((s: any) => s.round));
  const currentRound = series.find((s: any) => s.status !== 'completed')?.round || maxRound;

  // Check if finals are complete
  const finals = series.find((s: any) => s.round === 4);
  const isComplete = finals?.status === 'completed';
  const champion = finals?.winner_id || null;

  return {
    round: currentRound,
    series,
    isComplete,
    champion
  };
}

// Get round name
export function getRoundName(round: number): string {
  switch (round) {
    case 0: return 'Play-In Tournament';
    case 1: return 'First Round';
    case 2: return 'Conference Semifinals';
    case 3: return 'Conference Finals';
    case 4: return 'NBA Finals';
    default: return `Round ${round}`;
  }
}

// Check if all series in a round are complete
export async function isRoundComplete(seasonId: string, round: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*) as incomplete FROM playoff_series
     WHERE season_id = $1 AND round = $2 AND status != 'completed'`,
    [seasonId, round]
  );
  return parseInt(result.rows[0].incomplete) === 0;
}

// Get all play-in series for a season
export async function getPlayInSeries(seasonId: string): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM playoff_series
     WHERE season_id = $1 AND round = 0
     ORDER BY conference, series_number`,
    [seasonId]
  );
  return result.rows;
}

// Handle play-in game 3 generation for both conferences
// Returns true if any game 3 was generated
export async function generatePlayInGame3IfReady(seasonId: string): Promise<boolean> {
  let generated = false;

  for (const conf of ['Eastern', 'Western']) {
    const check = await checkPlayInGames12Complete(seasonId, conf);
    if (check.complete && check.loser7v8 && check.winner9v10) {
      const game3 = await generatePlayInGame3(seasonId, conf, check.loser7v8, check.winner9v10);
      await saveSeries([game3]);
      generated = true;
    }
  }

  return generated;
}

// Generate next round after current round completes
// Handles play-in -> first round and all subsequent transitions
export async function generateNextRoundIfReady(seasonId: string, completedRound: number): Promise<PlayoffSeries[]> {
  // Don't generate beyond finals
  if (completedRound >= 4) {
    return [];
  }

  // Handle play-in round specially
  if (completedRound === 0) {
    // First check if we need to generate game 3
    await generatePlayInGame3IfReady(seasonId);

    // Then check if all play-in games are complete
    const playInSeries = await getPlayInSeries(seasonId);
    const playInResults = extractPlayInWinners(playInSeries);

    if (playInResults) {
      const firstRound = await generateFirstRound(seasonId, playInResults);
      await saveSeries(firstRound);
      return firstRound;
    }

    return [];
  }

  // For other rounds, generate next round
  const nextSeries = await generateNextRound(seasonId, completedRound + 1);
  if (nextSeries.length > 0) {
    await saveSeries(nextSeries);
  }
  return nextSeries;
}
