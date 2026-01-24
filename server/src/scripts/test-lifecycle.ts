// Automated test: Simulate 20 full seasons including playoffs, offseason, draft, free agency, and progression
// Validates the complete franchise lifecycle with realistic multi-year stats
// Usage: npx ts-node src/scripts/test-lifecycle.ts

import { pool } from '../db/pool';
import { simulateGame } from '../simulation';
import { loadTeamForSimulation } from '../services/simulation';
import { saveCompleteGameResult, GameResult } from '../services/gamePersistence';
import { generateSchedule } from '../schedule/generator';
import { developPlayer, agePlayer, shouldRetire, calculateOverall } from '../development/progression';
import { generateDraftClass, convertProspectToPlayer } from '../draft/generator';
import { simulateLottery, LotteryTeam } from '../draft/lottery';
import {
  generatePlayIn, saveSeries, getHomeTeamIds, getWinsNeeded,
  generateFirstRound, generateNextRound
} from '../playoffs/engine';
import { REGULAR_SEASON_END_DAY, SEASON_START_DATE } from '../constants';

const TOTAL_SEASONS = 20;
const SEASON_NUMBER_START = 200; // Use high season numbers to avoid conflicts

interface SeasonMetrics {
  season: number;
  avgPPG: number;
  avgFG: number;
  avgAge: number;
  avgOverall: number;
  totalPlayers: number;
  retirements: number;
  rookies: number;
  freeAgentSignings: number;
  championId: string;
  bestRecord: { wins: number; team: string };
  worstRecord: { wins: number; team: string };
  scoringLeader: { name: string; ppg: number };
  rosterSizes: { min: number; max: number; avg: number };
}

interface CareerTracker {
  id: string;
  name: string;
  position: string;
  draftAge: number;
  draftOverall: number;
  potential: number;
  peakAge: number;
  overallByYear: number[];
  retired: boolean;
  retiredAge?: number;
}

function calculateGameDate(currentDay: number): string {
  const seasonStart = new Date(SEASON_START_DATE);
  const gameDate = new Date(seasonStart);
  gameDate.setDate(gameDate.getDate() + currentDay - 1);
  return gameDate.toISOString().split('T')[0];
}

async function createSeason(seasonNumber: number): Promise<{ seasonId: number; teams: any[] }> {
  const newSeason = await pool.query(
    `INSERT INTO seasons (season_number, status) VALUES ($1, 'regular') RETURNING id`,
    [seasonNumber]
  );
  const seasonId = newSeason.rows[0].id;

  const teamsResult = await pool.query('SELECT id, name, conference, division FROM teams');
  const teams = teamsResult.rows;

  for (const t of teams) {
    await pool.query(
      `INSERT INTO standings (season_id, team_id, wins, losses, home_wins, home_losses,
       away_wins, away_losses, conference_wins, conference_losses, division_wins, division_losses,
       points_for, points_against, streak, last_10_wins)
       VALUES ($1, $2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (season_id, team_id) DO NOTHING`,
      [seasonId, t.id]
    );
  }

  const schedule = generateSchedule(teams);
  const batchSize = 100;
  for (let i = 0; i < schedule.length; i += batchSize) {
    const batch = schedule.slice(i, i + batchSize);
    const values: any[] = [];
    const placeholders: string[] = [];
    batch.forEach((game: any, idx: number) => {
      const offset = idx * 7;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`);
      values.push(seasonId, game.home_team_id, game.away_team_id, game.game_number_home, game.game_date, false, game.game_day);
    });
    await pool.query(
      `INSERT INTO schedule (season_id, home_team_id, away_team_id, game_number, game_date, is_preseason, game_day)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  return { seasonId, teams };
}

async function simulateRegularSeason(seasonId: number): Promise<{ games: number; errors: number }> {
  let totalGames = 0;
  let errors = 0;

  for (let day = 1; day <= REGULAR_SEASON_END_DAY; day++) {
    const gameDateStr = calculateGameDate(day);
    const gamesResult = await pool.query(
      `SELECT s.id, s.home_team_id, s.away_team_id
       FROM schedule s
       WHERE s.season_id = $1 AND s.game_day = $2 AND s.status = 'scheduled'
         AND (s.is_preseason = false OR s.is_preseason IS NULL)`,
      [seasonId, day]
    );

    for (const scheduledGame of gamesResult.rows) {
      try {
        const homeTeam = await loadTeamForSimulation(scheduledGame.home_team_id);
        const awayTeam = await loadTeamForSimulation(scheduledGame.away_team_id);
        const simResult = simulateGame(homeTeam, awayTeam);

        const gameResult: GameResult = {
          id: simResult.id,
          home_team_id: simResult.home_team_id,
          away_team_id: simResult.away_team_id,
          home_score: simResult.home_score,
          away_score: simResult.away_score,
          winner_id: simResult.winner_id,
          is_overtime: simResult.is_overtime,
          overtime_periods: simResult.overtime_periods,
          quarters: simResult.quarters,
          home_stats: simResult.home_stats,
          away_stats: simResult.away_stats,
          home_player_stats: simResult.home_player_stats.map((ps: any) => ({
            ...ps, player_id: ps.player_id
          })),
          away_player_stats: simResult.away_player_stats.map((ps: any) => ({
            ...ps, player_id: ps.player_id
          })),
          plays: simResult.plays
        };

        await saveCompleteGameResult(
          gameResult, String(seasonId),
          { id: homeTeam.id, starters: homeTeam.starters },
          { id: awayTeam.id, starters: awayTeam.starters },
          true, undefined, false, gameDateStr
        );

        await pool.query(
          `UPDATE schedule SET status = 'completed', game_id = $1 WHERE id = $2`,
          [simResult.id, scheduledGame.id]
        );
        totalGames++;
      } catch (error: any) {
        errors++;
        if (errors <= 3) console.error(`    ERROR Day ${day}: ${error.message}`);
      }
    }
  }

  return { games: totalGames, errors };
}

async function simulatePlayoffGame(seasonId: number, homeTeamId: string, awayTeamId: string): Promise<string> {
  const homeTeam = await loadTeamForSimulation(homeTeamId);
  const awayTeam = await loadTeamForSimulation(awayTeamId);
  const simResult = simulateGame(homeTeam, awayTeam);

  const gameResult: GameResult = {
    id: simResult.id,
    home_team_id: simResult.home_team_id,
    away_team_id: simResult.away_team_id,
    home_score: simResult.home_score,
    away_score: simResult.away_score,
    winner_id: simResult.winner_id,
    is_overtime: simResult.is_overtime,
    overtime_periods: simResult.overtime_periods,
    quarters: simResult.quarters,
    home_stats: simResult.home_stats,
    away_stats: simResult.away_stats,
    home_player_stats: simResult.home_player_stats.map((ps: any) => ({ ...ps, player_id: ps.player_id })),
    away_player_stats: simResult.away_player_stats.map((ps: any) => ({ ...ps, player_id: ps.player_id })),
    plays: simResult.plays
  };

  await saveCompleteGameResult(
    gameResult, String(seasonId),
    { id: homeTeam.id, starters: homeTeam.starters },
    { id: awayTeam.id, starters: awayTeam.starters },
    true, undefined, true
  );

  return simResult.winner_id;
}

async function simulateSeries(
  seasonId: number,
  seriesId: string,
  higherSeedId: string,
  lowerSeedId: string,
  round: number
): Promise<string> {
  const winsNeeded = getWinsNeeded(round);
  let higherWins = 0;
  let lowerWins = 0;
  let gameNumber = 0;

  while (higherWins < winsNeeded && lowerWins < winsNeeded) {
    const { homeTeamId, awayTeamId } = getHomeTeamIds(gameNumber, higherSeedId, lowerSeedId);
    const winnerId = await simulatePlayoffGame(seasonId, homeTeamId, awayTeamId);

    if (winnerId === higherSeedId) higherWins++;
    else lowerWins++;
    gameNumber++;
  }

  const winnerId = higherWins >= winsNeeded ? higherSeedId : lowerSeedId;
  await pool.query(
    `UPDATE playoff_series SET higher_seed_wins = $1, lower_seed_wins = $2, winner_id = $3, status = 'completed' WHERE id = $4`,
    [higherWins, lowerWins, winnerId, seriesId]
  );

  return winnerId;
}

async function simulatePlayoffs(seasonId: number): Promise<string> {
  const seasonIdStr = String(seasonId);

  // Play-in tournament
  const playInSeries = await generatePlayIn(seasonIdStr);
  await saveSeries(playInSeries);

  // Simulate play-in games 1 & 2 (7v8 and 9v10 for each conference)
  const playInResult = await pool.query(
    `SELECT id, higher_seed_id, lower_seed_id, conference, series_number FROM playoff_series
     WHERE season_id = $1 AND round = 0 ORDER BY conference, series_number`,
    [seasonId]
  );

  const playInWinners: Record<string, Record<number, { winner: string; loser: string }>> = {};

  for (const series of playInResult.rows) {
    const winnerId = await simulateSeries(seasonId, series.id, series.higher_seed_id, series.lower_seed_id, 0);
    const loserId = winnerId === series.higher_seed_id ? series.lower_seed_id : series.higher_seed_id;
    if (!playInWinners[series.conference]) playInWinners[series.conference] = {};
    playInWinners[series.conference][series.series_number] = { winner: winnerId, loser: loserId };
  }

  // Play-in game 3 (loser of 7v8 vs winner of 9v10)
  for (const conf of ['Eastern', 'Western']) {
    const game1 = playInWinners[conf][1];
    const game2 = playInWinners[conf][2];
    if (game1 && game2) {
      const game3Result = await pool.query(
        `INSERT INTO playoff_series (season_id, round, conference, series_number, higher_seed_id, lower_seed_id, higher_seed_wins, lower_seed_wins, status)
         VALUES ($1, 0, $2, 3, $3, $4, 0, 0, 'pending') RETURNING id`,
        [seasonId, conf, game1.loser, game2.winner]
      );
      const game3Id = game3Result.rows[0].id;
      await simulateSeries(seasonId, game3Id, game1.loser, game2.winner, 0);
    }
  }

  // Get final play-in results
  const allPlayIn = await pool.query(
    `SELECT * FROM playoff_series WHERE season_id = $1 AND round = 0 ORDER BY conference, series_number`,
    [seasonId]
  );

  const playInResults: { eastern7: string; eastern8: string; western7: string; western8: string } = { eastern7: '', eastern8: '', western7: '', western8: '' };
  for (const conf of ['Eastern', 'Western']) {
    const confSeries = allPlayIn.rows.filter((s: any) => s.conference === conf);
    const game1 = confSeries.find((s: any) => s.series_number === 1);
    const game3 = confSeries.find((s: any) => s.series_number === 3);
    const key7 = conf === 'Eastern' ? 'eastern7' : 'western7';
    const key8 = conf === 'Eastern' ? 'eastern8' : 'western8';
    (playInResults as any)[key7] = game1?.winner_id;
    (playInResults as any)[key8] = game3?.winner_id;
  }

  // First round through Finals
  const firstRound = await generateFirstRound(seasonIdStr, playInResults);
  await saveSeries(firstRound);

  for (let round = 1; round <= 4; round++) {
    const roundSeries = await pool.query(
      `SELECT id, higher_seed_id, lower_seed_id FROM playoff_series WHERE season_id = $1 AND round = $2`,
      [seasonId, round]
    );

    for (const series of roundSeries.rows) {
      await simulateSeries(seasonId, series.id, series.higher_seed_id, series.lower_seed_id, round);
    }

    if (round < 4) {
      const nextRound = await generateNextRound(seasonIdStr, round + 1);
      await saveSeries(nextRound);
    }
  }

  // Get champion
  const finalsResult = await pool.query(
    `SELECT winner_id FROM playoff_series WHERE season_id = $1 AND round = 4`,
    [seasonId]
  );

  return finalsResult.rows[0]?.winner_id || 'unknown';
}

async function runOffseason(seasonId: number): Promise<{
  retirements: number;
  rookies: number;
  freeAgentSignings: number;
}> {
  // 1. Player development and aging
  const playersResult = await pool.query(
    `SELECT p.*, pa.*,
            pss.minutes as season_minutes
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     LEFT JOIN player_season_stats pss ON p.id = pss.player_id AND pss.season_id = $1
     WHERE p.team_id IS NOT NULL OR p.id IN (SELECT player_id FROM contracts WHERE status = 'active')`,
    [seasonId]
  );

  const ATTR_KEYS = [
    'work_ethic', 'basketball_iq', 'speed', 'acceleration', 'vertical',
    'stamina', 'strength', 'lateral_quickness', 'hustle',
    'inside_scoring', 'close_shot', 'mid_range', 'three_point', 'free_throw',
    'layup', 'standing_dunk', 'driving_dunk', 'post_moves', 'post_control',
    'ball_handling', 'passing_accuracy', 'passing_vision', 'steal', 'block',
    'shot_iq', 'offensive_iq', 'passing_iq', 'defensive_iq',
    'help_defense_iq', 'offensive_consistency', 'defensive_consistency',
    'interior_defense', 'perimeter_defense', 'offensive_rebound', 'defensive_rebound'
  ];

  let retirements = 0;
  const playerUpdates: Array<{ id: string; age: number; overall: number }> = [];
  const attrUpdates: Array<{ playerId: string; attr: string; newValue: number }> = [];

  for (const player of playersResult.rows) {
    if (shouldRetire(player.age, player.overall, player.years_pro || 0)) {
      await pool.query(`UPDATE players SET team_id = NULL WHERE id = $1`, [player.id]);
      retirements++;
      continue;
    }

    const newAge = agePlayer(player.age);
    const attributes: Record<string, number> = {};
    for (const attr of ATTR_KEYS) {
      attributes[attr] = player[attr] ?? 60;
    }

    const devResult = developPlayer({
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      position: player.position,
      age: newAge,
      overall: player.overall,
      potential: player.potential,
      peak_age: player.peak_age || 28,
      archetype: player.archetype || 'combo_guard',
      work_ethic: player.work_ethic || 60,
      coachability: player.coachability || 60,
      attributes,
      season_minutes: player.season_minutes || undefined
    });

    playerUpdates.push({ id: player.id, age: newAge, overall: devResult.new_overall });

    for (const [attr, change] of Object.entries(devResult.changes)) {
      if (change !== 0 && attributes[attr] !== undefined) {
        const newValue = Math.max(30, Math.min(99, attributes[attr] + change));
        attrUpdates.push({ playerId: player.id, attr, newValue });
      }
    }
  }

  // Batch update players
  for (const update of playerUpdates) {
    await pool.query(
      `UPDATE players SET age = $1, overall = GREATEST(40, LEAST(99, $2)), years_pro = COALESCE(years_pro, 0) + 1 WHERE id = $3`,
      [update.age, update.overall, update.id]
    );
  }

  // Batch update attributes (grouped by attribute for efficiency)
  const attrGroups = new Map<string, Array<{ playerId: string; newValue: number }>>();
  for (const update of attrUpdates) {
    if (!attrGroups.has(update.attr)) attrGroups.set(update.attr, []);
    attrGroups.get(update.attr)!.push({ playerId: update.playerId, newValue: update.newValue });
  }
  for (const [attr, updates] of attrGroups) {
    for (const u of updates) {
      await pool.query(
        `UPDATE player_attributes SET ${attr} = $1 WHERE player_id = $2`,
        [u.newValue, u.playerId]
      );
    }
  }

  // 2. Expire contracts
  await pool.query(`UPDATE contracts SET years_remaining = years_remaining - 1 WHERE status = 'active' AND years_remaining > 0`);
  await pool.query(`UPDATE contracts SET status = 'expired' WHERE status = 'active' AND years_remaining <= 0`);
  const expiredResult = await pool.query(
    `SELECT c.player_id FROM contracts c WHERE c.status = 'expired' AND c.updated_at > NOW() - INTERVAL '5 minutes'`
  );
  for (const row of expiredResult.rows) {
    await pool.query(`UPDATE players SET team_id = NULL, salary = 0 WHERE id = $1`, [row.player_id]);
  }

  // 3. Draft - generate class and assign to teams
  const standings = await pool.query(
    `SELECT s.team_id, t.name, s.wins, s.losses FROM standings s
     JOIN teams t ON s.team_id = t.id
     WHERE s.season_id = $1 ORDER BY s.wins ASC`,
    [seasonId]
  );

  // Only non-playoff teams get lottery (bottom 14)
  const lotteryTeams: LotteryTeam[] = standings.rows.slice(0, 14).map((t: any, i: number) => ({
    team_id: t.team_id,
    team_name: t.name,
    pre_lottery_position: i + 1,
    lottery_odds: 0
  }));

  const lotteryResults = simulateLottery(lotteryTeams);
  const draftOrder = [
    ...lotteryResults.map(t => t.team_id),
    ...standings.rows.slice(14).map((t: any) => t.team_id)
  ];

  // Generate draft class and pick top 60
  const prospects = generateDraftClass();
  let rookies = 0;

  for (let pick = 0; pick < Math.min(60, prospects.length); pick++) {
    const teamId = draftOrder[pick % 30]; // Round 1: picks 0-29, Round 2: picks 30-59
    const prospect = prospects[pick];
    const converted = convertProspectToPlayer(prospect, teamId);

    const playerResult = await pool.query(
      `INSERT INTO players (first_name, last_name, team_id, position, archetype, height_inches, weight_lbs, age, jersey_number, years_pro, overall, potential, peak_age, durability, coachability, motor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id`,
      [converted.player.first_name, converted.player.last_name, teamId, converted.player.position,
       converted.player.archetype, converted.player.height_inches, converted.player.weight_lbs,
       converted.player.age, converted.player.jersey_number, 0, converted.player.overall,
       converted.player.potential, converted.player.peak_age, converted.player.durability,
       converted.player.coachability, converted.player.motor]
    );

    const playerId = playerResult.rows[0].id;

    // Insert attributes
    const attrCols = Object.keys(converted.attributes);
    const attrVals = Object.values(converted.attributes);
    const attrPlaceholders = attrCols.map((_, i) => `$${i + 2}`).join(', ');
    await pool.query(
      `INSERT INTO player_attributes (player_id, ${attrCols.join(', ')}) VALUES ($1, ${attrPlaceholders})
       ON CONFLICT (player_id) DO UPDATE SET ${attrCols.map((c, i) => `${c} = $${i + 2}`).join(', ')}`,
      [playerId, ...attrVals]
    );

    // Give rookie contract (4 years)
    const rookieSalary = pick < 14 ? 8000000 - pick * 200000 : pick < 30 ? 3000000 : 1500000;
    await pool.query(
      `INSERT INTO contracts (player_id, team_id, base_salary, total_years, years_remaining, status)
       VALUES ($1, $2, $3, 4, 4, 'active')
       ON CONFLICT DO NOTHING`,
      [playerId, teamId, rookieSalary]
    );

    rookies++;
  }

  // 4. Free agency - fill rosters to 12 minimum
  let freeAgentSignings = 0;
  const rosterCounts = await pool.query(
    `SELECT team_id, COUNT(*) as count FROM players WHERE team_id IS NOT NULL GROUP BY team_id`
  );

  for (const team of rosterCounts.rows) {
    if (parseInt(team.count) < 12) {
      const needed = 12 - parseInt(team.count);
      const freeAgents = await pool.query(
        `SELECT id, overall FROM players WHERE team_id IS NULL AND overall >= 45
         ORDER BY overall DESC LIMIT $1`,
        [needed]
      );

      for (const fa of freeAgents.rows) {
        await pool.query(`UPDATE players SET team_id = $1 WHERE id = $2`, [team.team_id, fa.id]);
        const salary = Math.max(1500000, fa.overall * 80000);
        await pool.query(
          `INSERT INTO contracts (player_id, team_id, base_salary, total_years, years_remaining, status)
           VALUES ($1, $2, $3, 2, 2, 'active') ON CONFLICT DO NOTHING`,
          [fa.id, team.team_id, salary]
        );
        freeAgentSignings++;
      }
    }
  }

  // Also check teams that don't appear (0 players) and fill them
  const allTeams = await pool.query(`SELECT id FROM teams`);
  for (const team of allTeams.rows) {
    const count = await pool.query(`SELECT COUNT(*) as c FROM players WHERE team_id = $1`, [team.id]);
    const currentCount = parseInt(count.rows[0].c);
    if (currentCount < 12) {
      const needed = 12 - currentCount;
      const freeAgents = await pool.query(
        `SELECT id, overall FROM players WHERE team_id IS NULL AND overall >= 40
         ORDER BY overall DESC LIMIT $1`,
        [needed]
      );
      for (const fa of freeAgents.rows) {
        await pool.query(`UPDATE players SET team_id = $1 WHERE id = $2`, [team.id, fa.id]);
        freeAgentSignings++;
      }
    }
  }

  // Trim rosters to 15 max
  await pool.query(`
    WITH ranked AS (
      SELECT id, team_id, overall,
             ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY overall DESC) as rank
      FROM players WHERE team_id IS NOT NULL
    )
    UPDATE players SET team_id = NULL
    WHERE id IN (SELECT id FROM ranked WHERE rank > 15)
  `);

  return { retirements, rookies, freeAgentSignings };
}

async function getSeasonMetrics(seasonId: number, seasonNum: number, championId: string, offseasonResults: any): Promise<SeasonMetrics> {
  const teamStats = await pool.query(
    `SELECT ts.points_for, ts.fg_pct FROM team_season_stats ts WHERE ts.season_id = $1`,
    [seasonId]
  );
  const avgPPG = teamStats.rows.length > 0
    ? teamStats.rows.reduce((s: number, r: any) => s + r.points_for, 0) / teamStats.rows.length / 82
    : 0;
  const avgFG = teamStats.rows.length > 0
    ? teamStats.rows.reduce((s: number, r: any) => s + parseFloat(r.fg_pct || 0), 0) / teamStats.rows.length
    : 0;

  const playerInfo = await pool.query(
    `SELECT AVG(age) as avg_age, AVG(overall) as avg_overall, COUNT(*) as total
     FROM players WHERE team_id IS NOT NULL`
  );

  const standings = await pool.query(
    `SELECT s.wins, s.losses, t.name FROM standings s JOIN teams t ON s.team_id = t.id
     WHERE s.season_id = $1 ORDER BY s.wins DESC`,
    [seasonId]
  );

  const rosterSizes = await pool.query(
    `SELECT team_id, COUNT(*) as size FROM players WHERE team_id IS NOT NULL GROUP BY team_id`
  );
  const sizes = rosterSizes.rows.map((r: any) => parseInt(r.size));

  const scoringLeader = await pool.query(
    `SELECT ps.ppg, p.first_name, p.last_name FROM player_season_stats ps
     JOIN players p ON ps.player_id = p.id
     WHERE ps.season_id = $1 AND ps.games_played >= 50 ORDER BY ps.ppg DESC LIMIT 1`,
    [seasonId]
  );

  return {
    season: seasonNum,
    avgPPG,
    avgFG,
    avgAge: parseFloat(playerInfo.rows[0]?.avg_age || '27'),
    avgOverall: parseFloat(playerInfo.rows[0]?.avg_overall || '70'),
    totalPlayers: parseInt(playerInfo.rows[0]?.total || '0'),
    retirements: offseasonResults.retirements,
    rookies: offseasonResults.rookies,
    freeAgentSignings: offseasonResults.freeAgentSignings,
    championId,
    bestRecord: { wins: standings.rows[0]?.wins || 0, team: standings.rows[0]?.name || '' },
    worstRecord: { wins: standings.rows[standings.rows.length - 1]?.wins || 0, team: standings.rows[standings.rows.length - 1]?.name || '' },
    scoringLeader: {
      name: scoringLeader.rows[0] ? `${scoringLeader.rows[0].first_name} ${scoringLeader.rows[0].last_name}` : 'N/A',
      ppg: parseFloat(scoringLeader.rows[0]?.ppg || '0')
    },
    rosterSizes: {
      min: sizes.length > 0 ? Math.min(...sizes) : 0,
      max: sizes.length > 0 ? Math.max(...sizes) : 0,
      avg: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0
    }
  };
}

async function cleanupTestData(seasonIds: number[]) {
  console.log('\nCleaning up test data...');
  for (const seasonId of seasonIds) {
    await pool.query(`DELETE FROM playoff_games WHERE series_id IN (SELECT id FROM playoff_series WHERE season_id = $1)`, [seasonId]);
    await pool.query(`DELETE FROM playoff_series WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
    await pool.query(`DELETE FROM player_game_stats WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
    await pool.query(`DELETE FROM team_game_stats WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
    await pool.query(`DELETE FROM game_quarters WHERE game_id IN (SELECT id FROM games WHERE season_id = $1)`, [seasonId]);
    await pool.query(`DELETE FROM schedule WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM games WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM player_season_stats WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM team_season_stats WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM standings WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM free_agents WHERE season_id = $1`, [seasonId]);
    await pool.query(`DELETE FROM seasons WHERE id = $1`, [seasonId]);
  }

  // Clean up test players (drafted during test - years_pro < 20 and created recently)
  await pool.query(`DELETE FROM player_attributes WHERE player_id IN (SELECT id FROM players WHERE years_pro = 0 AND age <= 22 AND team_id IS NULL)`);
  await pool.query(`DELETE FROM contracts WHERE status = 'active' AND years_remaining > 3`);

  console.log('Cleanup complete.');
}

async function runLifecycleTest() {
  console.log('=== 20-SEASON LIFECYCLE TEST ===\n');
  const startTime = Date.now();

  const seasonIds: number[] = [];
  const allMetrics: SeasonMetrics[] = [];
  const championCounts: Record<string, number> = {};

  for (let s = 0; s < TOTAL_SEASONS; s++) {
    const seasonNumber = SEASON_NUMBER_START + s;
    const seasonStart = Date.now();
    console.log(`--- Season ${s + 1}/${TOTAL_SEASONS} ---`);

    // Create and simulate regular season
    const { seasonId, teams } = await createSeason(seasonNumber);
    seasonIds.push(seasonId);

    process.stdout.write('  Regular season...');
    const { games, errors } = await simulateRegularSeason(seasonId);
    console.log(` ${games} games (${errors} errors)`);

    // Simulate playoffs
    process.stdout.write('  Playoffs...');
    const championId = await simulatePlayoffs(seasonId);
    const champName = teams.find((t: any) => t.id === championId)?.name || 'Unknown';
    championCounts[champName] = (championCounts[champName] || 0) + 1;
    console.log(` Champion: ${champName}`);

    // Run offseason
    process.stdout.write('  Offseason...');
    const offseasonResults = await runOffseason(seasonId);
    console.log(` ${offseasonResults.retirements} retired, ${offseasonResults.rookies} drafted, ${offseasonResults.freeAgentSignings} signed`);

    // Collect metrics
    const metrics = await getSeasonMetrics(seasonId, s + 1, championId, offseasonResults);
    allMetrics.push(metrics);

    const seasonTime = ((Date.now() - seasonStart) / 1000).toFixed(0);
    console.log(`  PPG: ${metrics.avgPPG.toFixed(1)} | FG%: ${(metrics.avgFG * 100).toFixed(1)}% | Age: ${metrics.avgAge.toFixed(1)} | OVR: ${metrics.avgOverall.toFixed(1)} | Rosters: ${metrics.rosterSizes.min}-${metrics.rosterSizes.max} (${seasonTime}s)\n`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log(`\nAll ${TOTAL_SEASONS} seasons completed in ${totalTime}s\n`);

  // === VALIDATE MULTI-SEASON RESULTS ===
  console.log('=== VALIDATING LIFECYCLE ===\n');
  let issues = 0;

  function check(label: string, actual: number, min: number, max: number) {
    if (actual >= min && actual <= max) {
      console.log(`  PASS: ${label} = ${Number.isInteger(actual) ? actual : actual.toFixed(3)} (${min}-${max})`);
    } else {
      console.log(`  FAIL: ${label} = ${Number.isInteger(actual) ? actual : actual.toFixed(3)} (expected ${min}-${max})`);
      issues++;
    }
  }

  // 1. Per-season stat consistency
  console.log('--- Stat Consistency (all 20 seasons) ---');
  const ppgRange = allMetrics.map(m => m.avgPPG);
  check('Min season PPG', Math.min(...ppgRange), 85, 130);
  check('Max season PPG', Math.max(...ppgRange), 90, 135);

  const fgRange = allMetrics.map(m => m.avgFG);
  check('Min season FG%', Math.min(...fgRange), 0.38, 0.55);
  check('Max season FG%', Math.max(...fgRange), 0.40, 0.58);

  // 2. Player age stability
  console.log('\n--- Age & Overall Stability ---');
  const ageRange = allMetrics.map(m => m.avgAge);
  check('Min avg age', Math.min(...ageRange), 23, 29);
  check('Max avg age', Math.max(...ageRange), 24, 31);

  const ovrRange = allMetrics.map(m => m.avgOverall);
  check('Min avg overall', Math.min(...ovrRange), 58, 75);
  check('Max avg overall', Math.max(...ovrRange), 62, 80);

  // Check overall doesn't drift too much (year 1 vs year 20)
  const ovrDrift = Math.abs(allMetrics[allMetrics.length - 1].avgOverall - allMetrics[0].avgOverall);
  check('Overall drift (Y1 vs Y20)', ovrDrift, 0, 12);

  // 3. Retirements
  console.log('\n--- Retirements & Draft ---');
  const totalRetirements = allMetrics.reduce((s, m) => s + m.retirements, 0);
  check('Total retirements (20 seasons)', totalRetirements, 50, 400);

  const avgRetirements = totalRetirements / TOTAL_SEASONS;
  check('Avg retirements/season', avgRetirements, 3, 20);

  // 4. Roster sizes
  console.log('\n--- Roster Health ---');
  const minRoster = Math.min(...allMetrics.map(m => m.rosterSizes.min));
  const maxRoster = Math.max(...allMetrics.map(m => m.rosterSizes.max));
  check('Min roster size (any team, any season)', minRoster, 10, 15);
  check('Max roster size (any team, any season)', maxRoster, 12, 15);

  // 5. Total active players
  const playerCounts = allMetrics.map(m => m.totalPlayers);
  check('Min total active players', Math.min(...playerCounts), 350, 500);
  check('Max total active players', Math.max(...playerCounts), 380, 500);

  // 6. Championship parity
  console.log('\n--- Championship Parity ---');
  const maxChampionships = Math.max(...Object.values(championCounts));
  const uniqueChampions = Object.keys(championCounts).length;
  check('Max championships by one team', maxChampionships, 1, 8);
  check('Unique champions (20 seasons)', uniqueChampions, 4, 20);

  console.log(`\n  Champions: ${Object.entries(championCounts).sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}(${c})`).join(', ')}`);

  // 7. Scoring leaders
  console.log('\n--- Scoring Leaders ---');
  const scoringPPGs = allMetrics.map(m => m.scoringLeader.ppg);
  check('Min scoring leader PPG', Math.min(...scoringPPGs), 15, 30);
  check('Max scoring leader PPG', Math.max(...scoringPPGs), 20, 45);

  // 8. Win distribution
  console.log('\n--- Win Distribution ---');
  const bestWins = allMetrics.map(m => m.bestRecord.wins);
  const worstWins = allMetrics.map(m => m.worstRecord.wins);
  check('Min best team wins', Math.min(...bestWins), 48, 75);
  check('Max best team wins', Math.max(...bestWins), 52, 78);
  check('Min worst team wins', Math.min(...worstWins), 5, 28);
  check('Max worst team wins', Math.max(...worstWins), 12, 35);

  // 9. Season-over-season trends
  console.log('\n--- Trends ---');
  // Check that age doesn't continuously drift in one direction
  let ageIncreasing = 0;
  for (let i = 1; i < allMetrics.length; i++) {
    if (allMetrics[i].avgAge > allMetrics[i - 1].avgAge) ageIncreasing++;
  }
  const ageTrend = ageIncreasing / (TOTAL_SEASONS - 1);
  check('Age trend balance (0.3-0.7 = stable)', ageTrend, 0.2, 0.8);

  // Summary table
  console.log('\n--- Season Summary ---');
  console.log('  Season | PPG   | FG%   | Age  | OVR  | Ret | Rook | Champion');
  console.log('  -------|-------|-------|------|------|-----|------|--------');
  for (const m of allMetrics) {
    console.log(`  ${String(m.season).padStart(6)} | ${m.avgPPG.toFixed(1).padStart(5)} | ${(m.avgFG * 100).toFixed(1).padStart(5)}% | ${m.avgAge.toFixed(1).padStart(4)} | ${m.avgOverall.toFixed(1).padStart(4)} | ${String(m.retirements).padStart(3)} | ${String(m.rookies).padStart(4)} | ${m.bestRecord.team}`);
  }

  console.log(`\n=== RESULT ===`);
  console.log(`Seasons: ${TOTAL_SEASONS} | Issues: ${issues}`);
  console.log(issues === 0 ? 'STATUS: ALL PASS' : `STATUS: ${issues} ISSUES`);

  // Cleanup
  await cleanupTestData(seasonIds);
  await pool.end();
}

runLifecycleTest().catch(err => {
  console.error('Test crashed:', err);
  pool.end();
  process.exit(1);
});
