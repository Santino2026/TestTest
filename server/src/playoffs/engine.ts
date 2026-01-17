import { pool } from '../db/pool.js';
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

const HIGHER_SEED_HOME_GAMES = [0, 1, 4, 6];
const FIRST_ROUND_MATCHUPS = [[0, 7], [1, 6], [2, 5], [3, 4]];
const CONFERENCES = ['Eastern', 'Western'] as const;

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

export function getWinsNeeded(round: number): number {
  return round === 0 ? 1 : 4;
}

export function extractPlayInWinners(playInSeries: PlayoffSeries[]): PlayInResults | null {
  if (playInSeries.length !== 6 || !playInSeries.every(s => s.status === 'completed')) {
    return null;
  }

  const findWinner = (conf: string, seriesNum: number): string | undefined =>
    playInSeries.find(s => s.conference === conf && s.series_number === seriesNum)?.winner_id ?? undefined;

  const eastern7 = findWinner('Eastern', 1);
  const eastern8 = findWinner('Eastern', 3);
  const western7 = findWinner('Western', 1);
  const western8 = findWinner('Western', 3);

  if (!eastern7 || !eastern8 || !western7 || !western8) {
    return null;
  }

  return { eastern7, eastern8, western7, western8 };
}

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

function createSeries(
  seasonId: string,
  round: number,
  conference: string | null,
  seriesNumber: number,
  higherSeedId: string,
  lowerSeedId: string
): PlayoffSeries {
  return {
    season_id: seasonId,
    round,
    conference,
    series_number: seriesNumber,
    higher_seed_id: higherSeedId,
    lower_seed_id: lowerSeedId,
    higher_seed_wins: 0,
    lower_seed_wins: 0,
    winner_id: null,
    status: 'pending'
  };
}

export async function generatePlayIn(seasonId: string): Promise<PlayoffSeries[]> {
  const { eastern, western } = await getPlayoffStandings(seasonId);

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
  const conferenceTeams = { Eastern: eastern, Western: western };

  for (const conf of CONFERENCES) {
    const teams = conferenceTeams[conf];
    series.push(createSeries(seasonId, 0, conf, 1, teams[6].team_id, teams[7].team_id));
    series.push(createSeries(seasonId, 0, conf, 2, teams[8].team_id, teams[9].team_id));
  }

  return series;
}

export async function generatePlayInGame3(
  seasonId: string,
  conference: string,
  loser7v8: string,
  winner9v10: string
): Promise<PlayoffSeries> {
  return createSeries(seasonId, 0, conference, 3, loser7v8, winner9v10);
}

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
  const game1 = series.find((s: PlayoffSeries) => s.series_number === 1);
  const game2 = series.find((s: PlayoffSeries) => s.series_number === 2);
  const game3Exists = series.some((s: PlayoffSeries) => s.series_number === 3);

  const incomplete = { complete: false, loser7v8: null, winner9v10: null, winner7v8: null };

  if (game3Exists || !game1 || !game2 || game1.status !== 'completed' || game2.status !== 'completed') {
    return incomplete;
  }

  const loser7v8 = game1.winner_id === game1.higher_seed_id ? game1.lower_seed_id : game1.higher_seed_id;

  return {
    complete: true,
    loser7v8,
    winner9v10: game2.winner_id,
    winner7v8: game1.winner_id
  };
}

export async function generateFirstRound(
  seasonId: string,
  playInResults: PlayInResults
): Promise<PlayoffSeries[]> {
  const standings = await getPlayoffStandings(seasonId);
  const series: PlayoffSeries[] = [];

  const conferences = [
    { name: 'Eastern' as const, teams: standings.eastern, seed7: playInResults.eastern7, seed8: playInResults.eastern8 },
    { name: 'Western' as const, teams: standings.western, seed7: playInResults.western7, seed8: playInResults.western8 }
  ];

  for (const conf of conferences) {
    const seeds = [
      conf.teams[0].team_id, conf.teams[1].team_id, conf.teams[2].team_id,
      conf.teams[3].team_id, conf.teams[4].team_id, conf.teams[5].team_id,
      conf.seed7, conf.seed8
    ];

    FIRST_ROUND_MATCHUPS.forEach(([higher, lower], idx) => {
      series.push(createSeries(seasonId, 1, conf.name, idx + 1, seeds[higher], seeds[lower]));
    });
  }

  return series;
}

function getConferenceMatchups(round: number): number[][] {
  return round === 2 ? [[0, 3], [1, 2]] : [[0, 1]];
}

export async function generateNextRound(seasonId: string, round: number): Promise<PlayoffSeries[]> {
  const prevRoundResult = await pool.query(
    `SELECT * FROM playoff_series
     WHERE season_id = $1 AND round = $2 AND winner_id IS NOT NULL
     ORDER BY conference, series_number`,
    [seasonId, round - 1]
  );

  const prevSeries = prevRoundResult.rows;
  const series: PlayoffSeries[] = [];

  if (round === 4) {
    const easternWinner = prevSeries.find((s: PlayoffSeries) => s.conference === 'Eastern')?.winner_id;
    const westernWinner = prevSeries.find((s: PlayoffSeries) => s.conference === 'Western')?.winner_id;

    if (easternWinner && westernWinner) {
      series.push(createSeries(seasonId, 4, null, 1, easternWinner, westernWinner));
    }
    return series;
  }

  const matchups = getConferenceMatchups(round);

  for (const conf of CONFERENCES) {
    const confSeries = prevSeries.filter((s: PlayoffSeries) => s.conference === conf);

    matchups.forEach(([idx1, idx2], seriesNum) => {
      if (confSeries[idx1]?.winner_id && confSeries[idx2]?.winner_id) {
        series.push(createSeries(seasonId, round, conf, seriesNum + 1, confSeries[idx1].winner_id, confSeries[idx2].winner_id));
      }
    });
  }

  return series;
}

export async function saveSeries(series: PlayoffSeries[], client?: PoolClient): Promise<void> {
  const db = client || pool;
  for (const s of series) {
    await db.query(
      `INSERT INTO playoff_series
       (season_id, round, conference, series_number, higher_seed_id, lower_seed_id,
        higher_seed_wins, lower_seed_wins, winner_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [s.season_id, s.round, s.conference, s.series_number, s.higher_seed_id,
       s.lower_seed_id, s.higher_seed_wins, s.lower_seed_wins, s.winner_id, s.status]
    );
  }
}

export async function updateSeriesResult(
  seriesId: string,
  winnerId: string,
  gameId: string
): Promise<{ seriesComplete: boolean; seriesWinner: string | null }> {
  const seriesResult = await pool.query(
    'SELECT * FROM playoff_series WHERE id = $1',
    [seriesId]
  );

  if (seriesResult.rows.length === 0) {
    throw new Error('Series not found');
  }

  const series = seriesResult.rows[0];
  const isHigherSeedWin = winnerId === series.higher_seed_id;
  const currentGame = series.higher_seed_wins + series.lower_seed_wins + 1;

  await pool.query(
    `INSERT INTO playoff_games (series_id, game_id, game_number)
     VALUES ($1, $2, $3)
     ON CONFLICT (series_id, game_number) DO NOTHING`,
    [seriesId, gameId, currentGame]
  );

  const higherWins = series.higher_seed_wins + (isHigherSeedWin ? 1 : 0);
  const lowerWins = series.lower_seed_wins + (isHigherSeedWin ? 0 : 1);
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

export async function getPlayoffState(seasonId: string): Promise<{
  round: number;
  series: PlayoffSeries[];
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

  const maxRound = Math.max(...series.map((s: PlayoffSeries) => s.round));
  const currentRound = series.find((s: PlayoffSeries) => s.status !== 'completed')?.round || maxRound;
  const finals = series.find((s: PlayoffSeries) => s.round === 4);

  return {
    round: currentRound,
    series,
    isComplete: finals?.status === 'completed',
    champion: finals?.winner_id || null
  };
}

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

export async function isRoundComplete(seasonId: string, round: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT COUNT(*) as incomplete FROM playoff_series
     WHERE season_id = $1 AND round = $2 AND status != 'completed'`,
    [seasonId, round]
  );
  return parseInt(result.rows[0].incomplete) === 0;
}

export async function getPlayInSeries(seasonId: string): Promise<PlayoffSeries[]> {
  const result = await pool.query(
    `SELECT * FROM playoff_series
     WHERE season_id = $1 AND round = 0
     ORDER BY conference, series_number`,
    [seasonId]
  );
  return result.rows;
}

export async function generatePlayInGame3IfReady(seasonId: string): Promise<boolean> {
  let generated = false;

  for (const conf of CONFERENCES) {
    const check = await checkPlayInGames12Complete(seasonId, conf);
    if (check.complete && check.loser7v8 && check.winner9v10) {
      const game3 = await generatePlayInGame3(seasonId, conf, check.loser7v8, check.winner9v10);
      await saveSeries([game3]);
      generated = true;
    }
  }

  return generated;
}

export async function generateNextRoundIfReady(seasonId: string, completedRound: number): Promise<PlayoffSeries[]> {
  if (completedRound >= 4) {
    return [];
  }

  if (completedRound === 0) {
    await generatePlayInGame3IfReady(seasonId);
    const playInSeries = await getPlayInSeries(seasonId);
    const playInResults = extractPlayInWinners(playInSeries);

    if (playInResults) {
      const firstRound = await generateFirstRound(seasonId, playInResults);
      await saveSeries(firstRound);
      return firstRound;
    }

    return [];
  }

  const nextSeries = await generateNextRound(seasonId, completedRound + 1);
  if (nextSeries.length > 0) {
    await saveSeries(nextSeries);
  }
  return nextSeries;
}
