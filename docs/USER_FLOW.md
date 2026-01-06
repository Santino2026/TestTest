# User Flow - Sports League Office Basketball

Complete player journey from landing page through multi-season franchise management.

---

## Phase 1: Onboarding

### 1. Landing Page
- User visits `sportsleagueoffice.com`
- Views sales page with game features, pricing ($10)

### 2. Registration
- User registers at `/auth`
- Account created, JWT issued

### 3. Game Selection
- User sees game selection screen
- Options: **Basketball** | College Football (Coming Soon)

### 4. Purchase
- User clicks Basketball
- Purchase popup displays (Stripe checkout)
- User completes $10 purchase
- Access granted to Basketball

---

## Phase 2: Franchise Setup

### 5. Team Selection
- Cool scroll-through of all 30 teams
- Each team card shows:
  - Team logo, colors, arena
  - Overall rating
  - Roster preview
- User selects team to manage

### 6. First-Time Tutorial (Skip on subsequent franchises)
- Introductory briefing covering:
  - Franchise goals
  - Budget & salary cap basics
  - Core game mechanics
  - Interface navigation
- Only shows for first-time players

### 7. Franchise Assessment
- Review current roster
- Review draft picks owned
- Review free agency situation
- **Option: Automate or Manual**

### 8. Training Camp
- Set rotations
- Develop players
- Prepare for regular season
- **Option: Automate or Manual**

---

## Phase 3: Preseason

### 9. Preseason Games (8 games)
- Simulate: Daily, Weekly, or Whole Preseason
- View box scores and player stats
- Finalize rotations before regular season

---

## Phase 4: Regular Season

### 10. Regular Season (82 games)
- Simulate: Daily, Weekly, or Whole Season
- View box scores and player stats

### 11. Ongoing Franchise Management
Available throughout the season:
- **Trades** (until deadline)
- **Roster moves**: Assign from G-League, waive players
- **Rotations**: Adjust starting lineup and minutes
- **Player development**: Training focus

---

## Phase 5: All-Star Break

### 12. All-Star Weekend (2nd week of February)
**Prerequisite:** Each team must have played ~55 games by this point

#### Events:
1. **Rising Stars Challenge**
   - Rookies vs Sophomores
   - Best first-year players vs best second-year players

2. **All-Star Game**
   - 15 best players from Western Conference
   - 15 best players from Eastern Conference
   - One representative per team (regardless of position)
   - User can assign their franchise's best player

3. **All-Star Break**
   - No regular season games for 3 days
   - Franchise management continues league-wide

**Option: Automate or Manual**

---

## Phase 6: Trade Deadline

### 13. Trade Deadline (After All-Star Break)
- **User notification required** (regardless of simulation mode)
- Last chance to make trades
- Trading suspended until after playoffs
- **Option: Automate or Manual**

---

## Phase 7: Regular Season Completion

### 14. Complete Regular Season
- Continue simulation: Daily, Weekly, or Rest of Season
- Final standings determined

### 15. End-of-Season Awards (After 82 games)
Display awards before playoffs:
- **MVP** - Most Valuable Player
- **DPOY** - Defensive Player of the Year
- **6MOY** - Sixth Man of the Year
- **All-NBA Teams** (Mythical 5)
- **Franchise of the Year**

---

## Phase 8: Playoffs

### 16. Playoff Qualification
- **If qualified:** Proceed to playoffs
- **If not qualified:** Simulate entire playoffs as spectator

### 17. Playoffs Structure
- Top 8 teams from each conference (16 total)
- Standard bracket format
- **Every series: Best of 7**
- Simulate: Game by Game, Series by Series, or Whole Playoffs

### 18. Playoff Franchise Management
Available during playoffs:
- Roster updates
- Rotation adjustments
- Player minutes management

### 19. Championship Result
**If Won:**
- Cool summary screen showing:
  - Franchise stats and achievements
  - Finals MVP
  - Championship trophy animation

**If Lost:**
- Season review with elimination summary

---

## Phase 9: Offseason

### 20. Season Review
- League records
- Team performance summary
- Relevant stats and achievements

### 21. Offseason Evaluation
Display league-wide activity:
- Player retirements
- Free agency movement/signings
- Injury reports/updates
- Offseason trades

### 22. Draft Lottery
- Lottery based on regular season performance
- Worse records = higher lottery odds
- Better records = lower picks
- Lottery results revealed

### 23. Pre-Draft Preparation
- Scout prospects
- Attend workouts
- Develop draft strategy
- **Option: Automate or Manual**

### 24. NBA Draft
- Select players based on:
  - Lottery pick position
  - Franchise needs
  - Scouting reports
- **Option: Automate or Manual**

### 25. Free Agency Period
- Negotiate contracts
- Sign free agents
- Manage existing contracts
- **Option: Automate or Manual**

### 26. Offseason Trade Period
- Execute trades with other teams
- Build roster for next season
- **Option: Automate or Manual**

### 27. Training Camp (Next Season)
- Set rotations
- Develop players
- Prepare for upcoming season
- **Option: Automate or Manual**

---

## Phase 10: Loop or Exit

### 28. Continue or New Franchise

**Option A: Continue Franchise**
- Return to Phase 3 (Preseason) → Start next season

**Option B: Start New Franchise**
- Return to Phase 2 (Team Selection)
- Previous franchise saved

**Option C: Exit Game**
- Save user's history and data
- Return to game selection or logout

---

## Automation Summary

The following phases support **Automate or Manual** options:

| Phase | Action |
|-------|--------|
| Franchise Assessment | Review roster, picks, FA |
| Training Camp | Rotations, development |
| All-Star Weekend | Player selection, events |
| Trade Deadline | Last-minute trades |
| Pre-Draft | Scouting, strategy |
| Draft | Player selection |
| Free Agency | Signings, contracts |
| Offseason Trades | Trade execution |

---

## Key Notifications (Always Shown)

These notifications appear regardless of simulation mode:
1. **Trade Deadline approaching** (24 hours before)
2. **Trade Deadline passed** (trading suspended)
3. **Playoff qualification/elimination**
4. **Championship won/lost**
5. **Draft lottery results**
6. **Major free agent signings** (league-wide)

---

## Season Calendar Overview

```
October       Training Camp + Preseason (8 games)
November      Regular Season begins
December      Regular Season continues
January       Regular Season continues
February      All-Star Weekend (Week 2) + Trade Deadline
March         Regular Season continues
April         Regular Season ends + Awards + Playoffs begin
May           Playoffs continue
June          Finals + Offseason begins
July          Free Agency + Trades
August        Draft + Roster finalization
September     Pre-season preparation
```
