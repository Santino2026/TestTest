# Sports League Office - Basketball

Premium single-player basketball franchise simulation. $10 one-time purchase via Stripe.

**Live:** sportsleagueoffice.com/basketball

---

## Rules

- Be honest with me.
- Check `__claude.md__` in folders for directory-specific rules.
- Don't assume you know the code—investigate first.
- SSH in when needed, you have the information.
- All secrets go in `.env` (ignored by `.gitignore`).
- Check available `.env` for credentials.
- Put documentation in `/docs`.
- Keep main directory organized logically.
- Stick to the design theme, templates, and components. Create reusable components that fit the theme—don't hardcode.


---

## Quick Commands

When user says **"commit to github and deploy to prod"** (or similar), automatically:
```bash
git add -A && git commit -m "<descriptive message>" && git push origin main && ./deploy.sh
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query, Zustand |
| Backend | Express.js, TypeScript, PostgreSQL 15, Redis (optional) |
| Auth | JWT + bcryptjs |
| Payments | Stripe |
| Deploy | Hetzner VPS, nginx reverse proxy |

---

## New Developer Setup

1. Get `server/.env` from team lead
2. Clone repo from GitHub
3. Generate SSH key: `ssh-keygen -t ed25519`
4. Send public key (`~/.ssh/id_ed25519.pub`) to team lead for server access
5. Run `docker-compose up -d` to start local databases
6. Run `cd server && npm install && npm run migrate && npm run seed && npm run dev`
7. Run `cd client && npm install && npm run dev` (new terminal)

---

## Deployment

**Server:** `178.156.146.91` (Hetzner VPS)
**Remote Path:** `/opt/sportsleagueoffice`

### Deploy to Production

```bash
# From project root - commits must be pushed to GitHub first
./deploy.sh
```

This will:
1. SSH into the VPS
2. `git pull origin main`
3. Install dependencies (server + client)
4. Build both apps
5. Restart PM2

### Manual Deploy (if needed)

```bash
ssh root@178.156.146.91
cd /opt/sportsleagueoffice
git pull origin main
cd server && npm install && npm run build
cd ../client && npm install && npm run build
pm2 restart slo-api
```

### Server Details

- **PM2 Process:** `slo-api`
- **Nginx Config:** `/etc/nginx/sites-available/sportsleagueoffice`
- **Logs:** `pm2 logs slo-api`

---

## Project Structure

```
sportsleagueoffice/
├── client/                 # React frontend
│   └── src/
│       ├── pages/          # 22 page components
│       ├── components/     # ui/, layout/, team/, player/, landing/
│       ├── context/        # AuthContext, FranchiseContext
│       ├── api/            # client.ts, hooks.ts (React Query)
│       └── lib/            # Utilities
│
├── server/                 # Express backend
│   └── src/
│       ├── routes/         # 17 route modules (see API below)
│       ├── simulation/     # Game engine (engine.ts, possession.ts, shots.ts)
│       ├── schedule/       # 82-game generator
│       ├── playoffs/       # Bracket/series logic
│       ├── draft/          # Lottery, prospects, scouting
│       ├── freeagency/     # Contracts, signings, salary cap
│       ├── trading/        # Trade evaluation
│       ├── development/    # Player progression, aging
│       ├── ai/             # CPU team decisions
│       ├── statistics/     # Advanced stats (PER, TS%, etc.)
│       ├── auth/           # JWT auth
│       └── db/             # pool.ts, migrations/, seeds/
│
├── shared/                 # Shared TypeScript types
├── docs/                   # Deep documentation
│   └── GAME_DESIGN.md      # Full game design (8000 lines)
└── docker-compose.yml      # PostgreSQL + Redis
```

---

## API Endpoints

### Auth & Payments
```
POST /api/auth/signup|login|logout|refresh
GET  /api/auth/me
POST /api/payments/checkout|webhook
GET  /api/payments/status
```

### Core Data
```
GET  /api/teams              # All 30 teams
GET  /api/teams/:id          # Team + roster
GET  /api/players            # Paginated (?page, ?position, ?freeAgents)
GET  /api/players/:id        # Player details
GET  /api/standings          # By conference
GET  /api/traits             # All 50+ traits
```

### Franchise & Season
```
GET  /api/franchise          # Current franchise
POST /api/franchise/select   # Select team
GET  /api/season             # Current season info
POST /api/season/start       # Start new season
POST /api/season/advance/day|week|playoffs
POST /api/season/finalize-playoffs
POST /api/season/offseason|new
```

### Schedule & Games
```
POST /api/schedule/generate  # Generate 82-game schedule
GET  /api/schedule           # Filter by ?team, ?date, ?month
GET  /api/schedule/upcoming  # Next N games
GET  /api/games              # Recent games
GET  /api/games/:id          # Box score
POST /api/games/simulate     # Simulate game
```

### Playoffs
```
GET  /api/playoffs           # Bracket state
POST /api/playoffs/start     # Start play-in
POST /api/playoffs/simulate  # Simulate playoff game
GET  /api/playoffs/standings # Seeding
```

### Draft
```
GET  /api/draft/picks        # Team's draft picks
GET  /api/draft/prospects    # Draft class
POST /api/draft/scout        # Scout a prospect
GET  /api/draft/lottery      # Lottery results
```

### Free Agency
```
GET  /api/freeagency         # Available free agents
POST /api/freeagency/offer   # Make offer
GET  /api/freeagency/offers  # Your pending offers
POST /api/freeagency/sign    # Sign player
```

### Trades
```
GET  /api/trades             # Trade history
POST /api/trades/propose     # Propose trade
POST /api/trades/evaluate    # Evaluate trade value
POST /api/trades/execute     # Execute trade
```

### Stats
```
GET  /api/stats/leaders      # Stat leaders
GET  /api/stats/player/:id   # Player advanced stats
GET  /api/stats/team/:id     # Team stats
```

---

## Database (28+ tables)

**Core:** teams, players, player_attributes, player_traits, traits
**Games:** seasons, games, game_quarters, plays, player_game_stats, team_game_stats
**User:** users, sessions, franchises
**Schedule:** schedule, playoff_series, playoff_games
**Draft:** draft_picks, draft_prospects, draft_prospect_attributes, draft_lottery
**Contracts:** contracts, salary_cap_settings, free_agents
**Trading:** trades, team_scouting, season_history, advanced_stats

---

## Key Files

| Purpose | File |
|---------|------|
| Game simulation | `server/src/simulation/engine.ts` (530 lines) |
| Possession logic | `server/src/simulation/possession.ts` (719 lines) |
| Shot probability | `server/src/simulation/shots.ts` |
| Schedule generator | `server/src/schedule/generator.ts` |
| Playoff bracket | `server/src/playoffs/engine.ts` |
| API client | `client/src/api/client.ts` |
| React Query hooks | `client/src/api/hooks.ts` |
| Auth context | `client/src/context/AuthContext.tsx` |
| Franchise context | `client/src/context/FranchiseContext.tsx` |

---

## Frontend Pages

**Auth:** LandingPage, LoginPage, SignupPage
**Setup:** FranchisesPage, TeamSelectionPage, GameSelectPage
**Core:** Dashboard, SchedulePage, StandingsPage, GamesPage, GameDetailPage, PlayoffsPage
**Roster:** RosterPage, TeamsPage, TeamDetailPage, PlayersPage, PlayerDetailPage
**Management:** DraftPage, FreeAgencyPage, TradesPage, DevelopmentPage
**Stats:** StatsPage

---

## Environment Variables

**Server (.env):**
```
DATABASE_URL=postgres://...
REDIS_URL=redis://localhost:6379
PORT=3001
JWT_SECRET=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Client (.env):**
```
VITE_API_URL=http://localhost:3001/api  # Dev only, prod uses /api
```

---

## User Flow (Quick Reference)

```
Landing → Register → Game Select → Purchase → Team Select → Tutorial*
    ↓
Training Camp → Preseason (8) → Regular Season (82)
    ↓
All-Star Break → Trade Deadline → Playoffs (Best of 7)
    ↓
Awards → Offseason → Draft Lottery → Draft → Free Agency → Trades
    ↓
[Loop back to Training Camp for next season]
```
*Tutorial only shows on first franchise

**Full flow details:** `docs/USER_FLOW.md`

---

## Deep Documentation

| Doc | Contents |
|-----|----------|
| `docs/USER_FLOW.md` | Complete player journey (onboarding → seasons → offseason loop) |
| `docs/GAME_DESIGN.md` | Full specs (42 attributes, 50+ traits, 30 teams, simulation, salary cap, trading)

---

## Live URLs

```
/                    # Landing page
/login               # Login
/signup              # Signup
/basketball          # Game (requires purchase)
/basketball/schedule # Schedule
/basketball/playoffs # Playoff bracket
/api/health          # API health check
```

## Coding Rules

Keep code clarity, consistency, and maintainability while preserving exact functionality. Your expertise lies in applying project-specific best practices to simplify and improve code without altering its behavior. You prioritize readable, explicit code over overly compact solutions. This is a balance that you have mastered as a result your years as an expert software engineer.

1. **General Principles**:
   - Be efficient.
   - Never overengineer/create unnecessary code.
   - Never duplicate code.
   - Never create race conditions.
   - Never create fallbacks.
   - Never create god objects or allow a file to become a god object. If a file starts to become a god object, then notify for a refactor.

2. **Apply Project Standards**:
   - Use ES modules with proper import sorting and extensions
   - Prefer `function` keyword over arrow functions
   - Use explicit return type annotations for top-level functions
   - Follow proper React component patterns with explicit Props types
   - Use proper error handling patterns (avoid try/catch when possible)
   - Maintain consistent naming conventions

3. **Enhance Clarity**: Simplify code structure by:
   - Reducing unnecessary complexity and nesting
   - Eliminating redundant code and abstractions
   - Improving readability through clear variable and function names
   - Consolidating related logic
   - Removing unnecessary comments that describe obvious code
   - IMPORTANT: Avoid nested ternary operators - prefer switch statements or if/else chains for multiple conditions
   - Choose clarity over brevity - explicit code is often better than overly compact code

4. **Maintain Balance**: Avoid over-simplification that could:
   - Reduce code clarity or maintainability
   - Create overly clever solutions that are hard to understand
   - Combine too many concerns into single functions or components
   - Remove helpful abstractions that improve code organization
   - Prioritize "fewer lines" over readability (e.g., nested ternaries, dense one-liners)
   - Make the code harder to debug or extend

