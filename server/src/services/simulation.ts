import { pool } from '../db/pool';
import { SimTeam, SimPlayer, PlayerAttributes, PlayerTrait, initializeHotColdState } from '../simulation';

export async function loadTeamForSimulation(teamId: string): Promise<SimTeam> {
  const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
  if (teamResult.rows.length === 0) {
    throw new Error(`Team not found: ${teamId}`);
  }
  const team = teamResult.rows[0];

  const playersResult = await pool.query(
    `SELECT p.*, pa.*
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id = $1
     ORDER BY p.overall DESC`,
    [teamId]
  );

  const playerIds = playersResult.rows.map((p: any) => p.id);
  const traitsResult = playerIds.length > 0
    ? await pool.query(
        `SELECT pt.player_id, t.*, pt.tier
         FROM player_traits pt
         JOIN traits t ON pt.trait_id = t.id
         WHERE pt.player_id = ANY($1)`,
        [playerIds]
      )
    : { rows: [] };

  const traitsByPlayer = buildTraitsByPlayer(traitsResult.rows);
  const roster = playersResult.rows.map((p: any) => buildSimPlayer(p, traitsByPlayer[p.id] || []));

  const starters = selectStarters(roster);
  for (const player of starters) {
    player.is_on_court = true;
  }
  const bench = roster.filter(p => !starters.includes(p));

  return {
    id: team.id,
    name: team.name,
    city: team.city,
    abbreviation: team.abbreviation,
    roster,
    starters,
    bench,
    on_court: [...starters]
  };
}

function buildTraitsByPlayer(traitRows: any[]): Record<string, PlayerTrait[]> {
  const result: Record<string, PlayerTrait[]> = {};
  for (const trait of traitRows) {
    if (!result[trait.player_id]) {
      result[trait.player_id] = [];
    }
    result[trait.player_id].push({
      id: trait.id,
      name: trait.name,
      category: trait.category,
      tier: trait.tier,
      effects: []
    });
  }
  return result;
}

function buildSimPlayer(p: any, traits: PlayerTrait[]): SimPlayer {
  return {
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    height_inches: p.height_inches,
    overall: p.overall,
    attributes: buildPlayerAttributes(p),
    traits,
    fatigue: 0,
    minutes_played: 0,
    fouls: 0,
    is_on_court: false,
    hot_cold_state: initializeHotColdState(),
    stats: {
      points: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0,
      ftm: 0, fta: 0, oreb: 0, dreb: 0, rebounds: 0,
      assists: 0, steals: 0, blocks: 0, turnovers: 0,
      fouls: 0, plus_minus: 0, minutes: 0
    }
  };
}

function buildPlayerAttributes(p: any): PlayerAttributes {
  const attr = (name: string, fallback?: string): number =>
    p[name] ?? (fallback ? p[fallback] : null) ?? 50;

  return {
    // Shooting
    inside_scoring: attr('inside_scoring'),
    close_shot: attr('close_shot'),
    mid_range: attr('mid_range'),
    three_point: attr('three_point'),
    free_throw: attr('free_throw'),
    shot_iq: attr('shot_iq'),
    offensive_consistency: attr('offensive_consistency'),
    // Finishing
    layup: attr('layup'),
    standing_dunk: attr('standing_dunk'),
    driving_dunk: attr('driving_dunk'),
    draw_foul: attr('draw_foul'),
    post_moves: attr('post_moves'),
    post_control: attr('post_control'),
    // Playmaking
    ball_handling: attr('ball_handling'),
    speed_with_ball: attr('speed_with_ball'),
    passing_accuracy: attr('passing_accuracy', 'passing'),
    passing_vision: attr('passing_vision'),
    passing_iq: attr('passing_iq'),
    offensive_iq: attr('offensive_iq'),
    // Defense
    interior_defense: attr('interior_defense'),
    perimeter_defense: attr('perimeter_defense'),
    steal: attr('steal'),
    block: attr('block'),
    defensive_iq: attr('defensive_iq'),
    defensive_consistency: attr('defensive_consistency'),
    lateral_quickness: attr('lateral_quickness'),
    help_defense_iq: attr('help_defense_iq'),
    // Rebounding
    offensive_rebound: attr('offensive_rebound'),
    defensive_rebound: attr('defensive_rebound'),
    box_out: attr('box_out'),
    rebound_timing: attr('rebound_timing'),
    // Physical
    speed: attr('speed'),
    acceleration: attr('acceleration'),
    strength: attr('strength'),
    vertical: attr('vertical'),
    stamina: attr('stamina'),
    hustle: attr('hustle'),
    // Mental
    basketball_iq: attr('basketball_iq'),
    clutch: attr('clutch'),
    consistency: attr('consistency'),
    work_ethic: attr('work_ethic'),
    aggression: attr('aggression'),
    streakiness: attr('streakiness'),
    composure: attr('composure'),
    // Legacy alias
    passing: attr('passing_accuracy', 'passing')
  } as PlayerAttributes;
}

export function selectStarters(roster: SimPlayer[]): SimPlayer[] {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
  const starters: SimPlayer[] = [];

  for (const pos of positions) {
    const available = roster.filter(p => p.position === pos && !starters.includes(p));
    if (available.length > 0) {
      const best = available.reduce((a, b) => a.overall > b.overall ? a : b);
      starters.push(best);
    }
  }

  while (starters.length < 5 && roster.length > starters.length) {
    const available = roster.filter(p => !starters.includes(p));
    if (available.length === 0) break;
    const best = available.reduce((a, b) => a.overall > b.overall ? a : b);
    starters.push(best);
  }

  return starters;
}

export async function loadTeamsForSimulationBulk(teamIds: string[]): Promise<Map<string, SimTeam>> {
  if (teamIds.length === 0) return new Map();

  // 1 query: all teams
  const teamsResult = await pool.query(
    'SELECT * FROM teams WHERE id = ANY($1)',
    [teamIds]
  );

  // 1 query: all players with attributes
  const playersResult = await pool.query(
    `SELECT p.*, pa.*
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id = ANY($1)
     ORDER BY p.team_id, p.overall DESC`,
    [teamIds]
  );

  // 1 query: all traits for all players
  const playerIds = playersResult.rows.map((p: any) => p.id);
  const traitsResult = playerIds.length > 0
    ? await pool.query(
        `SELECT pt.player_id, t.*, pt.tier
         FROM player_traits pt
         JOIN traits t ON pt.trait_id = t.id
         WHERE pt.player_id = ANY($1)`,
        [playerIds]
      )
    : { rows: [] };

  // Group data by team
  const traitsByPlayer = buildTraitsByPlayer(traitsResult.rows);
  const playersByTeam: Record<string, any[]> = {};
  for (const p of playersResult.rows) {
    if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
    playersByTeam[p.team_id].push(p);
  }

  // Build SimTeam objects
  const teamCache = new Map<string, SimTeam>();
  for (const team of teamsResult.rows) {
    const players = playersByTeam[team.id] || [];
    const roster = players.map((p: any) => buildSimPlayer(p, traitsByPlayer[p.id] || []));
    const starters = selectStarters(roster);
    for (const player of starters) player.is_on_court = true;
    const bench = roster.filter(p => !starters.includes(p));

    teamCache.set(team.id, {
      id: team.id,
      name: team.name,
      city: team.city,
      abbreviation: team.abbreviation,
      roster,
      starters,
      bench,
      on_court: [...starters]
    });
  }

  return teamCache;
}
