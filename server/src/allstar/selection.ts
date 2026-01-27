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
  const overallScore = (overall / 99) * 30;
  const ppgScore = Math.min(ppg / 30, 1) * 25;
  const rpgScore = Math.min(rpg / 15, 1) * 15;
  const apgScore = Math.min(apg / 12, 1) * 15;
  const defScore = Math.min((spg + bpg) / 5, 1) * 5;
  const fgScore = Math.min(fg_pct / 60, 1) * 5;
  const teamScore = Math.min(teamWins / 41, 1) * 5;

  return overallScore + ppgScore + rpgScore + apgScore + defScore + fgScore + teamScore;
}

export async function getAllStarCandidates(
  seasonId: string,
  conference: 'Eastern' | 'Western'
): Promise<AllStarCandidate[]> {
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
    .filter((p: any) => p.games_played >= 5 || p.overall >= 85)
    .map((p: any) => {
      const ppg = parseFloat(p.ppg) || 0;
      const rpg = parseFloat(p.rpg) || 0;
      const apg = parseFloat(p.apg) || 0;
      const spg = parseFloat(p.spg) || 0;
      const bpg = parseFloat(p.bpg) || 0;
      const fg_pct = parseFloat(p.fg_pct) || 0;

      return {
        player_id: p.player_id,
        first_name: p.first_name,
        last_name: p.last_name,
        team_id: p.team_id,
        team_name: p.team_name,
        position: p.position,
        conference: confKey as 'east' | 'west',
        overall: p.overall,
        ppg,
        rpg,
        apg,
        spg,
        bpg,
        fg_pct,
        all_star_score: calculateAllStarScore(p.overall, ppg, rpg, apg, spg, bpg, fg_pct, p.team_wins || 0),
      };
    })
    .sort((a, b) => b.all_star_score - a.all_star_score);
}

export async function selectAllStars(
  seasonId: string,
  conference: 'Eastern' | 'Western',
  userPickId?: string
): Promise<AllStarCandidate[]> {
  const candidates = await getAllStarCandidates(seasonId, conference);
  const confKey = conference === 'Eastern' ? 'east' : 'west';

  if (candidates.length < 15) {
    throw new Error(`Insufficient All-Star candidates for ${conference} conference (found ${candidates.length}, need 15)`);
  }

  const guards = candidates.filter(c => c.position === 'PG' || c.position === 'SG');
  const forwards = candidates.filter(c => c.position === 'SF' || c.position === 'PF');
  const centers = candidates.filter(c => c.position === 'C');

  if (guards.length < 2 || forwards.length < 2 || centers.length < 1) {
    throw new Error(`Insufficient positional distribution for ${conference} All-Star selection (G:${guards.length}, F:${forwards.length}, C:${centers.length})`);
  }

  const selectedTeams = new Set<string>();
  const starters: AllStarCandidate[] = [];

  function selectFromPosition(pool: AllStarCandidate[], count: number): AllStarCandidate[] {
    const result: AllStarCandidate[] = [];

    for (const player of pool) {
      if (result.length >= count) break;
      if (!selectedTeams.has(player.team_id)) {
        result.push(player);
        selectedTeams.add(player.team_id);
      }
    }

    for (const player of pool) {
      if (result.length >= count) break;
      if (!result.includes(player)) {
        result.push(player);
      }
    }

    return result;
  }

  starters.push(
    ...selectFromPosition(guards, 2),
    ...selectFromPosition(forwards, 2),
    ...selectFromPosition(centers, 1)
  );

  while (starters.length < 5) {
    const nextBest = candidates.find(c => !starters.includes(c));
    if (nextBest) {
      starters.push(nextBest);
    } else {
      break;
    }
  }

  starters.sort((a, b) => b.all_star_score - a.all_star_score);

  const selected: AllStarCandidate[] = [...starters];
  const teamsInSelected = new Set(selected.map(s => s.team_id));

  const unrepresentedCandidates = candidates.filter(c => !selected.includes(c) && !teamsInSelected.has(c.team_id));
  const representedCandidates = candidates.filter(c => !selected.includes(c) && teamsInSelected.has(c.team_id));

  const reserves = [...unrepresentedCandidates, ...representedCandidates].slice(0, 10);
  selected.push(...reserves);

  if (userPickId && !selected.some(p => p.player_id === userPickId)) {
    const userPlayer = candidates.find(p => p.player_id === userPickId);
    if (userPlayer) {
      selected[selected.length - 1] = userPlayer;
    }
  }

  const allStarsWithVotes = selected.map((player, idx) => {
    const isStarter = idx < 5;
    const baseVotes = Math.floor(player.all_star_score * 10000);
    const fanVotes = baseVotes + Math.floor(Math.random() * 50000);
    const playerVotes = Math.floor(baseVotes * 0.3) + Math.floor(Math.random() * 5000);
    const mediaVotes = Math.floor(baseVotes * 0.2) + Math.floor(Math.random() * 3000);

    return {
      ...player,
      is_starter: isStarter,
      is_captain: idx === 0,
      votes: fanVotes + playerVotes + mediaVotes,
      fan_votes: fanVotes,
      player_votes: playerVotes,
      media_votes: mediaVotes,
    };
  });

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

export async function getSelectedAllStars(seasonId: string): Promise<{ east: any[]; west: any[] }> {
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

  return {
    east: result.rows.filter((r: any) => r.conference === 'east'),
    west: result.rows.filter((r: any) => r.conference === 'west'),
  };
}

export async function getRisingStars(seasonId: string): Promise<{ rookies: any[]; sophomores: any[] }> {
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
      COALESCE((ps.oreb + ps.dreb) / NULLIF(ps.games_played, 0), 0) as rpg,
      COALESCE(ps.assists / NULLIF(ps.games_played, 0), 0) as apg
    FROM players p
    JOIN teams t ON p.team_id = t.id
    LEFT JOIN player_season_stats ps ON p.id = ps.player_id AND ps.season_id = $1
    WHERE p.years_pro <= 1 AND p.team_id IS NOT NULL
    ORDER BY p.overall DESC, ps.points DESC
    LIMIT 24`,
    [seasonId]
  );

  return {
    rookies: result.rows.filter((r: any) => r.years_pro === 0).slice(0, 12),
    sophomores: result.rows.filter((r: any) => r.years_pro === 1).slice(0, 12),
  };
}
