# Bug Fix Plan - Sports League Office

Generated from comprehensive audit on 2026-01-06.

---

## Priority 1: CRITICAL (Fix Immediately - Game Breaking)

### P1-1: Uninitialized hot_cold_state Crashes Game
**File:** `server/src/simulation/engine.ts` (lines 446-452)
**Issue:** `player.hot_cold_state` is never initialized, causing runtime crash on first shot
**Fix:** Add `player.hot_cold_state = initializeHotColdState()` after player initialization

### P1-2: Infinite Re-render Loop in FranchiseContext
**File:** `client/src/context/FranchiseContext.tsx` (lines 95-108)
**Issue:** `refreshFranchise` and `refreshFranchises` in dependency array creates circular dependency
**Fix:** Remove callback functions from dependency array; check auth state directly

### P1-3: No Free Throws Simulated After Fouls
**File:** `server/src/simulation/possession.ts` (lines 531-558)
**Issue:** When foul drawn, possession ends without free throw attempts
**Fix:** Add free throw simulation logic after foul plays

### P1-4: Plus-Minus Stat Never Calculated
**File:** `server/src/simulation/engine.ts` (lines 39, 513-514)
**Issue:** `plus_minus` always 0 - Maps declared but never populated
**Fix:** Track points scored while each player on court; calculate at game end

### P1-5: Points For/Against Never Updated in Standings
**File:** `server/src/routes/season.ts` (lines 96-122), `server/src/routes/games.ts` (lines 108-125)
**Issue:** `points_for` and `points_against` never incremented, breaks tiebreakers
**Fix:** Add points update to all standings UPDATE queries

### P1-6: Draft Pick Numbering Error (Second Round)
**File:** `server/src/routes/draft.ts` (lines 437-442, 261-272)
**Issue:** Uses absolute pick (31-60) instead of relative (1-30) for second round
**Fix:** Use `round` and `pick_number` separately; fix INSERT/UPDATE queries

---

## Priority 2: HIGH (Fix Soon - Major Issues)

### P2-1: Missing Authentication on Multiple Endpoints
**Files:**
- `server/src/routes/schedule.ts` (lines 67, 122)
- `server/src/routes/games.ts` (lines 9, 145, 202, 235)
**Issue:** Schedule and games endpoints publicly accessible
**Fix:** Add `authMiddleware(false)` to all data endpoints

### P2-2: Division/Conference Records Never Updated
**File:** `server/src/routes/season.ts` (lines 96-122)
**Issue:** `division_wins`, `conference_wins` etc. never tracked
**Fix:** Check opponent's division/conference and update appropriate columns

### P2-3: Race Condition in API Client Auth
**File:** `client/src/api/client.ts` (lines 54-100)
**Issue:** No early return after 401 handling; continues to throw error
**Fix:** Add `return` after handling auth error and retry

### P2-4: Incorrect Payroll Calculation in Free Agency
**File:** `server/src/routes/freeagency.ts` (lines 96-101)
**Issue:** Formula `6 - years_remaining` doesn't calculate current year correctly
**Fix:** Use `total_years - years_remaining` to get current contract year

### P2-5: Missing season_id in Free Agent Status Update
**File:** `server/src/routes/freeagency.ts` (lines 525-527)
**Issue:** Updates FA status across ALL seasons, not just current
**Fix:** Add `AND season_id = $2` to WHERE clause

### P2-6: No Affordability Check in AI Free Agent Signing
**File:** `server/src/routes/freeagency.ts` (lines 501-516)
**Issue:** AI teams can sign contracts they can't afford
**Fix:** Call `validateOffer()` before AI signings

### P2-7: Team Advanced Stats Never Populated
**File:** `server/src/simulation/engine.ts` (lines 45-68, 517-518)
**Issue:** `fast_break_points`, `points_in_paint`, `second_chance_points` always 0
**Fix:** Track these during possession simulation

### P2-8: Race Condition in Franchise Deletion
**File:** `server/src/routes/franchise.ts` (lines 388-395)
**Issue:** If deleted franchise was active, next activation could fail
**Fix:** Add transaction and verify update affected rows

### P2-9: Missing await on refreshFranchise Calls
**Files:** `client/src/pages/Dashboard.tsx`, `client/src/pages/SchedulePage.tsx`
**Issue:** `refreshFranchise()` called without await causes race conditions
**Fix:** Await all refreshFranchise calls in mutation handlers

---

## Priority 3: MEDIUM (Schedule for Next Sprint)

### P3-1: 24 Player Attributes Never Used in Simulation
**File:** `server/src/simulation/` (various)
**Issue:** Attributes like `close_shot`, `layup`, `post_moves`, `draw_foul` etc. ignored
**Fix:** Integrate these attributes into shot selection and success calculations

### P3-2: Hardcoded Values Should Be Configurable
**Files:** Multiple simulation files
**Issue:** Drive foul (12%), block chance (0.08), fatigue recovery (8) hardcoded
**Fix:** Move to constants file or game difficulty settings

### P3-3: Division by Zero in Advanced Stats
**File:** `server/src/statistics/advanced.ts` (lines 157, 225-226)
**Issue:** `teamPoss === 0` check missing or after calculation
**Fix:** Add zero checks before division operations

### P3-4: Unrealistic Fatigue Thresholds
**File:** `server/src/simulation/engine.ts` (lines 189-204)
**Issue:** Players gain 30-60 fatigue per quarter; sub threshold is 70
**Fix:** Reduce fatigue gain rate or increase threshold

### P3-5: Missing Foul-Out Ejection Logic
**File:** `server/src/simulation/engine.ts` (lines 135-140, 226-239)
**Issue:** 6 fouls = bench, but player could return; should be ejected
**Fix:** Mark player as fouled out; prevent any future substitution

### P3-6: Play-in Game 3 Seeding Semantically Wrong
**File:** `server/src/playoffs/engine.ts` (lines 115-116)
**Issue:** `higher_seed_id` assigned to loser of 7v8, but loser could be 8th seed
**Fix:** Track actual seed numbers through play-in

### P3-7: Finals Seeding Ignores Record
**File:** `server/src/playoffs/engine.ts` (lines 241-259)
**Issue:** Eastern winner always `higher_seed_id`; should be by record
**Fix:** Compare conference champion records for home court

### P3-8: Roster Limit Not Checked in /offer Endpoint
**File:** `server/src/routes/freeagency.ts` (lines 125-210)
**Issue:** Can make offer even if roster full (15 players)
**Fix:** Add roster count check before creating offer

### P3-9: Query Key Object Reference Changes Every Render
**File:** `client/src/api/hooks.ts` (lines 21-23)
**Issue:** `params` object as query key causes constant refetching
**Fix:** Spread params into query key array: `['players', page, limit, position]`

### P3-10: Memory Leak in FranchiseContext
**File:** `client/src/context/FranchiseContext.tsx` (lines 95-108)
**Issue:** No cleanup on unmount; setState called after unmount
**Fix:** Add AbortController; check mounted state before setState

### P3-11: Stale Closure in SchedulePage Query
**File:** `client/src/pages/SchedulePage.tsx` (lines 29-37)
**Issue:** queryFn captures old franchise reference
**Fix:** Access franchise from closure at execution time, not definition

### P3-12: Missing Error State in RosterPage
**File:** `client/src/pages/RosterPage.tsx`
**Issue:** API errors show "Team not found" instead of actual error
**Fix:** Check React Query's `error` state and display message

### P3-13: Overly Broad Cache Invalidation
**File:** `client/src/api/hooks.ts` (lines 375-391)
**Issue:** `['draft']` invalidates all draft queries; `['players']` too broad
**Fix:** Use more specific query keys with season/franchise context

### P3-14: Second-Round Draft Order Calculation
**File:** `server/src/draft/ai.ts` (lines 307-319)
**Issue:** Pick order reversal logic is convoluted and potentially wrong
**Fix:** Simplify to iterate in reverse order of first round

### P3-15: Prospect Attribute Generation Misaligned
**File:** `server/src/draft/generator.ts` (lines 150-158)
**Issue:** Variance applied after scaling; can exceed expected ranges
**Fix:** Apply variance before scaling; ensure alignment with overall

---

## Priority 4: LOW (Nice to Have)

### P4-1: Unrealistic Three-Point Volume
**File:** `server/src/simulation/shots.ts` (lines 220-235)
**Issue:** Guards shoot 3s ~60% of time; NBA average is ~35%
**Fix:** Adjust shot selection probabilities

### P4-2: No Fatigue Recovery Between Overtimes
**File:** `server/src/simulation/engine.ts` (lines 487-490)
**Issue:** 5-fatigue reset only between quarters, not OT periods
**Fix:** Add same reset between regulation and OT

### P4-3: "Cold Blooded" Trait Incomplete
**File:** `server/src/simulation/types.ts` (lines 434-436)
**Issue:** Trait says "Applied based on clutch context" but always applies
**Fix:** Only apply modifier in clutch situations (last 2 min, close game)

### P4-4: Conference Case Mismatch in Schema
**File:** `server/src/db/migrations/007_create_schedule.sql` (line 52)
**Issue:** Schema comments say 'east'/'west'; code uses 'Eastern'/'Western'
**Fix:** Standardize on 'Eastern'/'Western' throughout

### P4-5: Hardcoded Month Values in SchedulePage
**File:** `client/src/pages/SchedulePage.tsx` (lines 116-124)
**Issue:** Months hardcoded for 2024-2025 season only
**Fix:** Generate months dynamically based on season dates

### P4-6: NaN Parsing in Pagination
**Files:** `server/src/routes/players.ts` (line 11), `server/src/routes/games.ts` (line 237)
**Issue:** `parseInt()` returns NaN for invalid input; `Math.min(NaN, 100)` = NaN
**Fix:** Use `Number(value) || defaultValue` pattern

### P4-7: Missing Logging for Critical Operations
**Files:** Multiple route files
**Issue:** Success operations not logged; makes auditing difficult
**Fix:** Add structured logging for franchise creation, signings, draft picks

---

## Implementation Order

### Week 1: Critical Fixes
1. P1-2: Fix FranchiseContext infinite loop (blocks all testing)
2. P1-1: Fix hot_cold_state crash (blocks game simulation)
3. P1-3: Add free throw simulation
4. P1-4: Calculate plus-minus
5. P1-5: Update points in standings
6. P1-6: Fix draft pick numbering

### Week 2: High Priority
1. P2-1: Add authentication to endpoints
2. P2-2: Track division/conference records
3. P2-3: Fix API client auth handling
4. P2-4-P2-6: Free agency fixes
5. P2-7: Team advanced stats
6. P2-8-P2-9: Race condition fixes

### Week 3: Medium Priority (Core Simulation)
1. P3-1: Integrate unused attributes
2. P3-2: Extract hardcoded values
3. P3-3-P3-5: Simulation balance fixes
4. P3-6-P3-7: Playoff seeding fixes

### Week 4: Medium Priority (Frontend + Draft)
1. P3-8-P3-15: Remaining medium fixes

### Ongoing: Low Priority
- Address as time permits
- Consider for future releases

---

## Testing Requirements

After fixing each bug, verify:
1. **Simulation bugs**: Run 10+ game simulations, check stat distributions
2. **API bugs**: Test with Postman/curl for auth and validation
3. **Draft/FA bugs**: Complete full draft and free agency cycle
4. **Playoff bugs**: Simulate full playoff bracket
5. **Frontend bugs**: Test franchise switching, page navigation, cache behavior

---

## Notes

- Total bugs identified: 65
- Critical: 6 (game-breaking)
- High: 9 (major functionality issues)
- Medium: 15 (notable problems)
- Low: 7 (minor improvements)

Generated by automated code audit on 2026-01-06.
