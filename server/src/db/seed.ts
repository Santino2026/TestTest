import { pool } from './pool';
import { teams } from './seeds/001_teams';
import { traits } from './seeds/002_traits';
import { generateRoster, generatePlayer } from './seeds/003_player_generator';

async function seed() {
  console.log('🏀 Seeding database...\n');

  try {
    // 1. Seed Teams
    console.log('📍 Seeding teams...');
    const teamIds: Map<string, string> = new Map();

    for (const team of teams) {
      const result = await pool.query(
        `INSERT INTO teams (name, city, abbreviation, conference, division, primary_color, secondary_color, arena_name, championships)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (abbreviation) DO UPDATE SET
           name = EXCLUDED.name,
           city = EXCLUDED.city,
           conference = EXCLUDED.conference,
           division = EXCLUDED.division,
           primary_color = EXCLUDED.primary_color,
           secondary_color = EXCLUDED.secondary_color,
           arena_name = EXCLUDED.arena_name,
           championships = EXCLUDED.championships
         RETURNING id`,
        [team.name, team.city, team.abbreviation, team.conference, team.division,
         team.primary_color, team.secondary_color, team.arena_name, team.championships]
      );
      teamIds.set(team.abbreviation, result.rows[0].id);
    }
    console.log(`   ✓ Seeded ${teams.length} teams\n`);

    // 2. Seed Traits
    console.log('🏷️  Seeding traits...');
    for (const trait of traits) {
      await pool.query(
        `INSERT INTO traits (id, name, description, category, rarity)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           category = EXCLUDED.category,
           rarity = EXCLUDED.rarity`,
        [trait.id, trait.name, trait.description, trait.category, trait.rarity]
      );
    }
    console.log(`   ✓ Seeded ${traits.length} traits\n`);

    // 3. Generate Players for each team
    console.log('👥 Generating players...');
    let totalPlayers = 0;
    let totalTraits = 0;

    for (const [abbrev, teamId] of teamIds) {
      const roster = generateRoster(teamId);

      for (const { player, attributes, traits } of roster) {
        // Insert player with all hidden attributes
        const playerResult = await pool.query(
          `INSERT INTO players (first_name, last_name, team_id, position, secondary_position, archetype,
                                height_inches, weight_lbs, age, jersey_number, years_pro, overall, potential,
                                peak_age, durability, coachability, greed, ego, loyalty, leadership, motor)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           RETURNING id`,
          [player.first_name, player.last_name, player.team_id, player.position, player.secondary_position,
           player.archetype, player.height_inches, player.weight_lbs, player.age, player.jersey_number,
           player.years_pro, player.overall, player.potential,
           player.peak_age, player.durability, player.coachability, player.greed, player.ego,
           player.loyalty, player.leadership, player.motor]
        );
        const playerId = playerResult.rows[0].id;

        // Insert all 43 attributes
        await pool.query(
          `INSERT INTO player_attributes (player_id,
             inside_scoring, close_shot, mid_range, three_point, free_throw, shot_iq, offensive_consistency,
             layup, standing_dunk, driving_dunk, draw_foul, post_moves, post_control,
             ball_handling, speed_with_ball, passing_accuracy, passing_vision, passing_iq, offensive_iq,
             interior_defense, perimeter_defense, steal, block, defensive_iq, defensive_consistency,
             lateral_quickness, help_defense_iq,
             offensive_rebound, defensive_rebound, box_out, rebound_timing,
             speed, acceleration, strength, vertical, stamina, hustle,
             basketball_iq, clutch, consistency, work_ethic, aggression, streakiness, composure)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                   $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
                   $39, $40, $41, $42, $43, $44, $45)`,
          [playerId,
           attributes.inside_scoring, attributes.close_shot, attributes.mid_range, attributes.three_point,
           attributes.free_throw, attributes.shot_iq, attributes.offensive_consistency,
           attributes.layup, attributes.standing_dunk, attributes.driving_dunk, attributes.draw_foul,
           attributes.post_moves, attributes.post_control,
           attributes.ball_handling, attributes.speed_with_ball, attributes.passing_accuracy,
           attributes.passing_vision, attributes.passing_iq, attributes.offensive_iq,
           attributes.interior_defense, attributes.perimeter_defense, attributes.steal, attributes.block,
           attributes.defensive_iq, attributes.defensive_consistency, attributes.lateral_quickness,
           attributes.help_defense_iq,
           attributes.offensive_rebound, attributes.defensive_rebound, attributes.box_out, attributes.rebound_timing,
           attributes.speed, attributes.acceleration, attributes.strength, attributes.vertical,
           attributes.stamina, attributes.hustle,
           attributes.basketball_iq, attributes.clutch, attributes.consistency, attributes.work_ethic,
           attributes.aggression, attributes.streakiness, attributes.composure]
        );

        // Insert player traits
        for (const trait of traits) {
          await pool.query(
            `INSERT INTO player_traits (player_id, trait_id, tier)
             VALUES ($1, $2, $3)
             ON CONFLICT (player_id, trait_id) DO NOTHING`,
            [playerId, trait.traitId, trait.tier]
          );
          totalTraits++;
        }

        totalPlayers++;
      }
      process.stdout.write(`   ${abbrev} `);
    }
    console.log(`\n   ✓ Generated ${totalPlayers} players with ${totalTraits} traits for ${teamIds.size} teams\n`);

    // 4. Generate Free Agents (60 players without teams)
    console.log('🆓 Generating free agents...');
    const positions: Array<'PG' | 'SG' | 'SF' | 'PF' | 'C'> = ['PG', 'SG', 'SF', 'PF', 'C'];
    let freeAgentCount = 0;

    for (let i = 0; i < 60; i++) {
      const position = positions[i % 5];
      const { player, attributes, traits } = generatePlayer(null, position, false);

      // Insert free agent with all hidden attributes
      const playerResult = await pool.query(
        `INSERT INTO players (first_name, last_name, team_id, position, secondary_position, archetype,
                              height_inches, weight_lbs, age, jersey_number, years_pro, overall, potential,
                              peak_age, durability, coachability, greed, ego, loyalty, leadership, motor)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         RETURNING id`,
        [player.first_name, player.last_name, null, player.position, player.secondary_position,
         player.archetype, player.height_inches, player.weight_lbs, player.age, player.jersey_number,
         player.years_pro, player.overall, player.potential,
         player.peak_age, player.durability, player.coachability, player.greed, player.ego,
         player.loyalty, player.leadership, player.motor]
      );
      const playerId = playerResult.rows[0].id;

      // Insert all 43 attributes
      await pool.query(
        `INSERT INTO player_attributes (player_id,
           inside_scoring, close_shot, mid_range, three_point, free_throw, shot_iq, offensive_consistency,
           layup, standing_dunk, driving_dunk, draw_foul, post_moves, post_control,
           ball_handling, speed_with_ball, passing_accuracy, passing_vision, passing_iq, offensive_iq,
           interior_defense, perimeter_defense, steal, block, defensive_iq, defensive_consistency,
           lateral_quickness, help_defense_iq,
           offensive_rebound, defensive_rebound, box_out, rebound_timing,
           speed, acceleration, strength, vertical, stamina, hustle,
           basketball_iq, clutch, consistency, work_ethic, aggression, streakiness, composure)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                 $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
                 $39, $40, $41, $42, $43, $44, $45)`,
        [playerId,
         attributes.inside_scoring, attributes.close_shot, attributes.mid_range, attributes.three_point,
         attributes.free_throw, attributes.shot_iq, attributes.offensive_consistency,
         attributes.layup, attributes.standing_dunk, attributes.driving_dunk, attributes.draw_foul,
         attributes.post_moves, attributes.post_control,
         attributes.ball_handling, attributes.speed_with_ball, attributes.passing_accuracy,
         attributes.passing_vision, attributes.passing_iq, attributes.offensive_iq,
         attributes.interior_defense, attributes.perimeter_defense, attributes.steal, attributes.block,
         attributes.defensive_iq, attributes.defensive_consistency, attributes.lateral_quickness,
         attributes.help_defense_iq,
         attributes.offensive_rebound, attributes.defensive_rebound, attributes.box_out, attributes.rebound_timing,
         attributes.speed, attributes.acceleration, attributes.strength, attributes.vertical,
         attributes.stamina, attributes.hustle,
         attributes.basketball_iq, attributes.clutch, attributes.consistency, attributes.work_ethic,
         attributes.aggression, attributes.streakiness, attributes.composure]
      );

      // Insert free agent traits
      for (const trait of traits) {
        await pool.query(
          `INSERT INTO player_traits (player_id, trait_id, tier)
           VALUES ($1, $2, $3)
           ON CONFLICT (player_id, trait_id) DO NOTHING`,
          [playerId, trait.traitId, trait.tier]
        );
        totalTraits++;
      }

      freeAgentCount++;
    }
    console.log(`   ✓ Generated ${freeAgentCount} free agents with traits\n`);

    // 5. Create initial season
    console.log('📅 Creating initial season...');
    await pool.query(
      `INSERT INTO seasons (season_number, status, current_day)
       VALUES (1, 'preseason', 0)
       ON CONFLICT DO NOTHING`
    );

    // Create standings for all teams
    const seasonResult = await pool.query(`SELECT id FROM seasons WHERE season_number = 1`);
    const seasonId = seasonResult.rows[0].id;

    for (const [_, teamId] of teamIds) {
      await pool.query(
        `INSERT INTO standings (season_id, team_id)
         VALUES ($1, $2)
         ON CONFLICT (season_id, team_id) DO NOTHING`,
        [seasonId, teamId]
      );
    }
    console.log(`   ✓ Created Season 1 with standings for all teams\n`);

    console.log('✅ Database seeding complete!');
    console.log(`   Total: ${teams.length} teams, ${traits.length} traits, ${totalPlayers + freeAgentCount} players`);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
