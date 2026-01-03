// All traits/badges for the game
export const traits = [
  // SCORING
  { id: 'deadeye', name: 'Deadeye', description: 'Reduced penalty for contested shots', category: 'scoring', rarity: 'common' },
  { id: 'catch_and_shoot', name: 'Catch & Shoot', description: 'Boosts shot percentage on catch-and-shoot attempts', category: 'scoring', rarity: 'common' },
  { id: 'difficult_shots', name: 'Difficult Shots', description: 'Better at making tough, contested shots', category: 'scoring', rarity: 'uncommon' },
  { id: 'volume_shooter', name: 'Volume Shooter', description: 'Gets better as shot attempts increase', category: 'scoring', rarity: 'uncommon' },
  { id: 'clutch_shooter', name: 'Clutch Shooter', description: 'Elevated shooting in final minutes of close games', category: 'scoring', rarity: 'rare' },
  { id: 'green_machine', name: 'Green Machine', description: 'Consecutive made shots boost accuracy further', category: 'scoring', rarity: 'rare' },
  { id: 'limitless_range', name: 'Limitless Range', description: 'Can shoot effectively from very deep', category: 'scoring', rarity: 'legendary' },
  { id: 'posterizer', name: 'Posterizer', description: 'Increased chance of powerful dunks over defenders', category: 'scoring', rarity: 'uncommon' },
  { id: 'contact_finisher', name: 'Contact Finisher', description: 'Better at finishing through contact at the rim', category: 'scoring', rarity: 'uncommon' },
  { id: 'pro_touch', name: 'Pro Touch', description: 'Extra boost for slightly early/late layups and floaters', category: 'scoring', rarity: 'common' },
  { id: 'slithery_finisher', name: 'Slithery Finisher', description: 'Better at avoiding contact when driving', category: 'scoring', rarity: 'common' },

  // PLAYMAKING
  { id: 'dimer', name: 'Dimer', description: 'Teammates get shooting boost from passes', category: 'playmaking', rarity: 'uncommon' },
  { id: 'floor_general', name: 'Floor General', description: 'Boosts teammates offensive attributes when on floor', category: 'playmaking', rarity: 'rare' },
  { id: 'needle_threader', name: 'Needle Threader', description: 'Better at throwing passes through tight windows', category: 'playmaking', rarity: 'uncommon' },
  { id: 'bailout', name: 'Bailout', description: 'Better at making passes while in the air', category: 'playmaking', rarity: 'common' },
  { id: 'break_starter', name: 'Break Starter', description: 'More accurate outlet passes after rebounds', category: 'playmaking', rarity: 'common' },
  { id: 'handles_for_days', name: 'Handles for Days', description: 'Reduced stamina loss from dribble moves', category: 'playmaking', rarity: 'common' },
  { id: 'ankle_breaker', name: 'Ankle Breaker', description: 'Dribble moves more likely to freeze or drop defenders', category: 'playmaking', rarity: 'rare' },
  { id: 'quick_first_step', name: 'Quick First Step', description: 'Faster acceleration from triple threat', category: 'playmaking', rarity: 'uncommon' },
  { id: 'space_creator', name: 'Space Creator', description: 'Stepback and escape moves create more separation', category: 'playmaking', rarity: 'uncommon' },

  // DEFENSE
  { id: 'clamps', name: 'Clamps', description: 'Better at staying in front of ball handlers', category: 'defense', rarity: 'uncommon' },
  { id: 'intimidator', name: 'Intimidator', description: 'Offensive players less likely to score when contested', category: 'defense', rarity: 'rare' },
  { id: 'pick_pocket', name: 'Pick Pocket', description: 'Increased chance of stripping ball handlers', category: 'defense', rarity: 'uncommon' },
  { id: 'pick_dodger', name: 'Pick Dodger', description: 'Better at navigating through screens', category: 'defense', rarity: 'common' },
  { id: 'chase_down_artist', name: 'Chase Down Artist', description: 'Better at chase-down blocks from behind', category: 'defense', rarity: 'uncommon' },
  { id: 'rim_protector', name: 'Rim Protector', description: 'Increased block success and deterrence at rim', category: 'defense', rarity: 'rare' },
  { id: 'pogo_stick', name: 'Pogo Stick', description: 'Faster recovery for multiple block attempts', category: 'defense', rarity: 'common' },
  { id: 'interceptor', name: 'Interceptor', description: 'Better at reading and intercepting passes', category: 'defense', rarity: 'uncommon' },
  { id: 'defensive_leader', name: 'Defensive Leader', description: 'Boosts teammates defensive attributes', category: 'defense', rarity: 'rare' },

  // REBOUNDING
  { id: 'rebound_chaser', name: 'Rebound Chaser', description: 'Better at tracking and chasing rebounds', category: 'rebounding', rarity: 'common' },
  { id: 'box_out', name: 'Box Out', description: 'More effective at boxing out for rebounds', category: 'rebounding', rarity: 'common' },
  { id: 'worm', name: 'Worm', description: 'Better at getting around boxouts for rebounds', category: 'rebounding', rarity: 'uncommon' },
  { id: 'putback_boss', name: 'Putback Boss', description: 'Better at scoring on offensive rebound putbacks', category: 'rebounding', rarity: 'uncommon' },

  // MENTAL
  { id: 'clutch_performer', name: 'Clutch Performer', description: 'Overall boost in clutch situations', category: 'mental', rarity: 'rare' },
  { id: 'ice_in_veins', name: 'Ice in Veins', description: 'Unaffected by pressure in big moments', category: 'mental', rarity: 'rare' },
  { id: 'microwave', name: 'Microwave', description: 'Gets hot quickly, builds momentum faster', category: 'mental', rarity: 'uncommon' },
  { id: 'comeback_kid', name: 'Comeback Kid', description: 'Plays better when team is trailing', category: 'mental', rarity: 'uncommon' },
  { id: 'alpha_dog', name: 'Alpha Dog', description: 'Elevates play when team needs a leader', category: 'mental', rarity: 'legendary' },
  { id: 'playoff_performer', name: 'Playoff Performer', description: 'Significant boost in playoff games', category: 'mental', rarity: 'legendary' },

  // PHYSICAL
  { id: 'tireless_defender', name: 'Tireless Defender', description: 'Reduced stamina loss on defensive actions', category: 'physical', rarity: 'common' },
  { id: 'tireless_scorer', name: 'Tireless Scorer', description: 'Reduced stamina loss on offensive actions', category: 'physical', rarity: 'common' },
  { id: 'relentless_finisher', name: 'Relentless Finisher', description: 'Maintains finishing ability when fatigued', category: 'physical', rarity: 'uncommon' },

  // NEGATIVE TRAITS
  { id: 'turnover_prone', name: 'Turnover Prone', description: 'More likely to commit turnovers under pressure', category: 'negative', rarity: 'common' },
  { id: 'cold_streak', name: 'Cold Streak', description: 'Misses compound; gets cold more easily', category: 'negative', rarity: 'uncommon' },
  { id: 'foul_trouble', name: 'Foul Trouble', description: 'More likely to commit unnecessary fouls', category: 'negative', rarity: 'common' },
  { id: 'pressure_choker', name: 'Pressure Choker', description: 'Struggles in high-pressure moments', category: 'negative', rarity: 'uncommon' },
  { id: 'injury_prone', name: 'Injury Prone', description: 'Higher chance of getting injured', category: 'negative', rarity: 'rare' },
];
