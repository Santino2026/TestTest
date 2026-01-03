# Sports League Office: Basketball - Game Design Document (GDD)

> **Version:** 2.0
> **Last Updated:** January 2026
> **Status:** Pre-Production (Single-Player Pivot)
> **Domain:** sportsleagueoffice.com/basketball
> **Price:** $10 one-time purchase

---

# TABLE OF CONTENTS

1. [Game Vision](#1-game-vision)
2. [Core Gameplay Loop](#2-core-gameplay-loop)
3. [League Structure](#3-league-structure)
4. [Player System](#4-player-system)
5. [Team Management](#5-team-management)
6. [Game Simulation Engine](#6-game-simulation-engine)
7. [Draft System](#7-draft-system)
8. [Free Agency](#8-free-agency)
9. [Trading System](#9-trading-system)
10. [Coaching & Staff](#10-coaching--staff)
11. [Owner & Franchise](#11-owner--franchise)
12. [Dynamic Events](#12-dynamic-events)
13. [Awards & Records](#13-awards--records)
14. [Single-Player Franchise System](#14-single-player-franchise-system)
15. [User Interface](#15-user-interface)
16. [Audio & Presentation](#16-audio--presentation)
17. [Monetization](#17-monetization)
18. [Technical Requirements](#18-technical-requirements)

---

# 1. GAME VISION

## 1.1 Elevator Pitch

Sports League Office: Basketball is a premium single-player basketball franchise simulation where you build a dynasty through smart drafting, player development, strategic trades, and tactical team building. Watch your decisions play out in real-time 3D game simulations. One-time $10 purchase at sportsleagueoffice.com/basketball.

## 1.2 Design Pillars

### Pillar 1: Statistics-Driven Authenticity
Every action in every game is simulated based on player attributes, traits, and context. Nothing is random - outcomes are determined by the intersection of player skills, matchups, and situation.

### Pillar 2: Meaningful Decisions
Every roster move, trade, and lineup decision should have clear trade-offs. There are no objectively "correct" answers - only strategies that fit your vision.

### Pillar 3: Emergent Narratives
The game doesn't script storylines. Drama emerges naturally from player personalities, team chemistry, contract situations, and on-court performance.

### Pillar 4: Deep Single-Player Experience
A complete NBA-style franchise mode with 30 teams, 82-game seasons, and realistic playoffs. CPU teams are intelligent opponents that make realistic moves, creating an authentic league ecosystem.

### Pillar 5: Accessible Depth
Easy to start playing, with layers of complexity revealed over time. A casual player can enjoy the core loop while hardcore players optimize every detail.

## 1.3 Target Audience

**Primary:**
- Sports simulation fans (Football Manager, OOTP, NBA 2K MyLeague)
- Fantasy basketball players
- Basketball stat enthusiasts
- Ages 16-40

**Secondary:**
- Casual basketball fans who want management without twitch gameplay
- Strategy game players looking for new genres
- Solo players wanting deep franchise management

## 1.4 Competitive Analysis

| Game | Strengths | Weaknesses | Our Differentiator |
|------|-----------|------------|-------------------|
| NBA 2K MyLeague | Presentation, realism | Complex, requires playing games | Pure management focus |
| Basketball GM | Deep simulation, free | No visuals, dated UI | 3D visualization, modern UX |
| Football Manager | Gold standard management | Not basketball | Same depth, basketball context |
| OOTP Baseball | Statistical depth | Learning curve | More accessible, visual games |

## 1.5 Unique Selling Points

1. **Watch Your Strategy Play Out** - 3D game visualization shows your roster decisions in action
2. **Full NBA-Style Experience** - 30 teams, 82-game seasons, 16-team playoffs with best-of-7 series
3. **Hidden Player Potential** - Scouting and development create discovery moments
4. **Archetype Synergies** - Team composition strategy beyond just "get best players"
5. **Deep Statistics** - Every possession tracked, advanced metrics calculated
6. **Premium One-Time Purchase** - $10, no subscriptions, no microtransactions

---

# 2. CORE GAMEPLAY LOOP

## 2.1 Session Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     TYPICAL PLAY SESSION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CHECK NOTIFICATIONS (2-5 min)                               │
│     ├── Trade offers from other teams                           │
│     ├── Injury updates                                          │
│     ├── Player morale changes                                   │
│     ├── Upcoming game reminders                                 │
│     └── League news/transactions                                │
│                                                                  │
│  2. MANAGE ROSTER (5-15 min)                                    │
│     ├── Adjust starting lineup                                  │
│     ├── Set rotation/minutes                                    │
│     ├── Review player development                               │
│     ├── Scout prospects/free agents                             │
│     └── Consider trades                                         │
│                                                                  │
│  3. PLAY/WATCH GAMES (5-30 min per game)                        │
│     ├── Watch full 3D simulation (20-30 min)                    │
│     ├── Watch key moments only (5-10 min)                       │
│     ├── Quick sim with box score (instant)                      │
│     └── Sim multiple games (batch advance)                      │
│                                                                  │
│  4. REVIEW & PLAN (5-10 min)                                    │
│     ├── Analyze game stats                                      │
│     ├── Check standings                                         │
│     ├── Plan roster moves                                       │
│     └── Set goals for next session                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Season Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      ANNUAL SEASON CYCLE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │  OFFSEASON   │ (Between seasons)                             │
│  │  ────────────│                                               │
│  │  • Draft     │──┐                                            │
│  │  • Free Agency│  │                                           │
│  │  • Trades    │  │                                            │
│  │  • Retirements│  │                                           │
│  │  • Contracts │  │                                            │
│  └──────────────┘  │                                            │
│         ▲          ▼                                            │
│         │    ┌──────────────┐                                   │
│         │    │  PRESEASON   │                                   │
│         │    │  ────────────│                                   │
│         │    │  • Set Lineup │                                  │
│         │    │  • Final Cuts │                                  │
│         │    │  • Team Chem  │                                  │
│         │    └──────┬───────┘                                   │
│         │           ▼                                            │
│         │    ┌──────────────┐                                   │
│         │    │   REGULAR    │                                   │
│         │    │   SEASON     │                                   │
│         │    │  ────────────│                                   │
│         │    │  • 82 Games  │                                   │
│         │    │  • Trades OK │                                   │
│         │    │  • Injuries  │                                   │
│         │    │  • FA Signs  │                                   │
│         │    └──────┬───────┘                                   │
│         │           ▼                                            │
│         │    ┌──────────────┐                                   │
│         │    │   PLAYOFFS   │                                   │
│         │    │  ────────────│                                   │
│         │    │  • Top 16    │                                   │
│         │    │  • Best of 7 │                                   │
│         │    │  • Champion  │                                   │
│         │    └──────┬───────┘                                   │
│         │           ▼                                            │
│         │    ┌──────────────┐                                   │
│         │    │   AWARDS     │                                   │
│         │    │  ────────────│                                   │
│         │    │  • MVP, etc  │                                   │
│         │    │  • All-Teams │                                   │
│         └────│  • Records   │                                   │
│              └──────────────┘                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2.3 Progression Systems

### Short-term (Within Season)
- Win/loss record improvement
- Player stat accumulation
- Trade deadline acquisitions
- Playoff push

### Medium-term (1-3 Seasons)
- Player development (rookies becoming stars)
- Draft pick assets maturing
- Building team chemistry
- Competing for championships

### Long-term (3+ Seasons)
- Dynasty building
- Franchise legacy/history
- Hall of Fame careers
- Record breaking

## 2.4 Success Metrics (For Players)

| Goal Type | Examples |
|-----------|----------|
| Competitive | Win championship, make playoffs |
| Building | Develop 3 draft picks into starters |
| Financial | Stay under salary cap while competitive |
| Statistical | Have league MVP on roster |
| Social | Beat your friend in head-to-head |

---

# 3. LEAGUE STRUCTURE

## 3.1 Teams

### 30 Teams - 2 Conferences - 6 Divisions (NBA Structure)

```
┌─────────────────────────────────────────────────────────────────┐
│                     EASTERN CONFERENCE (15 Teams)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ATLANTIC DIVISION          CENTRAL DIVISION        SOUTHEAST    │
│  ─────────────────          ────────────────        ─────────    │
│  New York Titans            Chicago Windigo         Miami Vice   │
│  Boston Shamrocks           Detroit Engines         Atlanta Phoenixes│
│  Philadelphia Founders      Cleveland Cavaliers     Charlotte Hornets│
│  Toronto Huskies            Indiana Racers          Washington Monuments│
│  Brooklyn Bridges           Milwaukee Stags         Orlando Solar│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     WESTERN CONFERENCE (15 Teams)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NORTHWEST DIVISION         PACIFIC DIVISION        SOUTHWEST    │
│  ─────────────────          ────────────────        ─────────    │
│  Denver Altitude            Los Angeles Waves       Dallas Stampede│
│  Minneapolis Freeze         San Francisco Gold      Houston Fuel │
│  Portland Pioneers          Seattle Sasquatch       San Antonio Spurs│
│  Oklahoma Thunder           Phoenix Scorpions       Memphis Blues│
│  Salt Lake Summit           Sacramento Royals       New Orleans Brass│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** All team names are fictional. Full team profiles with colors, arenas, and history are in Appendix B.1.

### Team Data Structure

```typescript
interface Team {
  // Identity
  id: string;                    // UUID
  name: string;                  // "Titans"
  city: string;                  // "New York"
  abbreviation: string;          // "NYT"

  // Visuals
  primaryColor: string;          // Hex code
  secondaryColor: string;        // Hex code
  logo: string;                  // Asset path
  court: string;                 // Court texture path

  // Organization
  conference: 'Eastern' | 'Western';
  division: 'Atlantic' | 'Central' | 'Southeast' | 'Northwest' | 'Pacific' | 'Southwest';
  arena: {
    name: string;
    capacity: number;            // Affects revenue
    atmosphere: number;          // 0-100, home court advantage
  };

  // Management
  owner_id: string;
  gm_id: string;                 // Human or CPU
  coach_id: string;

  // Roster
  players: string[];             // Player IDs
  roster_size: number;           // Current count (max 15)

  // Finances
  salary_cap: number;            // League cap
  current_payroll: number;       // Sum of salaries
  luxury_tax_paid: number;       // This season

  // Season
  wins: number;
  losses: number;
  streak: number;                // Positive = wins, negative = losses

  // Historical
  championships: number;
  playoff_appearances: number;
  all_time_wins: number;
  all_time_losses: number;
}
```

## 3.2 Schedule

### Regular Season: 82 Games (NBA Structure)

Full 82-game schedule following NBA scheduling patterns.

```typescript
interface ScheduleGeneration {
  games_per_team: 82;
  total_league_games: 1230;     // (30 * 82) / 2

  // Schedule breakdown per team:
  schedule_breakdown: {
    division_rivals: 16;        // 4 games each vs 4 division rivals
    conference_non_division: 36; // 3-4 games vs 10 other conference teams
    other_conference: 30;       // 2 games vs 15 other conference teams
  };

  // Home/Away balance
  home_games: 41;
  away_games: 41;

  // Scheduling rules
  rules: {
    no_back_to_back_to_back: true;   // Max 2 games in row
    max_consecutive_road: 6;          // Road trip limit
    min_rest_days: 0;                 // Can play back-to-back
    division_games_spread: true;      // Don't cluster division games
    balanced_home_away_stretch: true; // Balanced road trips
  };
}
```

### Game Days

```typescript
interface GameDay {
  date: Date;
  games: Game[];                 // 4-8 games per day

  // Typical schedule:
  // - 4 games on weekdays
  // - 6-8 games on weekends
}

interface Game {
  id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_time: Date;
  status: 'scheduled' | 'live' | 'final';

  // Results (after played)
  home_score?: number;
  away_score?: number;
  overtime_periods?: number;
  play_by_play?: Play[];
  box_score?: BoxScore;
}
```

## 3.3 Playoffs

### Format: 16-Team Playoffs with Play-In Tournament (NBA Structure)

```
PLAY-IN TOURNAMENT (Per Conference)
─────────────────────────────────────
7th Seed vs 8th Seed → Winner = 7th Seed
9th Seed vs 10th Seed → Loser Eliminated
Loser of 7v8 vs Winner of 9v10 → Winner = 8th Seed

PLAYOFF BRACKET (Best-of-7 Series)
─────────────────────────────────────

                         NBA FINALS
                        ┌──────────┐
              ┌─────────│ Best of 7│─────────┐
              │         └──────────┘         │
       EAST CONF FINALS          WEST CONF FINALS
         ┌──────────┐              ┌──────────┐
       ┌─│ Best of 7│─┐          ┌─│ Best of 7│─┐
       │ └──────────┘ │          │ └──────────┘ │
   EAST SEMIS              WEST SEMIS
   ┌────────┐ ┌────────┐   ┌────────┐ ┌────────┐
 ┌─│ Bo7    │ │ Bo7    │─┐ ┌─│ Bo7    │ │ Bo7    │─┐
 │ └────────┘ └────────┘ │ │ └────────┘ └────────┘ │
 FIRST ROUND                FIRST ROUND
┌──┐ ┌──┐ ┌──┐ ┌──┐     ┌──┐ ┌──┐ ┌──┐ ┌──┐
│E1│ │E4│ │E3│ │E2│     │W1│ │W4│ │W3│ │W2│
│vs│ │vs│ │vs│ │vs│     │vs│ │vs│ │vs│ │vs│
│E8│ │E5│ │E6│ │E7│     │W8│ │W5│ │W6│ │W7│
└──┘ └──┘ └──┘ └──┘     └──┘ └──┘ └──┘ └──┘

Seeding:
- 1-6: Top 6 records in conference (automatic playoff berth)
- 7-8: Determined by Play-In Tournament
- Higher seed always has home court advantage

Tiebreakers:
1. Head-to-head record
2. Division winner
3. Conference record
4. Point differential
5. Points scored
```

### Playoff Settings

```typescript
interface PlayoffSettings {
  format: 'best_of_7';              // All rounds are best-of-7

  // Play-In Tournament
  play_in: {
    enabled: true;
    seeds_7_8_game: true;           // 7 vs 8 for 7th seed
    seeds_9_10_game: true;          // 9 vs 10 (loser eliminated)
    final_game: true;               // Loser 7v8 vs Winner 9v10 for 8th
  };

  // Home court for best-of-7 (2-2-1-1-1 format)
  home_court_advantage: {
    games_1_2: 'higher_seed';
    games_3_4: 'lower_seed';
    game_5: 'higher_seed';
    game_6: 'lower_seed';
    game_7: 'higher_seed';
  };

  // Playoff intensity
  playoff_modifiers: {
    fatigue_rate: 1.2;           // 20% faster fatigue
    injury_rate: 0.8;            // 20% less injuries (stars play through)
    trait_trigger_boost: 1.5;    // Playoff traits more impactful
    home_court_boost: 1.3;       // Home court matters more
  };
}
```

## 3.4 Standings

```typescript
interface Standings {
  conference: {
    Eastern: TeamStanding[];     // 15 teams
    Western: TeamStanding[];     // 15 teams
  };

  division: {
    // Eastern Conference
    Atlantic: TeamStanding[];    // 5 teams
    Central: TeamStanding[];     // 5 teams
    Southeast: TeamStanding[];   // 5 teams
    // Western Conference
    Northwest: TeamStanding[];   // 5 teams
    Pacific: TeamStanding[];     // 5 teams
    Southwest: TeamStanding[];   // 5 teams
  };

  league: TeamStanding[];        // All 30 teams
}

interface TeamStanding {
  team_id: string;
  rank: number;
  wins: number;
  losses: number;
  win_pct: number;
  games_behind: number;

  // Records
  home_record: string;           // "5-2"
  away_record: string;           // "4-4"
  conference_record: string;     // "6-3"
  division_record: string;       // "2-1"
  last_10: string;               // "7-3"
  streak: string;                // "W3" or "L2"

  // Advanced
  point_differential: number;
  points_for_avg: number;
  points_against_avg: number;

  // Clinching
  clinched_playoff: boolean;
  clinched_division: boolean;
  eliminated: boolean;
}
```

---

# 4. PLAYER SYSTEM

## 4.1 Player Identity

```typescript
interface Player {
  // Identity
  id: string;                    // UUID
  first_name: string;
  last_name: string;
  nickname?: string;             // "The Hammer", etc.

  // Physical
  height_inches: number;         // 70-90 (5'10" to 7'6")
  weight_lbs: number;            // 160-300
  wingspan_inches: number;       // Usually height + 0-8

  // Demographics
  age: number;                   // 19-42
  birth_date: Date;
  nationality: string;
  college?: string;              // or "International"
  draft_year?: number;
  draft_pick?: number;
  years_pro: number;

  // Team
  team_id: string | null;        // null = free agent
  jersey_number: number;
  position: Position;
  secondary_position?: Position;

  // Basketball
  archetype: Archetype;
  attributes: PlayerAttributes;
  traits: Trait[];

  // Hidden (not shown to player until scouted)
  hidden: {
    potential: number;           // 0-99, max possible overall
    peak_age: number;            // 24-32
    development_speed: 'slow' | 'normal' | 'fast';
    durability: number;          // 0-99, injury resistance
    personality: PlayerPersonality;
  };

  // Status
  morale: PlayerMorale;
  injury?: Injury;
  contract?: Contract;

  // Stats
  career_stats: CareerStats;
  season_stats: SeasonStats[];

  // Metadata
  created_at: Date;
  updated_at: Date;
}

type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
```

## 4.2 Attributes

### Complete Attribute List (42 DEEP Attributes)

```typescript
interface PlayerAttributes {
  // ═══════════════════════════════════════════════════════════
  // SHOOTING (8 attributes)
  // ═══════════════════════════════════════════════════════════

  close_shot: number;            // 0-99
  // Close range shots (0-5 feet) - hooks, floaters, short shots
  // Affects: Close range FG%, floater success

  layup: number;                 // 0-99
  // Finishing at the rim with layups and finger rolls
  // Affects: Layup FG%, contested layup success

  dunk: number;                  // 0-99
  // Ability to finish with dunks, contact dunks
  // Affects: Dunk success rate, contact dunk frequency

  mid_range: number;             // 0-99
  // Pull-up jumpers, fadeaways, mid-range shots (10-22 feet)
  // Affects: Mid-range FG%, shot selection quality

  three_point: number;           // 0-99
  // Catch-and-shoot 3s, pull-up 3s, corner 3s
  // Affects: 3PT%, range extension

  free_throw: number;            // 0-99
  // Free throw shooting ability
  // Affects: FT%, clutch free throws

  shot_iq: number;               // 0-99
  // When to shoot, shot selection, taking good shots
  // Affects: Shot quality, avoiding bad shots

  offensive_consistency: number; // 0-99
  // Reliability of shot mechanics game to game
  // Affects: Variance in shooting performance

  // ═══════════════════════════════════════════════════════════
  // FINISHING (5 attributes)
  // ═══════════════════════════════════════════════════════════

  driving_layup: number;         // 0-99
  // Finishing at rim when driving to the basket
  // Affects: Drive success, and-1 frequency

  driving_dunk: number;          // 0-99
  // Ability to dunk when attacking the basket
  // Affects: Dunk frequency on drives, poster dunks

  standing_dunk: number;         // 0-99
  // Dunking in the post or from standing position
  // Affects: Put-back dunks, post dunks

  post_control: number;          // 0-99
  // Ability to back down defenders and create space
  // Affects: Post move success, positioning

  draw_foul: number;             // 0-99
  // Getting to the free throw line, selling contact
  // Affects: Free throw attempts, and-1 frequency

  // ═══════════════════════════════════════════════════════════
  // PLAYMAKING (6 attributes)
  // ═══════════════════════════════════════════════════════════

  ball_handling: number;         // 0-99
  // Dribbling, crossovers, protecting the ball
  // Affects: Turnover rate, ability to create own shot

  speed_with_ball: number;       // 0-99
  // How fast you move while dribbling
  // Affects: Fast break efficiency, drive speed

  pass_accuracy: number;         // 0-99
  // Precision on all types of passes
  // Affects: Turnover rate on passes, successful passes

  pass_vision: number;           // 0-99
  // Seeing open teammates, threading needles
  // Affects: Finding open shooters, difficult assist opportunities

  pass_iq: number;               // 0-99
  // When to pass vs shoot, reading the defense
  // Affects: Assist quality, turnover reduction

  offensive_iq: number;          // 0-99
  // Shot selection, positioning, reading defenses
  // Affects: Shot quality, cutting, offensive positioning

  // ═══════════════════════════════════════════════════════════
  // DEFENSE (8 attributes)
  // ═══════════════════════════════════════════════════════════

  interior_defense: number;      // 0-99
  // Contesting at rim, post defense, help defense inside
  // Affects: Opponent inside FG%, post defense success

  perimeter_defense: number;     // 0-99
  // On-ball defense, staying in front, contesting jumpers
  // Affects: Opponent jump shot %, blow-by rate

  steal: number;                 // 0-99
  // Active hands, passing lane anticipation
  // Affects: Steal rate, deflections

  block: number;                 // 0-99
  // Shot blocking timing, verticality, weak-side help
  // Affects: Block rate, altered shots

  defensive_iq: number;          // 0-99
  // Rotations, help defense, knowing when to gamble
  // Affects: Team defense, help quality, foul rate

  lateral_quickness: number;     // 0-99
  // Side-to-side movement speed on defense
  // Affects: Staying in front, defending drives

  help_defense_iq: number;       // 0-99
  // Knowing when and how to rotate/help
  // Affects: Team defensive rating, rotations

  defensive_consistency: number; // 0-99
  // Focus and effort on every defensive possession
  // Affects: Variance in defensive performance

  // ═══════════════════════════════════════════════════════════
  // REBOUNDING (4 attributes)
  // ═══════════════════════════════════════════════════════════

  offensive_rebound: number;     // 0-99
  // Crashing the offensive glass
  // Affects: OREB rate, second chance points

  defensive_rebound: number;     // 0-99
  // Securing defensive rebounds
  // Affects: DREB rate, ending possessions

  box_out: number;               // 0-99
  // Positioning for rebounds, sealing out opponents
  // Affects: Contested rebound success

  rebound_timing: number;        // 0-99
  // When to jump, reading ball trajectory
  // Affects: 50/50 ball success, tip-ins

  // ═══════════════════════════════════════════════════════════
  // PHYSICAL (6 attributes)
  // ═══════════════════════════════════════════════════════════

  speed: number;                 // 0-99
  // Top running speed without the ball
  // Affects: Transition offense/defense, closeout speed

  acceleration: number;          // 0-99
  // First step quickness, burst
  // Affects: Blow-by rate, recovery speed

  strength: number;              // 0-99
  // Physical power, holding position
  // Affects: Post defense, finishing through contact

  vertical: number;              // 0-99
  // Jumping ability
  // Affects: Dunks, rebounds, blocks, alley-oops

  stamina: number;               // 0-99
  // Endurance, resistance to fatigue
  // Affects: Minutes capacity, late-game performance

  hustle: number;                // 0-99
  // Effort on loose balls, diving, extra effort plays
  // Affects: 50/50 balls, offensive rebounds, deflections

  // ═══════════════════════════════════════════════════════════
  // MENTAL/INTANGIBLES (5 attributes) - THE GAME CHANGERS
  // ═══════════════════════════════════════════════════════════

  clutch: number;                // 0-99 ★ CRITICAL
  // Performance under pressure, big moments
  // 50 = neutral, >75 = ice in veins, <40 = chokes
  // Affects: Stats in final 2 min of close games, playoffs, FTs

  aggression: number;            // 0-99 ★ CRITICAL
  // How hard they attack, physicality, forcing action
  // HIGH (75+): More drives, shots, FTAs, but more fouls
  // LOW (25-): More passive, picks spots, efficient but fewer attempts
  // Affects: Shot attempts, foul rate, FTA, finishing through contact

  streakiness: number;           // 0-99 ★ CRITICAL ("RANDOMLY HOT")
  // Tendency to get hot or cold during games
  // HIGH (80+): Can catch fire (+20% shooting) OR go ice cold
  // LOW (30-): Steady eddie, predictable output, no hot streaks
  // MID (50): Normal variance
  // Affects: Hot/cold streak frequency and magnitude

  composure: number;             // 0-99
  // Staying calm under pressure, hostile environments
  // Affects: Road game performance, performance when down big

  work_ethic: number;            // 0-99
  // Practice habits, dedication to improvement
  // Affects: Development speed, attribute improvement in offseason
}

// ═══════════════════════════════════════════════════════════════
// HIDDEN ATTRIBUTES (Not shown to user, revealed by scouting)
// ═══════════════════════════════════════════════════════════════

interface HiddenAttributes {
  potential: number;             // 40-99
  // Maximum overall rating player can reach

  peak_age: number;              // 24-33
  // Age when player hits their potential

  durability: number;            // 40-99
  // Injury resistance (LOW = injury prone)

  coachability: number;          // 40-99
  // Response to coaching, learning speed

  greed: number;                 // 0-100
  // Contract demands (HIGH = always wants max)

  ego: number;                   // 0-100
  // Demands touches (HIGH = unhappy in reduced role)

  loyalty: number;               // 0-100
  // Likelihood to re-sign (HIGH = discount to stay)

  leadership: number;            // 0-100
  // Locker room impact, mentoring young players

  motor: number;                 // 40-99
  // Effort level every possession (HIGH = never coasts)
}
```

### THE "RANDOMLY HOT" SYSTEM (Streakiness)

```typescript
// The Streakiness attribute determines how often players "catch fire"

interface HotColdState {
  current_state: 'ice_cold' | 'cold' | 'normal' | 'warm' | 'hot' | 'on_fire';
  consecutive_makes: number;
  consecutive_misses: number;
  modifier: number;  // Applied to all shooting
}

const STATE_MODIFIERS = {
  'ice_cold':  -0.20,  // -20% to all shooting
  'cold':      -0.10,  // -10% to all shooting
  'normal':     0.00,  // No modifier
  'warm':      +0.08,  // +8% to all shooting
  'hot':       +0.15,  // +15% to all shooting
  'on_fire':   +0.25   // +25% to all shooting - UNSTOPPABLE
};

function updateHotColdState(
  player: Player,
  shotMade: boolean,
  currentState: HotColdState
): HotColdState {
  const streakiness = player.attributes.streakiness;

  // High streakiness = gets hot faster, but also cold faster
  // Low streakiness = almost never changes state

  if (streakiness < 30) {
    // Low streakiness players stay in 'normal' state 95% of the time
    return { ...currentState, current_state: 'normal', modifier: 0 };
  }

  if (shotMade) {
    const newMakes = currentState.consecutive_makes + 1;

    // Threshold to get hot depends on streakiness
    // 90 streakiness = 2 makes to get warm, 3 hot, 4 on_fire
    // 60 streakiness = 3 makes to get warm, 4 hot, 5 on_fire
    const baseThreshold = Math.max(2, 5 - Math.floor(streakiness / 25));

    if (newMakes >= baseThreshold + 2 && streakiness >= 75) {
      return {
        current_state: 'on_fire',
        consecutive_makes: newMakes,
        consecutive_misses: 0,
        modifier: STATE_MODIFIERS['on_fire']
      };
    } else if (newMakes >= baseThreshold + 1 && streakiness >= 60) {
      return {
        current_state: 'hot',
        consecutive_makes: newMakes,
        consecutive_misses: 0,
        modifier: STATE_MODIFIERS['hot']
      };
    } else if (newMakes >= baseThreshold) {
      return {
        current_state: 'warm',
        consecutive_makes: newMakes,
        consecutive_misses: 0,
        modifier: STATE_MODIFIERS['warm']
      };
    }

    return { ...currentState, consecutive_makes: newMakes, consecutive_misses: 0 };

  } else {
    // Miss - check for going cold
    const newMisses = currentState.consecutive_misses + 1;
    const coldThreshold = Math.max(2, 5 - Math.floor(streakiness / 25));

    // Reset hot state on any miss (unless very low streakiness)
    if (currentState.current_state !== 'normal' && streakiness >= 40) {
      // Hot players cool down on misses
      if (currentState.current_state === 'on_fire') {
        return { current_state: 'hot', consecutive_makes: 0, consecutive_misses: 1, modifier: STATE_MODIFIERS['hot'] };
      } else if (currentState.current_state === 'hot') {
        return { current_state: 'warm', consecutive_makes: 0, consecutive_misses: 1, modifier: STATE_MODIFIERS['warm'] };
      } else {
        return { current_state: 'normal', consecutive_makes: 0, consecutive_misses: 1, modifier: 0 };
      }
    }

    // Check for going cold
    if (newMisses >= coldThreshold + 1 && streakiness >= 60) {
      return {
        current_state: 'ice_cold',
        consecutive_makes: 0,
        consecutive_misses: newMisses,
        modifier: STATE_MODIFIERS['ice_cold']
      };
    } else if (newMisses >= coldThreshold && streakiness >= 50) {
      return {
        current_state: 'cold',
        consecutive_makes: 0,
        consecutive_misses: newMisses,
        modifier: STATE_MODIFIERS['cold']
      };
    }

    return { ...currentState, consecutive_makes: 0, consecutive_misses: newMisses };
  }
}

// PLAYER EXAMPLES:
//
// Streakiness 90 "Human Torch"
// - Gets 'warm' after just 2 makes
// - Gets 'hot' after 3 makes (+15%)
// - Gets 'on_fire' after 4 makes (+25% - practically automatic)
// - BUT goes 'cold' after 2 misses
// - Can single-handedly win OR lose a game
// - Best used: Let them shoot when hot, bench when cold
//
// Streakiness 50 "Average Joe"
// - Gets 'warm' after 3 makes
// - Gets 'hot' after 4 makes (rare)
// - Goes 'cold' after 3 misses
// - Normal game-to-game variance
//
// Streakiness 25 "The Machine"
// - Almost NEVER gets hot or cold
// - Steady, predictable output every game
// - You know exactly what you're getting
// - Best for: Consistent role players, closers who won't go cold
```

### AGGRESSION SYSTEM

```typescript
// Aggression determines playstyle and risk-taking

interface AggressionProfile {
  shot_frequency: number;      // How often they shoot vs pass
  drive_frequency: number;     // How often they attack the rim
  foul_drawing: number;        // FTA generation
  foul_committing: number;     // Personal fouls committed
  contested_shot_tendency: number;  // Takes hard shots
}

function getAggressionProfile(aggression: number): AggressionProfile {
  // HIGH Aggression (75+): "Mamba Mentality"
  // - Takes lots of shots, often contested
  // - Attacks the basket relentlessly
  // - Gets to the line a lot
  // - Commits more fouls trying to stop others
  // - Can be inefficient but gets buckets when needed

  // LOW Aggression (25-): "The Facilitator"
  // - Defers to teammates
  // - Only shoots wide open looks
  // - Rarely drives into contact
  // - Very few fouls (but also few FTAs)
  // - More efficient but can disappear in games

  const normalized = aggression / 100;

  return {
    shot_frequency: 0.3 + (normalized * 0.5),        // 0.3-0.8
    drive_frequency: 0.2 + (normalized * 0.5),       // 0.2-0.7
    foul_drawing: 0.5 + (normalized * 0.6),          // 0.5-1.1x
    foul_committing: 0.7 + (normalized * 0.5),       // 0.7-1.2x
    contested_shot_tendency: 0.2 + (normalized * 0.5) // 0.2-0.7
  };
}

// Usage in simulation:
function decideAction(player: Player, context: PossessionContext): Action {
  const aggProfile = getAggressionProfile(player.attributes.aggression);

  // More aggressive players more likely to shoot
  const shootChance = calculateShootChance(player, context) * aggProfile.shot_frequency;

  // More aggressive players more likely to drive vs pull up
  const driveChance = calculateDriveChance(player, context) * aggProfile.drive_frequency;

  // ...
}
```

### CLUTCH SYSTEM

```typescript
// Clutch is the most important mental attribute

interface ClutchContext {
  is_clutch: boolean;
  intensity: number;  // 0.0 to 1.0
  situation: 'normal' | 'close_game' | 'final_minute' | 'final_seconds' | 'game_winner';
}

function getClutchContext(game: GameState): ClutchContext {
  const { quarter, clock, scoreDiff, isPlayoffs } = game;

  // Not clutch if blowout
  if (Math.abs(scoreDiff) > 15) {
    return { is_clutch: false, intensity: 0, situation: 'normal' };
  }

  // Must be Q4+ and close
  if (quarter < 4 || Math.abs(scoreDiff) > 10) {
    return { is_clutch: false, intensity: 0, situation: 'normal' };
  }

  let intensity = 0.3;
  let situation: ClutchContext['situation'] = 'close_game';

  // Last 5 minutes of close game
  if (clock <= 300 && Math.abs(scoreDiff) <= 8) {
    intensity = 0.5;
    situation = 'close_game';
  }

  // Final minute
  if (clock <= 60 && Math.abs(scoreDiff) <= 5) {
    intensity = 0.75;
    situation = 'final_minute';
  }

  // Final 10 seconds
  if (clock <= 10 && Math.abs(scoreDiff) <= 3) {
    intensity = 0.95;
    situation = 'final_seconds';
  }

  // Potential game winner
  if (clock <= 5 && (scoreDiff === 0 || scoreDiff === -1 || scoreDiff === -2)) {
    intensity = 1.0;
    situation = 'game_winner';
  }

  // Playoffs multiplier
  if (isPlayoffs) {
    intensity = Math.min(1.0, intensity * 1.3);
  }

  return { is_clutch: true, intensity, situation };
}

function applyClutchModifier(
  player: Player,
  baseValue: number,
  clutchContext: ClutchContext
): number {
  if (!clutchContext.is_clutch) return baseValue;

  const clutch = player.attributes.clutch;

  // Clutch 50 = neutral (no change)
  // Clutch 90 = big bonus in clutch
  // Clutch 20 = big penalty in clutch

  const deviation = (clutch - 50) / 50;  // -1.0 to +1.0
  const scaledImpact = deviation * clutchContext.intensity * 0.25;  // Up to ±25%

  return baseValue * (1 + scaledImpact);
}

// CLUTCH RATINGS:
//
// 90+ "Ice In Veins"
// - +22% to everything in final minute
// - Wants the ball in crunch time
// - Never misses clutch FTs
// - Makes game-winners routinely
//
// 70-89 "Big Game Player"
// - +10-15% boost in clutch
// - Reliable in big moments
// - Will take the big shot
//
// 45-55 "Average"
// - No change in clutch
// - Neither rises nor falls
//
// 25-44 "Nervous"
// - -10-15% in clutch
// - Should pass to better option
// - Might throw it away
//
// <25 "The Choker"
// - -20%+ in clutch situations
// - Ball should be OUT of their hands
// - Will miss crucial FTs
// - Turns it over in key moments
```

### Attribute Impact Formulas

```typescript
// Example: Three-Point Shot Success
function calculate3ptSuccess(
  shooter: Player,
  defender: Player,
  context: ShotContext
): number {
  // Base percentage from attribute (max ~45% for 99 rating)
  let basePct = (shooter.attributes.three_point / 99) * 0.45;

  // Defender contest (reduces by up to 15%)
  const contestLevel = calculateContest(defender, context);
  basePct *= (1 - contestLevel * 0.15);

  // Shot difficulty modifier
  const difficultyMod = getShotDifficulty(context);
  basePct *= difficultyMod;

  // Fatigue penalty (up to -10%)
  const fatiguePenalty = (1 - shooter.currentFatigue) * 0.1;
  basePct *= (1 - fatiguePenalty);

  // Trait modifiers
  basePct *= getTraitModifiers(shooter, 'three_point', context);

  // Clutch modifier (if applicable)
  if (context.isClutch) {
    const clutchMod = shooter.attributes.clutch / 100;
    basePct *= (0.9 + clutchMod * 0.2); // 0.9x to 1.1x
  }

  // Consistency variance
  const variance = (100 - shooter.attributes.consistency) / 200;
  basePct *= randomInRange(1 - variance, 1 + variance);

  return clamp(basePct, 0.05, 0.65); // Min 5%, max 65%
}
```

### Overall Rating Calculation

```typescript
function calculateOverall(player: Player): number {
  const pos = player.position;
  const attrs = player.attributes;

  // Position-specific weights
  const weights = POSITION_WEIGHTS[pos];

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [attr, value] of Object.entries(attrs)) {
    const weight = weights[attr] || 1.0;
    weightedSum += value * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

const POSITION_WEIGHTS = {
  PG: {
    ball_handling: 1.8,
    passing: 1.6,
    three_point: 1.3,
    speed: 1.4,
    perimeter_defense: 1.2,
    offensive_iq: 1.3,
    // Lower weights for big man stats
    inside_scoring: 0.7,
    block: 0.5,
    interior_defense: 0.6,
    strength: 0.7
  },
  SG: {
    three_point: 1.6,
    mid_range: 1.4,
    ball_handling: 1.2,
    perimeter_defense: 1.3,
    speed: 1.2,
    // Lower
    block: 0.5,
    interior_defense: 0.6,
    passing: 0.9
  },
  SF: {
    three_point: 1.3,
    mid_range: 1.2,
    inside_scoring: 1.1,
    perimeter_defense: 1.3,
    strength: 1.1,
    vertical: 1.1
  },
  PF: {
    inside_scoring: 1.5,
    interior_defense: 1.4,
    strength: 1.4,
    vertical: 1.2,
    block: 1.2,
    // Lower
    ball_handling: 0.6,
    three_point: 0.8
  },
  C: {
    inside_scoring: 1.6,
    interior_defense: 1.6,
    block: 1.5,
    strength: 1.5,
    vertical: 1.2,
    // Lower
    ball_handling: 0.4,
    three_point: 0.6,
    speed: 0.7,
    perimeter_defense: 0.6
  }
};
```

## 4.3 Archetypes

### Complete Archetype Definitions

```typescript
interface Archetype {
  id: string;
  name: string;
  description: string;
  positions: Position[];

  // Attribute generation ranges
  attributeRanges: {
    high: string[];      // 75-95 base range
    medium: string[];    // 55-75 base range
    low: string[];       // 35-55 base range
  };

  // Common traits for this archetype
  commonTraits: string[];

  // Playstyle tendencies
  tendencies: {
    shot_selection: 'inside' | 'mid_range' | 'three_point' | 'balanced';
    aggression: 'passive' | 'normal' | 'aggressive';
    help_defense: 'stay_home' | 'balanced' | 'aggressive_help';
  };
}

const ARCHETYPES: Archetype[] = [
  // ═══════════════════════════════════════════════════════════
  // GUARDS (PG/SG)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'floor_general',
    name: 'Floor General',
    description: 'Elite playmaker who controls the offense and makes everyone better',
    positions: ['PG'],
    attributeRanges: {
      high: ['passing', 'ball_handling', 'offensive_iq', 'defensive_iq'],
      medium: ['three_point', 'mid_range', 'speed', 'perimeter_defense'],
      low: ['inside_scoring', 'block', 'strength', 'vertical']
    },
    commonTraits: ['Floor General', 'Dimer', 'Needle Threader', 'Pick & Roll Maestro'],
    tendencies: {
      shot_selection: 'balanced',
      aggression: 'passive',
      help_defense: 'balanced'
    }
  },

  {
    id: 'scoring_pg',
    name: 'Scoring Point Guard',
    description: 'Score-first point guard who can create their own shot',
    positions: ['PG', 'SG'],
    attributeRanges: {
      high: ['ball_handling', 'three_point', 'mid_range', 'speed'],
      medium: ['passing', 'inside_scoring', 'offensive_iq', 'acceleration'],
      low: ['block', 'interior_defense', 'strength']
    },
    commonTraits: ['Pull-Up Shooter', 'Ankle Breaker', 'Clutch Performer'],
    tendencies: {
      shot_selection: 'three_point',
      aggression: 'aggressive',
      help_defense: 'stay_home'
    }
  },

  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Deadly perimeter shooter who stretches the defense',
    positions: ['SG', 'SF'],
    attributeRanges: {
      high: ['three_point', 'mid_range', 'free_throw', 'offensive_iq'],
      medium: ['perimeter_defense', 'stamina', 'basketball_iq'],
      low: ['inside_scoring', 'ball_handling', 'strength', 'block']
    },
    commonTraits: ['Sharpshooter', 'Deep Range', 'Cold Blooded', 'Free Throw Ace'],
    tendencies: {
      shot_selection: 'three_point',
      aggression: 'passive',
      help_defense: 'stay_home'
    }
  },

  {
    id: 'slasher',
    name: 'Slasher',
    description: 'Athletic finisher who attacks the basket relentlessly',
    positions: ['SG', 'SF'],
    attributeRanges: {
      high: ['inside_scoring', 'speed', 'acceleration', 'vertical'],
      medium: ['ball_handling', 'free_throw', 'stamina', 'strength'],
      low: ['three_point', 'mid_range', 'passing']
    },
    commonTraits: ['Slasher', 'Posterizer', 'Acrobat', 'Contact Finisher'],
    tendencies: {
      shot_selection: 'inside',
      aggression: 'aggressive',
      help_defense: 'aggressive_help'
    }
  },

  {
    id: 'combo_guard',
    name: 'Combo Guard',
    description: 'Versatile guard who can play either backcourt position',
    positions: ['PG', 'SG'],
    attributeRanges: {
      high: ['ball_handling', 'mid_range', 'speed', 'perimeter_defense'],
      medium: ['three_point', 'passing', 'inside_scoring', 'steal'],
      low: ['block', 'interior_defense', 'strength']
    },
    commonTraits: ['Versatile', 'Motor', 'Two-Way Player'],
    tendencies: {
      shot_selection: 'balanced',
      aggression: 'normal',
      help_defense: 'balanced'
    }
  },

  {
    id: 'lockdown_defender',
    name: 'Lockdown Defender',
    description: 'Elite perimeter defender who shuts down opposing scorers',
    positions: ['PG', 'SG', 'SF'],
    attributeRanges: {
      high: ['perimeter_defense', 'steal', 'defensive_iq', 'speed'],
      medium: ['acceleration', 'stamina', 'strength', 'basketball_iq'],
      low: ['three_point', 'mid_range', 'passing', 'inside_scoring']
    },
    commonTraits: ['Clamps', 'Interceptor', 'Pick Pocket', 'Tireless Defender'],
    tendencies: {
      shot_selection: 'balanced',
      aggression: 'normal',
      help_defense: 'aggressive_help'
    }
  },

  // ═══════════════════════════════════════════════════════════
  // WINGS (SF/PF)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'two_way_wing',
    name: 'Two-Way Wing',
    description: 'Complete player who contributes on both ends',
    positions: ['SF', 'PF'],
    attributeRanges: {
      high: ['perimeter_defense', 'three_point', 'defensive_iq'],
      medium: ['mid_range', 'inside_scoring', 'steal', 'strength', 'speed'],
      low: ['ball_handling', 'passing', 'block']
    },
    commonTraits: ['3-and-D', 'Versatile', 'High Motor'],
    tendencies: {
      shot_selection: 'three_point',
      aggression: 'normal',
      help_defense: 'aggressive_help'
    }
  },

  {
    id: 'scoring_machine',
    name: 'Scoring Machine',
    description: 'Pure scorer who can get buckets from anywhere',
    positions: ['SG', 'SF'],
    attributeRanges: {
      high: ['inside_scoring', 'mid_range', 'three_point', 'free_throw'],
      medium: ['ball_handling', 'offensive_iq', 'vertical', 'clutch'],
      low: ['perimeter_defense', 'interior_defense', 'passing', 'defensive_iq']
    },
    commonTraits: ['Volume Scorer', 'Clutch Performer', 'Shot Creator'],
    tendencies: {
      shot_selection: 'balanced',
      aggression: 'aggressive',
      help_defense: 'stay_home'
    }
  },

  {
    id: 'athletic_freak',
    name: 'Athletic Freak',
    description: 'Physically dominant player who overwhelms opponents',
    positions: ['SF', 'PF', 'C'],
    attributeRanges: {
      high: ['speed', 'acceleration', 'vertical', 'strength', 'stamina'],
      medium: ['inside_scoring', 'block', 'interior_defense'],
      low: ['three_point', 'mid_range', 'passing', 'ball_handling']
    },
    commonTraits: ['Athletic Freak', 'Posterizer', 'Chase Down Artist', 'Motor'],
    tendencies: {
      shot_selection: 'inside',
      aggression: 'aggressive',
      help_defense: 'aggressive_help'
    }
  },

  {
    id: 'playmaking_forward',
    name: 'Playmaking Forward',
    description: 'Point-forward who initiates offense from the wing',
    positions: ['SF', 'PF'],
    attributeRanges: {
      high: ['passing', 'ball_handling', 'offensive_iq', 'basketball_iq'],
      medium: ['three_point', 'inside_scoring', 'perimeter_defense'],
      low: ['block', 'interior_defense', 'strength']
    },
    commonTraits: ['Floor General', 'Dimer', 'Versatile'],
    tendencies: {
      shot_selection: 'balanced',
      aggression: 'passive',
      help_defense: 'balanced'
    }
  },

  // ═══════════════════════════════════════════════════════════
  // BIGS (PF/C)
  // ═══════════════════════════════════════════════════════════

  {
    id: 'stretch_big',
    name: 'Stretch Big',
    description: 'Floor-spacing big who can shoot from distance',
    positions: ['PF', 'C'],
    attributeRanges: {
      high: ['three_point', 'mid_range', 'free_throw'],
      medium: ['interior_defense', 'strength', 'basketball_iq', 'defensive_iq'],
      low: ['inside_scoring', 'block', 'speed', 'ball_handling']
    },
    commonTraits: ['Stretch Big', 'Sharpshooter', 'Floor Spacer'],
    tendencies: {
      shot_selection: 'three_point',
      aggression: 'passive',
      help_defense: 'stay_home'
    }
  },

  {
    id: 'rim_protector',
    name: 'Rim Protector',
    description: 'Defensive anchor who protects the paint',
    positions: ['PF', 'C'],
    attributeRanges: {
      high: ['block', 'interior_defense', 'defensive_iq', 'strength'],
      medium: ['vertical', 'inside_scoring', 'stamina'],
      low: ['three_point', 'ball_handling', 'speed', 'perimeter_defense']
    },
    commonTraits: ['Rim Protector', 'Intimidator', 'Anchor'],
    tendencies: {
      shot_selection: 'inside',
      aggression: 'normal',
      help_defense: 'aggressive_help'
    }
  },

  {
    id: 'post_scorer',
    name: 'Post Scorer',
    description: 'Back-to-basket scorer with polished post moves',
    positions: ['PF', 'C'],
    attributeRanges: {
      high: ['inside_scoring', 'strength', 'free_throw', 'offensive_iq'],
      medium: ['interior_defense', 'vertical', 'mid_range'],
      low: ['three_point', 'speed', 'ball_handling', 'perimeter_defense']
    },
    commonTraits: ['Post Scorer', 'Drop-Stepper', 'Dream Shake'],
    tendencies: {
      shot_selection: 'inside',
      aggression: 'aggressive',
      help_defense: 'stay_home'
    }
  },

  {
    id: 'glass_cleaner',
    name: 'Glass Cleaner',
    description: 'Dominant rebounder who controls the boards',
    positions: ['PF', 'C'],
    attributeRanges: {
      high: ['vertical', 'strength', 'interior_defense', 'stamina'],
      medium: ['inside_scoring', 'block', 'defensive_iq'],
      low: ['three_point', 'ball_handling', 'passing', 'speed']
    },
    commonTraits: ['Glass Cleaner', 'Relentless', 'Box Out King'],
    tendencies: {
      shot_selection: 'inside',
      aggression: 'aggressive',
      help_defense: 'stay_home'
    }
  },

  {
    id: 'paint_beast',
    name: 'Paint Beast',
    description: 'Dominant two-way force in the paint',
    positions: ['C'],
    attributeRanges: {
      high: ['inside_scoring', 'interior_defense', 'block', 'strength'],
      medium: ['vertical', 'defensive_iq', 'stamina'],
      low: ['three_point', 'mid_range', 'ball_handling', 'speed', 'perimeter_defense']
    },
    commonTraits: ['Paint Beast', 'Rim Protector', 'Posterizer'],
    tendencies: {
      shot_selection: 'inside',
      aggression: 'aggressive',
      help_defense: 'aggressive_help'
    }
  }
];
```

### Archetype Synergies

```typescript
interface TeamSynergy {
  name: string;
  description: string;
  required_archetypes: string[];
  min_count: number;
  effect: SynergyEffect;
}

const TEAM_SYNERGIES: TeamSynergy[] = [
  // ═══════════════════════════════════════════════════════════
  // POSITIVE SYNERGIES
  // ═══════════════════════════════════════════════════════════

  {
    name: 'Pace & Space',
    description: 'Floor General feeding shooters creates open looks',
    required_archetypes: ['floor_general'],
    min_count: 1,
    effect: {
      condition: 'team_has_3+_shooters', // sharpshooter, stretch_big, etc.
      bonus: {
        three_point_pct: +0.05,          // +5% 3PT for shooters
        assist_rate: +0.10               // +10% assist rate
      }
    }
  },

  {
    name: 'Defensive Wall',
    description: 'Rim Protector anchors elite perimeter defenders',
    required_archetypes: ['rim_protector', 'lockdown_defender'],
    min_count: 2,
    effect: {
      condition: 'both_on_court',
      bonus: {
        opponent_fg_pct: -0.05,          // Opponents -5% FG%
        team_def_rating: +3              // +3 defensive rating
      }
    }
  },

  {
    name: 'Lob City',
    description: 'Playmaker + Athletes = Highlight dunks',
    required_archetypes: ['floor_general', 'athletic_freak'],
    min_count: 2,
    effect: {
      condition: 'both_on_court',
      bonus: {
        alley_oop_rate: +0.25,           // +25% alley-oop attempts
        alley_oop_success: +0.15         // +15% success rate
      }
    }
  },

  {
    name: 'Spacing Nightmare',
    description: 'Multiple floor spacers create driving lanes',
    required_archetypes: ['sharpshooter', 'stretch_big'],
    min_count: 3,
    effect: {
      condition: '3+_on_court',
      bonus: {
        inside_scoring: +0.08,           // +8% inside FG for slashers
        driving_frequency: +0.15         // +15% drive attempts
      }
    }
  },

  {
    name: 'Inside-Out',
    description: 'Post presence opens perimeter looks on kick-outs',
    required_archetypes: ['post_scorer'],
    min_count: 1,
    effect: {
      condition: 'post_double_team',
      bonus: {
        corner_three_pct: +0.08,         // +8% corner 3 on kick-out
        open_shot_frequency: +0.20       // +20% open looks
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // ANTI-SYNERGIES (NEGATIVE)
  // ═══════════════════════════════════════════════════════════

  {
    name: 'Ball Hog Central',
    description: 'Too many ball-dominant players hurt ball movement',
    required_archetypes: ['scoring_pg', 'scoring_machine', 'slasher'],
    min_count: 3,
    effect: {
      condition: '3+_ball_dominant',
      penalty: {
        assist_rate: -0.15,              // -15% assists
        turnover_rate: +0.10,            // +10% turnovers
        team_chemistry: -5               // Chemistry penalty
      }
    }
  },

  {
    name: 'No Rim Protection',
    description: 'Without a rim protector, opponents feast inside',
    required_archetypes: [],
    min_count: 0,
    effect: {
      condition: 'no_rim_protector_or_paint_beast',
      penalty: {
        opponent_inside_fg: +0.15,       // +15% opponent inside FG
        opponent_drive_rate: +0.20       // +20% more drives
      }
    }
  },

  {
    name: 'No Floor Spacing',
    description: 'Without shooters, defense clogs the paint',
    required_archetypes: [],
    min_count: 0,
    effect: {
      condition: 'no_shooters_above_75_3pt',
      penalty: {
        inside_scoring: -0.10,           // -10% inside FG
        driving_frequency: -0.15         // -15% drives (no space)
      }
    }
  },

  {
    name: 'No Playmaker',
    description: 'Without a distributor, offense becomes stagnant',
    required_archetypes: [],
    min_count: 0,
    effect: {
      condition: 'no_floor_general_or_playmaking_forward',
      penalty: {
        assist_rate: -0.15,
        turnover_rate: +0.08,
        offensive_rating: -4
      }
    }
  }
];
```

## 4.4 Traits (NBA 2K-Style Badge System)

### Badge Tiers (Like NBA 2K)

Every trait/badge has 4 tiers with increasing power:

```
TIER         MULTIPLIER   DESCRIPTION
───────────────────────────────────────────────────────────
Bronze       0.5x         Basic version of the badge
Silver       0.75x        Noticeable improvement
Gold         1.0x         Full badge effect
Hall of Fame 1.5x         Elite, dominant version
───────────────────────────────────────────────────────────
```

Players earn badges at different tiers:
- **Stars (85+)**: Can have HOF badges in their specialty
- **Starters (75-84)**: Usually Gold badges at best
- **Role Players (65-74)**: Silver/Bronze badges
- **Bench (55-64)**: Mostly Bronze or none

### Complete Trait Interface

```typescript
interface Trait {
  id: string;
  name: string;
  description: string;
  category: 'shooting' | 'finishing' | 'playmaking' | 'defense' | 'rebounding' | 'mental' | 'negative';

  // Badge tier - determines effect multiplier
  tier: 'bronze' | 'silver' | 'gold' | 'hall_of_fame';

  // When does this trait activate?
  trigger: TraitTrigger;

  // What does it do at Gold tier? (multiplied by tier)
  effects: TraitEffect[];

  // Which archetypes commonly have this?
  common_archetypes: string[];

  // Can this badge be upgraded through gameplay?
  upgradeable: boolean;

  // Requirements to unlock/upgrade
  unlock_requirements?: BadgeRequirements;
}

interface BadgeRequirements {
  // Stats needed to unlock
  stat_thresholds?: {
    stat: string;
    value: number;
    games: number;  // Over how many games
  }[];

  // Actions needed
  action_counts?: {
    action: string;
    count: number;
  }[];

  // Attribute minimums
  attribute_minimums?: {
    attribute: string;
    value: number;
  }[];
}

const TIER_MULTIPLIERS = {
  'bronze': 0.5,
  'silver': 0.75,
  'gold': 1.0,
  'hall_of_fame': 1.5
};

function applyTraitEffect(trait: Trait, baseValue: number): number {
  const multiplier = TIER_MULTIPLIERS[trait.tier];

  for (const effect of trait.effects) {
    const scaledMod = effect.modifier * multiplier;

    if (effect.type === 'add') {
      baseValue += scaledMod;
    } else {
      baseValue *= (1 + scaledMod);
    }
  }

  return baseValue;
}

// Example: Sharpshooter badge
// Bronze: +7.5% catch-and-shoot 3PT
// Silver: +11.25% catch-and-shoot 3PT
// Gold: +15% catch-and-shoot 3PT
// HOF: +22.5% catch-and-shoot 3PT
```

interface TraitTrigger {
  type: 'always' | 'conditional' | 'clutch' | 'playoff' | 'streak';
  conditions?: {
    time_remaining?: number;           // Seconds left in game
    score_margin?: number;             // Point differential
    quarter?: number[];                // Which quarters
    is_playoff?: boolean;
    hot_streak?: number;               // Made shots in a row
    cold_streak?: number;              // Missed shots in a row
    fatigue_below?: number;            // Fatigue threshold
    home?: boolean;
    away?: boolean;
  };
}

interface TraitEffect {
  stat: string;
  modifier: number;                    // Percentage change
  type: 'add' | 'multiply';
}

// ═══════════════════════════════════════════════════════════════
// SHOOTING TRAITS
// ═══════════════════════════════════════════════════════════════

const SHOOTING_TRAITS: Trait[] = [
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Elite catch-and-shoot ability from three',
    category: 'shooting',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'catch_and_shoot_3pt', modifier: 0.15, type: 'add' }
    ],
    common_archetypes: ['sharpshooter', 'stretch_big', 'two_way_wing']
  },

  {
    id: 'deep_range',
    name: 'Deep Range',
    description: 'Can hit shots from well beyond the arc (28+ feet)',
    category: 'shooting',
    rarity: 'rare',
    trigger: { type: 'always' },
    effects: [
      { stat: 'deep_three_range', modifier: 5, type: 'add' },   // Extra 5 feet range
      { stat: 'deep_three_pct', modifier: 0.10, type: 'add' }
    ],
    common_archetypes: ['sharpshooter', 'scoring_pg']
  },

  {
    id: 'pull_up_shooter',
    name: 'Pull-Up Shooter',
    description: 'Deadly off-the-dribble jumper',
    category: 'shooting',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'pull_up_mid', modifier: 0.12, type: 'add' },
      { stat: 'pull_up_three', modifier: 0.10, type: 'add' }
    ],
    common_archetypes: ['scoring_pg', 'combo_guard', 'scoring_machine']
  },

  {
    id: 'cold_blooded',
    name: 'Cold Blooded',
    description: 'Ice in veins during clutch moments',
    category: 'shooting',
    rarity: 'rare',
    trigger: {
      type: 'clutch',
      conditions: {
        time_remaining: 120,           // Last 2 minutes
        score_margin: 5                // Within 5 points
      }
    },
    effects: [
      { stat: 'all_shooting', modifier: 0.20, type: 'add' }
    ],
    common_archetypes: ['scoring_machine', 'scoring_pg']
  },

  {
    id: 'free_throw_ace',
    name: 'Free Throw Ace',
    description: 'Never misses from the charity stripe',
    category: 'shooting',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'free_throw_pct', modifier: 0.10, type: 'add' },
      { stat: 'clutch_ft', modifier: 0.15, type: 'add' }
    ],
    common_archetypes: ['sharpshooter', 'post_scorer']
  },

  {
    id: 'volume_scorer',
    name: 'Volume Scorer',
    description: 'Maintains efficiency even on high shot volume',
    category: 'shooting',
    rarity: 'rare',
    trigger: { type: 'always' },
    effects: [
      { stat: 'fatigue_shooting_penalty', modifier: -0.50, type: 'multiply' }
    ],
    common_archetypes: ['scoring_machine', 'scoring_pg']
  },

  {
    id: 'corner_specialist',
    name: 'Corner Specialist',
    description: 'Deadly from the corners',
    category: 'shooting',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'corner_three_pct', modifier: 0.12, type: 'add' }
    ],
    common_archetypes: ['sharpshooter', 'two_way_wing']
  },

  // ═══════════════════════════════════════════════════════════════
  // FINISHING TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'posterizer',
    name: 'Posterizer',
    description: 'Dunks on defenders without fear',
    category: 'finishing',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'contested_dunk_success', modifier: 0.25, type: 'add' },
      { stat: 'dunk_attempt_rate', modifier: 0.15, type: 'add' }
    ],
    common_archetypes: ['slasher', 'athletic_freak', 'paint_beast']
  },

  {
    id: 'acrobat',
    name: 'Acrobat',
    description: 'Finishes with circus shots and difficult angles',
    category: 'finishing',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'difficult_layup_pct', modifier: 0.18, type: 'add' },
      { stat: 'reverse_layup_pct', modifier: 0.15, type: 'add' }
    ],
    common_archetypes: ['slasher', 'combo_guard']
  },

  {
    id: 'contact_finisher',
    name: 'Contact Finisher',
    description: 'Finishes through contact and draws fouls',
    category: 'finishing',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'and_one_rate', modifier: 0.25, type: 'add' },
      { stat: 'foul_drawn_rate', modifier: 0.20, type: 'add' }
    ],
    common_archetypes: ['slasher', 'post_scorer', 'athletic_freak']
  },

  {
    id: 'floater_game',
    name: 'Floater Game',
    description: 'Master of the tear-drop floater',
    category: 'finishing',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'floater_pct', modifier: 0.20, type: 'add' }
    ],
    common_archetypes: ['scoring_pg', 'combo_guard']
  },

  {
    id: 'relentless',
    name: 'Relentless',
    description: 'Crashes the offensive glass with intensity',
    category: 'finishing',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'offensive_rebound_rate', modifier: 0.30, type: 'add' },
      { stat: 'putback_attempt_rate', modifier: 0.25, type: 'add' }
    ],
    common_archetypes: ['glass_cleaner', 'paint_beast', 'athletic_freak']
  },

  {
    id: 'drop_stepper',
    name: 'Drop-Stepper',
    description: 'Elite post move execution',
    category: 'finishing',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'post_move_success', modifier: 0.20, type: 'add' }
    ],
    common_archetypes: ['post_scorer', 'paint_beast']
  },

  // ═══════════════════════════════════════════════════════════════
  // PLAYMAKING TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'floor_general_trait',
    name: 'Floor General',
    description: 'Makes teammates better through leadership',
    category: 'playmaking',
    rarity: 'rare',
    trigger: { type: 'always' },
    effects: [
      { stat: 'teammate_offensive_boost', modifier: 0.05, type: 'add' }
    ],
    common_archetypes: ['floor_general', 'playmaking_forward']
  },

  {
    id: 'dimer',
    name: 'Dimer',
    description: 'Assists lead to higher percentage shots',
    category: 'playmaking',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'assisted_shot_boost', modifier: 0.10, type: 'add' }
    ],
    common_archetypes: ['floor_general', 'playmaking_forward']
  },

  {
    id: 'needle_threader',
    name: 'Needle Threader',
    description: 'Completes difficult passes that others can\'t',
    category: 'playmaking',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'difficult_pass_success', modifier: 0.25, type: 'add' },
      { stat: 'turnover_on_pass', modifier: -0.15, type: 'add' }
    ],
    common_archetypes: ['floor_general', 'playmaking_forward']
  },

  {
    id: 'lob_city_passer',
    name: 'Lob City Passer',
    description: 'Throws perfect alley-oop passes',
    category: 'playmaking',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'alley_oop_pass_success', modifier: 0.30, type: 'add' }
    ],
    common_archetypes: ['floor_general', 'scoring_pg']
  },

  {
    id: 'pnr_maestro',
    name: 'Pick & Roll Maestro',
    description: 'Master of the pick and roll',
    category: 'playmaking',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'pnr_ball_handler_success', modifier: 0.15, type: 'add' },
      { stat: 'pnr_roll_man_boost', modifier: 0.10, type: 'add' }
    ],
    common_archetypes: ['floor_general', 'scoring_pg']
  },

  // ═══════════════════════════════════════════════════════════════
  // DEFENSE TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'clamps',
    name: 'Clamps',
    description: 'Locks down matchup with elite on-ball defense',
    category: 'defense',
    rarity: 'rare',
    trigger: { type: 'always' },
    effects: [
      { stat: 'matchup_fg_reduction', modifier: 0.15, type: 'add' },
      { stat: 'blow_by_prevention', modifier: 0.20, type: 'add' }
    ],
    common_archetypes: ['lockdown_defender', 'two_way_wing']
  },

  {
    id: 'rim_protector_trait',
    name: 'Rim Protector',
    description: 'Intimidates and blocks shots at the rim',
    category: 'defense',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'block_rate', modifier: 0.25, type: 'add' },
      { stat: 'opponent_rim_fg_reduction', modifier: 0.10, type: 'add' }
    ],
    common_archetypes: ['rim_protector', 'paint_beast']
  },

  {
    id: 'interceptor',
    name: 'Interceptor',
    description: 'Jumps passing lanes with anticipation',
    category: 'defense',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'passing_lane_steal_rate', modifier: 0.35, type: 'add' }
    ],
    common_archetypes: ['lockdown_defender', 'two_way_wing']
  },

  {
    id: 'chase_down_artist',
    name: 'Chase Down Artist',
    description: 'Elite at chasing down fast breaks from behind',
    category: 'defense',
    rarity: 'rare',
    trigger: { type: 'always' },
    effects: [
      { stat: 'chase_down_block_rate', modifier: 0.40, type: 'add' }
    ],
    common_archetypes: ['athletic_freak', 'rim_protector']
  },

  {
    id: 'intimidator',
    name: 'Intimidator',
    description: 'Presence alone makes opponents miss',
    category: 'defense',
    rarity: 'rare',
    trigger: { type: 'always' },
    effects: [
      { stat: 'opponent_shot_contest_boost', modifier: 0.10, type: 'add' },
      { stat: 'opponent_hesitation_rate', modifier: 0.15, type: 'add' }
    ],
    common_archetypes: ['rim_protector', 'paint_beast']
  },

  {
    id: 'pick_pocket',
    name: 'Pick Pocket',
    description: 'Elite at on-ball steals',
    category: 'defense',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'on_ball_steal_rate', modifier: 0.30, type: 'add' }
    ],
    common_archetypes: ['lockdown_defender']
  },

  // ═══════════════════════════════════════════════════════════════
  // MENTAL TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'clutch_performer',
    name: 'Clutch Performer',
    description: 'Elevates entire game in big moments',
    category: 'mental',
    rarity: 'rare',
    trigger: {
      type: 'clutch',
      conditions: {
        time_remaining: 180,          // Last 3 minutes
        score_margin: 6               // Within 6 points
      }
    },
    effects: [
      { stat: 'all_attributes', modifier: 0.12, type: 'add' }
    ],
    common_archetypes: ['scoring_machine', 'floor_general']
  },

  {
    id: 'playoff_riser',
    name: 'Playoff Riser',
    description: 'Performs best when it matters most',
    category: 'mental',
    rarity: 'rare',
    trigger: {
      type: 'playoff',
      conditions: { is_playoff: true }
    },
    effects: [
      { stat: 'all_attributes', modifier: 0.10, type: 'add' }
    ],
    common_archetypes: ['scoring_machine', 'two_way_wing']
  },

  {
    id: 'motor',
    name: 'Motor',
    description: 'Never stops running, endless energy',
    category: 'mental',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'fatigue_rate', modifier: -0.40, type: 'multiply' }
    ],
    common_archetypes: ['glass_cleaner', 'lockdown_defender', 'slasher']
  },

  {
    id: 'coachable',
    name: 'Coachable',
    description: 'Develops faster than peers',
    category: 'mental',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'development_rate', modifier: 0.30, type: 'add' }
    ],
    common_archetypes: [] // Any archetype
  },

  {
    id: 'hot_start',
    name: 'Hot Start',
    description: 'Comes out firing in the first quarter',
    category: 'mental',
    rarity: 'common',
    trigger: {
      type: 'conditional',
      conditions: { quarter: [1] }
    },
    effects: [
      { stat: 'all_shooting', modifier: 0.15, type: 'add' }
    ],
    common_archetypes: ['scoring_machine', 'sharpshooter']
  },

  {
    id: 'closer',
    name: 'Closer',
    description: 'Dominates the fourth quarter',
    category: 'mental',
    rarity: 'uncommon',
    trigger: {
      type: 'conditional',
      conditions: { quarter: [4] }
    },
    effects: [
      { stat: 'all_attributes', modifier: 0.12, type: 'add' }
    ],
    common_archetypes: ['scoring_machine', 'floor_general']
  },

  {
    id: 'streaky',
    name: 'Streaky',
    description: 'Gets hot or cold, rarely in between',
    category: 'mental',
    rarity: 'common',
    trigger: { type: 'streak' },
    effects: [
      // When hot (3+ makes in a row)
      { stat: 'shooting_hot', modifier: 0.20, type: 'add' },
      // When cold (3+ misses in a row)
      { stat: 'shooting_cold', modifier: -0.15, type: 'add' }
    ],
    common_archetypes: ['sharpshooter', 'scoring_machine']
  },

  // ═══════════════════════════════════════════════════════════════
  // NEGATIVE TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'ball_hog',
    name: 'Ball Hog',
    description: 'Tends to over-dribble and force shots',
    category: 'negative',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'pass_tendency', modifier: -0.20, type: 'add' },
      { stat: 'contested_shot_rate', modifier: 0.25, type: 'add' }
    ],
    common_archetypes: ['scoring_machine', 'scoring_pg']
  },

  {
    id: 'turnover_prone',
    name: 'Turnover Prone',
    description: 'Careless with the ball, makes risky plays',
    category: 'negative',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'turnover_rate', modifier: 0.30, type: 'add' }
    ],
    common_archetypes: ['athletic_freak']
  },

  {
    id: 'foul_trouble',
    name: 'Foul Trouble',
    description: 'Struggles to stay out of foul trouble',
    category: 'negative',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'foul_rate', modifier: 0.40, type: 'add' }
    ],
    common_archetypes: ['rim_protector', 'lockdown_defender']
  },

  {
    id: 'frontrunner',
    name: 'Frontrunner',
    description: 'Plays well when ahead, disappears when behind',
    category: 'negative',
    rarity: 'common',
    trigger: {
      type: 'conditional',
      conditions: { score_margin: -5 }  // When losing by 5+
    },
    effects: [
      { stat: 'all_attributes', modifier: -0.12, type: 'add' }
    ],
    common_archetypes: []
  },

  {
    id: 'playoff_choker',
    name: 'Playoff Pressure',
    description: 'Struggles under playoff spotlight',
    category: 'negative',
    rarity: 'uncommon',
    trigger: {
      type: 'playoff',
      conditions: { is_playoff: true }
    },
    effects: [
      { stat: 'all_attributes', modifier: -0.10, type: 'add' }
    ],
    common_archetypes: []
  },

  {
    id: 'inconsistent',
    name: 'Inconsistent',
    description: 'Performance varies wildly game to game',
    category: 'negative',
    rarity: 'common',
    trigger: { type: 'always' },
    effects: [
      { stat: 'performance_variance', modifier: 2.0, type: 'multiply' }
    ],
    common_archetypes: []
  },

  {
    id: 'fragile',
    name: 'Fragile',
    description: 'Injury-prone, misses significant time',
    category: 'negative',
    rarity: 'uncommon',
    trigger: { type: 'always' },
    effects: [
      { stat: 'injury_chance', modifier: 0.50, type: 'add' }
    ],
    common_archetypes: []
  },

  {
    id: 'slow_starter',
    name: 'Slow Starter',
    description: 'Takes time to get going each game',
    category: 'negative',
    rarity: 'common',
    trigger: {
      type: 'conditional',
      conditions: { quarter: [1] }
    },
    effects: [
      { stat: 'all_shooting', modifier: -0.12, type: 'add' }
    ],
    common_archetypes: []
  }
];
```

## 4.5 Hidden Potential System

```typescript
interface HiddenPotential {
  // The maximum overall this player can reach
  potential: number;                   // 0-99

  // When they'll reach their peak
  peak_age: number;                    // 24-32

  // How quickly they develop
  development_speed: 'slow' | 'normal' | 'fast';

  // Injury resistance (affects career length)
  durability: number;                  // 0-99

  // ═══════════════════════════════════════════════════════════
  // SCOUTING REVEALS THIS PROGRESSIVELY
  // ═══════════════════════════════════════════════════════════

  scouted: {
    // How much we know about this player
    confidence: number;                // 0-100%

    // What we've discovered
    estimated_potential?: 'low' | 'medium' | 'high' | 'elite';
    estimated_peak_age?: 'early' | 'normal' | 'late';

    // Confidence translates to range width
    // 100% confidence = exact number
    // 50% confidence = +/- 8 points
    // 0% confidence = +/- 20 points (basically unknown)
  };
}

// Scouting accuracy by confidence level
function getPotentialRange(actual: number, confidence: number): [number, number] {
  const uncertainty = Math.round((100 - confidence) / 5); // 0-20
  const min = Math.max(40, actual - uncertainty);
  const max = Math.min(99, actual + uncertainty);
  return [min, max];
}

// Example:
// Player has 85 potential, 60% confidence
// Range shown: 77-93 (85 +/- 8)
```

### Scouting System

```typescript
interface ScoutingReport {
  player_id: string;
  scout_id: string;
  date: Date;

  // Overall assessment
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

  // Detailed breakdown
  sections: {
    physical: {
      grade: string;
      notes: string;
    };
    offensive: {
      grade: string;
      notes: string;
    };
    defensive: {
      grade: string;
      notes: string;
    };
    mental: {
      grade: string;
      notes: string;
    };
  };

  // Player comparison
  comparison: string;                  // "Reminds me of [player]"

  // Strengths/Weaknesses
  strengths: string[];
  weaknesses: string[];

  // Potential assessment
  potential_estimate: 'low' | 'medium' | 'high' | 'elite';

  // Overall notes
  summary: string;

  // Increases confidence
  confidence_gained: number;           // +10-25% typically
}

// Scouting action
interface ScoutAction {
  target_player_id: string;
  scout_hours: number;                 // 1-40 hours

  // More hours = more accurate
  confidence_formula: (hours: number) => number;
  // ~5 hours = +10% confidence
  // ~20 hours = +40% confidence
  // ~40 hours = +70% confidence
}
```

## 4.6 Player Progression

```typescript
interface PlayerProgression {
  // Called at end of each season
  processOffseasonDevelopment(player: Player): void;

  // Called each game
  processGameExperience(player: Player, game: Game, stats: GameStats): void;
}

// Offseason development
function developPlayer(player: Player): AttributeChanges {
  const age = player.age;
  const potential = player.hidden.potential;
  const peakAge = player.hidden.peak_age;
  const workEthic = player.attributes.work_ethic;
  const devSpeed = player.hidden.development_speed;

  const changes: AttributeChanges = {};

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: DEVELOPMENT (age < peak_age)
  // ═══════════════════════════════════════════════════════════

  if (age < peakAge) {
    const yearsToGo = peakAge - age;
    const currentOverall = calculateOverall(player);
    const gapToPotential = potential - currentOverall;

    // Base improvement per year
    let baseGain = gapToPotential / yearsToGo;

    // Development speed modifier
    const speedMod = {
      slow: 0.7,
      normal: 1.0,
      fast: 1.4
    }[devSpeed];

    // Work ethic modifier (0.5x to 1.5x)
    const workMod = 0.5 + (workEthic / 100);

    // Playing time modifier (more minutes = more development)
    const minutesMod = getMinutesModifier(player.season_stats);

    // Final gain
    const totalGain = baseGain * speedMod * workMod * minutesMod;

    // Distribute across attributes (weighted by archetype)
    changes = distributeGains(player, totalGain);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: PEAK (peak_age to peak_age + 3)
  // ═══════════════════════════════════════════════════════════

  else if (age <= peakAge + 3) {
    // Minimal changes - player is at their best
    // Small random fluctuations (+/- 1-2 points on some attributes)
    changes = getSmallFluctuations(player);
  }

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: DECLINE (age > peak_age + 3)
  // ═══════════════════════════════════════════════════════════

  else {
    const yearsDecline = age - (peakAge + 3);

    // Base decline rate (accelerates with age)
    let declineRate = 1 + (yearsDecline * 0.5);

    // Durability helps slow decline
    const durabilityMod = 1.5 - (player.hidden.durability / 100);
    declineRate *= durabilityMod;

    // Physical attributes decline faster
    const physicalDecline = declineRate * 1.5;
    changes = {
      speed: -Math.round(physicalDecline * randomRange(1, 3)),
      acceleration: -Math.round(physicalDecline * randomRange(1, 3)),
      vertical: -Math.round(physicalDecline * randomRange(1, 3)),
      stamina: -Math.round(physicalDecline * randomRange(1, 2)),
    };

    // Skill attributes decline slower
    const skillDecline = declineRate * 0.5;
    changes = {
      ...changes,
      three_point: -Math.round(skillDecline * randomRange(0, 2)),
      inside_scoring: -Math.round(skillDecline * randomRange(0, 2)),
      // IQ attributes may actually INCREASE slightly
      basketball_iq: Math.round(randomRange(-1, 2)),
      offensive_iq: Math.round(randomRange(-1, 1)),
    };
  }

  return changes;
}
```

### Age Curves

```
PLAYER DEVELOPMENT CURVE

OVR
 │
95│                    ┌─────────┐
  │                   ╱           ╲
90│                  ╱             ╲
  │                 ╱               ╲
85│                ╱                 ╲
  │               ╱                   ╲
80│              ╱                     ╲
  │             ╱                       ╲
75│            ╱                         ╲
  │           ╱                           ╲
70│          ╱                             ╲
  │         ╱                               ╲
65│        ╱                                 ╲
  │       ╱                                   ╲
60│      ╱                                     ╲
  │─────────────────────────────────────────────
  19  21  23  25  27  29  31  33  35  37  39  AGE
     └──────┘└────────┘└────────────────────┘
     Development  Peak        Decline

DEVELOPMENT SPEED VARIANTS:
- Fast Developer: Peaks at 24-26, faster decline
- Normal: Peaks at 27-29
- Late Bloomer: Peaks at 29-32, slower decline
```

## 4.7 Personality & Morale

```typescript
interface PlayerPersonality {
  // ═══════════════════════════════════════════════════════════
  // PERSONALITY TRAITS (Hidden, 0-100)
  // ═══════════════════════════════════════════════════════════

  loyalty: number;
  // High: More likely to stay with current team, takes less money
  // Low: Chases money/rings, demands trades

  greed: number;
  // High: Prioritizes salary above all
  // Low: Will take discounts for right situation

  competitiveness: number;
  // High: Wants to win championships, joins contenders
  // Low: Happy with any situation

  ego: number;
  // High: Demands touches, starter role, star treatment
  // Low: Accepts any role, team player

  leadership: number;
  // High: Improves teammate morale, chemistry
  // Low: No effect on teammates

  maturity: number;
  // High: Handles adversity well, stable
  // Low: Prone to drama, public complaints
}

interface PlayerMorale {
  // ═══════════════════════════════════════════════════════════
  // CURRENT HAPPINESS (0-100)
  // ═══════════════════════════════════════════════════════════

  happiness: number;

  // Contributing factors (each -25 to +25)
  factors: {
    role: number;
    // Based on: minutes vs. expectation for their overall
    // Star getting starter minutes = positive
    // Starter getting bench minutes = negative

    winning: number;
    // Based on: team record
    // Playoff team = positive
    // Losing team = negative

    salary: number;
    // Based on: contract vs. market value
    // Overpaid = positive
    // Underpaid = negative

    location: number;
    // Based on: market size preference
    // Some prefer big markets, some don't care

    teammates: number;
    // Based on: chemistry with other players
    // Friends on team = positive
    // Conflicts = negative

    coach: number;
    // Based on: relationship with coach
    // Good fit = positive
    // Conflict = negative
  };
}

// Morale effects
function getMoraleModifier(morale: PlayerMorale): number {
  const happiness = morale.happiness;

  if (happiness >= 80) return 1.05;      // +5% performance
  if (happiness >= 60) return 1.0;       // No change
  if (happiness >= 40) return 0.95;      // -5% performance
  if (happiness >= 20) return 0.90;      // -10% performance
  return 0.85;                            // -15% performance
}

// Low morale consequences
interface MoraleConsequence {
  threshold: number;
  consequence: string;
  probability: number;
}

const MORALE_CONSEQUENCES: MoraleConsequence[] = [
  { threshold: 30, consequence: 'demands_trade', probability: 0.4 },
  { threshold: 20, consequence: 'public_complaint', probability: 0.3 },
  { threshold: 10, consequence: 'holdout', probability: 0.2 },
];
```

---

# 5. TEAM MANAGEMENT

## 5.1 Roster Rules

```typescript
interface RosterRules {
  // Roster size
  max_roster_size: 15;
  min_roster_size: 12;
  active_roster_size: 12;              // Can dress for games

  // Positional requirements (none - any composition allowed)

  // Two-way contracts (future feature)
  max_two_way_contracts: 2;

  // Injured Reserve
  ir_spots: 3;
  ir_minimum_games: 5;                 // Must miss 5+ games
}
```

## 5.2 Lineups & Rotations

```typescript
interface TeamLineup {
  // Starting five
  starters: {
    PG: string;                        // Player ID
    SG: string;
    SF: string;
    PF: string;
    C: string;
  };

  // Rotation settings (minutes per game target)
  rotation: {
    [playerId: string]: {
      target_minutes: number;          // 0-40
      can_play_positions: Position[];
      role: 'starter' | 'rotation' | 'bench' | 'dnp';
    };
  };

  // Substitution patterns
  substitution_style: 'normal' | 'deep' | 'short';
  // normal: 8-9 man rotation
  // deep: 10-11 man rotation
  // short: 6-7 man rotation

  // Clutch time lineup (last 3 min of close games)
  clutch_lineup?: {
    PG: string;
    SG: string;
    SF: string;
    PF: string;
    C: string;
  };
}
```

### Rotation Logic

```typescript
interface SubstitutionEngine {
  // When to sub
  triggers: {
    fatigue_threshold: 70;             // Sub out when 70%+ fatigued
    foul_threshold: 4;                 // Careful with 4 fouls
    blowout_threshold: 20;             // Rest starters if up/down 20+
    quarter_end: true;                 // Natural sub points
  };

  // Who to sub in
  selection: {
    match_position: true;              // Same position preferred
    consider_matchup: true;            // Offensive/defensive needs
    respect_rotation: true;            // Follow set rotation
    minutes_balance: true;             // Track toward target minutes
  };
}
```

## 5.3 Salary Cap System

### Cap Structure

```typescript
interface SalaryCapSystem {
  // ═══════════════════════════════════════════════════════════
  // CAP THRESHOLDS (2024 values, scale for game)
  // ═══════════════════════════════════════════════════════════

  salary_cap: 140000000;               // $140M soft cap
  luxury_tax_threshold: 170000000;     // $170M tax line
  first_apron: 178000000;              // $178M first apron
  second_apron: 189000000;             // $189M second apron

  // Salary floor (must spend at least this)
  salary_floor: 126000000;             // 90% of cap

  // ═══════════════════════════════════════════════════════════
  // INDIVIDUAL SALARY LIMITS
  // ═══════════════════════════════════════════════════════════

  max_salary: {
    // Based on years in league
    '0-5_years': 0.25 * salary_cap;    // ~$35M
    '6-9_years': 0.30 * salary_cap;    // ~$42M
    '10+_years': 0.35 * salary_cap;    // ~$49M
  };

  min_salary: {
    // Minimum based on experience
    'rookie': 1100000;
    '1_year': 1800000;
    '2_years': 2100000;
    '3+_years': 2800000;
  };

  // ═══════════════════════════════════════════════════════════
  // EXCEPTIONS (Ways to exceed cap)
  // ═══════════════════════════════════════════════════════════

  exceptions: {
    // Mid-Level Exception (can sign FA even over cap)
    mid_level: {
      amount: 12800000;
      years: 4;
      available: 'under_first_apron';
    };

    // Bi-Annual Exception (every other year)
    bi_annual: {
      amount: 4500000;
      years: 2;
      available: 'under_first_apron';
    };

    // Minimum Exception (always available)
    minimum: {
      amount: 'league_minimum';
      years: 2;
      available: 'always';
    };

    // Traded Player Exception (from trades)
    traded_player: {
      amount: 'outgoing_salary';
      duration: '1_year';
    };
  };
}
```

### Luxury Tax

```typescript
function calculateLuxuryTax(payroll: number, threshold: number): number {
  if (payroll <= threshold) return 0;

  const over = payroll - threshold;
  let tax = 0;
  let remaining = over;

  // Progressive tax brackets
  const brackets = [
    { upTo: 5000000, rate: 1.50 },
    { upTo: 10000000, rate: 1.75 },
    { upTo: 15000000, rate: 2.50 },
    { upTo: 20000000, rate: 3.25 },
    { upTo: 25000000, rate: 3.75 },
    { upTo: Infinity, rate: 4.25 },
  ];

  for (const bracket of brackets) {
    const taxable = Math.min(remaining, bracket.upTo);
    tax += taxable * bracket.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }

  // Repeater tax (3 of last 4 years) adds 1.0 to each rate
  if (isRepeater(team)) {
    tax *= 1.5;
  }

  return Math.round(tax);
}
```

## 5.4 Contracts

```typescript
interface Contract {
  id: string;
  player_id: string;
  team_id: string;

  // Structure
  years: number;                       // 1-5
  total_value: number;
  salaries: number[];                  // Per year

  // Options
  player_option?: {
    year: number;                      // Which year (usually last)
    value: number;
  };
  team_option?: {
    year: number;
    value: number;
  };

  // Clauses
  no_trade_clause: boolean;            // Player can veto trades
  trade_kicker?: number;               // % bonus if traded (15% typical)

  // Trade eligibility
  tradeable_date: Date;                // Can't trade immediately after signing

  // Status
  status: 'active' | 'expiring' | 'completed';
  signed_date: Date;
}

// Contract calculation
interface ContractOffer {
  years: number;
  annual_salary: number;

  // For simulation: will player accept?
  acceptance_factors: {
    market_value_match: number;        // Is salary fair?
    years_desired: number;             // Security preference
    team_competitiveness: number;      // Championship odds
    role_promised: string;             // Star/starter/bench
    location_preference: number;       // Market size
    loyalty_bonus: number;             // Current team bonus
  };
}
```

---

# 6. GAME SIMULATION ENGINE

## 6.1 Simulation Overview

```
GAME SIMULATION FLOW

┌─────────────────────────────────────────────────────────────────┐
│                        GAME SETUP                                │
├─────────────────────────────────────────────────────────────────┤
│ 1. Load teams, rosters, lineups                                 │
│ 2. Calculate team synergies and modifiers                       │
│ 3. Apply home court advantage                                   │
│ 4. Initialize player fatigue (fresh)                            │
│ 5. Set game clock (12 min quarters = 48 min total)              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      QUARTER LOOP                                │
├─────────────────────────────────────────────────────────────────┤
│ For each quarter (1-4, overtime if tied):                       │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  POSSESSION LOOP                         │   │
│   ├─────────────────────────────────────────────────────────┤   │
│   │ 1. Determine possession (tip-off, made basket, etc.)    │   │
│   │ 2. Simulate possession (see below)                      │   │
│   │ 3. Record all plays                                     │   │
│   │ 4. Update stats                                         │   │
│   │ 5. Check for substitutions                              │   │
│   │ 6. Update fatigue                                       │   │
│   │ 7. Repeat until quarter ends                            │   │
│   └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GAME END                                    │
├─────────────────────────────────────────────────────────────────┤
│ 1. Final score                                                  │
│ 2. Complete box score                                           │
│ 3. Play-by-play log                                            │
│ 4. Update season stats                                         │
│ 5. Trigger post-game events                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Possession Simulation

```typescript
interface Possession {
  team: Team;
  players_on_court: Player[];         // Offense
  defenders: Player[];                 // Defense
  shot_clock: number;                  // 24 seconds
  game_clock: number;                  // Remaining in quarter
  quarter: number;
  score_differential: number;          // Positive = winning
}

interface PossessionResult {
  plays: Play[];
  points_scored: number;
  time_elapsed: number;
  possession_ended: boolean;
  ending: 'made_shot' | 'missed_shot' | 'turnover' | 'foul' | 'end_of_period';
}

function simulatePossession(possession: Possession): PossessionResult {
  const plays: Play[] = [];
  let shotClock = 24;
  let ballHandler = selectBallHandler(possession);

  while (shotClock > 0) {
    // ═══════════════════════════════════════════════════════════
    // 1. DETERMINE ACTION PROBABILITIES
    // ═══════════════════════════════════════════════════════════

    const actionProbs = calculateActionProbabilities(
      ballHandler,
      possession,
      shotClock
    );

    // Actions: shoot, pass, drive, post_up, pick_and_roll, iso
    // Probabilities based on:
    // - Player attributes and tendencies
    // - Shot clock situation
    // - Defensive matchup
    // - Score/time situation

    // ═══════════════════════════════════════════════════════════
    // 2. SELECT AND EXECUTE ACTION
    // ═══════════════════════════════════════════════════════════

    const action = weightedRandomSelect(actionProbs);
    const result = executeAction(action, ballHandler, possession);

    plays.push(result.play);

    // ═══════════════════════════════════════════════════════════
    // 3. HANDLE RESULT
    // ═══════════════════════════════════════════════════════════

    if (result.possession_ended) {
      return {
        plays,
        points_scored: result.points,
        time_elapsed: 24 - shotClock + result.action_time,
        possession_ended: true,
        ending: result.ending
      };
    }

    // Update for next action
    shotClock -= result.action_time;
    if (result.new_ball_handler) {
      ballHandler = result.new_ball_handler;
    }
  }

  // Shot clock violation
  plays.push({ type: 'shot_clock_violation', team: possession.team });
  return {
    plays,
    points_scored: 0,
    time_elapsed: 24,
    possession_ended: true,
    ending: 'turnover'
  };
}
```

## 6.3 Action Execution

### Shot Attempts

```typescript
function executeShot(
  shooter: Player,
  shot_type: ShotType,
  defender: Player,
  context: ShotContext
): ShotResult {

  // ═══════════════════════════════════════════════════════════
  // 1. BASE SHOT PERCENTAGE
  // ═══════════════════════════════════════════════════════════

  let basePct: number;

  switch (shot_type) {
    case 'layup':
      basePct = (shooter.attributes.inside_scoring / 99) * 0.70;
      break;
    case 'dunk':
      basePct = (shooter.attributes.inside_scoring / 99) * 0.85;
      break;
    case 'mid_range':
      basePct = (shooter.attributes.mid_range / 99) * 0.50;
      break;
    case 'three_pointer':
      basePct = (shooter.attributes.three_point / 99) * 0.42;
      break;
    case 'floater':
      basePct = ((shooter.attributes.inside_scoring + shooter.attributes.mid_range) / 2 / 99) * 0.45;
      break;
    case 'post_move':
      basePct = (shooter.attributes.inside_scoring / 99) * 0.55;
      break;
  }

  // ═══════════════════════════════════════════════════════════
  // 2. DEFENDER CONTEST
  // ═══════════════════════════════════════════════════════════

  const contestLevel = calculateContest(defender, shot_type, context);
  // contestLevel: 0 (wide open) to 1 (heavily contested)

  const contestPenalty = contestLevel * 0.25; // Up to 25% reduction
  basePct *= (1 - contestPenalty);

  // ═══════════════════════════════════════════════════════════
  // 3. SITUATIONAL MODIFIERS
  // ═══════════════════════════════════════════════════════════

  // Fatigue
  const fatiguePenalty = (shooter.current_fatigue / 100) * 0.15;
  basePct *= (1 - fatiguePenalty);

  // Shot difficulty (catch-and-shoot vs. off-dribble vs. contested)
  basePct *= getShotDifficultyMod(context);

  // Clutch modifier
  if (context.is_clutch) {
    const clutchMod = (shooter.attributes.clutch - 50) / 500;
    basePct *= (1 + clutchMod); // -10% to +10%
  }

  // ═══════════════════════════════════════════════════════════
  // 4. TRAIT MODIFIERS
  // ═══════════════════════════════════════════════════════════

  for (const trait of shooter.traits) {
    if (traitApplies(trait, shot_type, context)) {
      for (const effect of trait.effects) {
        if (effect.stat === 'shooting' || effect.stat === shot_type) {
          basePct *= (1 + effect.modifier);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 5. CONSISTENCY VARIANCE
  // ═══════════════════════════════════════════════════════════

  const variance = (100 - shooter.attributes.consistency) / 400;
  const roll = (Math.random() - 0.5) * 2 * variance;
  basePct *= (1 + roll);

  // ═══════════════════════════════════════════════════════════
  // 6. FINAL CALCULATION
  // ═══════════════════════════════════════════════════════════

  const finalPct = clamp(basePct, 0.02, 0.95);
  const made = Math.random() < finalPct;

  return {
    made,
    shot_type,
    shooter_id: shooter.id,
    defender_id: defender.id,
    contested: contestLevel > 0.3,
    distance: context.distance,
    points: made ? getPoints(shot_type) : 0
  };
}
```

### Passing

```typescript
function executePass(
  passer: Player,
  receiver: Player,
  pass_type: PassType,
  defender: Player
): PassResult {

  // Base pass success rate
  let successRate = (passer.attributes.passing / 99) * 0.95;

  // Defender interception attempt
  const stealChance = calculateStealChance(defender, pass_type);

  // Risky passes more likely to be stolen
  const difficultyMod = {
    simple: 1.0,
    skip: 0.9,
    alley_oop: 0.85,
    entry: 0.9,
    crosscourt: 0.85
  }[pass_type];

  successRate *= difficultyMod;

  // Trait modifiers
  if (hasTrait(passer, 'needle_threader')) {
    successRate *= 1.15;
  }

  // Roll for steal
  if (Math.random() < stealChance) {
    return { success: false, stolen: true, stealer_id: defender.id };
  }

  // Roll for pass completion
  if (Math.random() < successRate) {
    return { success: true, receiver_id: receiver.id };
  }

  return { success: false, turnover: true };
}
```

### Rebounds

```typescript
function simulateRebound(
  offensive_players: Player[],
  defensive_players: Player[],
  shot_location: Location
): ReboundResult {

  // Calculate rebound chances for each player
  const candidates: { player: Player; chance: number; offensive: boolean }[] = [];

  for (const player of offensive_players) {
    let chance = calculateReboundChance(player, shot_location, true);
    // Offensive rebounds harder to get
    chance *= 0.25; // ~25% of rebounds are offensive
    candidates.push({ player, chance, offensive: true });
  }

  for (const player of defensive_players) {
    const chance = calculateReboundChance(player, shot_location, false);
    candidates.push({ player, chance, offensive: false });
  }

  // Normalize and select
  const total = candidates.reduce((sum, c) => sum + c.chance, 0);
  let roll = Math.random() * total;

  for (const candidate of candidates) {
    roll -= candidate.chance;
    if (roll <= 0) {
      return {
        rebounder_id: candidate.player.id,
        offensive: candidate.offensive
      };
    }
  }

  // Fallback
  return {
    rebounder_id: defensive_players[0].id,
    offensive: false
  };
}

function calculateReboundChance(
  player: Player,
  shot_location: Location,
  offensive: boolean
): number {

  // Base from attributes
  let chance = 0;
  chance += player.attributes.vertical * 0.3;
  chance += player.attributes.strength * 0.25;
  chance += player.attributes.basketball_iq * 0.15;

  // Position matters (bigs get more)
  const positionMod = {
    C: 1.4,
    PF: 1.2,
    SF: 0.9,
    SG: 0.7,
    PG: 0.6
  }[player.position];

  chance *= positionMod;

  // Height advantage
  chance *= (player.height_inches / 78); // 78" is average

  // Traits
  if (hasTrait(player, 'glass_cleaner')) {
    chance *= 1.3;
  }
  if (hasTrait(player, 'relentless') && offensive) {
    chance *= 1.25;
  }

  return chance;
}
```

## 6.4 Fatigue System

```typescript
interface FatigueSystem {
  // Each player has fatigue 0-100 (0 = fresh, 100 = exhausted)

  // Fatigue accumulation per minute
  base_fatigue_per_minute: 2.5;

  // Modifiers
  stamina_modifier: (stamina: number) => number;
  // stamina 99 = 0.5x fatigue rate
  // stamina 50 = 1.0x fatigue rate
  // stamina 1 = 2.0x fatigue rate

  // Recovery
  bench_recovery_per_minute: 8;        // Recover 8 fatigue per minute on bench

  // Effects at fatigue levels
  effects: {
    30: { /* No effect */ },
    50: { shooting: -0.03, speed: -0.05 },
    70: { shooting: -0.08, speed: -0.10, defense: -0.05 },
    90: { shooting: -0.15, speed: -0.20, defense: -0.12, injury_risk: 1.5 }
  };
}

function updateFatigue(player: Player, minutes_played: number): void {
  const staminaMod = 2 - (player.attributes.stamina / 100);
  const fatigueGain = 2.5 * minutes_played * staminaMod;

  // Motor trait reduces fatigue
  if (hasTrait(player, 'motor')) {
    fatigueGain *= 0.6;
  }

  player.current_fatigue = Math.min(100, player.current_fatigue + fatigueGain);
}

function applyFatigueEffects(player: Player): AttributeModifiers {
  const fatigue = player.current_fatigue;
  const mods: AttributeModifiers = {};

  if (fatigue >= 90) {
    mods.shooting = -0.15;
    mods.speed = -0.20;
    mods.defense = -0.12;
  } else if (fatigue >= 70) {
    mods.shooting = -0.08;
    mods.speed = -0.10;
    mods.defense = -0.05;
  } else if (fatigue >= 50) {
    mods.shooting = -0.03;
    mods.speed = -0.05;
  }

  return mods;
}
```

## 6.5 Play-by-Play Generation

```typescript
interface Play {
  id: string;
  game_id: string;

  // Timing
  quarter: number;
  game_clock: number;                  // Seconds remaining
  shot_clock: number;

  // Type
  type: PlayType;

  // Players involved
  primary_player_id: string;
  secondary_player_id?: string;        // Assister, defender, etc.

  // Details
  team_id: string;

  // Scoring
  points: number;
  home_score: number;
  away_score: number;

  // Shot details (if applicable)
  shot_type?: ShotType;
  shot_made?: boolean;
  shot_distance?: number;
  shot_contested?: boolean;

  // Location (for 3D visualization)
  location?: {
    x: number;                         // Court position
    y: number;
  };

  // Description
  description: string;
}

type PlayType =
  | 'jump_ball'
  | 'made_shot'
  | 'missed_shot'
  | 'assist'
  | 'offensive_rebound'
  | 'defensive_rebound'
  | 'turnover'
  | 'steal'
  | 'block'
  | 'foul'
  | 'free_throw_made'
  | 'free_throw_missed'
  | 'timeout'
  | 'substitution'
  | 'quarter_start'
  | 'quarter_end';

// Description generation
function generateDescription(play: Play): string {
  const player = getPlayerName(play.primary_player_id);
  const secondary = play.secondary_player_id
    ? getPlayerName(play.secondary_player_id)
    : null;

  switch (play.type) {
    case 'made_shot':
      const shotDesc = getShotDescription(play.shot_type, play.shot_distance);
      if (secondary) {
        return `${player} ${shotDesc} (assist: ${secondary})`;
      }
      return `${player} ${shotDesc}`;

    case 'missed_shot':
      return `${player} misses ${play.shot_type} from ${play.shot_distance} feet`;

    case 'block':
      return `${player} blocks ${secondary}'s shot`;

    case 'steal':
      return `${player} steals the ball from ${secondary}`;

    case 'offensive_rebound':
      return `${player} grabs the offensive rebound`;

    // ... etc
  }
}
```

---

# 7. DRAFT SYSTEM

## 7.1 Draft Structure

```typescript
interface DraftSettings {
  // Format
  rounds: 2;
  picks_per_round: 16;                 // One per team
  total_picks: 32;

  // Order
  format: 'snake';
  // Round 1: Worst to best record (1-16)
  // Round 2: Reverses (best to worst, picks 17-32)

  // Lottery (optional - for more randomness)
  lottery_enabled: false;              // MVP: straight order
  lottery_teams: 8;                    // Bottom 8 if enabled

  // Timing
  time_per_pick: 120;                  // 2 minutes per pick
  auto_pick_on_timeout: true;
}

interface DraftOrder {
  pick_number: number;
  round: number;
  team_id: string;
  original_team_id: string;            // If traded
  is_traded: boolean;
  player_selected?: string;            // After pick made
}
```

## 7.2 Draft Prospects

```typescript
interface DraftProspect {
  id: string;

  // Identity
  first_name: string;
  last_name: string;
  age: number;                         // 19-22 typically
  position: Position;
  height_inches: number;
  weight_lbs: number;

  // Background
  college?: string;
  international_team?: string;
  country: string;

  // Public info
  projected_pick: number;              // Mock draft position
  projection_variance: number;         // How uncertain

  // ═══════════════════════════════════════════════════════════
  // SCOUTING DATA (Revealed through scouting)
  // ═══════════════════════════════════════════════════════════

  scouting: {
    overall_grade: string;             // "A", "B+", etc. (estimate)
    potential_grade: string;           // "Elite", "Star", etc.
    confidence: number;                // 0-100%

    // Known traits (discovered through scouting)
    known_traits: string[];

    // Reports
    reports: ScoutingReport[];

    // Comparison
    player_comparison?: string;        // "Reminds scouts of [player]"
  };

  // ═══════════════════════════════════════════════════════════
  // ACTUAL VALUES (Hidden until drafted)
  // ═══════════════════════════════════════════════════════════

  actual: {
    overall: number;
    potential: number;
    peak_age: number;
    archetype: Archetype;
    attributes: PlayerAttributes;
    traits: Trait[];
    personality: PlayerPersonality;
  };
}
```

## 7.3 Prospect Generation

```typescript
interface DraftClassGeneration {
  // Class size
  total_prospects: 60;                 // More than 32 picks

  // Quality distribution
  distribution: {
    lottery_talent: 8;                 // 80-90 OVR potential
    first_round: 12;                   // 72-82 OVR potential
    second_round: 15;                  // 65-75 OVR potential
    undrafted: 25;                     // 55-68 OVR potential
  };

  // Ensure variety
  position_distribution: 'balanced';   // ~12 per position
  archetype_distribution: 'varied';    // All archetypes represented
}

function generateDraftClass(): DraftProspect[] {
  const prospects: DraftProspect[] = [];

  // Generate lottery talents (future stars)
  for (let i = 0; i < 8; i++) {
    prospects.push(generateProspect({
      potential_range: [80, 94],
      overall_range: [68, 78],
      projected_pick: i + 1 + randomRange(-2, 2)
    }));
  }

  // Generate first-round talents
  for (let i = 0; i < 12; i++) {
    prospects.push(generateProspect({
      potential_range: [72, 82],
      overall_range: [62, 72],
      projected_pick: 9 + i + randomRange(-3, 3)
    }));
  }

  // Generate second-round talents
  for (let i = 0; i < 15; i++) {
    prospects.push(generateProspect({
      potential_range: [65, 75],
      overall_range: [55, 68],
      projected_pick: 20 + i + randomRange(-5, 5)
    }));
  }

  // Generate undrafted players (go to FA)
  for (let i = 0; i < 25; i++) {
    prospects.push(generateProspect({
      potential_range: [55, 68],
      overall_range: [45, 62],
      projected_pick: 40 + randomRange(0, 20)
    }));
  }

  return sortByProjectedPick(prospects);
}
```

## 7.4 Draft Night Flow

```
DRAFT NIGHT SEQUENCE

┌─────────────────────────────────────────────────────────────────┐
│                      PRE-DRAFT                                   │
├─────────────────────────────────────────────────────────────────┤
│ 1. Draft order finalized                                        │
│ 2. All users notified                                           │
│ 3. Trade window opens (can trade picks)                         │
│ 4. Users set draft boards                                       │
│ 5. Countdown to draft start                                     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LIVE DRAFT                                  │
├─────────────────────────────────────────────────────────────────┤
│ For each pick:                                                  │
│ 1. Team on the clock (2 min timer)                              │
│ 2. If human: Show UI, allow selection or trade                  │
│ 3. If CPU: Auto-select based on team needs + BPA                │
│ 4. Selection announced                                          │
│ 5. Player removed from board                                    │
│ 6. Next team on clock                                          │
│                                                                  │
│ Trade rules during draft:                                       │
│ - Can trade current pick + future picks                        │
│ - Can trade players                                             │
│ - 60 second trade review period                                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POST-DRAFT                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. All picks recorded                                           │
│ 2. Rookies added to rosters                                     │
│ 3. Undrafted players to free agency                            │
│ 4. Draft grades generated (based on value vs. pick)            │
│ 5. Proceed to free agency                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 7.5 CPU Draft AI

```typescript
interface DraftAI {
  // CPU team draft strategy
  selectPick(team: Team, available: DraftProspect[]): DraftProspect {

    // 1. Identify team needs
    const needs = analyzeTeamNeeds(team);

    // 2. Score each prospect
    const scored = available.map(prospect => ({
      prospect,
      score: calculateDraftScore(prospect, team, needs)
    }));

    // 3. Weight BPA vs. need
    // Top prospects: favor BPA (don't pass on star for need)
    // Later picks: favor need more heavily

    // 4. Add some variance (not purely optimal)
    const variance = randomRange(0.9, 1.1);

    // 5. Select highest scored
    return getTopScored(scored);
  }
}

function calculateDraftScore(
  prospect: DraftProspect,
  team: Team,
  needs: TeamNeeds
): number {
  let score = 0;

  // Base value (projected overall + potential)
  score += prospect.scouting.overall_grade_numeric * 2;
  score += prospect.scouting.potential_grade_numeric * 3;

  // Need bonus (if fills a gap)
  const positionNeed = needs.positions[prospect.position];
  score += positionNeed * 10;

  // Archetype fit
  const archetypeFit = evaluateArchetypeFit(prospect, team);
  score += archetypeFit * 5;

  // Age (younger = more development time)
  score += (23 - prospect.age) * 2;

  return score;
}
```

---

# 8. FREE AGENCY

## 8.1 Free Agency Structure

```typescript
interface FreeAgencyPeriod {
  // Timing
  start_date: 'after_draft';
  duration_days: 7;                    // In-game days

  // Phases
  phases: {
    negotiation: 3;                    // Days 1-3: Make offers
    decision: 2;                       // Days 4-5: Players decide
    secondary: 2;                      // Days 6-7: Remaining players
  };
}

interface FreeAgent {
  player_id: string;
  type: 'unrestricted' | 'restricted';

  // Market
  market_value: number;                // Estimated fair salary
  interest_level: number;              // How many teams interested

  // Preferences
  preferences: {
    money: number;                     // 0-100 priority
    winning: number;                   // 0-100 priority
    role: number;                      // 0-100 priority
    location: number;                  // 0-100 priority
    loyalty: number;                   // Bonus to current team
  };

  // Status
  offers: ContractOffer[];
  status: 'available' | 'negotiating' | 'signed';
}
```

## 8.2 Making Offers

```typescript
interface ContractOffer {
  team_id: string;
  player_id: string;

  // Terms
  years: number;                       // 1-4
  salary_per_year: number;
  total_value: number;

  // Options
  player_option_year?: number;
  team_option_year?: number;
  no_trade_clause: boolean;

  // Promises
  role_promised: 'star' | 'starter' | 'rotation' | 'bench';

  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  submitted_at: Date;
}

// Validation
function validateOffer(team: Team, offer: ContractOffer): ValidationResult {
  // Check cap space
  const capSpace = team.salary_cap - team.current_payroll;
  const hasCapSpace = offer.salary_per_year <= capSpace;

  // Check exceptions
  const canUseMLE = canUseMidLevelException(team, offer);
  const canUseMin = offer.salary_per_year <= getMinimumSalary(player);

  // Check roster space
  const hasRosterSpace = team.roster_size < 15;

  if (!hasCapSpace && !canUseMLE && !canUseMin) {
    return { valid: false, reason: 'Insufficient cap space' };
  }

  if (!hasRosterSpace) {
    return { valid: false, reason: 'Roster full' };
  }

  return { valid: true };
}
```

## 8.3 Player Decision Making

```typescript
function evaluateOffers(
  player: FreeAgent,
  offers: ContractOffer[]
): ContractOffer | null {

  if (offers.length === 0) return null;

  const scored = offers.map(offer => ({
    offer,
    score: scoreOffer(player, offer)
  }));

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Top offer must meet minimum threshold
  const bestOffer = scored[0];
  if (bestOffer.score < getMinimumAcceptableScore(player)) {
    return null; // Reject all, wait for better offers
  }

  return bestOffer.offer;
}

function scoreOffer(player: FreeAgent, offer: ContractOffer): number {
  let score = 0;
  const prefs = player.preferences;

  // ═══════════════════════════════════════════════════════════
  // MONEY (weighted by greed)
  // ═══════════════════════════════════════════════════════════

  const salaryRatio = offer.salary_per_year / player.market_value;
  const moneyScore = salaryRatio * 100; // 100 = market value, 150 = overpay
  score += moneyScore * (prefs.money / 100);

  // ═══════════════════════════════════════════════════════════
  // WINNING (weighted by competitiveness)
  // ═══════════════════════════════════════════════════════════

  const team = getTeam(offer.team_id);
  const winningScore = team.championship_odds * 100;
  score += winningScore * (prefs.winning / 100);

  // ═══════════════════════════════════════════════════════════
  // ROLE (weighted by ego)
  // ═══════════════════════════════════════════════════════════

  const roleScore = getRoleScore(offer.role_promised, player.overall);
  score += roleScore * (prefs.role / 100);

  // ═══════════════════════════════════════════════════════════
  // LOYALTY (bonus to current team)
  // ═══════════════════════════════════════════════════════════

  if (offer.team_id === player.current_team_id) {
    score *= (1 + prefs.loyalty / 200); // Up to 50% bonus
  }

  return score;
}
```

## 8.4 Restricted Free Agency

```typescript
interface RestrictedFreeAgent extends FreeAgent {
  type: 'restricted';
  rights_team_id: string;              // Team with matching rights

  // If another team makes an offer:
  // - Rights team has 48 hours to match
  // - If matched, player stays
  // - If not matched, player leaves
}

function handleRFAOffer(
  rfa: RestrictedFreeAgent,
  offer: ContractOffer
): void {
  // Notify rights team
  notifyTeam(rfa.rights_team_id, {
    type: 'rfa_offer_received',
    player_id: rfa.player_id,
    offer: offer,
    match_deadline: addHours(now(), 48)
  });
}

function matchRFAOffer(
  team: Team,
  player: RestrictedFreeAgent,
  offer: ContractOffer
): boolean {
  // Team must match exact terms
  const matchingOffer: ContractOffer = {
    ...offer,
    team_id: team.id
  };

  // Check if team can afford
  if (!canAffordContract(team, matchingOffer)) {
    return false;
  }

  // Match successful - player stays
  signPlayer(player, matchingOffer);
  return true;
}
```

---

# 9. TRADING SYSTEM

## 9.1 Trade Rules

```typescript
interface TradeRules {
  // Salary matching
  salary_matching: {
    // Teams over cap must match salaries within 125% + $100K
    over_cap_matching: {
      percentage: 1.25,
      flat_addition: 100000
    };

    // Teams under cap can absorb salary into cap space
    under_cap_absorption: true;
  };

  // Restrictions
  restrictions: {
    // Recently signed players can't be traded immediately
    newly_signed_restriction_days: 60;

    // Players with NTC must approve
    no_trade_clause_veto: true;

    // Can't trade same player twice in short period
    retrade_restriction_days: 30;
  };

  // Draft picks
  draft_picks: {
    // Can trade picks up to 7 years out
    max_future_years: 7;

    // Must keep at least one first rounder per 2 years (Stepien Rule)
    consecutive_first_round_rule: true;

    // Pick swaps allowed
    pick_swaps_allowed: true;
  };

  // Multi-team trades
  max_teams_in_trade: 3;
}
```

## 9.2 Trade Proposal

```typescript
interface TradeProposal {
  id: string;

  // Teams involved
  teams: string[];                     // 2-3 team IDs

  // Assets
  assets: {
    [teamId: string]: {
      outgoing_players: string[];
      incoming_players: string[];
      outgoing_picks: DraftPick[];
      incoming_picks: DraftPick[];
    };
  };

  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  proposed_by: string;
  proposed_at: Date;
  expires_at: Date;

  // Validation
  is_valid: boolean;
  validation_errors?: string[];

  // For display
  summary: string;
}

function validateTrade(trade: TradeProposal): ValidationResult {
  const errors: string[] = [];

  // 1. Check salary matching
  for (const teamId of trade.teams) {
    const team = getTeam(teamId);
    const outgoing = getSalary(trade.assets[teamId].outgoing_players);
    const incoming = getSalary(trade.assets[teamId].incoming_players);

    if (isOverCap(team)) {
      const maxIncoming = outgoing * 1.25 + 100000;
      if (incoming > maxIncoming) {
        errors.push(`${team.name}: Incoming salary exceeds 125% + $100K`);
      }
    } else {
      const capSpace = team.salary_cap - team.current_payroll + outgoing;
      if (incoming > capSpace) {
        errors.push(`${team.name}: Insufficient cap space`);
      }
    }
  }

  // 2. Check player restrictions
  for (const teamId of trade.teams) {
    for (const playerId of trade.assets[teamId].outgoing_players) {
      const player = getPlayer(playerId);

      // Newly signed
      if (isNewlySigned(player)) {
        errors.push(`${player.name}: Cannot trade within 60 days of signing`);
      }

      // NTC
      if (hasNoTradeClause(player)) {
        errors.push(`${player.name}: Has no-trade clause (needs approval)`);
      }
    }
  }

  // 3. Check roster sizes
  for (const teamId of trade.teams) {
    const team = getTeam(teamId);
    const outCount = trade.assets[teamId].outgoing_players.length;
    const inCount = trade.assets[teamId].incoming_players.length;
    const newSize = team.roster_size - outCount + inCount;

    if (newSize > 15) {
      errors.push(`${team.name}: Would exceed 15-man roster`);
    }
    if (newSize < 12) {
      errors.push(`${team.name}: Would fall below 12-man minimum`);
    }
  }

  // 4. Check Stepien Rule (future picks)
  // ... additional validation

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## 9.3 Trade AI (CPU Evaluation)

```typescript
interface TradeEvaluation {
  team_id: string;
  value_score: number;                 // Positive = good for team
  recommendation: 'accept' | 'reject' | 'counter';
  reasoning: string[];
}

function evaluateTradeForCPU(
  team: Team,
  trade: TradeProposal
): TradeEvaluation {

  let value = 0;
  const reasoning: string[] = [];
  const assets = trade.assets[team.id];

  // ═══════════════════════════════════════════════════════════
  // PLAYER VALUES
  // ═══════════════════════════════════════════════════════════

  for (const playerId of assets.incoming_players) {
    const player = getPlayer(playerId);
    const playerValue = calculatePlayerValue(player, team);
    value += playerValue;
    reasoning.push(`+${playerValue}: Acquiring ${player.name}`);
  }

  for (const playerId of assets.outgoing_players) {
    const player = getPlayer(playerId);
    const playerValue = calculatePlayerValue(player, team);
    value -= playerValue;
    reasoning.push(`-${playerValue}: Losing ${player.name}`);
  }

  // ═══════════════════════════════════════════════════════════
  // DRAFT PICK VALUES
  // ═══════════════════════════════════════════════════════════

  for (const pick of assets.incoming_picks) {
    const pickValue = estimatePickValue(pick);
    value += pickValue;
    reasoning.push(`+${pickValue}: Acquiring ${pick.year} ${pick.round}rd`);
  }

  for (const pick of assets.outgoing_picks) {
    const pickValue = estimatePickValue(pick);
    value -= pickValue;
    reasoning.push(`-${pickValue}: Losing ${pick.year} ${pick.round}rd`);
  }

  // ═══════════════════════════════════════════════════════════
  // TEAM CONTEXT
  // ═══════════════════════════════════════════════════════════

  // Contending teams value win-now players more
  if (isContender(team)) {
    value *= getContenderMultiplier(trade, team);
  }

  // Rebuilding teams value picks and young players more
  if (isRebuilding(team)) {
    value *= getRebuildingMultiplier(trade, team);
  }

  // Need fit bonus
  const needFit = evaluateNeedFit(team, trade);
  value += needFit;

  // ═══════════════════════════════════════════════════════════
  // DECISION
  // ═══════════════════════════════════════════════════════════

  let recommendation: 'accept' | 'reject' | 'counter';

  if (value > 10) {
    recommendation = 'accept';
  } else if (value > -5) {
    recommendation = 'counter';
  } else {
    recommendation = 'reject';
  }

  return { team_id: team.id, value_score: value, recommendation, reasoning };
}

function calculatePlayerValue(player: Player, forTeam: Team): number {
  let value = 0;

  // Base value from overall
  value += player.overall * 1.5;

  // Age factor (younger = more valuable)
  const ageValue = Math.max(0, 30 - player.age) * 2;
  value += ageValue;

  // Potential (if young)
  if (player.age < 26) {
    value += player.hidden.potential * 0.5;
  }

  // Contract value (good contracts more valuable)
  const contractValue = evaluateContract(player.contract);
  value += contractValue;

  // Archetype fit for team
  const archetypeFit = evaluateArchetypeFit(player, forTeam);
  value *= (1 + archetypeFit * 0.2);

  return Math.round(value);
}
```

## 9.4 Trade Finder

```typescript
interface TradeFinder {
  // User specifies what they want
  seeking: {
    positions?: Position[];
    min_overall?: number;
    max_age?: number;
    max_salary?: number;
    archetypes?: string[];
    traits?: string[];
  };

  // User specifies what they'll give up
  available: {
    players: string[];
    picks: DraftPick[];
  };

  // System finds potential matches
  findTrades(): TradeSuggestion[];
}

interface TradeSuggestion {
  partner_team: Team;
  proposal: TradeProposal;
  likelihood: number;                  // % chance they accept
  value_for_us: number;
  value_for_them: number;
}

function findTrades(finder: TradeFinder, team: Team): TradeSuggestion[] {
  const suggestions: TradeSuggestion[] = [];

  // Scan all teams
  for (const otherTeam of getAllTeams()) {
    if (otherTeam.id === team.id) continue;

    // Find players matching criteria
    const matchingPlayers = otherTeam.roster.filter(p =>
      matchesCriteria(p, finder.seeking)
    );

    // For each matching player, try to build a trade
    for (const targetPlayer of matchingPlayers) {
      const proposal = buildTradeProposal(
        team,
        otherTeam,
        targetPlayer,
        finder.available
      );

      if (proposal && proposal.is_valid) {
        const evaluation = evaluateTradeForCPU(otherTeam, proposal);

        suggestions.push({
          partner_team: otherTeam,
          proposal,
          likelihood: calculateAcceptLikelihood(evaluation),
          value_for_us: evaluateTradeForCPU(team, proposal).value_score,
          value_for_them: evaluation.value_score
        });
      }
    }
  }

  // Sort by likelihood * value
  return suggestions.sort((a, b) =>
    (b.likelihood * b.value_for_us) - (a.likelihood * a.value_for_us)
  );
}
```

---

# 10. COACHING & STAFF

## 10.1 Head Coach

```typescript
interface Coach {
  id: string;
  name: string;
  age: number;
  experience_years: number;

  // Coaching ratings (0-99)
  ratings: {
    offense: number;                   // Offensive system quality
    defense: number;                   // Defensive system quality
    player_development: number;        // Young player improvement
    game_management: number;           // Timeouts, rotations, adjustments
    motivation: number;                // Player morale impact
    reputation: number;                // Attracts free agents
  };

  // Systems
  offensive_system: OffensiveSystem;
  defensive_system: DefensiveSystem;

  // Personality
  personality: {
    players_coach: boolean;            // Gets along with players
    disciplinarian: boolean;           // Strict on rotations/effort
    innovator: boolean;                // Tries new things
  };

  // Contract
  salary: number;
  years_remaining: number;

  // Career stats
  career: {
    wins: number;
    losses: number;
    playoff_wins: number;
    playoff_losses: number;
    championships: number;
    coty_awards: number;
  };
}

type OffensiveSystem =
  | 'pace_and_space'                   // Fast, 3-point heavy
  | 'motion'                           // Ball movement, cuts
  | 'iso_heavy'                        // Star-driven
  | 'post_centric'                     // Inside-out
  | 'balanced';

type DefensiveSystem =
  | 'switch_everything'                // Versatile defenders needed
  | 'drop_coverage'                    // Protect paint, give up 3s
  | 'aggressive_trapping'              // Gamble for steals
  | 'pack_the_paint'                   // Clog lanes
  | 'balanced';
```

## 10.2 Coaching Impact

```typescript
// System fit affects team performance
function calculateSystemFit(team: Team, coach: Coach): number {
  let fit = 50; // Base fit

  // Offensive system fit
  const rosterArchetypes = team.roster.map(p => p.archetype);

  if (coach.offensive_system === 'pace_and_space') {
    // Need shooters and athletes
    const shooterCount = countArchetypes(rosterArchetypes, ['sharpshooter', 'stretch_big']);
    fit += shooterCount * 5;
  }

  if (coach.offensive_system === 'post_centric') {
    // Need post players
    const postCount = countArchetypes(rosterArchetypes, ['post_scorer', 'paint_beast']);
    fit += postCount * 8;
  }

  // Defensive system fit
  if (coach.defensive_system === 'switch_everything') {
    // Need versatile defenders
    const versatileCount = countPlayersWithDefenseRange(team);
    fit += versatileCount * 4;
  }

  return clamp(fit, 0, 100);
}

// Coach ratings affect game simulation
function applyCoachModifiers(team: Team, coach: Coach): TeamModifiers {
  return {
    // Offensive rating bonus/penalty
    offensive_rating_mod: (coach.ratings.offense - 50) / 10,

    // Defensive rating bonus/penalty
    defensive_rating_mod: (coach.ratings.defense - 50) / 10,

    // Player development (offseason)
    development_mod: coach.ratings.player_development / 100,

    // In-game adjustments
    timeout_effectiveness: coach.ratings.game_management / 100,
    halftime_adjustment: (coach.ratings.game_management - 50) / 200,
  };
}
```

## 10.3 Assistant Coaches

```typescript
interface CoachingStaff {
  head_coach: Coach;

  assistants: {
    offensive_coordinator?: AssistantCoach;
    defensive_coordinator?: AssistantCoach;
    player_development?: AssistantCoach;
  };

  // Each assistant adds to head coach's ratings
  // OC: +10 max to offense
  // DC: +10 max to defense
  // PD: +15 max to player development
}

interface AssistantCoach {
  id: string;
  name: string;
  specialty: 'offense' | 'defense' | 'development';
  rating: number;                      // 0-99
  salary: number;
}

function calculateEffectiveCoachRatings(staff: CoachingStaff): CoachRatings {
  const base = staff.head_coach.ratings;

  return {
    offense: base.offense + (staff.assistants.offensive_coordinator?.rating || 0) / 10,
    defense: base.defense + (staff.assistants.defensive_coordinator?.rating || 0) / 10,
    player_development: base.player_development +
      (staff.assistants.player_development?.rating || 0) / 6.5,
    // ... etc
  };
}
```

---

# 11. OWNER & FRANCHISE

## 11.1 Owner Profile

```typescript
interface Owner {
  id: string;
  name: string;
  net_worth: number;                   // Affects spending willingness

  // Owner tendencies
  tendencies: {
    spending: 'cheap' | 'moderate' | 'aggressive' | 'unlimited';
    patience: number;                  // 0-100, tolerance for losing
    meddling: number;                  // 0-100, forces decisions
    win_now: boolean;                  // Prioritizes immediate results
  };

  // Goals (generated or set)
  current_goals: OwnerGoal[];

  // Satisfaction
  satisfaction: number;                // 0-100
  years_of_patience: number;           // Before major changes
}

interface OwnerGoal {
  type: 'playoffs' | 'championship' | 'develop_youth' | 'cut_costs' | 'improve_record';
  deadline_seasons: number;
  priority: 'critical' | 'important' | 'preferred';
}
```

## 11.2 Franchise History

```typescript
interface FranchiseHistory {
  team_id: string;

  // Championships
  championships: {
    year: number;
    finals_opponent: string;
    finals_result: string;             // "4-2"
    mvp: string;
  }[];

  // Retired numbers
  retired_numbers: {
    number: number;
    player_name: string;
    years_played: string;
  }[];

  // Hall of Famers
  hall_of_famers: string[];            // Player IDs

  // Records
  franchise_records: {
    single_game_points: { value: number; player: string; date: Date };
    single_season_points: { value: number; player: string; season: number };
    career_points: { value: number; player: string };
    // ... more records
  };

  // Season history
  season_history: {
    year: number;
    wins: number;
    losses: number;
    made_playoffs: boolean;
    playoff_result?: string;
    mvp?: string;
    notable_events: string[];
  }[];
}
```

---

# 12. DYNAMIC EVENTS

## 12.1 Event System

```typescript
interface GameEvent {
  id: string;
  type: EventType;

  // Trigger conditions
  trigger: {
    phase?: SeasonPhase[];             // When can this happen
    probability: number;               // Daily chance
    conditions: EventCondition[];      // Must all be true
  };

  // Content
  headline: string;
  description: string;

  // Choices (if any)
  choices?: EventChoice[];

  // Effects (if no choices, auto-applied)
  effects?: EventEffect[];

  // Timing
  duration_days?: number;
  expires_in_days?: number;
}

type EventType =
  | 'trade_demand'
  | 'contract_holdout'
  | 'injury'
  | 'media_controversy'
  | 'breakout_performance'
  | 'chemistry_issue'
  | 'award_nomination'
  | 'milestone'
  | 'draft_prospect_news'
  | 'coaching_issue'
  | 'owner_demand';
```

## 12.2 Event Examples

```typescript
const EVENTS: GameEvent[] = [
  // ═══════════════════════════════════════════════════════════
  // TRADE DEMANDS
  // ═══════════════════════════════════════════════════════════

  {
    id: 'star_demands_trade',
    type: 'trade_demand',
    trigger: {
      phase: ['regular_season'],
      probability: 0.02,               // 2% daily if conditions met
      conditions: [
        { type: 'player_morale_below', value: 30 },
        { type: 'player_overall_above', value: 80 },
        { type: 'player_ego_above', value: 70 }
      ]
    },
    headline: '{player} demands trade',
    description: '{player} is unhappy with the current situation and has formally requested a trade. His agent expects the team to find a suitable destination.',
    choices: [
      {
        text: 'Explore trade options',
        effects: [
          { type: 'set_player_flag', flag: 'trade_block', value: true }
        ]
      },
      {
        text: 'Try to convince him to stay',
        effects: [
          { type: 'morale_change', value: 10 },
          { type: 'meeting_event', success_chance: 0.3 }
        ]
      },
      {
        text: 'Refuse the request',
        effects: [
          { type: 'morale_change', value: -20 },
          { type: 'chemistry_change', value: -5 }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // INJURIES
  // ═══════════════════════════════════════════════════════════

  {
    id: 'minor_injury',
    type: 'injury',
    trigger: {
      phase: ['regular_season', 'playoffs'],
      probability: 0.03,               // Per game
      conditions: [
        { type: 'player_played_game', value: true }
      ]
    },
    headline: '{player} suffers {injury}',
    description: '{player} will miss {duration} due to a {injury}.',
    effects: [
      { type: 'injury', injury_type: 'random_minor', duration: 'varies' }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // BREAKOUT PERFORMANCES
  // ═══════════════════════════════════════════════════════════

  {
    id: 'young_player_breakout',
    type: 'breakout_performance',
    trigger: {
      phase: ['regular_season'],
      probability: 0.05,
      conditions: [
        { type: 'player_age_under', value: 24 },
        { type: 'recent_games_above_average', games: 5, margin: 1.3 }
      ]
    },
    headline: '{player} emerging as star',
    description: 'After a string of impressive performances, {player} is gaining recognition around the league.',
    effects: [
      { type: 'morale_change', value: 15 },
      { type: 'development_boost', value: 0.1 }
    ]
  },

  // ═══════════════════════════════════════════════════════════
  // CHEMISTRY ISSUES
  // ═══════════════════════════════════════════════════════════

  {
    id: 'locker_room_conflict',
    type: 'chemistry_issue',
    trigger: {
      phase: ['regular_season'],
      probability: 0.01,
      conditions: [
        { type: 'team_losing_streak', value: 4 },
        { type: 'has_high_ego_players', count: 2 }
      ]
    },
    headline: 'Tension in {team} locker room',
    description: 'Sources report growing tension between {player1} and {player2} following recent struggles.',
    choices: [
      {
        text: 'Address it publicly',
        effects: [
          { type: 'chemistry_change', value: -5 },
          { type: 'player_morale_change', target: 'both', value: -10 }
        ]
      },
      {
        text: 'Private team meeting',
        effects: [
          { type: 'chemistry_change', value: 5, chance: 0.6 },
          { type: 'chemistry_change', value: -10, chance: 0.4 }
        ]
      },
      {
        text: 'Ignore and hope it passes',
        effects: [
          { type: 'chemistry_change', value: -3, ongoing_days: 7 }
        ]
      }
    ]
  }
];
```

## 12.3 Injury System Detail

```typescript
interface InjurySystem {
  // Injury types with details
  injuries: {
    [key: string]: {
      name: string;
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      games_out: [number, number];     // Min-max range
      recovery_variance: number;       // How unpredictable
      reinjury_risk: number;           // If rushed back
      permanent_impact?: {             // Long-term effects
        attributes: string[];
        reduction: [number, number];
      };
    };
  };
}

const INJURIES: InjurySystem['injuries'] = {
  ankle_sprain: {
    name: 'Ankle Sprain',
    severity: 'minor',
    games_out: [2, 8],
    recovery_variance: 0.3,
    reinjury_risk: 0.15
  },
  knee_soreness: {
    name: 'Knee Soreness',
    severity: 'minor',
    games_out: [1, 4],
    recovery_variance: 0.2,
    reinjury_risk: 0.1
  },
  hamstring_strain: {
    name: 'Hamstring Strain',
    severity: 'moderate',
    games_out: [5, 15],
    recovery_variance: 0.4,
    reinjury_risk: 0.25
  },
  acl_tear: {
    name: 'ACL Tear',
    severity: 'severe',
    games_out: [50, 80],               // Full season
    recovery_variance: 0.3,
    reinjury_risk: 0.20,
    permanent_impact: {
      attributes: ['speed', 'acceleration', 'vertical'],
      reduction: [3, 8]
    }
  },
  achilles_tear: {
    name: 'Achilles Tear',
    severity: 'severe',
    games_out: [60, 90],
    recovery_variance: 0.35,
    reinjury_risk: 0.15,
    permanent_impact: {
      attributes: ['speed', 'acceleration', 'vertical', 'inside_scoring'],
      reduction: [5, 12]
    }
  }
};
```

---

# 13. AWARDS & RECORDS

## 13.1 Season Awards

```typescript
interface SeasonAwards {
  // Individual
  mvp: {
    winner: string;
    voting: AwardVoting[];
  };
  dpoy: {                              // Defensive Player of Year
    winner: string;
    voting: AwardVoting[];
  };
  roy: {                               // Rookie of Year
    winner: string;
    voting: AwardVoting[];
  };
  sixth_man: {
    winner: string;
    voting: AwardVoting[];
  };
  most_improved: {
    winner: string;
    voting: AwardVoting[];
  };

  // All-League Teams
  all_league_first: string[];          // 5 players
  all_league_second: string[];
  all_league_third: string[];

  all_defensive_first: string[];
  all_defensive_second: string[];

  all_rookie_first: string[];
  all_rookie_second: string[];

  // Playoff
  finals_mvp?: string;

  // Coach
  coach_of_year: string;
}

interface AwardVoting {
  player_id: string;
  first_place_votes: number;
  total_points: number;
  stats_summary: {
    ppg: number;
    rpg: number;
    apg: number;
    team_record: string;
  };
}
```

## 13.2 Award Calculation

```typescript
function calculateMVPVoting(season: Season): AwardVoting[] {
  const candidates: AwardVoting[] = [];

  for (const player of getAllPlayers()) {
    if (!player.team_id) continue;

    const stats = getSeasonStats(player, season);
    const team = getTeam(player.team_id);

    // MVP criteria
    let score = 0;

    // Stats weight (60%)
    score += stats.ppg * 2;
    score += stats.rpg * 1.5;
    score += stats.apg * 1.5;
    score += stats.spg * 3;
    score += stats.bpg * 3;
    score += (stats.fg_pct - 0.45) * 100;
    score += (stats.ts_pct - 0.55) * 150;

    // Team success weight (30%)
    const teamWinPct = team.wins / (team.wins + team.losses);
    score += teamWinPct * 50;

    // Narrative bonus (10%)
    score += calculateNarrativeBonus(player, season);

    candidates.push({
      player_id: player.id,
      first_place_votes: 0,            // Calculated after ranking
      total_points: Math.round(score),
      stats_summary: {
        ppg: stats.ppg,
        rpg: stats.rpg,
        apg: stats.apg,
        team_record: `${team.wins}-${team.losses}`
      }
    });
  }

  // Sort and assign votes
  candidates.sort((a, b) => b.total_points - a.total_points);

  // Top candidate gets most first-place votes
  candidates[0].first_place_votes = 85;
  candidates[1].first_place_votes = 12;
  candidates[2].first_place_votes = 3;

  return candidates.slice(0, 10);
}
```

## 13.3 Records

```typescript
interface LeagueRecords {
  // Single game
  single_game: {
    points: { value: number; player: string; date: Date; team: string };
    rebounds: { value: number; player: string; date: Date; team: string };
    assists: { value: number; player: string; date: Date; team: string };
    steals: { value: number; player: string; date: Date; team: string };
    blocks: { value: number; player: string; date: Date; team: string };
    three_pointers: { value: number; player: string; date: Date; team: string };
  };

  // Single season
  single_season: {
    points: { value: number; player: string; season: number };
    ppg: { value: number; player: string; season: number };
    rebounds: { value: number; player: string; season: number };
    assists: { value: number; player: string; season: number };
    // ... etc
  };

  // Career
  career: {
    points: { value: number; player: string; };
    games: { value: number; player: string; };
    championships: { value: number; player: string; };
    mvps: { value: number; player: string; };
    // ... etc
  };

  // Team records
  team: {
    best_record: { wins: number; losses: number; team: string; season: number };
    worst_record: { wins: number; losses: number; team: string; season: number };
    longest_win_streak: { value: number; team: string; season: number };
    highest_scoring_game: { value: number; team: string; opponent: string; date: Date };
  };
}

function checkForRecords(game: Game): RecordBroken[] {
  const records: RecordBroken[] = [];

  for (const playerStats of game.player_stats) {
    const player = getPlayer(playerStats.player_id);

    // Check single-game records
    if (playerStats.points > leagueRecords.single_game.points.value) {
      records.push({
        type: 'single_game_points',
        new_value: playerStats.points,
        old_value: leagueRecords.single_game.points.value,
        old_holder: leagueRecords.single_game.points.player,
        new_holder: player.name
      });
    }

    // Check other records...
  }

  return records;
}
```

---

# 14. SINGLE-PLAYER FRANCHISE SYSTEM

## 14.1 Franchise Mode Overview

Sports League Office: Basketball is a **single-player only** experience. You control one of 30 franchises while CPU AI manages all other teams realistically.

```typescript
interface Franchise {
  id: string;
  user_id: string;
  team_id: string;

  // Save state
  current_season: number;
  current_day: number;
  phase: SeasonPhase;

  // Settings
  settings: FranchiseSettings;

  // History
  seasons_played: number;
  championships: number;
  playoff_appearances: number;

  // Created/Last played
  created_at: Date;
  last_played_at: Date;
}

interface FranchiseSettings {
  // Difficulty
  cpu_difficulty: 'rookie' | 'pro' | 'all_star' | 'superstar' | 'hall_of_fame';

  // Simulation preferences
  injuries_enabled: boolean;
  salary_cap_enabled: boolean;
  trade_difficulty: 'easy' | 'realistic' | 'hard';

  // Game watching
  auto_sim_games: boolean;
  default_watch_speed: 1 | 2 | 4 | 8;
}
```

## 14.2 CPU Team AI

All 29 other teams are managed by intelligent AI that makes realistic decisions.

```typescript
interface CPUTeamAI {
  // Personality varies by team
  personality: {
    aggressiveness: number;        // 0-100: How aggressive in trades/FA
    youth_focus: number;           // 0-100: Prefer young players vs veterans
    win_now_mode: number;          // 0-100: Sacrifice future for present
    analytics_driven: number;      // 0-100: Value advanced stats
  };

  // Decision making
  decisions: {
    // Trades
    evaluate_trade: (proposal: TradeProposal) => TradeResponse;
    propose_trades: () => TradeProposal[];

    // Free Agency
    target_free_agents: () => Player[];
    make_offers: () => ContractOffer[];

    // Draft
    evaluate_prospects: () => DraftBoard;
    make_pick: (available: Player[]) => Player;

    // Roster
    set_lineup: () => Lineup;
    set_rotation: () => Rotation;

    // During season
    make_waiver_claims: () => Player[];
    release_players: () => Player[];
  };
}

interface TradeResponse {
  accepted: boolean;
  counter_offer?: TradeProposal;
  rejection_reason?: string;
}
```

## 14.3 Season Advancement

Player controls when to advance time. Can simulate at various speeds.

```typescript
interface AdvancementOptions {
  // Advance one day at a time
  advance_day: () => DayResults;

  // Advance to next game
  advance_to_next_game: () => GameResults;

  // Advance week
  advance_week: () => WeekResults;

  // Simulate rest of regular season
  sim_to_playoffs: () => SeasonResults;

  // Simulate to offseason
  sim_to_offseason: () => PlayoffResults;
}

interface DayResults {
  games_played: Game[];
  transactions: Transaction[];
  injuries: InjuryUpdate[];
  news: NewsItem[];
}
```

## 14.4 Save System

Multiple save slots with cloud sync.

```typescript
interface SaveSystem {
  // Local saves
  max_saves: 5;
  auto_save: boolean;
  auto_save_frequency: 'daily' | 'weekly' | 'monthly';

  // Save data
  save: {
    franchise: Franchise;
    league_state: LeagueState;
    player_data: Player[];
    team_data: Team[];
    history: SeasonHistory[];
  };

  // Cloud sync (tied to purchase/account)
  cloud_enabled: boolean;
  last_cloud_sync: Date;
}

---

# 15. USER INTERFACE

## 15.1 Screen Map

```
NAVIGATION STRUCTURE

┌─────────────────────────────────────────────────────────────────┐
│                         TOP NAV                                  │
│  [Logo] [Dashboard] [Team] [League] [Games] ──── [Inbox] [Menu] │
└─────────────────────────────────────────────────────────────────┘

SCREENS:

Dashboard (/)
├── Team Summary Card
├── Upcoming Games
├── Recent Results
├── Notifications
└── Quick Actions

Team (/team)
├── Roster (/team/roster)
│   ├── Player Cards
│   ├── Lineup Editor
│   └── Rotation Settings
├── Salary (/team/salary)
│   ├── Cap Space
│   ├── Contracts
│   └── Luxury Tax
├── Staff (/team/staff)
│   ├── Coach
│   └── Assistants
└── Facilities (/team/facilities)

League (/league)
├── Standings (/league/standings)
├── Schedule (/league/schedule)
├── Players (/league/players)
│   └── Player Detail (/league/players/:id)
├── Teams (/league/teams)
│   └── Team Detail (/league/teams/:id)
├── Transactions (/league/transactions)
├── Free Agents (/league/free-agents)
├── Trade Center (/league/trades)
└── Draft (/league/draft)

Games (/games)
├── Today's Games (/games/today)
├── Game Detail (/games/:id)
│   ├── Watch (3D View)
│   ├── Box Score
│   └── Play-by-Play
└── Schedule (/games/schedule)

Settings (/settings)
├── Game Settings
├── League Settings (Commissioner)
└── Account
```

## 15.2 Design System (EA FIFA Style - White Theme)

The UI uses a clean, premium white theme inspired by EA SPORTS FC. Everything should feel modern, polished, and professional.

```typescript
// Design system - CLEAN WHITE THEME (EA FIFA Style)

interface DesignSystem {
  // Colors - WHITE THEME
  colors: {
    // Primary brand
    primary: '#1a56db';           // Deep blue - actions, links
    primaryHover: '#1e40af';      // Darker blue on hover
    primaryLight: '#dbeafe';      // Light blue backgrounds

    // Backgrounds (WHITE theme)
    background: '#ffffff';        // Pure white - page background
    surface: '#f8fafc';           // Light gray - cards, panels
    elevated: '#f1f5f9';          // Hover states
    muted: '#e2e8f0';             // Muted backgrounds

    // Text (DARK on white)
    text: '#0f172a';              // Near black - main text
    textSecondary: '#475569';     // Medium gray - secondary
    textMuted: '#94a3b8';         // Light gray - disabled

    // Semantic
    success: '#16a34a';           // Green - wins, positive
    warning: '#d97706';           // Amber - caution
    danger: '#dc2626';            // Red - losses, negative

    // Badges/Accents
    gold: '#ca8a04';              // Gold tier
    silver: '#71717a';            // Silver tier
    bronze: '#a16207';            // Bronze tier

    // Borders
    border: '#e2e8f0';            // Light border
    borderStrong: '#cbd5e1';      // Emphasis border
    borderFocus: '#1a56db';       // Focus rings
  };

  // Typography
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif';
    fontMono: 'JetBrains Mono, Fira Code, monospace';
    sizes: {
      xs: '0.75rem';     // 12px - badges, labels
      sm: '0.875rem';    // 14px - secondary text
      base: '1rem';      // 16px - body
      lg: '1.125rem';    // 18px - subheadings
      xl: '1.25rem';     // 20px - card titles
      '2xl': '1.5rem';   // 24px - section headers
      '3xl': '1.875rem'; // 30px - page titles
      '4xl': '2.25rem';  // 36px - hero numbers
    };
    weights: {
      normal: 400;
      medium: 500;
      semibold: 600;
      bold: 700;
    };
  };

  // Shadows (subtle for white theme)
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)';
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)';
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)';
  };

  // Border radius
  borderRadius: {
    sm: '0.25rem';    // 4px
    md: '0.375rem';   // 6px
    lg: '0.5rem';     // 8px
    xl: '0.75rem';    // 12px
    full: '9999px';   // Pills, avatars
  };

  // Spacing
  spacing: {
    xs: '0.25rem';    // 4px
    sm: '0.5rem';     // 8px
    md: '1rem';       // 16px
    lg: '1.5rem';     // 24px
    xl: '2rem';       // 32px
  };
}
```

### Stat Display Colors (Light Theme)

```typescript
// Stat rating colors on white background
const STAT_COLORS = {
  elite: 'text-emerald-600',   // 90-99 - Bright green
  great: 'text-green-600',     // 80-89 - Green
  good: 'text-blue-600',       // 70-79 - Blue
  average: 'text-slate-600',   // 60-69 - Gray
  below: 'text-amber-600',     // 50-59 - Amber
  poor: 'text-orange-600',     // 40-49 - Orange
  bad: 'text-red-600',         // 0-39 - Red
};

// Badge tier styling
const BADGE_TIERS = {
  hall_of_fame: 'text-yellow-600 bg-yellow-50 border border-yellow-200',
  gold: 'text-amber-600 bg-amber-50 border border-amber-200',
  silver: 'text-slate-500 bg-slate-50 border border-slate-200',
  bronze: 'text-orange-700 bg-orange-50 border border-orange-200',
};
```

### Design Principles

1. **White Space** - Clean layouts with breathing room
2. **Subtle Shadows** - Depth without heaviness
3. **Bold Typography** - Clear visual hierarchy
4. **Card-Based** - Information in well-defined containers
5. **Pop of Color** - Primary blue and stats colors stand out
6. **Premium Feel** - Every interaction polished

---

# APPENDIX A: Complete Formulas

## A.1 Overall Rating Formula

```typescript
// Position-weighted overall rating calculation
// Each position values different attributes

const POSITION_WEIGHTS: Record<Position, Record<Attribute, number>> = {
  PG: {
    // Offense (60% weight for PG)
    inside_scoring: 0.03,
    mid_range: 0.06,
    three_point: 0.10,
    free_throw: 0.04,
    ball_handling: 0.15,
    passing: 0.14,
    offensive_iq: 0.08,
    // Defense (22% weight)
    interior_defense: 0.01,
    perimeter_defense: 0.10,
    steal: 0.06,
    block: 0.01,
    defensive_iq: 0.04,
    // Physical (10% weight)
    speed: 0.04,
    acceleration: 0.03,
    strength: 0.01,
    vertical: 0.01,
    stamina: 0.01,
    // Mental (8% weight)
    clutch: 0.03,
    consistency: 0.02,
    work_ethic: 0.02,
    basketball_iq: 0.01
  },

  SG: {
    inside_scoring: 0.04,
    mid_range: 0.10,
    three_point: 0.14,
    free_throw: 0.04,
    ball_handling: 0.08,
    passing: 0.06,
    offensive_iq: 0.06,
    interior_defense: 0.02,
    perimeter_defense: 0.12,
    steal: 0.06,
    block: 0.02,
    defensive_iq: 0.04,
    speed: 0.05,
    acceleration: 0.04,
    strength: 0.02,
    vertical: 0.03,
    stamina: 0.02,
    clutch: 0.03,
    consistency: 0.02,
    work_ethic: 0.01,
    basketball_iq: 0.00
  },

  SF: {
    inside_scoring: 0.08,
    mid_range: 0.10,
    three_point: 0.10,
    free_throw: 0.04,
    ball_handling: 0.04,
    passing: 0.04,
    offensive_iq: 0.05,
    interior_defense: 0.06,
    perimeter_defense: 0.10,
    steal: 0.04,
    block: 0.04,
    defensive_iq: 0.05,
    speed: 0.04,
    acceleration: 0.03,
    strength: 0.04,
    vertical: 0.04,
    stamina: 0.02,
    clutch: 0.03,
    consistency: 0.02,
    work_ethic: 0.02,
    basketball_iq: 0.02
  },

  PF: {
    inside_scoring: 0.12,
    mid_range: 0.08,
    three_point: 0.06,
    free_throw: 0.04,
    ball_handling: 0.02,
    passing: 0.03,
    offensive_iq: 0.04,
    interior_defense: 0.14,
    perimeter_defense: 0.04,
    steal: 0.02,
    block: 0.10,
    defensive_iq: 0.05,
    speed: 0.02,
    acceleration: 0.02,
    strength: 0.08,
    vertical: 0.05,
    stamina: 0.02,
    clutch: 0.02,
    consistency: 0.02,
    work_ethic: 0.02,
    basketball_iq: 0.01
  },

  C: {
    inside_scoring: 0.14,
    mid_range: 0.04,
    three_point: 0.02,
    free_throw: 0.03,
    ball_handling: 0.01,
    passing: 0.03,
    offensive_iq: 0.04,
    interior_defense: 0.18,
    perimeter_defense: 0.02,
    steal: 0.01,
    block: 0.14,
    defensive_iq: 0.05,
    speed: 0.01,
    acceleration: 0.01,
    strength: 0.12,
    vertical: 0.06,
    stamina: 0.02,
    clutch: 0.02,
    consistency: 0.02,
    work_ethic: 0.02,
    basketball_iq: 0.01
  }
};

function calculateOverall(player: Player): number {
  const weights = POSITION_WEIGHTS[player.position];
  let overall = 0;

  for (const [attr, weight] of Object.entries(weights)) {
    overall += player.attributes[attr] * weight;
  }

  // Apply trait bonuses (some traits affect overall)
  for (const trait of player.traits) {
    if (trait.overall_modifier) {
      overall += trait.overall_modifier;
    }
  }

  return Math.round(Math.min(99, Math.max(40, overall)));
}
```

## A.2 Shot Probability Formulas

```typescript
// Complete shot probability calculation system

interface ShotContext {
  shooter: Player;
  defender: Player | null;
  shot_type: ShotType;
  shot_distance: number;          // feet from basket
  shot_clock: number;             // seconds remaining
  game_clock: number;             // seconds remaining in quarter
  score_differential: number;     // positive = shooter's team winning
  quarter: number;
  is_fast_break: boolean;
  is_contested: boolean;
  contest_level: 'open' | 'light' | 'moderate' | 'heavy' | 'smothered';
  shooter_fatigue: number;        // 0-100 (100 = exhausted)
  consecutive_minutes: number;    // minutes without rest
}

// Base percentages by shot type (for 99-rated attribute)
const BASE_PERCENTAGES: Record<ShotType, number> = {
  dunk: 0.95,
  layup: 0.72,
  floater: 0.52,
  hook_shot: 0.55,
  post_fadeaway: 0.48,
  mid_range_pull_up: 0.47,
  mid_range_catch_shoot: 0.50,
  three_point_catch_shoot: 0.43,
  three_point_pull_up: 0.38,
  three_point_step_back: 0.36,
  three_point_corner: 0.45,
  three_point_deep: 0.32,
  free_throw: 0.88,
  alley_oop: 0.85,
  putback: 0.60,
  tip_in: 0.50
};

// Contest modifiers (multiplied against base %)
const CONTEST_MODIFIERS: Record<ContestLevel, number> = {
  open: 1.10,           // +10% for wide open shots
  light: 1.00,          // baseline
  moderate: 0.85,       // -15%
  heavy: 0.65,          // -35%
  smothered: 0.40       // -60%
};

// Fatigue modifiers
function getFatigueModifier(fatigue: number): number {
  if (fatigue < 30) return 1.0;
  if (fatigue < 50) return 0.97;
  if (fatigue < 70) return 0.92;
  if (fatigue < 85) return 0.85;
  return 0.75;
}

// Clutch modifiers (last 2 minutes, close game)
function getClutchModifier(context: ShotContext, player: Player): number {
  const isClutch = context.game_clock <= 120 &&
                   context.quarter >= 4 &&
                   Math.abs(context.score_differential) <= 5;

  if (!isClutch) return 1.0;

  // Clutch attribute affects performance in these moments
  const clutchRating = player.attributes.clutch;

  // 50 clutch = neutral, below = penalty, above = bonus
  return 0.85 + (clutchRating / 99) * 0.30;  // Range: 0.85 to 1.15
}

// Full shot calculation
function calculateShotProbability(context: ShotContext): number {
  const { shooter, defender, shot_type } = context;

  // 1. Get relevant attribute
  let attribute: number;
  switch (shot_type) {
    case 'dunk':
    case 'layup':
    case 'floater':
    case 'hook_shot':
    case 'post_fadeaway':
    case 'alley_oop':
    case 'putback':
    case 'tip_in':
      attribute = shooter.attributes.inside_scoring;
      break;
    case 'mid_range_pull_up':
    case 'mid_range_catch_shoot':
      attribute = shooter.attributes.mid_range;
      break;
    default:
      attribute = shooter.attributes.three_point;
  }

  // 2. Calculate base percentage
  const maxPct = BASE_PERCENTAGES[shot_type];
  let probability = (attribute / 99) * maxPct;

  // 3. Apply contest modifier
  probability *= CONTEST_MODIFIERS[context.contest_level];

  // 4. Apply defender's skill (if contested)
  if (defender && context.is_contested) {
    const defenseRating = shot_type.includes('three') || shot_type.includes('mid')
      ? defender.attributes.perimeter_defense
      : defender.attributes.interior_defense;

    // Defense reduces probability further
    const defenseImpact = 1 - ((defenseRating - 50) / 99) * 0.15;
    probability *= defenseImpact;
  }

  // 5. Apply fatigue
  probability *= getFatigueModifier(context.shooter_fatigue);

  // 6. Apply clutch modifier
  probability *= getClutchModifier(context, shooter);

  // 7. Apply consistency trait
  const consistencyMod = (shooter.attributes.consistency - 50) / 100;
  // Low consistency = more variance, high = more reliable
  // (This affects the actual roll, not the probability directly)

  // 8. Apply relevant traits
  for (const trait of shooter.traits) {
    if (trait.shot_modifier && trait.applies_to(shot_type, context)) {
      probability *= trait.shot_modifier;
    }
  }

  // 9. Clamp to reasonable bounds
  return Math.max(0.02, Math.min(0.98, probability));
}

// Trait shot modifiers
const SHOT_TRAIT_MODIFIERS: Record<string, TraitShotModifier> = {
  'Sharpshooter': {
    applies_to: (type) => type.includes('three'),
    modifier: 1.08  // +8% on all threes
  },
  'Deep Range': {
    applies_to: (type) => type === 'three_point_deep',
    modifier: 1.25  // +25% on deep threes
  },
  'Mid Range Maestro': {
    applies_to: (type) => type.includes('mid_range'),
    modifier: 1.10  // +10% on mid-range
  },
  'Acrobat': {
    applies_to: (type) => ['layup', 'floater'].includes(type),
    modifier: 1.12  // +12% on acrobatic finishes
  },
  'Posterizer': {
    applies_to: (type, ctx) => type === 'dunk' && ctx.is_contested,
    modifier: 1.20  // +20% on contested dunks
  },
  'Cold Blooded': {
    applies_to: (type, ctx) => ctx.game_clock <= 120 && ctx.quarter >= 4,
    modifier: 1.15  // +15% in clutch
  },
  'Volume Shooter': {
    applies_to: (type, ctx) => ctx.shooter.game_stats.fga > 15,
    modifier: 1.05  // +5% when taking many shots
  },
  'Spot Up Specialist': {
    applies_to: (type) => type.includes('catch_shoot'),
    modifier: 1.10  // +10% on catch and shoot
  },
  'Off-Ball Pest': {
    // Defensive trait - doesn't help shooting
    modifier: 1.0
  }
};
```

## A.3 Development Formulas

```typescript
// Player development/decline system

interface DevelopmentFactors {
  age: number;
  potential: number;           // Hidden 40-99
  peak_age: number;            // Hidden 26-33
  work_ethic: number;          // 40-99 attribute
  minutes_played: number;      // Season total
  team_development_rating: number;  // Coach/facility quality
  is_starting: boolean;
  playoff_experience: boolean;
}

// Age curves
const AGE_MODIFIERS = {
  physical: {
    // Physical attributes peak early, decline faster
    19: 0.95, 20: 0.98, 21: 1.00, 22: 1.02, 23: 1.03,
    24: 1.04, 25: 1.04, 26: 1.03, 27: 1.02, 28: 1.00,
    29: 0.97, 30: 0.94, 31: 0.90, 32: 0.85, 33: 0.80,
    34: 0.74, 35: 0.68, 36: 0.62, 37: 0.55, 38: 0.48
  },
  skill: {
    // Skill attributes peak later, decline slower
    19: 0.90, 20: 0.93, 21: 0.96, 22: 0.98, 23: 1.00,
    24: 1.02, 25: 1.04, 26: 1.05, 27: 1.06, 28: 1.06,
    29: 1.05, 30: 1.04, 31: 1.02, 32: 1.00, 33: 0.97,
    34: 0.94, 35: 0.90, 36: 0.86, 37: 0.81, 38: 0.76
  },
  mental: {
    // Mental attributes peak latest, decline slowest
    19: 0.85, 20: 0.88, 21: 0.91, 22: 0.94, 23: 0.96,
    24: 0.98, 25: 1.00, 26: 1.02, 27: 1.04, 28: 1.06,
    29: 1.07, 30: 1.08, 31: 1.08, 32: 1.07, 33: 1.06,
    34: 1.04, 35: 1.02, 36: 1.00, 37: 0.97, 38: 0.94
  }
};

const ATTRIBUTE_CATEGORIES = {
  physical: ['speed', 'acceleration', 'strength', 'vertical', 'stamina'],
  skill: ['inside_scoring', 'mid_range', 'three_point', 'free_throw',
          'ball_handling', 'passing', 'interior_defense', 'perimeter_defense',
          'steal', 'block'],
  mental: ['offensive_iq', 'defensive_iq', 'clutch', 'consistency',
           'work_ethic', 'basketball_iq']
};

function calculateOffseasonDevelopment(player: Player, factors: DevelopmentFactors): AttributeChanges {
  const changes: AttributeChanges = {};
  const distanceFromPeak = factors.age - factors.peak_age;
  const potentialCeiling = factors.potential;

  for (const [attr, value] of Object.entries(player.attributes)) {
    // Determine category
    let category: 'physical' | 'skill' | 'mental';
    if (ATTRIBUTE_CATEGORIES.physical.includes(attr)) category = 'physical';
    else if (ATTRIBUTE_CATEGORIES.skill.includes(attr)) category = 'skill';
    else category = 'mental';

    // Get age modifier
    const ageMod = AGE_MODIFIERS[category][Math.min(38, Math.max(19, factors.age))];

    // Calculate base change
    let baseChange = 0;

    if (distanceFromPeak < -3) {
      // Young player, developing
      baseChange = Math.random() * 4 + 1;  // +1 to +5
    } else if (distanceFromPeak < 0) {
      // Approaching peak
      baseChange = Math.random() * 2;      // 0 to +2
    } else if (distanceFromPeak < 3) {
      // At peak
      baseChange = Math.random() * 1.5 - 0.5;  // -0.5 to +1
    } else {
      // Declining
      baseChange = -Math.random() * 3 - 1;    // -1 to -4
    }

    // Apply age modifier
    baseChange *= ageMod;

    // Work ethic bonus (up to +2 for 99 work ethic)
    baseChange += (factors.work_ethic - 50) / 99 * 2;

    // Minutes played bonus (starters develop faster)
    if (factors.minutes_played > 2000) baseChange += 0.5;
    else if (factors.minutes_played > 1000) baseChange += 0.25;
    else if (factors.minutes_played < 200) baseChange -= 0.5;

    // Team development rating
    baseChange += (factors.team_development_rating - 50) / 100;

    // Playoff experience bonus
    if (factors.playoff_experience) baseChange += 0.3;

    // Cap at potential
    const newValue = value + baseChange;
    const cappedValue = Math.min(potentialCeiling, Math.max(40, newValue));

    changes[attr] = Math.round(cappedValue) - value;
  }

  return changes;
}

// Trait acquisition during development
function checkTraitAcquisition(player: Player, season: Season): Trait | null {
  // Players can gain traits based on performance
  const stats = getSeasonStats(player, season);

  // Check each possible trait
  const possibleTraits = ACQUIRABLE_TRAITS.filter(t =>
    !player.traits.includes(t) && t.meetsRequirements(stats, player)
  );

  if (possibleTraits.length === 0) return null;

  // 20% chance to gain a qualifying trait
  if (Math.random() < 0.20) {
    return possibleTraits[Math.floor(Math.random() * possibleTraits.length)];
  }

  return null;
}

// Trait loss (rare)
function checkTraitLoss(player: Player, season: Season): Trait | null {
  // Only lose traits that have performance requirements
  const lossibleTraits = player.traits.filter(t =>
    t.can_be_lost && !t.meetsRequirements(getSeasonStats(player, season), player)
  );

  if (lossibleTraits.length === 0) return null;

  // 10% chance to lose a trait you no longer qualify for
  if (Math.random() < 0.10) {
    return lossibleTraits[Math.floor(Math.random() * lossibleTraits.length)];
  }

  return null;
}
```

---

# APPENDIX B: Data Tables

## B.1 All 16 Teams (Complete)

```typescript
const ALL_TEAMS: TeamProfile[] = [
  // ═══════════════════════════════════════════════════════════════
  // EASTERN CONFERENCE - ATLANTIC DIVISION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'nyt',
    city: 'New York',
    name: 'Titans',
    abbreviation: 'NYT',
    conference: 'Eastern',
    division: 'Atlantic',
    colors: {
      primary: '#FF6B35',      // Burnt Orange
      secondary: '#1E3A5F',    // Navy Blue
      accent: '#FFFFFF',       // White
      court_primary: '#C4A484', // Light hardwood
      court_paint: '#1E3A5F'   // Navy paint
    },
    arena: {
      name: 'Madison Center',
      capacity: 19500,
      location: 'Manhattan, NY',
      court_design: 'classic'  // Traditional look
    },
    market_size: 'large',
    prestige: 90,
    fan_loyalty: 85,
    owner_patience: 60,        // Demanding market
    history: {
      championships: 3,
      playoff_appearances: 25,
      founded_year: 1946
    }
  },

  {
    id: 'bos',
    city: 'Boston',
    name: 'Shamrocks',
    abbreviation: 'BOS',
    conference: 'Eastern',
    division: 'Atlantic',
    colors: {
      primary: '#00843D',      // Kelly Green
      secondary: '#C4A767',    // Gold
      accent: '#FFFFFF',       // White
      court_primary: '#C4A484', // Classic hardwood
      court_paint: '#00843D'   // Green paint
    },
    arena: {
      name: 'Garden Arena',
      capacity: 18600,
      location: 'Boston, MA',
      court_design: 'classic'
    },
    market_size: 'large',
    prestige: 95,
    fan_loyalty: 92,
    owner_patience: 65,
    history: {
      championships: 8,
      playoff_appearances: 32,
      founded_year: 1946
    }
  },

  {
    id: 'phi',
    city: 'Philadelphia',
    name: 'Founders',
    abbreviation: 'PHI',
    conference: 'Eastern',
    division: 'Atlantic',
    colors: {
      primary: '#003087',      // Royal Blue
      secondary: '#C41E3A',    // Red
      accent: '#FFFFFF',       // White
      court_primary: '#D4B896', // Medium hardwood
      court_paint: '#003087'   // Blue paint
    },
    arena: {
      name: 'Liberty Center',
      capacity: 20500,
      location: 'Philadelphia, PA',
      court_design: 'modern'
    },
    market_size: 'large',
    prestige: 75,
    fan_loyalty: 78,
    owner_patience: 55,
    history: {
      championships: 2,
      playoff_appearances: 18,
      founded_year: 1949
    }
  },

  {
    id: 'tor',
    city: 'Toronto',
    name: 'Huskies',
    abbreviation: 'TOR',
    conference: 'Eastern',
    division: 'Atlantic',
    colors: {
      primary: '#6B3FA0',      // Deep Purple
      secondary: '#FFFFFF',    // White
      accent: '#C4CED4',       // Silver
      court_primary: '#E8DCC4', // Light maple
      court_paint: '#6B3FA0'   // Purple paint
    },
    arena: {
      name: 'North Court',
      capacity: 19800,
      location: 'Toronto, ON',
      court_design: 'modern'
    },
    market_size: 'large',
    prestige: 70,
    fan_loyalty: 88,
    owner_patience: 70,
    history: {
      championships: 1,
      playoff_appearances: 12,
      founded_year: 1995
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // EASTERN CONFERENCE - CENTRAL DIVISION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'chi',
    city: 'Chicago',
    name: 'Windigo',
    abbreviation: 'CHI',
    conference: 'Eastern',
    division: 'Central',
    colors: {
      primary: '#C8102E',      // Bull Red
      secondary: '#000000',    // Black
      accent: '#FFFFFF',       // White
      court_primary: '#C4A484', // Classic hardwood
      court_paint: '#C8102E'   // Red paint
    },
    arena: {
      name: 'Windy City Arena',
      capacity: 20900,
      location: 'Chicago, IL',
      court_design: 'classic'
    },
    market_size: 'large',
    prestige: 88,
    fan_loyalty: 90,
    owner_patience: 50,
    history: {
      championships: 6,
      playoff_appearances: 28,
      founded_year: 1966
    }
  },

  {
    id: 'det',
    city: 'Detroit',
    name: 'Engines',
    abbreviation: 'DET',
    conference: 'Eastern',
    division: 'Central',
    colors: {
      primary: '#4682B4',      // Steel Blue
      secondary: '#C0C0C0',    // Silver
      accent: '#1C2526',       // Charcoal
      court_primary: '#B8A070', // Darker hardwood
      court_paint: '#4682B4'   // Steel paint
    },
    arena: {
      name: 'Motor City Center',
      capacity: 20100,
      location: 'Detroit, MI',
      court_design: 'industrial'
    },
    market_size: 'medium',
    prestige: 72,
    fan_loyalty: 75,
    owner_patience: 65,
    history: {
      championships: 3,
      playoff_appearances: 20,
      founded_year: 1948
    }
  },

  {
    id: 'mia',
    city: 'Miami',
    name: 'Vice',
    abbreviation: 'MIA',
    conference: 'Eastern',
    division: 'Central',
    colors: {
      primary: '#F9A1BC',      // Miami Pink
      secondary: '#41D3BD',    // Cyan/Teal
      accent: '#000000',       // Black
      court_primary: '#1C1C1C', // Black court
      court_paint: '#F9A1BC'   // Pink paint
    },
    arena: {
      name: 'South Beach Arena',
      capacity: 19600,
      location: 'Miami, FL',
      court_design: 'neon'     // Vice aesthetic
    },
    market_size: 'large',
    prestige: 80,
    fan_loyalty: 65,
    owner_patience: 45,
    history: {
      championships: 3,
      playoff_appearances: 22,
      founded_year: 1988
    }
  },

  {
    id: 'atl',
    city: 'Atlanta',
    name: 'Phoenixes',
    abbreviation: 'ATL',
    conference: 'Eastern',
    division: 'Central',
    colors: {
      primary: '#C8102E',      // Phoenix Red
      secondary: '#FF8C00',    // Orange
      accent: '#FFFFFF',       // White
      court_primary: '#D4B896', // Medium hardwood
      court_paint: '#C8102E'   // Red paint
    },
    arena: {
      name: 'Peachtree Center',
      capacity: 18100,
      location: 'Atlanta, GA',
      court_design: 'modern'
    },
    market_size: 'medium',
    prestige: 65,
    fan_loyalty: 60,
    owner_patience: 70,
    history: {
      championships: 1,
      playoff_appearances: 15,
      founded_year: 1968
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // WESTERN CONFERENCE - PACIFIC DIVISION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'lal',
    city: 'Los Angeles',
    name: 'Waves',
    abbreviation: 'LAW',
    conference: 'Western',
    division: 'Pacific',
    colors: {
      primary: '#00CED1',      // Aqua/Turquoise
      secondary: '#FFD700',    // Gold
      accent: '#FFFFFF',       // White
      court_primary: '#E8DCC4', // Light maple
      court_paint: '#00CED1'   // Aqua paint
    },
    arena: {
      name: 'Pacific Center',
      capacity: 19100,
      location: 'Los Angeles, CA',
      court_design: 'beach'    // Coastal vibe
    },
    market_size: 'large',
    prestige: 92,
    fan_loyalty: 80,
    owner_patience: 40,
    history: {
      championships: 7,
      playoff_appearances: 35,
      founded_year: 1960
    }
  },

  {
    id: 'sfo',
    city: 'San Francisco',
    name: 'Gold',
    abbreviation: 'SFG',
    conference: 'Western',
    division: 'Pacific',
    colors: {
      primary: '#FFD700',      // Gold
      secondary: '#000000',    // Black
      accent: '#FFFFFF',       // White
      court_primary: '#C4A484', // Classic hardwood
      court_paint: '#FFD700'   // Gold paint
    },
    arena: {
      name: 'Bay Arena',
      capacity: 18000,
      location: 'San Francisco, CA',
      court_design: 'tech'     // Modern tech aesthetic
    },
    market_size: 'large',
    prestige: 85,
    fan_loyalty: 82,
    owner_patience: 50,
    history: {
      championships: 4,
      playoff_appearances: 24,
      founded_year: 1962
    }
  },

  {
    id: 'sea',
    city: 'Seattle',
    name: 'Sasquatch',
    abbreviation: 'SEA',
    conference: 'Western',
    division: 'Pacific',
    colors: {
      primary: '#228B22',      // Forest Green
      secondary: '#8B4513',    // Brown
      accent: '#FFFFFF',       // White
      court_primary: '#B8A070', // Natural wood
      court_paint: '#228B22'   // Green paint
    },
    arena: {
      name: 'Emerald Court',
      capacity: 17500,
      location: 'Seattle, WA',
      court_design: 'nature'   // Pacific Northwest theme
    },
    market_size: 'medium',
    prestige: 68,
    fan_loyalty: 88,
    owner_patience: 75,
    history: {
      championships: 1,
      playoff_appearances: 14,
      founded_year: 1967
    }
  },

  {
    id: 'phx',
    city: 'Phoenix',
    name: 'Scorpions',
    abbreviation: 'PHX',
    conference: 'Western',
    division: 'Pacific',
    colors: {
      primary: '#FF6600',      // Desert Orange
      secondary: '#000000',    // Black
      accent: '#FFD700',       // Gold
      court_primary: '#D4B896', // Desert sand wood
      court_paint: '#FF6600'   // Orange paint
    },
    arena: {
      name: 'Desert Dome',
      capacity: 18400,
      location: 'Phoenix, AZ',
      court_design: 'desert'
    },
    market_size: 'medium',
    prestige: 70,
    fan_loyalty: 72,
    owner_patience: 60,
    history: {
      championships: 0,
      playoff_appearances: 16,
      founded_year: 1968
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // WESTERN CONFERENCE - MOUNTAIN DIVISION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'den',
    city: 'Denver',
    name: 'Altitude',
    abbreviation: 'DEN',
    conference: 'Western',
    division: 'Mountain',
    colors: {
      primary: '#0D2240',      // Navy Blue
      secondary: '#87CEEB',    // Sky Blue
      accent: '#FFD700',       // Gold
      court_primary: '#C4A484', // Classic hardwood
      court_paint: '#0D2240'   // Navy paint
    },
    arena: {
      name: 'Mile High Court',
      capacity: 19500,
      location: 'Denver, CO',
      court_design: 'mountain'
    },
    market_size: 'medium',
    prestige: 75,
    fan_loyalty: 78,
    owner_patience: 65,
    history: {
      championships: 1,
      playoff_appearances: 18,
      founded_year: 1976
    }
  },

  {
    id: 'dal',
    city: 'Dallas',
    name: 'Stampede',
    abbreviation: 'DAL',
    conference: 'Western',
    division: 'Mountain',
    colors: {
      primary: '#002B5C',      // Dallas Navy
      secondary: '#C0C0C0',    // Silver
      accent: '#FFFFFF',       // White
      court_primary: '#D4B896', // Medium hardwood
      court_paint: '#002B5C'   // Navy paint
    },
    arena: {
      name: 'Lone Star Arena',
      capacity: 19200,
      location: 'Dallas, TX',
      court_design: 'western'
    },
    market_size: 'large',
    prestige: 78,
    fan_loyalty: 74,
    owner_patience: 55,
    history: {
      championships: 2,
      playoff_appearances: 20,
      founded_year: 1980
    }
  },

  {
    id: 'hou',
    city: 'Houston',
    name: 'Fuel',
    abbreviation: 'HOU',
    conference: 'Western',
    division: 'Mountain',
    colors: {
      primary: '#FF6600',      // Energy Orange
      secondary: '#4A4A4A',    // Gray
      accent: '#FFFFFF',       // White
      court_primary: '#B8A070', // Darker hardwood
      court_paint: '#FF6600'   // Orange paint
    },
    arena: {
      name: 'Energy Center',
      capacity: 18300,
      location: 'Houston, TX',
      court_design: 'industrial'
    },
    market_size: 'large',
    prestige: 76,
    fan_loyalty: 70,
    owner_patience: 50,
    history: {
      championships: 2,
      playoff_appearances: 21,
      founded_year: 1967
    }
  },

  {
    id: 'min',
    city: 'Minneapolis',
    name: 'Freeze',
    abbreviation: 'MIN',
    conference: 'Western',
    division: 'Mountain',
    colors: {
      primary: '#A5D8FF',      // Ice Blue
      secondary: '#FFFFFF',    // White
      accent: '#0D2240',       // Navy
      court_primary: '#E8DCC4', // Light maple (ice-like)
      court_paint: '#A5D8FF'   // Ice blue paint
    },
    arena: {
      name: 'North Star Arena',
      capacity: 18000,
      location: 'Minneapolis, MN',
      court_design: 'frozen'
    },
    market_size: 'small',
    prestige: 55,
    fan_loyalty: 82,
    owner_patience: 80,
    history: {
      championships: 0,
      playoff_appearances: 8,
      founded_year: 1989
    }
  }
];
```

## B.2 All Archetypes (Complete)

```typescript
const ALL_ARCHETYPES: ArchetypeDefinition[] = [
  {
    id: 'floor_general',
    name: 'Floor General',
    description: 'Elite playmaker who orchestrates the offense and controls tempo',
    positions: ['PG'],
    attribute_template: {
      high: ['passing', 'ball_handling', 'offensive_iq', 'basketball_iq'],
      medium: ['mid_range', 'speed', 'perimeter_defense', 'clutch'],
      low: ['inside_scoring', 'block', 'strength', 'vertical']
    },
    common_traits: ['Floor General', 'Dimer', 'Lob City Passer', 'Court Vision'],
    playstyle: 'Pass-first, high assist numbers, controls pace',
    synergies: {
      positive: ['Sharpshooter', 'Slasher', 'Lob Threat'],
      negative: ['Ball Dominant', 'Floor General']  // Only one floor general
    }
  },

  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Elite shooter who spaces the floor and punishes defensive breakdowns',
    positions: ['SG', 'SF'],
    attribute_template: {
      high: ['three_point', 'mid_range', 'free_throw', 'offensive_iq'],
      medium: ['stamina', 'perimeter_defense', 'speed'],
      low: ['inside_scoring', 'strength', 'block', 'ball_handling']
    },
    common_traits: ['Sharpshooter', 'Deep Range', 'Spot Up Specialist', 'Cold Blooded'],
    playstyle: 'Catch and shoot, off-ball movement, floor spacing',
    synergies: {
      positive: ['Floor General', 'Slasher', 'Post Scorer'],
      negative: ['Sharpshooter']  // Diminishing returns on many shooters
    }
  },

  {
    id: 'slasher',
    name: 'Slasher',
    description: 'Athletic finisher who attacks the rim and draws fouls',
    positions: ['SG', 'SF'],
    attribute_template: {
      high: ['inside_scoring', 'speed', 'acceleration', 'vertical'],
      medium: ['ball_handling', 'free_throw', 'stamina', 'perimeter_defense'],
      low: ['three_point', 'strength', 'block']
    },
    common_traits: ['Acrobat', 'Slithery Finisher', 'Contact Finisher', 'Posterizer'],
    playstyle: 'Rim attacks, transition play, drawing fouls',
    synergies: {
      positive: ['Floor General', 'Stretch Big', 'Rim Protector'],
      negative: ['Post Scorer']  // Clogs the paint
    }
  },

  {
    id: 'two_way_wing',
    name: 'Two-Way Wing',
    description: 'Versatile player who contributes on both ends equally',
    positions: ['SF', 'SG'],
    attribute_template: {
      high: ['perimeter_defense', 'defensive_iq', 'steal'],
      medium: ['three_point', 'mid_range', 'speed', 'basketball_iq', 'passing'],
      low: ['block', 'inside_scoring']
    },
    common_traits: ['Lockdown Defender', 'Pick Pocket', 'Clamps', 'Versatile'],
    playstyle: 'Defensive stopper, switchable, 3&D role',
    synergies: {
      positive: ['Floor General', 'Post Scorer', 'Ball Dominant'],
      negative: []  // Works with everyone
    }
  },

  {
    id: 'ball_dominant',
    name: 'Ball Dominant',
    description: 'Primary scorer who needs the ball in their hands to be effective',
    positions: ['PG', 'SG'],
    attribute_template: {
      high: ['ball_handling', 'mid_range', 'inside_scoring', 'clutch'],
      medium: ['three_point', 'passing', 'speed', 'offensive_iq'],
      low: ['perimeter_defense', 'defensive_iq', 'block']
    },
    common_traits: ['ISO Specialist', 'Ankle Breaker', 'Tight Handles', 'Volume Shooter'],
    playstyle: 'Isolation scorer, creates own shot, high usage',
    synergies: {
      positive: ['Sharpshooter', 'Stretch Big', 'Rim Protector'],
      negative: ['Ball Dominant', 'Floor General']  // Only one primary
    }
  },

  {
    id: 'post_scorer',
    name: 'Post Scorer',
    description: 'Back-to-basket player with an arsenal of post moves',
    positions: ['PF', 'C'],
    attribute_template: {
      high: ['inside_scoring', 'strength', 'mid_range'],
      medium: ['interior_defense', 'block', 'offensive_iq', 'free_throw'],
      low: ['three_point', 'speed', 'ball_handling', 'perimeter_defense']
    },
    common_traits: ['Post Spin Technician', 'Dream Shake', 'Backdown Punisher', 'Hook Specialist'],
    playstyle: 'Post-ups, mid-range fadeaways, scores inside',
    synergies: {
      positive: ['Sharpshooter', 'Floor General', 'Two-Way Wing'],
      negative: ['Slasher', 'Post Scorer']  // Clogs paint
    }
  },

  {
    id: 'stretch_big',
    name: 'Stretch Big',
    description: 'Shooting big man who spaces the floor and draws defenders out',
    positions: ['PF', 'C'],
    attribute_template: {
      high: ['three_point', 'mid_range', 'free_throw'],
      medium: ['interior_defense', 'block', 'strength', 'basketball_iq'],
      low: ['speed', 'ball_handling', 'acceleration']
    },
    common_traits: ['Sharpshooter', 'Spot Up Specialist', 'Pick and Pop'],
    playstyle: 'Floor spacing, pick-and-pop, catches lobs occasionally',
    synergies: {
      positive: ['Slasher', 'Ball Dominant', 'Floor General'],
      negative: ['Sharpshooter']  // Too much shooting
    }
  },

  {
    id: 'rim_protector',
    name: 'Rim Protector',
    description: 'Defensive anchor who alters shots and protects the paint',
    positions: ['C', 'PF'],
    attribute_template: {
      high: ['block', 'interior_defense', 'defensive_iq', 'vertical'],
      medium: ['strength', 'inside_scoring', 'stamina'],
      low: ['three_point', 'ball_handling', 'speed', 'perimeter_defense']
    },
    common_traits: ['Rim Protector', 'Intimidator', 'Chase Down Artist', 'Anchor'],
    playstyle: 'Shot blocking, rim protection, defensive anchor',
    synergies: {
      positive: ['Sharpshooter', 'Slasher', 'Two-Way Wing'],
      negative: []  // Every team needs one
    }
  },

  {
    id: 'lob_threat',
    name: 'Lob Threat',
    description: 'Athletic big who finishes above the rim and runs the floor',
    positions: ['C', 'PF'],
    attribute_template: {
      high: ['vertical', 'inside_scoring', 'acceleration', 'speed'],
      medium: ['block', 'interior_defense', 'strength', 'stamina'],
      low: ['three_point', 'mid_range', 'ball_handling', 'passing']
    },
    common_traits: ['Lob Threat', 'Putback Boss', 'Rim Runner', 'Posterizer'],
    playstyle: 'Alley-oops, transition, offensive rebounds',
    synergies: {
      positive: ['Floor General', 'Sharpshooter'],
      negative: ['Post Scorer']  // Both need paint touches
    }
  },

  {
    id: 'glass_cleaner',
    name: 'Glass Cleaner',
    description: 'Dominant rebounder who controls the boards on both ends',
    positions: ['C', 'PF'],
    attribute_template: {
      high: ['strength', 'vertical', 'interior_defense'],
      medium: ['inside_scoring', 'block', 'stamina', 'defensive_iq'],
      low: ['three_point', 'mid_range', 'speed', 'ball_handling']
    },
    common_traits: ['Worm', 'Box Out Beast', 'Putback Boss', 'Rebound Chaser'],
    playstyle: 'Rebounding, second chance points, physicality',
    synergies: {
      positive: ['Sharpshooter', 'Slasher'],  // Cleans their misses
      negative: []
    }
  },

  {
    id: 'point_forward',
    name: 'Point Forward',
    description: 'Oversized playmaker who handles and creates from the wing',
    positions: ['SF', 'PF'],
    attribute_template: {
      high: ['passing', 'ball_handling', 'basketball_iq', 'offensive_iq'],
      medium: ['mid_range', 'speed', 'perimeter_defense', 'strength'],
      low: ['block', 'interior_defense', 'three_point']
    },
    common_traits: ['Dimer', 'Floor General', 'Court Vision', 'Playmaker'],
    playstyle: 'Facilitation, mismatches, versatile offense',
    synergies: {
      positive: ['Sharpshooter', 'Lob Threat', 'Rim Protector'],
      negative: ['Floor General']  // Already have a primary playmaker
    }
  },

  {
    id: 'combo_guard',
    name: 'Combo Guard',
    description: 'Versatile guard who can play either backcourt position',
    positions: ['PG', 'SG'],
    attribute_template: {
      high: ['ball_handling', 'mid_range', 'passing'],
      medium: ['three_point', 'speed', 'perimeter_defense', 'offensive_iq'],
      low: ['block', 'strength', 'interior_defense']
    },
    common_traits: ['Versatile', 'Shifty', 'High Motor'],
    playstyle: 'Flexible, can score or facilitate, positional versatility',
    synergies: {
      positive: ['Rim Protector', 'Two-Way Wing'],
      negative: []
    }
  },

  {
    id: 'lockdown_defender',
    name: 'Lockdown Defender',
    description: 'Elite perimeter defender who shuts down opposing scorers',
    positions: ['SG', 'SF', 'PG'],
    attribute_template: {
      high: ['perimeter_defense', 'steal', 'defensive_iq', 'speed'],
      medium: ['acceleration', 'stamina', 'strength', 'basketball_iq'],
      low: ['three_point', 'inside_scoring', 'passing', 'offensive_iq']
    },
    common_traits: ['Clamps', 'Lockdown Defender', 'Pick Pocket', 'Menace'],
    playstyle: 'Defensive specialist, limited offense, assignment stopper',
    synergies: {
      positive: ['Ball Dominant', 'Floor General'],  // Covers for their D
      negative: []
    }
  },

  {
    id: 'microwave',
    name: 'Microwave',
    description: 'Instant offense off the bench who heats up quickly',
    positions: ['SG', 'PG', 'SF'],
    attribute_template: {
      high: ['three_point', 'mid_range', 'inside_scoring', 'clutch'],
      medium: ['ball_handling', 'speed', 'offensive_iq'],
      low: ['perimeter_defense', 'defensive_iq', 'passing']
    },
    common_traits: ['Microwave', 'Volume Shooter', 'Heat Check', 'Spark Plug'],
    playstyle: 'Bench scorer, gets hot quickly, offense-first',
    synergies: {
      positive: ['Rim Protector', 'Two-Way Wing'],  // Need D around them
      negative: ['Microwave']  // Only need one
    }
  },

  {
    id: 'athletic_freak',
    name: 'Athletic Freak',
    description: 'Generational athlete who dominates with pure physical tools',
    positions: ['SF', 'PF'],
    attribute_template: {
      high: ['speed', 'acceleration', 'vertical', 'strength'],
      medium: ['inside_scoring', 'perimeter_defense', 'block', 'steal'],
      low: ['three_point', 'mid_range', 'passing', 'offensive_iq']
    },
    common_traits: ['Freak Athlete', 'Posterizer', 'Chase Down Artist', 'High Flyer'],
    playstyle: 'Athleticism-based plays, transition, physical defense',
    synergies: {
      positive: ['Floor General', 'Sharpshooter'],  // Need playmaking help
      negative: []
    }
  }
];
```

## B.3 All Traits (Complete)

```typescript
const ALL_TRAITS: TraitDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // OFFENSIVE SHOOTING TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Increased accuracy on all three-point attempts',
    effect: { three_point_pct: +0.08 },
    trigger: 'all_threes',
    rarity: 'rare',
    acquirable: true,
    requirements: { three_point_pct: 0.38, three_point_attempts: 200 }
  },

  {
    id: 'deep_range',
    name: 'Deep Range',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Can hit threes from well beyond the arc',
    effect: { deep_three_pct: +0.25, range_extended: true },
    trigger: 'deep_threes',
    rarity: 'legendary',
    acquirable: false  // Born with it
  },

  {
    id: 'mid_range_maestro',
    name: 'Mid Range Maestro',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Elite mid-range shooter with high accuracy',
    effect: { mid_range_pct: +0.10 },
    trigger: 'mid_range_shots',
    rarity: 'rare',
    acquirable: true,
    requirements: { mid_range_pct: 0.48, mid_range_attempts: 150 }
  },

  {
    id: 'spot_up_specialist',
    name: 'Spot Up Specialist',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Increased accuracy on catch-and-shoot attempts',
    effect: { catch_shoot_pct: +0.10 },
    trigger: 'catch_and_shoot',
    rarity: 'common',
    acquirable: true,
    requirements: { catch_shoot_pct: 0.40, catch_shoot_attempts: 100 }
  },

  {
    id: 'heat_check',
    name: 'Heat Check',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Gets increasingly accurate when on a hot streak',
    effect: { hot_streak_bonus: +0.15, hot_streak_threshold: 3 },
    trigger: 'consecutive_makes',
    rarity: 'rare',
    acquirable: true,
    requirements: { games_with_hot_streak: 10 }
  },

  {
    id: 'volume_shooter',
    name: 'Volume Shooter',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Maintains accuracy even with high shot volume',
    effect: { no_volume_penalty: true },
    trigger: 'high_fga_games',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { fga_per_game: 18, fg_pct: 0.44 }
  },

  {
    id: 'cold_blooded',
    name: 'Cold Blooded',
    category: 'offensive',
    subcategory: 'shooting',
    description: 'Increased accuracy in clutch moments',
    effect: { clutch_shot_pct: +0.15 },
    trigger: 'clutch_shots',
    rarity: 'legendary',
    acquirable: true,
    requirements: { clutch_fg_pct: 0.45, clutch_attempts: 30 }
  },

  // ═══════════════════════════════════════════════════════════════
  // OFFENSIVE FINISHING TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'acrobat',
    name: 'Acrobat',
    category: 'offensive',
    subcategory: 'finishing',
    description: 'Increased success on difficult layup attempts',
    effect: { contested_layup_pct: +0.12, euro_step_bonus: true },
    trigger: 'acrobatic_layups',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { layup_pct: 0.55, contested_layups: 50 }
  },

  {
    id: 'slithery_finisher',
    name: 'Slithery Finisher',
    category: 'offensive',
    subcategory: 'finishing',
    description: 'Better at avoiding contact and finishing',
    effect: { contact_avoidance: +0.20 },
    trigger: 'rim_attempts',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { points_in_paint: 300 }
  },

  {
    id: 'contact_finisher',
    name: 'Contact Finisher',
    category: 'offensive',
    subcategory: 'finishing',
    description: 'Finishes through contact effectively',
    effect: { and_one_chance: +0.15, through_contact_pct: +0.10 },
    trigger: 'contested_rim_attempts',
    rarity: 'rare',
    acquirable: true,
    requirements: { and_ones: 15, points_in_paint: 250 }
  },

  {
    id: 'posterizer',
    name: 'Posterizer',
    category: 'offensive',
    subcategory: 'finishing',
    description: 'Increased success on dunk attempts over defenders',
    effect: { contested_dunk_pct: +0.20 },
    trigger: 'contested_dunks',
    rarity: 'rare',
    acquirable: true,
    requirements: { dunks: 50, vertical: 75 }
  },

  {
    id: 'lob_threat',
    name: 'Lob Threat',
    category: 'offensive',
    subcategory: 'finishing',
    description: 'Elite at catching and finishing alley-oops',
    effect: { alley_oop_success: +0.20 },
    trigger: 'alley_oops',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { alley_oops: 20 }
  },

  {
    id: 'putback_boss',
    name: 'Putback Boss',
    category: 'offensive',
    subcategory: 'finishing',
    description: 'Excellent at converting offensive rebounds',
    effect: { putback_pct: +0.15, oreb_bonus: +0.10 },
    trigger: 'offensive_rebounds',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { offensive_rebounds: 100, putbacks: 25 }
  },

  // ═══════════════════════════════════════════════════════════════
  // OFFENSIVE PLAYMAKING TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'floor_general',
    name: 'Floor General',
    category: 'offensive',
    subcategory: 'playmaking',
    description: 'Teammates shoot better when this player has the ball',
    effect: { teammate_shot_bonus: +0.05 },
    trigger: 'on_court',
    rarity: 'legendary',
    acquirable: false
  },

  {
    id: 'dimer',
    name: 'Dimer',
    category: 'offensive',
    subcategory: 'playmaking',
    description: 'Passes that lead to shots give the shooter a bonus',
    effect: { assist_shot_bonus: +0.08 },
    trigger: 'assists',
    rarity: 'rare',
    acquirable: true,
    requirements: { assists_per_game: 7, seasons: 2 }
  },

  {
    id: 'lob_city_passer',
    name: 'Lob City Passer',
    category: 'offensive',
    subcategory: 'playmaking',
    description: 'Throws more accurate lob passes',
    effect: { lob_pass_accuracy: +0.20 },
    trigger: 'lob_passes',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { lob_assists: 30 }
  },

  {
    id: 'court_vision',
    name: 'Court Vision',
    category: 'offensive',
    subcategory: 'playmaking',
    description: 'Sees passing lanes others miss',
    effect: { turnover_rate: -0.15, difficult_pass_success: +0.15 },
    trigger: 'all_passes',
    rarity: 'rare',
    acquirable: false
  },

  {
    id: 'ankle_breaker',
    name: 'Ankle Breaker',
    category: 'offensive',
    subcategory: 'playmaking',
    description: 'Ball handling moves more likely to freeze defender',
    effect: { crossover_freeze_chance: +0.20 },
    trigger: 'dribble_moves',
    rarity: 'rare',
    acquirable: true,
    requirements: { ball_handling: 85 }
  },

  // ═══════════════════════════════════════════════════════════════
  // DEFENSIVE TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'rim_protector',
    name: 'Rim Protector',
    category: 'defensive',
    subcategory: 'interior',
    description: 'Intimidates shooters and alters shots at rim',
    effect: { rim_contest_penalty: +0.15, block_range: +1 },
    trigger: 'rim_defense',
    rarity: 'rare',
    acquirable: true,
    requirements: { blocks_per_game: 2.0, seasons: 2 }
  },

  {
    id: 'intimidator',
    name: 'Intimidator',
    category: 'defensive',
    subcategory: 'interior',
    description: 'Opponents shoot worse when guarded by this player',
    effect: { opponent_shot_penalty: -0.08 },
    trigger: 'contests',
    rarity: 'legendary',
    acquirable: true,
    requirements: { dpoy_votes: 1 }
  },

  {
    id: 'chase_down_artist',
    name: 'Chase Down Artist',
    category: 'defensive',
    subcategory: 'interior',
    description: 'Increased block success from behind on fast breaks',
    effect: { chase_down_block_pct: +0.25 },
    trigger: 'transition_defense',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { chase_down_blocks: 15 }
  },

  {
    id: 'clamps',
    name: 'Clamps',
    category: 'defensive',
    subcategory: 'perimeter',
    description: 'Cuts off driving lanes and stays in front of ball handlers',
    effect: { drive_stop_pct: +0.15, stay_in_front: +0.10 },
    trigger: 'perimeter_defense',
    rarity: 'rare',
    acquirable: true,
    requirements: { perimeter_defense: 80, defensive_win_shares: 2.0 }
  },

  {
    id: 'pick_pocket',
    name: 'Pick Pocket',
    category: 'defensive',
    subcategory: 'perimeter',
    description: 'Increased chance of poking ball loose',
    effect: { steal_chance: +0.12 },
    trigger: 'on_ball_defense',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { steals_per_game: 1.5 }
  },

  {
    id: 'off_ball_pest',
    name: 'Off-Ball Pest',
    category: 'defensive',
    subcategory: 'perimeter',
    description: 'Disrupts passing lanes and denies catches',
    effect: { deflection_chance: +0.15, passing_lane_steal: +0.10 },
    trigger: 'off_ball_defense',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { deflections_per_game: 3.0 }
  },

  {
    id: 'box_out_beast',
    name: 'Box Out Beast',
    category: 'defensive',
    subcategory: 'rebounding',
    description: 'Superior at boxing out for rebounds',
    effect: { box_out_success: +0.20, rebound_position: +0.15 },
    trigger: 'rebounding',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { rebounds_per_game: 8.0 }
  },

  {
    id: 'worm',
    name: 'Worm',
    category: 'defensive',
    subcategory: 'rebounding',
    description: 'Fights through box outs to grab rebounds',
    effect: { contested_rebound_pct: +0.20 },
    trigger: 'contested_rebounds',
    rarity: 'rare',
    acquirable: true,
    requirements: { contested_rebounds: 200 }
  },

  // ═══════════════════════════════════════════════════════════════
  // MENTAL/INTANGIBLE TRAITS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'clutch_performer',
    name: 'Clutch Performer',
    category: 'mental',
    subcategory: 'clutch',
    description: 'All attributes boosted in clutch situations',
    effect: { clutch_attribute_boost: +5 },
    trigger: 'clutch_moments',
    rarity: 'legendary',
    acquirable: true,
    requirements: { game_winners: 3 }
  },

  {
    id: 'ice_in_veins',
    name: 'Ice In Veins',
    category: 'mental',
    subcategory: 'clutch',
    description: 'Free throws unaffected by pressure',
    effect: { clutch_ft_pct: +0.15, no_pressure_penalty: true },
    trigger: 'clutch_free_throws',
    rarity: 'rare',
    acquirable: true,
    requirements: { clutch_ft_pct: 0.85, clutch_fta: 50 }
  },

  {
    id: 'leader',
    name: 'Leader',
    category: 'mental',
    subcategory: 'intangibles',
    description: 'Improves teammate morale and chemistry',
    effect: { team_chemistry_bonus: +5, teammate_morale_boost: true },
    trigger: 'team_presence',
    rarity: 'rare',
    acquirable: true,
    requirements: { seasons_as_captain: 2 }
  },

  {
    id: 'high_motor',
    name: 'High Motor',
    category: 'mental',
    subcategory: 'intangibles',
    description: 'Never takes plays off, hustles constantly',
    effect: { hustle_plays: +0.20, fatigue_rate: -0.10 },
    trigger: 'always_active',
    rarity: 'uncommon',
    acquirable: false
  },

  {
    id: 'microwave',
    name: 'Microwave',
    category: 'mental',
    subcategory: 'intangibles',
    description: 'Gets hot quickly when coming off the bench',
    effect: { bench_entry_boost: +8, hot_streak_fast: true },
    trigger: 'bench_minutes',
    rarity: 'uncommon',
    acquirable: true,
    requirements: { bench_ppg: 12, sixth_man_votes: 1 }
  },

  {
    id: 'gym_rat',
    name: 'Gym Rat',
    category: 'mental',
    subcategory: 'development',
    description: 'Develops faster in offseason',
    effect: { development_bonus: +0.25 },
    trigger: 'offseason',
    rarity: 'uncommon',
    acquirable: false
  },

  {
    id: 'injury_prone',
    name: 'Injury Prone',
    category: 'mental',
    subcategory: 'negative',
    description: 'Higher chance of injury',
    effect: { injury_chance: +0.50 },
    trigger: 'game_actions',
    rarity: 'uncommon',
    acquirable: false,
    is_negative: true
  },

  {
    id: 'inconsistent',
    name: 'Inconsistent',
    category: 'mental',
    subcategory: 'negative',
    description: 'Performance varies wildly game to game',
    effect: { performance_variance: +0.30 },
    trigger: 'games',
    rarity: 'common',
    acquirable: false,
    is_negative: true
  },

  {
    id: 'locker_room_cancer',
    name: 'Locker Room Cancer',
    category: 'mental',
    subcategory: 'negative',
    description: 'Damages team chemistry',
    effect: { team_chemistry_penalty: -10 },
    trigger: 'team_presence',
    rarity: 'rare',
    acquirable: false,
    is_negative: true
  }
];
```

## B.4 All Events (Complete)

```typescript
const ALL_EVENTS: EventDefinition[] = [
  // ═══════════════════════════════════════════════════════════════
  // PLAYER EVENTS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'contract_holdout',
    name: 'Contract Holdout',
    category: 'player',
    description: '{player} is demanding a contract extension and threatening to hold out',
    probability: 0.05,
    conditions: { contract_years_left: 1, overall: { min: 75 } },
    choices: [
      { label: 'Negotiate Extension', effect: { salary_increase: 0.15, morale: +10 } },
      { label: 'Stand Firm', effect: { morale: -20, trade_request_chance: 0.3 } },
      { label: 'Trade Player', effect: { initiate_trade: true } }
    ]
  },

  {
    id: 'breakout_game',
    name: 'Breakout Performance',
    category: 'player',
    description: '{player} had a career game! +{points} points, +{assists} assists',
    probability: 0.03,
    conditions: { age: { max: 25 }, overall: { max: 75 } },
    effects: { morale: +15, potential_reveal: 0.2, media_attention: +20 }
  },

  {
    id: 'trade_request',
    name: 'Trade Request',
    category: 'player',
    description: '{player} has formally requested a trade',
    probability: 0.02,
    conditions: { morale: { max: 30 } },
    choices: [
      { label: 'Honor Request', effect: { trade_block: true, value_penalty: -0.10 } },
      { label: 'Deny Request', effect: { morale: -15, performance: -0.05 } },
      { label: 'Meet to Discuss', effect: { morale: +5, request_withdrawn_chance: 0.4 } }
    ]
  },

  {
    id: 'injury_minor',
    name: 'Minor Injury',
    category: 'player',
    description: '{player} suffered a {injury_type}. Out {days} days',
    probability: 0.08,
    injury_types: ['ankle sprain', 'knee soreness', 'back tightness', 'hamstring strain'],
    duration: { min: 3, max: 14 }
  },

  {
    id: 'injury_major',
    name: 'Major Injury',
    category: 'player',
    description: '{player} suffered a {injury_type}. Out {weeks} weeks',
    probability: 0.02,
    injury_types: ['torn ACL', 'broken hand', 'torn meniscus', 'stress fracture'],
    duration: { min: 4, max: 20, unit: 'weeks' }
  },

  {
    id: 'player_beef',
    name: 'Locker Room Tension',
    category: 'player',
    description: '{player1} and {player2} had a heated argument in practice',
    probability: 0.03,
    conditions: { team_chemistry: { max: 60 } },
    effects: { chemistry: -10 },
    choices: [
      { label: 'Mediate Dispute', effect: { chemistry: +5, both_morale: -5 } },
      { label: 'Let Them Work It Out', effect: { beef_continues_chance: 0.5 } },
      { label: 'Trade One', effect: { trade_block_choice: true } }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // TEAM EVENTS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'winning_streak',
    name: 'Winning Streak',
    category: 'team',
    description: 'The team is on a {count}-game winning streak!',
    probability: 'calculated',  // Based on actual wins
    effects: { morale: +2, chemistry: +1, fan_interest: +5 }
  },

  {
    id: 'losing_streak',
    name: 'Losing Streak',
    category: 'team',
    description: 'The team has lost {count} games in a row',
    probability: 'calculated',
    effects: { morale: -3, chemistry: -1, media_pressure: +10 }
  },

  {
    id: 'coach_tension',
    name: 'Coach-Player Tension',
    category: 'team',
    description: '{player} and the coaching staff are clashing over playing time',
    probability: 0.04,
    conditions: { player_minutes: { max: 20 }, player_overall: { min: 75 } },
    choices: [
      { label: 'Increase Minutes', effect: { lineup_change: true, morale: +15 } },
      { label: 'Support Coach', effect: { morale: -10, trade_request_chance: 0.2 } }
    ]
  },

  {
    id: 'team_bonding',
    name: 'Team Bonding Event',
    category: 'team',
    description: 'The team had a successful bonding event',
    probability: 0.05,
    effects: { chemistry: +8, morale_all: +5 }
  },

  // ═══════════════════════════════════════════════════════════════
  // LEAGUE EVENTS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'salary_cap_change',
    name: 'Salary Cap Adjustment',
    category: 'league',
    description: 'The salary cap has been adjusted to ${new_cap}M',
    probability: 1.0,  // Happens each offseason
    timing: 'offseason',
    effects: { cap_change: 'calculated' }
  },

  {
    id: 'rookie_showcase',
    name: 'Rookie Showcase',
    category: 'league',
    description: 'Pre-draft rookie showcase revealed new prospect information',
    probability: 1.0,
    timing: 'pre_draft',
    effects: { prospect_info_reveal: 0.3 }
  },

  {
    id: 'all_star_voting',
    name: 'All-Star Voting Results',
    category: 'league',
    description: 'All-Star voting has concluded',
    probability: 1.0,
    timing: 'mid_season',
    effects: { all_star_selection: true, fan_voting_results: true }
  },

  // ═══════════════════════════════════════════════════════════════
  // MEDIA EVENTS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'media_controversy',
    name: 'Media Controversy',
    category: 'media',
    description: '{player} made controversial comments to the media',
    probability: 0.02,
    conditions: { personality: 'outspoken' },
    effects: { media_attention: +30, team_chemistry: -5 },
    choices: [
      { label: 'Issue Apology', effect: { media_attention: -10, morale: -5 } },
      { label: 'Support Player', effect: { morale: +10, media_attention: +10 } },
      { label: 'Fine Player', effect: { morale: -15, media_attention: -5 } }
    ]
  },

  {
    id: 'player_award',
    name: 'Player of the Week',
    category: 'media',
    description: '{player} was named Player of the Week',
    probability: 'calculated',  // Based on performance
    effects: { morale: +10, media_attention: +15 }
  },

  // ═══════════════════════════════════════════════════════════════
  // DRAFT EVENTS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'draft_bust_warning',
    name: 'Concerning Workout',
    category: 'draft',
    description: 'Scouts report {prospect} had a concerning workout',
    probability: 0.10,
    timing: 'pre_draft',
    effects: { prospect_stock: -5, concern_flag: true }
  },

  {
    id: 'draft_sleeper',
    name: 'Hidden Gem Discovered',
    category: 'draft',
    description: 'Your scouts have identified {prospect} as an undervalued talent',
    probability: 0.05,
    timing: 'pre_draft',
    effects: { prospect_info: 'partial_reveal', scout_exclusive: true }
  }
];
```

---

# APPENDIX C: UI Wireframes

## C.1 All Screens

### Dashboard Screen (/)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HoopsManager          [Dashboard] [Team] [League] [Games]   [@] [≡] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  YOUR TEAM                      │  │  NOTIFICATIONS (3)              │  │
│  │  ─────────────────────────────  │  │  ─────────────────────────────  │  │
│  │  [Team Logo]                    │  │  ⚠ Trade offer from Boston      │  │
│  │  New York Titans                │  │  📋 Marcus Johnson requested    │  │
│  │  Record: 8-4 (2nd in Atlantic)  │  │     meeting                     │  │
│  │                                 │  │  🏥 D. Williams (ankle) - 3 days│  │
│  │  Cap Space: $12.5M              │  │                                 │  │
│  │  Roster: 13/15                  │  │  [View All Notifications →]     │  │
│  │                                 │  └─────────────────────────────────┘  │
│  │  [Manage Team →]                │                                       │
│  └─────────────────────────────────┘  ┌─────────────────────────────────┐  │
│                                       │  UPCOMING GAMES                 │  │
│  ┌─────────────────────────────────┐  │  ─────────────────────────────  │  │
│  │  QUICK ACTIONS                  │  │  Tomorrow vs BOS  7:30 PM      │  │
│  │  ─────────────────────────────  │  │  Dec 28 @ CHI     8:00 PM      │  │
│  │  [📋 Set Lineup]                │  │  Dec 30 vs PHI    7:00 PM      │  │
│  │  [🔄 Trade Center]              │  │                                 │  │
│  │  [📝 Free Agents]               │  │  [Full Schedule →]              │  │
│  │  [🔍 Scout Players]             │  └─────────────────────────────────┘  │
│  └─────────────────────────────────┘                                       │
│                                       ┌─────────────────────────────────┐  │
│  ┌─────────────────────────────────┐  │  RECENT RESULTS                 │  │
│  │  LEAGUE FEED                    │  │  ─────────────────────────────  │  │
│  │  ─────────────────────────────  │  │  W 112-98 vs Miami    ✓        │  │
│  │  🏀 BOS defeats MIA 105-98      │  │  W 105-102 @ Detroit  ✓        │  │
│  │  📰 J. Smith named POW          │  │  L 95-108 vs Chicago  ✗        │  │
│  │  🔄 LAW trades for C. Davis     │  │                                 │  │
│  │  📋 PHI signs FA J. Brown       │  │  [Game Logs →]                  │  │
│  │                                 │  └─────────────────────────────────┘  │
│  │  [View All →]                   │                                       │
│  └─────────────────────────────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Roster Screen (/team/roster)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HoopsManager          [Dashboard] [Team] [League] [Games]   [@] [≡] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Team › Roster                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Roster] [Lineup] [Rotation] [Salary]                    [Filter ▼] [⋮]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STARTERS                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ POS │ PLAYER           │ OVR │ AGE │ ARCHETYPE      │ CONTRACT     │   │
│  ├─────┼──────────────────┼─────┼─────┼────────────────┼──────────────┤   │
│  │ PG  │ Marcus Johnson   │ 84  │ 27  │ Floor General  │ $18M (3yr)   │   │
│  │ SG  │ DeShawn Williams │ 81  │ 24  │ Sharpshooter   │ $12M (2yr)   │   │
│  │ SF  │ Kevin Thompson   │ 79  │ 29  │ Two-Way Wing   │ $9M (1yr)    │   │
│  │ PF  │ Andre Davis      │ 82  │ 26  │ Stretch Big    │ $15M (4yr)   │   │
│  │ C   │ Marcus Brown     │ 80  │ 28  │ Rim Protector  │ $14M (2yr)   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  BENCH                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ POS │ PLAYER           │ OVR │ AGE │ ARCHETYPE      │ CONTRACT     │   │
│  ├─────┼──────────────────┼─────┼─────┼────────────────┼──────────────┤   │
│  │ PG  │ Tyler Richardson │ 72  │ 23  │ Combo Guard    │ $3M (2yr)    │   │
│  │ SG  │ James Mitchell   │ 70  │ 31  │ Microwave      │ $2M (1yr)    │   │
│  │ SF  │ Chris Anderson   │ 68  │ 22  │ Athletic Freak │ $1.8M (R)    │   │
│  │ PF  │ David Lee        │ 71  │ 25  │ Glass Cleaner  │ $4M (3yr)    │   │
│  │ C   │ Michael Scott    │ 67  │ 30  │ Post Scorer    │ $2M (1yr)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  RESERVES                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ POS │ PLAYER           │ OVR │ AGE │ ARCHETYPE      │ CONTRACT     │   │
│  ├─────┼──────────────────┼─────┼─────┼────────────────┼──────────────┤   │
│  │ C   │ Robert Taylor    │ 62  │ 21  │ Lob Threat     │ $1M (2-way)  │   │
│  │ G   │ Anthony White    │ 60  │ 24  │ Lockdown Def   │ $1M (2-way)  │   │
│  │     │ [+ Add Player]   │     │     │                │              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Click any player row for detailed view                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Player Detail Modal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                            [✕]              │
│  ┌──────────────┐  MARCUS JOHNSON                                          │
│  │              │  ───────────────────────────────────────                 │
│  │   [Photo]    │  #12 • Point Guard • 6'2" • 185 lbs                      │
│  │              │  New York Titans                                         │
│  │              │                                                          │
│  │  OVR: 84     │  Age: 27 (Peak: 28)                                      │
│  └──────────────┘  Experience: 6 seasons                                   │
│                    Archetype: FLOOR GENERAL                                 │
│                                                                             │
│  [Overview] [Attributes] [Stats] [History] [Scouting]                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ATTRIBUTES                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  OFFENSE                         DEFENSE                                    │
│  Inside Scoring  ████████░░ 62   Interior Def   ████████░░ 58              │
│  Mid Range       █████████░ 78   Perimeter Def  █████████░ 76              │
│  Three Point     ████████░░ 71   Steal          █████████░ 82              │
│  Free Throw      █████████░ 85   Block          ████░░░░░░ 45              │
│  Ball Handling   ██████████ 92   Defensive IQ   █████████░ 80              │
│  Passing         ██████████ 94                                              │
│  Offensive IQ    █████████░ 88   MENTAL                                     │
│                                  Clutch         █████████░ 85              │
│  PHYSICAL                        Consistency    █████████░ 82              │
│  Speed           █████████░ 81   Work Ethic     █████████░ 88              │
│  Acceleration    █████████░ 79   Basketball IQ  ██████████ 91              │
│  Strength        ██████░░░░ 55                                              │
│  Vertical        ███████░░░ 65                                              │
│  Stamina         █████████░ 84                                              │
│                                                                             │
│  TRAITS                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Floor General] [Dimer] [Court Vision] [Cold Blooded]                      │
│                                                                             │
│  CONTRACT                                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  $18,000,000 / year • 3 years remaining                                     │
│  Player Option in final year                                                │
│                                                                             │
│  [Trade] [Extend Contract] [Cut Player]                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Game View Screen (/games/:id)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HoopsManager          [Dashboard] [Team] [League] [Games]   [@] [≡] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    NEW YORK TITANS  vs  BOSTON SHAMROCKS                    │
│                         [NYT Logo]      [BOS Logo]                          │
│                                                                             │
│                              98 - 95                                        │
│                           Q4 • 2:34                                         │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                       │ │
│  │                    [THREE.JS 3D GAME VISUALIZATION]                   │ │
│  │                                                                       │ │
│  │                    Basketball court with players                      │ │
│  │                    Real-time game simulation                          │ │
│  │                    Camera controls: [Broadcast] [Overhead] [Sideline] │ │
│  │                                                                       │ │
│  │                                                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  [▶ Play] [⏸ Pause] [⏩ 2x] [⏩ 4x] [⏭ Skip to End]      [📊 Box Score]   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  PLAY-BY-PLAY                           │  MATCHUP STATS                   │
│  ─────────────────────────              │  ─────────────────────           │
│  2:34 - M. Johnson hits 3PT             │  FG%:  48.2% │ 45.1%            │
│  2:52 - J. Smith misses layup           │  3P%:  38.5% │ 32.0%            │
│  3:10 - Defensive rebound (A. Davis)    │  REB:  38    │ 42               │
│  3:15 - M. Brown blocks shot            │  AST:  24    │ 19               │
│  3:28 - Turnover (J. Williams)          │  TO:   12    │ 15               │
│                                         │                                  │
│  [View Full Play-by-Play]               │  [View Full Box Score]           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Draft Screen (/league/draft)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HoopsManager          [Dashboard] [Team] [League] [Games]   [@] [≡] │
├─────────────────────────────────────────────────────────────────────────────┤
│  2024 ROOKIE DRAFT • Round 1                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ON THE CLOCK: NEW YORK TITANS                    ⏱ 2:45           │   │
│  │  Pick #5 (Round 1)                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  DRAFT ORDER                │  │  AVAILABLE PROSPECTS                │  │
│  │  ─────────────────────────  │  │  ─────────────────────────          │  │
│  │  1. MIN - J. Williams (PG)  │  │  [Search...] [Filter: All ▼] [Sort] │  │
│  │  2. SEA - M. Jackson (C)    │  │                                     │  │
│  │  3. ATL - K. Thompson (SF)  │  │  ┌─────────────────────────────────┐│  │
│  │  4. DET - R. Davis (SG)     │  │  │ RK  PLAYER        POS  OVR  POT ││  │
│  │  ▶ 5. NYT - ON CLOCK        │  │  ├─────────────────────────────────┤│  │
│  │  6. PHI                     │  │  │ 5   D. Harris     PF   72   A   ││  │
│  │  7. TOR                     │  │  │ 6   C. Brown      SG   70   A-  ││  │
│  │  8. HOU                     │  │  │ 7   M. Wilson     C    71   B+  ││  │
│  │  ...                        │  │  │ 8   J. Anderson   PG   68   A   ││  │
│  │                             │  │  │ 9   T. Lee        SF   69   B   ││  │
│  │  YOUR PICKS:                │  │  │ 10  R. Garcia     PF   67   B+  ││  │
│  │  • Rd 1, Pick 5             │  │  │ ...                             ││  │
│  │  • Rd 2, Pick 21            │  │  └─────────────────────────────────┘│  │
│  │                             │  │                                     │  │
│  │  [Trade Pick]               │  │  Click prospect for scouting report │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SELECTED: D. HARRIS                                [Draft Player] │   │
│  │  PF • 6'9" • 225 lbs • University of Kentucky • Age: 20            │   │
│  │  Archetype: STRETCH BIG | Projected: #4-8                          │   │
│  │                                                                     │   │
│  │  Scout Grade: A- | Potential: A | Comparison: "Modern Power Forward"│   │
│  │                                                                     │   │
│  │  Strengths: Elite shooter, good size, high IQ                      │   │
│  │  Weaknesses: Lateral quickness, rim protection                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trade Screen (/league/trades)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HoopsManager          [Dashboard] [Team] [League] [Games]   [@] [≡] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Trade Center                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Create Trade] [Incoming Offers (2)] [Trade History]                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  NEW YORK TITANS (You)         │  │  BOSTON SHAMROCKS               │  │
│  │  ─────────────────────────     │  │  ─────────────────────────      │  │
│  │                                │  │                                 │  │
│  │  SENDING:                      │  │  RECEIVING:                     │  │
│  │  ┌───────────────────────────┐ │  │  ┌───────────────────────────┐  │  │
│  │  │ Kevin Thompson   SF  79   │ │  │  │ James Carter    SG  77   │  │  │
│  │  │ $9M / 1yr              [✕]│ │  │  │ $8M / 2yr              [✕]│  │  │
│  │  ├───────────────────────────┤ │  │  ├───────────────────────────┤  │  │
│  │  │ 2025 1st Round Pick    [✕]│ │  │  │ 2025 2nd Round Pick    [✕]│  │  │
│  │  └───────────────────────────┘ │  │  └───────────────────────────┘  │  │
│  │                                │  │                                 │  │
│  │  [+ Add Player]                │  │  [+ Request Player]             │  │
│  │  [+ Add Pick]                  │  │  [+ Request Pick]               │  │
│  │                                │  │                                 │  │
│  │  ───────────────────────────── │  │  ─────────────────────────────  │  │
│  │  Salary Out: $9.0M             │  │  Salary In: $8.0M               │  │
│  │  Cap After: $13.5M             │  │                                 │  │
│  └─────────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TRADE ANALYSIS                                                     │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │                                                                     │   │
│  │  Trade Value:  NYT ████████████░░░░░░░░  BOS                       │   │
│  │                         FAIR TRADE                                  │   │
│  │                                                                     │   │
│  │  CPU Interest: ████████░░ 78%    Likelihood: HIGH                  │   │
│  │                                                                     │   │
│  │  [Propose Trade]    [Save as Draft]    [Clear Trade]               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Standings Screen (/league/standings)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo] HoopsManager          [Dashboard] [Team] [League] [Games]   [@] [≡] │
├─────────────────────────────────────────────────────────────────────────────┤
│  League Standings • Season 1                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Overall] [Conference] [Division]                              [Export ⬇]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EASTERN CONFERENCE                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ RK │ TEAM                  │  W  │  L  │  PCT  │  GB  │ STRK │ L10  │ │
│  ├────┼───────────────────────┼─────┼─────┼───────┼──────┼──────┼──────┤ │
│  │ 1  │ ▶ New York Titans    │  9  │  3  │ .750  │  -   │ W3   │ 7-3  │ │
│  │ 2  │ Boston Shamrocks     │  8  │  4  │ .667  │ 1.0  │ W1   │ 6-4  │ │
│  │ 3  │ Chicago Windigo      │  7  │  5  │ .583  │ 2.0  │ L2   │ 5-5  │ │
│  │ 4  │ Miami Vice           │  7  │  5  │ .583  │ 2.0  │ W2   │ 6-4  │ │
│  │ 5  │ Philadelphia Founders│  6  │  6  │ .500  │ 3.0  │ L1   │ 4-6  │ │
│  │ 6  │ Toronto Huskies      │  5  │  7  │ .417  │ 4.0  │ L3   │ 3-7  │ │
│  │ 7  │ Detroit Engines      │  4  │  8  │ .333  │ 5.0  │ W1   │ 4-6  │ │
│  │ 8  │ Atlanta Phoenixes    │  3  │  9  │ .250  │ 6.0  │ L4   │ 2-8  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  WESTERN CONFERENCE                                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ RK │ TEAM                  │  W  │  L  │  PCT  │  GB  │ STRK │ L10  │ │
│  ├────┼───────────────────────┼─────┼─────┼───────┼──────┼──────┼──────┤ │
│  │ 1  │ Los Angeles Waves    │  10 │  2  │ .833  │  -   │ W5   │ 8-2  │ │
│  │ 2  │ San Francisco Gold   │  8  │  4  │ .667  │ 2.0  │ W2   │ 7-3  │ │
│  │ 3  │ Denver Altitude      │  7  │  5  │ .583  │ 3.0  │ L1   │ 5-5  │ │
│  │ 4  │ Dallas Stampede      │  7  │  5  │ .583  │ 3.0  │ W1   │ 6-4  │ │
│  │ 5  │ Phoenix Scorpions    │  6  │  6  │ .500  │ 4.0  │ L2   │ 5-5  │ │
│  │ 6  │ Houston Fuel         │  5  │  7  │ .417  │ 5.0  │ W1   │ 4-6  │ │
│  │ 7  │ Seattle Sasquatch    │  4  │  8  │ .333  │ 6.0  │ L1   │ 3-7  │ │
│  │ 8  │ Minneapolis Freeze   │  2  │  10 │ .167  │ 8.0  │ L6   │ 1-9  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ▶ = Your Team    Playoff positions: Top 4 from each conference            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## C.2 Component Library

### Player Card Component

```
┌──────────────────────────────────────┐
│  ┌────────┐  MARCUS JOHNSON         │
│  │        │  ────────────────────── │
│  │ Photo  │  #12 • PG • 6'2"        │
│  │        │  Floor General          │
│  │  84    │                         │
│  └────────┘  [NYT] New York Titans  │
│                                      │
│  ▓▓▓▓▓▓▓▓░░ 84 OFF                  │
│  ▓▓▓▓▓▓▓░░░ 72 DEF                  │
│  ▓▓▓▓▓▓▓▓░░ 80 ATH                  │
│                                      │
│  Traits: [Floor Gen] [Dimer] [+2]   │
│                                      │
│  $18M / 3yr                          │
└──────────────────────────────────────┘
```

### Stat Table Component

```
┌─────────────────────────────────────────────────────────────────┐
│  PLAYER           │ PPG  │ RPG  │ APG  │ FG%  │ 3P%  │ +/-  │
├───────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  M. Johnson       │ 18.5 │ 3.2  │ 9.1  │ .485 │ .372 │ +8.2 │
│  D. Williams      │ 16.2 │ 2.8  │ 2.1  │ .442 │ .398 │ +5.1 │
│  A. Davis         │ 14.8 │ 8.5  │ 1.8  │ .512 │ .358 │ +6.3 │
│  K. Thompson      │ 11.2 │ 5.2  │ 2.4  │ .468 │ .342 │ +3.8 │
│  M. Brown         │ 10.5 │ 9.8  │ 1.2  │ .548 │ .000 │ +4.2 │
└─────────────────────────────────────────────────────────────────┘
Sort: [PPG ▼]  Show: [Per Game ▼]  Season: [2024 ▼]
```

### Contract Display Component

```
┌─────────────────────────────────────────────────────┐
│  CONTRACT DETAILS                                   │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Total Value: $54,000,000                          │
│  Years: 3 (2024-2027)                              │
│                                                     │
│  YEAR    SALARY       OPTIONS                      │
│  2024    $18,000,000  -                            │
│  2025    $18,000,000  -                            │
│  2026    $18,000,000  Player Option                │
│                                                     │
│  Cap Hit: $18,000,000 (14.4% of cap)              │
│  Dead Cap: $36,000,000 (if cut now)               │
│                                                     │
│  Status: ✓ Tradeable                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Trade Value Meter

```
┌─────────────────────────────────────────────────────┐
│  TRADE VALUE ANALYSIS                               │
│                                                     │
│  Your Package    ░░░░░░░░░░░░░░░░░░░░   Their Pkg  │
│                                                     │
│  ████████████████████░░░░░░░░░░░░░░░░░░            │
│         75              │              45           │
│                         │                           │
│                    ADVANTAGE                        │
│                      YOU                            │
│                                                     │
│  Trade Fairness: UNBALANCED (You're overpaying)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Notification Toast

```
┌─────────────────────────────────────────────┐
│  ⚠ TRADE OFFER                         [✕] │
│  ─────────────────────────────────────────  │
│  Boston Shamrocks want Kevin Thompson       │
│  Offering: J. Carter + 2nd Round Pick       │
│                                             │
│  [View Offer]    [Decline]                  │
└─────────────────────────────────────────────┘
```

---

# APPENDIX D: Statistics System

## D.1 All Tracked Statistics

### Per-Game Statistics (Traditional)

| Stat | Abbreviation | Description | UI Display |
|------|--------------|-------------|------------|
| Points | PTS/PPG | Total points scored | Everywhere |
| Rebounds | REB/RPG | Total rebounds | Everywhere |
| Offensive Rebounds | OREB | Offensive boards | Box score, player page |
| Defensive Rebounds | DREB | Defensive boards | Box score, player page |
| Assists | AST/APG | Assists | Everywhere |
| Steals | STL/SPG | Steals | Box score, player page |
| Blocks | BLK/BPG | Blocks | Box score, player page |
| Turnovers | TO/TOPG | Turnovers | Box score, player page |
| Personal Fouls | PF | Fouls committed | Box score |
| Minutes | MIN/MPG | Minutes played | Everywhere |
| Field Goals Made | FGM | Made field goals | Box score |
| Field Goals Attempted | FGA | Attempted field goals | Box score |
| Field Goal % | FG% | FGM/FGA | Everywhere |
| 3-Point Made | 3PM | Made 3-pointers | Box score |
| 3-Point Attempted | 3PA | Attempted 3-pointers | Box score |
| 3-Point % | 3P% | 3PM/3PA | Everywhere |
| Free Throws Made | FTM | Made free throws | Box score |
| Free Throws Attempted | FTA | Attempted free throws | Box score |
| Free Throw % | FT% | FTM/FTA | Everywhere |
| Plus/Minus | +/- | Point differential on court | Box score |

### Advanced Statistics

| Stat | Abbreviation | Formula | Description |
|------|--------------|---------|-------------|
| True Shooting % | TS% | PTS / (2 * (FGA + 0.44 * FTA)) | Overall scoring efficiency |
| Effective FG% | eFG% | (FGM + 0.5 * 3PM) / FGA | FG% weighted for 3s |
| Player Efficiency Rating | PER | Complex formula | Overall efficiency |
| Usage Rate | USG% | 100 * ((FGA + 0.44 * FTA + TO) * (Tm MP / 5)) / (MP * (Tm FGA + 0.44 * Tm FTA + Tm TO)) | Possession usage |
| Assist Ratio | AST% | 100 * AST / (((MP / (Tm MP / 5)) * Tm FGM) - FGM) | Assists per possession |
| Turnover Ratio | TOV% | 100 * TO / (FGA + 0.44 * FTA + TO) | Turnovers per possession |
| Offensive Rebound % | OREB% | Offensive boards per opportunity | Rebounding rate |
| Defensive Rebound % | DREB% | Defensive boards per opportunity | Rebounding rate |
| Box Plus/Minus | BPM | Complex formula | Contribution per 100 poss |
| Win Shares | WS | Complex formula | Wins attributed to player |
| VORP | VORP | (BPM - (-2.0)) * (% of minutes played) * (team games/82) | Value over replacement |

### Situational Statistics

| Stat | Description | Tracked For |
|------|-------------|-------------|
| Clutch FG% | FG% in last 5 min, score within 5 | Players, Teams |
| Fast Break Points | Points in transition | Players, Teams |
| Points in Paint | Interior scoring | Players, Teams |
| Second Chance Points | Points after OREB | Players, Teams |
| Points off Turnovers | Scoring after steals | Teams |
| Bench Points | Points from non-starters | Teams |
| Catch & Shoot 3P% | 3P% on catch-and-shoot | Players |
| Pull-Up 3P% | 3P% off the dribble | Players |
| Contested Shot % | FG% on contested shots | Players |
| Open Shot % | FG% when unguarded | Players |

### Team Statistics

| Stat | Description |
|------|-------------|
| Offensive Rating | Points per 100 possessions |
| Defensive Rating | Points allowed per 100 poss |
| Net Rating | ORtg - DRtg |
| Pace | Possessions per 48 minutes |
| Assist/Turnover Ratio | AST / TO |
| Rebound Rate | Team OREB% + DREB% |

## D.2 Statistics Display Locations

| Screen | Stats Shown |
|--------|-------------|
| Dashboard | Team W-L, key player PPG/APG |
| Roster List | OVR, PPG, RPG, APG |
| Player Detail | All stats, career history |
| Box Score | All traditional stats |
| League Leaders | Top 10 in each category |
| Standings | W, L, PCT, GB, Streak, L10 |
| Game Preview | H2H record, recent form, key matchups |
| Trade Evaluation | Player value based on advanced stats |

## D.3 Season Records Tracked

- Single game records (points, rebounds, assists, etc.)
- Season records (PPG, total points, etc.)
- Career records (career points, games played)
- Franchise records (best season, most wins)
- League records (all-time leaders)

---

# APPENDIX E: Player Generation

## E.1 Name Generation System

```typescript
// Name generation uses weighted pools for realistic variety

const FIRST_NAMES: WeightedPool = {
  common: [
    'Michael', 'James', 'Marcus', 'Kevin', 'Anthony', 'DeShawn', 'Terrell',
    'Chris', 'Andre', 'David', 'Tyler', 'Brandon', 'Derek', 'Jamal', 'Darius',
    'Cameron', 'Jordan', 'Justin', 'Ryan', 'Kyle', 'Isaiah', 'Jaylen',
    'Trey', 'Malik', 'DeMarcus', 'LaMarcus', 'DeAndre', 'Kendrick', 'Damian',
    'Stephen', 'Russell', 'Kawhi', 'Giannis', 'Luka', 'Zion', 'Ja', 'Trae',
    'Donovan', 'Jayson', 'Bam', 'Jaren', 'RJ', 'Coby', 'Keldon', 'Tyrese',
    'Immanuel', 'Jalen', 'Scottie', 'Cade', 'Evan', 'Franz', 'Alperen',
    'Jonathan', 'Desmond', 'Anfernee', 'Paolo', 'Victor', 'Scoot', 'Amen'
  ],
  weight: 0.85
};

const LAST_NAMES: WeightedPool = {
  common: [
    'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Thompson', 'Robinson',
    'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Scott',
    'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Turner',
    'Collins', 'Murphy', 'Cook', 'Rogers', 'Morgan', 'Peterson', 'Cooper',
    'Richardson', 'Cox', 'Howard', 'Ward', 'Brooks', 'Russell', 'Griffin',
    'Hayes', 'Bryant', 'Alexander', 'Price', 'Bennett', 'Wood', 'Barnes',
    'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long',
    'Patterson', 'Hughes', 'Washington', 'Butler', 'Simmons', 'Foster',
    'Gordon', 'Sullivan', 'Wallace', 'Cunningham', 'Banchero', 'Wembanyama'
  ],
  weight: 0.85
};

// International names for variety
const INTERNATIONAL_FIRST: string[] = [
  'Nikola', 'Goran', 'Bojan', 'Dario', 'Ante', 'Mario', 'Sasha', 'Jonas',
  'Domantas', 'Kristaps', 'Davis', 'Rui', 'Yuta', 'Kai', 'Isaac', 'Ousmane',
  'Sekou', 'Cheick', 'Bismack', 'Serge', 'Pascal', 'OG', 'Precious', 'Shai'
];

const INTERNATIONAL_LAST: string[] = [
  'Jokic', 'Doncic', 'Antetokounmpo', 'Embiid', 'Siakam', 'Sabonis', 'Porzingis',
  'Vucevic', 'Bogdanovic', 'Dragic', 'Markkanen', 'Bertans', 'Valanciunas',
  'Hachimura', 'Watanabe', 'Diallo', 'Dieng', 'Bamba', 'Anunoby', 'Gilgeous-Alexander'
];

function generatePlayerName(): { first: string; last: string } {
  // 15% chance of international name
  if (Math.random() < 0.15) {
    return {
      first: INTERNATIONAL_FIRST[Math.floor(Math.random() * INTERNATIONAL_FIRST.length)],
      last: INTERNATIONAL_LAST[Math.floor(Math.random() * INTERNATIONAL_LAST.length)]
    };
  }

  return {
    first: weightedRandomSelect(FIRST_NAMES),
    last: weightedRandomSelect(LAST_NAMES)
  };
}
```

## E.2 Physical Attribute Generation

```typescript
// Height/weight based on position

const PHYSICAL_TEMPLATES: Record<Position, PhysicalRange> = {
  PG: {
    height: { min: 70, max: 76, mean: 73 },      // 5'10" - 6'4", avg 6'1"
    weight: { min: 170, max: 200, mean: 185 },
    wingspan_mod: { min: 1.00, max: 1.08 }
  },
  SG: {
    height: { min: 73, max: 79, mean: 76 },      // 6'1" - 6'7", avg 6'4"
    weight: { min: 185, max: 220, mean: 200 },
    wingspan_mod: { min: 1.02, max: 1.10 }
  },
  SF: {
    height: { min: 76, max: 82, mean: 79 },      // 6'4" - 6'10", avg 6'7"
    weight: { min: 210, max: 240, mean: 220 },
    wingspan_mod: { min: 1.03, max: 1.12 }
  },
  PF: {
    height: { min: 79, max: 84, mean: 81 },      // 6'7" - 7'0", avg 6'9"
    weight: { min: 225, max: 260, mean: 240 },
    wingspan_mod: { min: 1.04, max: 1.14 }
  },
  C: {
    height: { min: 81, max: 88, mean: 84 },      // 6'9" - 7'4", avg 7'0"
    weight: { min: 240, max: 290, mean: 260 },
    wingspan_mod: { min: 1.05, max: 1.15 }
  }
};

function generatePhysicals(position: Position): PlayerPhysicals {
  const template = PHYSICAL_TEMPLATES[position];

  const height = normalDistribution(template.height.mean, 2);
  const weight = normalDistribution(template.weight.mean, 10);
  const wingspan_mod = uniformRandom(template.wingspan_mod.min, template.wingspan_mod.max);

  return {
    height_inches: Math.round(clamp(height, template.height.min, template.height.max)),
    weight_lbs: Math.round(clamp(weight, template.weight.min, template.weight.max)),
    wingspan_inches: Math.round(height * wingspan_mod),
    jersey_number: generateJerseyNumber()
  };
}

function generateJerseyNumber(): number {
  // Common numbers weighted higher
  const common = [0, 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14, 15, 20, 21, 22, 23, 24, 25, 30, 32, 33, 34, 35];
  const rare = Array.from({ length: 100 }, (_, i) => i).filter(n => !common.includes(n));

  if (Math.random() < 0.80) {
    return common[Math.floor(Math.random() * common.length)];
  }
  return rare[Math.floor(Math.random() * rare.length)];
}
```

## E.3 Draft Class Generation

```typescript
interface DraftClassConfig {
  size: number;           // Total prospects
  star_chance: number;    // % of elite prospects
  position_weights: Record<Position, number>;
}

function generateDraftClass(config: DraftClassConfig): Prospect[] {
  const prospects: Prospect[] = [];

  // Generate pool of prospects
  for (let i = 0; i < config.size; i++) {
    const position = weightedRandomSelect(config.position_weights);
    const archetype = selectArchetypeForPosition(position);

    // Determine tier (affects potential)
    let tier: 'star' | 'lottery' | 'first_round' | 'second_round' | 'undrafted';
    const roll = Math.random();

    if (roll < 0.03) tier = 'star';           // ~1 per draft
    else if (roll < 0.12) tier = 'lottery';   // ~3 per draft
    else if (roll < 0.35) tier = 'first_round'; // ~8 per draft
    else if (roll < 0.65) tier = 'second_round'; // ~10 per draft
    else tier = 'undrafted';                   // Rest are undrafted level

    const prospect = generateProspect({
      position,
      archetype,
      tier,
      age: uniformRandom(19, 23)
    });

    prospects.push(prospect);
  }

  // Sort by projected value for draft order
  return prospects.sort((a, b) => b.projectedValue - a.projectedValue);
}

function generateProspect(config: ProspectConfig): Prospect {
  const potentialRange = TIER_POTENTIAL[config.tier];
  const overallRange = TIER_OVERALL[config.tier];

  return {
    ...generatePlayerName(),
    ...generatePhysicals(config.position),
    position: config.position,
    archetype: config.archetype,
    age: config.age,
    potential: uniformRandom(potentialRange.min, potentialRange.max),
    current_overall: uniformRandom(overallRange.min, overallRange.max),
    attributes: generateAttributesForArchetype(config.archetype),
    traits: generateTraitsForArchetype(config.archetype),
    scouting: {
      accuracy: 0.5,  // Unknown at start
      reports: []
    }
  };
}
```

---

# CHANGELOG

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial GDD |
| 1.1 | Dec 2024 | Added complete formulas (Appendix A) |
| 1.2 | Dec 2024 | Added team profiles, archetypes, traits, events (Appendix B) |
| 1.3 | Dec 2024 | Added UI wireframes and component library (Appendix C) |
| 1.4 | Dec 2024 | Added statistics system (Appendix D) |
| 1.5 | Dec 2024 | Added player generation system (Appendix E) |

