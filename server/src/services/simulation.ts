// Simulation service - helper functions for loading teams and players
import { pool } from '../db/pool';
import { SimTeam, SimPlayer, PlayerAttributes, PlayerTrait, initializeHotColdState } from '../simulation';

// Load a team with full player data for simulation
export async function loadTeamForSimulation(teamId: string): Promise<SimTeam> {
  const teamResult = await pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
  if (teamResult.rows.length === 0) {
    throw new Error(`Team not found: ${teamId}`);
  }
  const team = teamResult.rows[0];

  // Get all players with attributes
  const playersResult = await pool.query(
    `SELECT p.*, pa.*
     FROM players p
     LEFT JOIN player_attributes pa ON p.id = pa.player_id
     WHERE p.team_id = $1
     ORDER BY p.overall DESC`,
    [teamId]
  );

  // Get traits for all players
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

  // Group traits by player
  const traitsByPlayer: Record<string, PlayerTrait[]> = {};
  for (const trait of traitsResult.rows) {
    if (!traitsByPlayer[trait.player_id]) {
      traitsByPlayer[trait.player_id] = [];
    }
    traitsByPlayer[trait.player_id].push({
      id: trait.id,
      name: trait.name,
      category: trait.category,
      tier: trait.tier,
      effects: []
    });
  }

  // Build SimPlayer objects with all 43+ attributes from GAME_DESIGN.md
  const roster: SimPlayer[] = playersResult.rows.map((p: any) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    position: p.position,
    height_inches: p.height_inches,
    overall: p.overall,
    attributes: {
      // Shooting (8)
      inside_scoring: p.inside_scoring || 50,
      close_shot: p.close_shot || 50,
      mid_range: p.mid_range || 50,
      three_point: p.three_point || 50,
      free_throw: p.free_throw || 50,
      shot_iq: p.shot_iq || 50,
      offensive_consistency: p.offensive_consistency || 50,
      // Finishing (5)
      layup: p.layup || 50,
      standing_dunk: p.standing_dunk || 50,
      driving_dunk: p.driving_dunk || 50,
      draw_foul: p.draw_foul || 50,
      post_moves: p.post_moves || 50,
      post_control: p.post_control || 50,
      // Playmaking (6)
      ball_handling: p.ball_handling || 50,
      speed_with_ball: p.speed_with_ball || 50,
      passing_accuracy: p.passing_accuracy || p.passing || 50,
      passing_vision: p.passing_vision || 50,
      passing_iq: p.passing_iq || 50,
      offensive_iq: p.offensive_iq || 50,
      // Defense (8)
      interior_defense: p.interior_defense || 50,
      perimeter_defense: p.perimeter_defense || 50,
      steal: p.steal || 50,
      block: p.block || 50,
      defensive_iq: p.defensive_iq || 50,
      defensive_consistency: p.defensive_consistency || 50,
      lateral_quickness: p.lateral_quickness || 50,
      help_defense_iq: p.help_defense_iq || 50,
      // Rebounding (4)
      offensive_rebound: p.offensive_rebound || 50,
      defensive_rebound: p.defensive_rebound || 50,
      box_out: p.box_out || 50,
      rebound_timing: p.rebound_timing || 50,
      // Physical (6)
      speed: p.speed || 50,
      acceleration: p.acceleration || 50,
      strength: p.strength || 50,
      vertical: p.vertical || 50,
      stamina: p.stamina || 50,
      hustle: p.hustle || 50,
      // Mental (7) - THE GAME CHANGERS
      basketball_iq: p.basketball_iq || 50,
      clutch: p.clutch || 50,
      consistency: p.consistency || 50,
      work_ethic: p.work_ethic || 50,
      aggression: p.aggression || 50,
      streakiness: p.streakiness || 50,  // ★ CRITICAL for hot/cold system
      composure: p.composure || 50,
      // Legacy alias
      passing: p.passing_accuracy || p.passing || 50
    } as PlayerAttributes,
    traits: traitsByPlayer[p.id] || [],
    fatigue: 0,
    minutes_played: 0,
    fouls: 0,
    is_on_court: false,
    // Initialize hot/cold state for streakiness system (GDD Section 4.2)
    hot_cold_state: initializeHotColdState(),
    stats: {
      points: 0, fgm: 0, fga: 0, three_pm: 0, three_pa: 0,
      ftm: 0, fta: 0, oreb: 0, dreb: 0, rebounds: 0,
      assists: 0, steals: 0, blocks: 0, turnovers: 0,
      fouls: 0, plus_minus: 0, minutes: 0
    }
  }));

  // Set starters (top 5 by overall, respecting positions)
  const starters = selectStarters(roster);
  const bench = roster.filter(p => !starters.includes(p));

  return {
    id: team.id,
    name: team.name,
    city: team.city,
    abbreviation: team.abbreviation,
    roster,
    starters,
    bench,
    on_court: []
  };
}

// Select best starting lineup
export function selectStarters(roster: SimPlayer[]): SimPlayer[] {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
  const starters: SimPlayer[] = [];

  for (const pos of positions) {
    const available = roster.filter(
      p => p.position === pos && !starters.includes(p)
    );
    if (available.length > 0) {
      // Pick highest overall at this position
      const best = available.reduce((a, b) => a.overall > b.overall ? a : b);
      starters.push(best);
    }
  }

  // If we don't have 5 starters, fill with best remaining
  while (starters.length < 5 && roster.length > starters.length) {
    const available = roster.filter(p => !starters.includes(p));
    if (available.length === 0) break;
    const best = available.reduce((a, b) => a.overall > b.overall ? a : b);
    starters.push(best);
  }

  return starters;
}
