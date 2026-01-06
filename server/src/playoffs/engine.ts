// Playoffs Engine
// Handles play-in tournament and 16-team playoffs

import { pool } from '../db/pool';

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
  season_id: number;
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

// Get standings sorted by conference
export async function getPlayoffStandings(seasonId: number): Promise<{
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
export async function generatePlayIn(seasonId: number): Promise<PlayoffSeries[]> {
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

// Generate first round matchups (after play-in complete)
export async function generateFirstRound(
  seasonId: number,
  playInResults: { eastern7: string; eastern8: string; western7: string; western8: string }
): Promise<PlayoffSeries[]> {
  const { eastern, western } = await getPlayoffStandings(seasonId);
  const series: PlayoffSeries[] = [];

  // Eastern Conference First Round
  const easternSeeds = [
    eastern[0].team_id, eastern[1].team_id, eastern[2].team_id,
    eastern[3].team_id, eastern[4].team_id, eastern[5].team_id,
    playInResults.eastern7, playInResults.eastern8
  ];

  // 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
  const easternMatchups = [
    [0, 7], [1, 6], [2, 5], [3, 4]
  ];

  easternMatchups.forEach(([higher, lower], idx) => {
    series.push({
      season_id: seasonId,
      round: 1,
      conference: 'Eastern',
      series_number: idx + 1,
      higher_seed_id: easternSeeds[higher],
      lower_seed_id: easternSeeds[lower],
      higher_seed_wins: 0,
      lower_seed_wins: 0,
      winner_id: null,
      status: 'pending'
    });
  });

  // Western Conference First Round
  const westernSeeds = [
    western[0].team_id, western[1].team_id, western[2].team_id,
    western[3].team_id, western[4].team_id, western[5].team_id,
    playInResults.western7, playInResults.western8
  ];

  const westernMatchups = [
    [0, 7], [1, 6], [2, 5], [3, 4]
  ];

  westernMatchups.forEach(([higher, lower], idx) => {
    series.push({
      season_id: seasonId,
      round: 1,
      conference: 'Western',
      series_number: idx + 1,
      higher_seed_id: westernSeeds[higher],
      lower_seed_id: westernSeeds[lower],
      higher_seed_wins: 0,
      lower_seed_wins: 0,
      winner_id: null,
      status: 'pending'
    });
  });

  return series;
}

// Generate next round matchups based on previous round winners
export async function generateNextRound(seasonId: number, round: number): Promise<PlayoffSeries[]> {
  // Get previous round winners
  const prevRoundResult = await pool.query(
    `SELECT * FROM playoff_series
     WHERE season_id = $1 AND round = $2 AND winner_id IS NOT NULL
     ORDER BY conference, series_number`,
    [seasonId, round - 1]
  );

  const prevSeries = prevRoundResult.rows;
  const series: PlayoffSeries[] = [];

  if (round === 4) {
    // Finals - conference winners
    const easternWinner = prevSeries.find((s: any) => s.conference === 'Eastern')?.winner_id;
    const westernWinner = prevSeries.find((s: any) => s.conference === 'Western')?.winner_id;

    if (easternWinner && westernWinner) {
      series.push({
        season_id: seasonId,
        round: 4,
        conference: null,
        series_number: 1,
        higher_seed_id: easternWinner, // Could determine by record
        lower_seed_id: westernWinner,
        higher_seed_wins: 0,
        lower_seed_wins: 0,
        winner_id: null,
        status: 'pending'
      });
    }
  } else {
    // Semi-finals and Conference Finals
    for (const conf of ['Eastern', 'Western']) {
      const confSeries = prevSeries.filter((s: any) => s.conference === conf);

      // Match winners: series 1 winner vs series 4 winner, series 2 winner vs series 3 winner
      const matchups = round === 2
        ? [[0, 3], [1, 2]] // Semis: 1v4, 2v3
        : [[0, 1]]; // Conf Finals: only 2 teams left

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
  }

  return series;
}

// Save series to database
export async function saveSeries(series: PlayoffSeries[]): Promise<void> {
  for (const s of series) {
    await pool.query(
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
     VALUES ($1, $2, $3)`,
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

  // Check if series is complete (best of 7 = first to 4)
  let seriesWinner: string | null = null;
  let newStatus = 'in_progress';

  if (higherWins === 4) {
    seriesWinner = series.higher_seed_id;
    newStatus = 'completed';
  } else if (lowerWins === 4) {
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
export async function getPlayoffState(seasonId: number): Promise<{
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
