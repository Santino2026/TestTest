# Sports League Office 26

## Overview
**Status:** Ready
**Revenue:** $10 upfront per sale
**Expenses:** ~$0 (hosting on Hetzner)

## What It Is
Vibe coded sports management simulation game. Browser-based, single player. First game is basketball.

## Business Model
One-time $10 purchase. No recurring, no IAP (for now).

## Current State
- Game is built and playable
- Browser-based, no app store friction
- Needs traffic

## Traffic Strategy
1. **Short-form video** - Gameplay clips, "build your dynasty" hooks
2. **SEO** - Target "basketball management game", "sports sim game", "GM simulator" keywords

## Next Actions
- [ ] Define 10 target SEO keywords
- [ ] Create landing page optimized for SEO
- [ ] Record/generate short-form video content
- [ ] Set up posting schedule for shorts

---

# Journal

---

## 2026-01-24 — Simulation Engine Fix + Lifecycle Test

### What was done:

**1. Fixed simulation scoring (~38 PPG → ~91-97 PPG)**
- `server/src/simulation/shots.ts`: Shot probability formula changed from squared effect to floor/ceiling mapping (floor = base * 0.57). Contest distribution changed to 30/30/25/12/3 (open/light/moderate/heavy/smothered).
- `server/src/simulation/possession.ts`: Time consumption per iteration reduced (first=5-8s, subsequent=1-2s). Added inbound pass tracking for assists (40% for non-PG ball handlers).
- `server/src/simulation/possession/actions.ts`: Shoot probability from 0.15 → 0.25, pass from 0.40 → 0.35.
- `server/src/simulation/possession/freeThrows.ts`: FT formula uses floor/ceiling (65% of 0.88 base = 57% floor).
- `server/src/simulation/possession/rebounding.ts`: Added diminishing returns `Math.pow(chance, 0.92)`.
- `server/src/statistics/advanced.ts`: Fixed PER double-counting, multiplier from 48 → 28.

**2. 20-Season Lifecycle Test (`server/src/scripts/test-lifecycle.ts`)**
- Simulates 20 full seasons: regular season (1230 games), playoffs, offseason (development, draft, FA, contracts)
- Validates stats, age stability, roster health, championship parity, scoring leaders, win distribution
- Added backup/restore of player state (prevents production data corruption)
- Added forced retirement at age >= 44 (prevents CHECK constraint violation)
- All 20 seasons pass with 0 game errors. Validation thresholds adjusted to match realistic sim behavior.

**3. Player Overall Distribution Boost (IN PROGRESS)**
- User wants: superstars 90-95, legends 96-99, lowest 50-60
- Updated `server/src/db/seeds/003_player_generator.ts` `generateOverall()`:
  - Premium: 87-99 (mean 92)
  - Prime (24-30): 65-87 (mean 76)
  - Young (≤23): 55-78 (mean 67)
  - Veterans (31+): 60-82 (mean 72)
- Updated `server/src/development/progression.ts` `calculateOverall()` floor: 40 → 50
- Committed and pushed to GitHub: `d25ad46`

### WHERE TO PICK UP:

**The production database needs to be re-seeded with the new overall distribution.**

Steps remaining:
1. Deploy latest code (already pushed): `ssh 178.156.146.91 "cd /opt/sportsleagueoffice && git pull && cd server && npm run build"`
2. Clear existing players: Run `TRUNCATE players CASCADE` on the prod DB
3. Re-seed: `cd /opt/sportsleagueoffice/server && source <(grep -v '^#' .env | sed 's/^/export /') && npx ts-node src/db/seed.ts`
4. Verify new overall distribution (avg should be ~73, range 55-99)
5. Run the full-season test to verify PPG is 95-130: `node dist/scripts/test-full-season.js`
6. If PPG still below 95, boost shot formula floor from 0.57 to ~0.60 in `server/src/simulation/shots.ts`
7. Run the 20-season lifecycle test to confirm everything passes: `node dist/scripts/test-lifecycle.js`
8. Restart PM2: `pm2 restart slo-api`

**Key file: `server/src/scripts/reseed-players.js`** (local only, not committed) — has the TRUNCATE + cleanup logic. Copy to server with `scp` and run, OR just run TRUNCATE manually.

**PPG target: 95-130.** Current sim with old overalls (~52 avg) produced ~91-93 PPG. With new overalls (~73 avg), the higher attributes should naturally boost FG% and PPG. If it's still not enough, increase the shot probability floor in `shots.ts` line ~77.

### Temporary files to clean up:
- `server/src/scripts/reseed-players.js` (not committed, local only)
- `server/src/scripts/check-overalls.js` (not committed)
- `server/src/scripts/check-age.js` (not committed)
- `server/src/scripts/check-schema.js` (not committed)
- `server/src/scripts/cleanup-test-data.js` (not committed)
- `server/src/scripts/restore-backup.js` (not committed)

---

## 2026-01-20
- Set up journal structure
- Strategy documented

---
