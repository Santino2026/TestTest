// All-Star Selection Logic
// Selects 15 players per conference based on stats and team record

import { pool } from '../db/pool';

export interface AllStarCandidate {
  player_id: string;
  first_name: string;
  last_name: string;
  team_id: string;
  team_name: string;
  position: string;
  conference: 'east' | 'west';
  overall: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fg_pct: number;
  all_star_score: number;
}

// Calculate All-Star score based on stats and overall
function calculateAllStarScore(
  overall: number,
  ppg: number,
  rpg: number,
  apg: number,
  spg: number,
  bpg: number,
  fg_pct: number,
  teamWins: number
): number {
  // Weighted formula:
  // 30% overall rating
  // 25% PPG (normalized to 0-30)
  // 15% RPG (normalized to 0-15)
  // 15% APG (normalized to 0-12)
  // 5% SPG+BPG (normalized to 0-5)
  // 5% FG% (normalized 0-60)
  // 5% team success (wins / 41 halfway point)

  const overallScore = (overall / 99) * 30;
  const ppgScore = Math.min(ppg / 30, 1) * 25;
  const rpgScore = Math.min(rpg / 15, 1) * 15;
  const apgScore = Math.min(apg / 12, 1) * 15;
  const defScore = Math.min((spg + bpg) / 5, 1) * 5;
  const fgScore = Math.min(fg_pct / 60, 1) * 5;
  const teamScore = Math.min(teamWins / 41, 1) * 5;

  return overallScore + ppgScore + rpgScore + apgScore + defScore + fgScore + teamScore;
}

// Get All-Star candidates from a conference
export async function getAllStarCandidates(
  seasonId: string,
  conference: 'Eastern' | 'Western'
): Promise<AllStarCandidate[]> {
  // Get players with their season stats aggregated from game stats
  // This aggregates directly from player_game_stats rather than relying on player_season_stats
  const result = await pool.query(
    `SELECT
      p.id as player_id,
      p.first_name,
      p.last_name,
      p.team_id,
      t.name as team_name,
      p.position,
      p.overall,
      COALESCE(stats.games_played, 0) as games_played,
      COALESCE(stats.total_points::float / NULLIF(stats.games_played, 0), 0) as ppg,
      COALESCE(stats.total_rebounds::float / NULLIF(stats.games_played, 0), 0) as rpg,
      COALESCE(stats.total_assists::float / NULLIF(stats.games_played, 0), 0) as apg,
      COALESCE(stats.total_steals::float / NULLIF(stats.games_played, 0), 0) as spg,
      COALESCE(stats.total_blocks::float / NULLIF(stats.games_played, 0), 0) as bpg,
      COALESCE(stats.total_fgm * 100.0 / NULLIF(stats.total_fga, 0), 0) as fg_pct,
      COALESCE(st.wins, 0) as team_wins
    FROM players p
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN (
      SELECT
        pgs.player_id,
        COUNT(*) as games_played,
        SUM(pgs.points) as total_points,
        SUM(pgs.rebounds) as total_rebounds,
        SUM(pgs.assists) as total_assists,
        SUM(pgs.steals) as total_steals,
        SUM(pgs.blocks) as total_blocks,
        SUM(pgs.fgm) as total_fgm,
        SUM(pgs.fga) as total_fga
      FROM player_game_stats pgs
      JOIN games g ON pgs.game_id = g.id
      WHERE g.season_id = $1 AND g.status = 'completed'
      GROUP BY pgs.player_id
    ) stats ON p.id = stats.player_id
    LEFT JOIN standings st ON t.id = st.team_id AND st.season_id = $1
    WHERE t.conference = $2
      AND p.team_id IS NOT NULL
    ORDER BY p.overall DESC`,
    [seasonId, conference]
  );

  const confKey = conference === 'Eastern' ? 'east' : 'west';

  return result.rows
    .filter((p: any) => p.games_played >= 5 || p.overall >= 85) // Lower threshold + allow stars
    .map((p: any) => ({
      player_id: p.player_id,
      first_name: p.first_name,
      last_name: p.last_name,
      team_id: p.team_id,
      team_name: p.team_name,
      position: p.position,
      conference: confKey as 'east' | 'west',
      overall: p.overall,
      ppg: parseFloat(p.ppg) || 0,
      rpg: parseFloat(p.rpg) || 0,
      apg: parseFloat(p.apg) || 0,
      spg: parseFloat(p.spg) || 0,
      bpg: parseFloat(p.bpg) || 0,
      fg_pct: parseFloat(p.fg_pct) || 0,
      all_star_score: calculateAllStarScore(
        p.overall,
        parseFloat(p.ppg) || 0,
        parseFloat(p.rpg) || 0,
        parseFloat(p.apg) || 0,
        parseFloat(p.spg) || 0,
        parseFloat(p.bpg) || 0,
        parseFloat(p.fg_pct) || 0,
        p.team_wins || 0
      ),
    }))
    .sort((a: AllStarCandidate, b: AllStarCandidate) => b.all_star_score - a.all_star_score);
}

// Select All-Stars for a conference
export async function selectAllStars(
  seasonId: string,
  conference: 'Eastern' | 'Western'
): Promise<AllStarCandidate[]> {
  const candidates = await getAllStarCandidates(seasonId, conference);
  const confKey = conference === 'Eastern' ? 'east' : 'west';

  // Validate we have enough candidates
  if (candidates.length < 15) {
    throw new Error(`Insufficient All-Star candidates for ${conference} conference (found ${candidates.length}, need 15)`);
  }

  // Select top 15 players
  // Ensure positional balance: at least 2 guards, 2 forwards, 1 center as starters
  const selected: AllStarCandidate[] = [];
  const starters: AllStarCandidate[] = [];

  // Position categories
  const guards = candidates.filter(c => c.position === 'PG' || c.position === 'SG');
  const forwards = candidates.filter(c => c.position === 'SF' || c.position === 'PF');
  const centers = candidates.filter(c => c.position === 'C');

  // Validate positional distribution
  if (guards.length < 2 || forwards.length < 2 || centers.length < 1) {
    throw new Error(`Insufficient positional distribution for ${conference} All-Star selection (G:${guards.length}, F:${forwards.length}, C:${centers.length})`)
  }

  // Select starters (5): 2 guards, 2 forwards, 1 center
  // Enforce one-per-team rule for starters to ensure variety
  const selectedTeams = new Set<string>();

  // Helper to select best player not already from a selected team
  const selectBestFromPosition = (pool: AllStarCandidate[], count: number): AllStarCandidate[] => {
    const result: AllStarCandidate[] = [];
    for (const player of pool) {
      if (result.length >= count) break;
      // Allow one player per team in starters
      if (!selectedTeams.has(player.team_id)) {
        result.push(player);
        selectedTeams.add(player.team_id);
      }
    }
    // If we couldn't fill with unique teams, allow duplicates
    if (result.length < count) {
      for (const player of pool) {
        if (result.length >= count) break;
        if (!result.includes(player)) {
          result.push(player);
        }
      }
    }
    return result;
  };

  const starterGuards = selectBestFromPosition(guards, 2);
  const starterForwards = selectBestFromPosition(forwards, 2);
  const starterCenter = selectBestFromPosition(centers, 1);

  starters.push(...starterGuards, ...starterForwards, ...starterCenter);

  // If we don't have enough at a position, fill with best available
  while (starters.length < 5) {
    const nextBest = candidates.find(c => !starters.includes(c));
    if (nextBest) starters.push(nextBest);
    else break;
  }

  selected.push(...starters);

  // Select reserves (10 more): best available not already selected
  // For reserves, prefer players from teams not yet represented, but don't enforce strictly
  const teamsInSelected = new Set(selected.map(s => s.team_id));
  const unrepresentedCandidates = candidates.filter(c => !selected.includes(c) && !teamsInSelected.has(c.team_id));
  const otherCandidates = candidates.filter(c => !selected.includes(c) && teamsInSelected.has(c.team_id));

  // Take from unrepresented teams first, then fill with best remaining
  const reserves = [
    ...unrepresentedCandidates.slice(0, 10),
    ...otherCandidates
  ].slice(0, 10);

  selected.push(...reserves);

  // Generate vote counts (simulated)
  const allStarsWithVotes = selected.map((player, idx) => {
    const isStarter = idx < 5;
    const baseVotes = Math.floor(player.all_star_score * 10000);
    const fanVotes = baseVotes + Math.floor(Math.random() * 50000);
    const playerVotes = Math.floor(baseVotes * 0.3) + Math.floor(Math.random() * 5000);
    const mediaVotes = Math.floor(baseVotes * 0.2) + Math.floor(Math.random() * 3000);

    return {
      ...player,
      is_starter: isStarter,
      is_captain: idx === 0, // Top scorer is captain
      votes: fanVotes + playerVotes + mediaVotes,
      fan_votes: fanVotes,
      player_votes: playerVotes,
      media_votes: mediaVotes,
    };
  });

  // Save to database
  for (const player of allStarsWithVotes) {
    await pool.query(
      `INSERT INTO all_star_selections
       (season_id, player_id, conference, is_starter, is_captain, votes, fan_votes, player_votes, media_votes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (season_id, player_id) DO UPDATE
       SET is_starter = $4, is_captain = $5, votes = $6`,
      [seasonId, player.player_id, confKey, player.is_starter, player.is_captain,
       player.votes, player.fan_votes, player.player_votes, player.media_votes]
    );
  }

  return allStarsWithVotes;
}

// Get already selected All-Stars
export async function getSelectedAllStars(seasonId: string) {
  const result = await pool.query(
    `SELECT
      ass.*,
      p.first_name,
      p.last_name,
      p.position,
      p.overall,
      t.name as team_name,
      t.abbreviation as team_abbr
    FROM all_star_selections ass
    JOIN players p ON ass.player_id = p.id
    JOIN teams t ON p.team_id = t.id
    WHERE ass.season_id = $1
    ORDER BY ass.conference, ass.is_captain DESC, ass.is_starter DESC, ass.votes DESC`,
    [seasonId]
  );

  const east = result.rows.filter((r: any) => r.conference === 'east');
  const west = result.rows.filter((r: any) => r.conference === 'west');

  return { east, west };
}

// Get rising stars (rookies and sophomores)
export async function getRisingStars(seasonId: string) {
  const result = await pool.query(
    `SELECT
      p.id as player_id,
      p.first_name,
      p.last_name,
      p.position,
      p.overall,
      p.years_pro,
      t.name as team_name,
      t.conference,
      COALESCE(ps.points / NULLIF(ps.games_played, 0), 0) as ppg,
      COALESCE(ps.rebounds / NULLIF(ps.games_played, 0), 0) as rpg,
      COALESCE(ps.assists / NULLIF(ps.games_played, 0), 0) as apg
    FROM players p
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN player_season_stats ps ON p.id = ps.player_id AND ps.season_id = $1
    WHERE p.years_pro <= 1 AND p.team_id IS NOT NULL
    ORDER BY p.overall DESC, ps.points DESC
    LIMIT 24`,
    [seasonId]
  );

  const rookies = result.rows.filter((r: any) => r.years_pro === 0).slice(0, 12);
  const sophomores = result.rows.filter((r: any) => r.years_pro === 1).slice(0, 12);

  return { rookies, sophomores };
}
