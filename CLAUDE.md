# Sports League Office - Basketball

A premium single-player basketball franchise simulation. $10 one-time purchase.

**Domain:** sportsleagueoffice.com/basketball
**Price:** $10 via Stripe

---

## DEVELOPMENT RULES (MUST FOLLOW)

### Rule 1: Update CLAUDE.md As We Build
- Mark checkboxes `[x]` as tasks are completed
- Add new files/components to Project Structure as created
- Document any deviations from the plan with reasoning
- Add new endpoints to API section when implemented
- Keep "Current Progress" section updated

### Rule 2: Follow GAME_DESIGN.md Specifications
- Always reference the relevant GAME_DESIGN.md section before implementing
- Use exact formulas from Appendix A
- Use exact data from Appendix B (teams, traits, archetypes)
- Match UI specifications from Appendix C
- If deviating, document WHY in CLAUDE.md

### Rule 3: Consistent White Theme Design System (EA FIFA Style)
All UI must use the established design system. Components should feel unified, clean, and premium like EA SPORTS FC.

#### Color Palette (Clean White Theme - EA FIFA Style)
```css
:root {
  /* Primary Brand */
  --color-primary: #1a56db;        /* Deep Blue - primary actions */
  --color-primary-hover: #1e40af;  /* Darker blue on hover */
  --color-primary-light: #dbeafe;  /* Light blue backgrounds */

  /* Backgrounds */
  --color-bg-base: #ffffff;        /* Pure white - page background */
  --color-bg-surface: #f8fafc;     /* Light gray - cards, panels */
  --color-bg-elevated: #f1f5f9;    /* Slightly darker - hover states */
  --color-bg-muted: #e2e8f0;       /* Muted backgrounds */

  /* Text */
  --color-text-primary: #0f172a;   /* Near black - main text */
  --color-text-secondary: #475569; /* Medium gray - secondary text */
  --color-text-muted: #94a3b8;     /* Light gray - disabled/hints */

  /* Semantic */
  --color-success: #16a34a;        /* Green - wins, positive stats */
  --color-warning: #d97706;        /* Amber - caution, mid-tier */
  --color-danger: #dc2626;         /* Red - losses, negative stats */

  /* Accents */
  --color-gold: #ca8a04;           /* Gold badges, elite tier */
  --color-silver: #71717a;         /* Silver badges */
  --color-bronze: #a16207;         /* Bronze badges */

  /* Borders */
  --color-border: #e2e8f0;         /* Light border */
  --color-border-strong: #cbd5e1;  /* Emphasis border */
  --color-border-focus: #1a56db;   /* Focus rings */
}
```

#### Typography
```css
:root {
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Scale */
  --text-xs: 0.75rem;    /* 12px - badges, labels */
  --text-sm: 0.875rem;   /* 14px - secondary text */
  --text-base: 1rem;     /* 16px - body text */
  --text-lg: 1.125rem;   /* 18px - subheadings */
  --text-xl: 1.25rem;    /* 20px - card titles */
  --text-2xl: 1.5rem;    /* 24px - section headers */
  --text-3xl: 1.875rem;  /* 30px - page titles */
  --text-4xl: 2.25rem;   /* 36px - hero numbers */
}
```

#### Component Patterns (EA FIFA Style)
```
EVERY component must:
├── Use CSS variables from above (no hardcoded colors)
├── Have clean, subtle shadows: shadow-sm or shadow-md
├── Use consistent border-radius: rounded-lg (0.5rem) or rounded-xl (0.75rem)
├── Use consistent spacing: p-4 for cards, gap-4 for grids
├── Have subtle hover states (bg-slate-50 or slight shadow increase)
├── Include proper focus rings for accessibility
├── Feel premium and polished - no clutter
└── Follow established Tailwind patterns (clean white theme)
```

#### Stat Display Colors (Light Theme)
```typescript
// Use these consistently for all stat displays
const STAT_COLORS = {
  elite: 'text-emerald-600',   // 90-99
  great: 'text-green-600',     // 80-89
  good: 'text-blue-600',       // 70-79
  average: 'text-slate-600',   // 60-69
  below: 'text-amber-600',     // 50-59
  poor: 'text-orange-600',     // 40-49
  bad: 'text-red-600',         // 0-39
};

// Badge tier colors (consistent everywhere)
const BADGE_COLORS = {
  hall_of_fame: 'text-yellow-600 bg-yellow-50 border border-yellow-200',
  gold: 'text-amber-600 bg-amber-50 border border-amber-200',
  silver: 'text-slate-500 bg-slate-50 border border-slate-200',
  bronze: 'text-orange-700 bg-orange-50 border border-orange-200',
};
```

#### Design Principles (EA FIFA Inspired)
1. **Clean white space** - Let content breathe, no cramped layouts
2. **Subtle depth** - Use shadows sparingly for hierarchy
3. **Bold typography** - Strong headings, clear hierarchy
4. **Card-based layout** - Information in well-defined containers
5. **Accent colors pop** - Primary blue and stats colors stand out on white
6. **Premium feel** - Every interaction should feel polished

---

## Component Library

All components live in `client/src/components/ui/` and must follow these patterns exactly.

### Base Components

#### Button
```tsx
// Variants: primary, secondary, ghost, danger
// Sizes: sm, md, lg
<Button variant="primary" size="md">Click Me</Button>

// Tailwind classes by variant:
const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};
// All buttons: rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
```

#### Card
```tsx
// Standard card wrapper for all content sections
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Optional subtitle</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>

// Tailwind: bg-white rounded-xl border border-slate-200 shadow-sm
// CardHeader: px-6 py-4 border-b border-slate-100
// CardContent: px-6 py-4
```

#### Input
```tsx
<Input placeholder="Search..." />
<Select options={[...]} />

// Tailwind: w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900
//           placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
```

#### Badge
```tsx
// For positions, status, tiers
<Badge variant="position">PG</Badge>
<Badge variant="tier" tier="gold">Gold</Badge>

const badgeVariants = {
  position: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
};
// All badges: px-2 py-0.5 text-xs font-medium rounded-md
```

#### Table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead className="text-right">OVR</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Player Name</TableCell>
      <TableCell className="text-right">95</TableCell>
    </TableRow>
  </TableBody>
</Table>

// Table: w-full border-collapse
// TableHeader: bg-slate-50
// TableHead: px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider
// TableRow: border-b border-slate-100 hover:bg-slate-50 transition-colors
// TableCell: px-4 py-3 text-sm text-slate-900
```

### Domain Components

#### PlayerCard
```tsx
// Compact player display for lists/rosters
<PlayerCard player={player} />

// Shows: Name, Position badge, Overall rating (color-coded), Team abbrev
// Layout: Horizontal flex, avatar placeholder on left, info in middle, OVR on right
```

#### StatBar
```tsx
// Visual attribute display (0-99)
<StatBar label="Three Point" value={85} />

// Horizontal bar with label, value, and filled progress bar
// Color based on STAT_COLORS from design system
```

#### TeamLogo
```tsx
// Team color circle with abbreviation
<TeamLogo team={team} size="md" />

// Sizes: sm (32px), md (48px), lg (64px)
// Circle with team's primary_color, white text abbreviation
```

#### StandingsRow
```tsx
// Single row in standings table
<StandingsRow team={team} rank={1} />

// Shows: Rank, Team logo + name, W-L record, PCT, GB, Streak
```

---

## Page Templates

All pages use consistent structure. Import from `components/layout/`.

### PageTemplate
```tsx
// Every page wraps content in this template
import { PageTemplate } from '@/components/layout/PageTemplate';

export function TeamsPage() {
  return (
    <PageTemplate
      title="Teams"
      subtitle="All 30 franchise teams"
      action={<Button>Optional Action</Button>}
    >
      {/* Page content */}
    </PageTemplate>
  );
}
```

**PageTemplate Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Sidebar Nav]  │  Page Content Area                        │
│                 │  ┌─────────────────────────────────────┐  │
│  Dashboard      │  │ Page Header                         │  │
│  Teams          │  │ Title          [Optional Action]    │  │
│  Players        │  │ Subtitle                            │  │
│  Standings      │  └─────────────────────────────────────┘  │
│  Schedule       │                                           │
│                 │  ┌─────────────────────────────────────┐  │
│                 │  │                                     │  │
│                 │  │  {children} - Page Content          │  │
│                 │  │                                     │  │
│                 │  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Layout Component
```tsx
// Wraps entire app, provides sidebar + main content area
<Layout>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/teams" element={<TeamsPage />} />
    ...
  </Routes>
</Layout>
```

**Sidebar Specs:**
- Width: 240px (w-60)
- Background: white (bg-white)
- Border: right border (border-r border-slate-200)
- Logo area: h-16, centered, app name
- Nav items: py-2 px-4, hover:bg-slate-50, active:bg-blue-50 active:text-blue-600
- Icons: 20px, text-slate-400, active:text-blue-600

**Main Content Area:**
- Background: bg-slate-50 (light gray to contrast with white cards)
- Padding: p-6
- Max-width: max-w-7xl mx-auto

### Page Header Component
```tsx
<PageHeader
  title="Teams"
  subtitle="Browse all 30 teams"
  action={<Button>Create Team</Button>}  // optional
  breadcrumbs={[{label: 'Home', href: '/'}, {label: 'Teams'}]}  // optional
/>

// Tailwind:
// Container: mb-6
// Title: text-2xl font-bold text-slate-900
// Subtitle: text-sm text-slate-500 mt-1
// Action: ml-auto (flex container)
```

---

## File Structure (Components)

```
client/src/
├── components/
│   ├── ui/                    # Base components
│   │   ├── Button.tsx         # Primary, secondary, ghost, danger variants
│   │   ├── Card.tsx           # Card, CardHeader, CardTitle, CardContent
│   │   ├── Input.tsx          # Text input with focus states
│   │   ├── Badge.tsx          # Position, success, warning, danger variants
│   │   ├── Table.tsx          # Table, TableHeader, TableBody, TableRow, etc.
│   │   ├── StatBar.tsx        # Horizontal attribute bar (0-99)
│   │   └── index.ts           # Re-export all
│   │
│   ├── layout/                # Layout components
│   │   ├── Layout.tsx         # Main app layout with sidebar
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   ├── PageTemplate.tsx   # Page wrapper with header
│   │   ├── PageHeader.tsx     # Title + subtitle + actions
│   │   └── index.ts           # Re-export all
│   │
│   ├── player/                # Player-related components
│   │   └── PlayerCard.tsx     # Compact player display for lists
│   │
│   ├── team/                  # Team-related components
│   │   ├── TeamCard.tsx       # Compact team display card
│   │   └── TeamLogo.tsx       # Team color circle with abbreviation
│   │
│   └── PurchaseModal.tsx      # Stripe checkout modal
│
├── pages/                     # Page components (19 pages)
│   ├── Dashboard.tsx          # Franchise home with stats
│   ├── TeamSelectionPage.tsx  # Forced team selection (entry point)
│   ├── TeamsPage.tsx          # Browse all 30 teams
│   ├── TeamDetailPage.tsx     # Team details with roster
│   ├── PlayersPage.tsx        # Paginated player list
│   ├── PlayerDetailPage.tsx   # Player stats with attribute bars
│   ├── StandingsPage.tsx      # League standings by division
│   ├── StatsPage.tsx          # League leaders and team rankings
│   ├── GamesPage.tsx          # Game history and simulation
│   ├── GameDetailPage.tsx     # Box score with quarter breakdown
│   ├── GameSelectPage.tsx     # Manual team selection for simulation
│   ├── SchedulePage.tsx       # Season schedule calendar
│   ├── PlayoffsPage.tsx       # Playoff bracket and series
│   ├── DraftPage.tsx          # Draft prospects, lottery, picks
│   ├── FreeAgencyPage.tsx     # Free agents, signings, salary cap
│   ├── TradesPage.tsx         # Trade builder, proposals, history
│   ├── LandingPage.tsx        # Marketing page with $10 pricing
│   ├── LoginPage.tsx          # User login form
│   └── SignupPage.tsx         # User signup form
│
├── tests/                     # Playwright E2E tests
│   ├── auth.spec.ts           # Login/signup form tests
│   ├── routing.spec.ts        # Route protection tests
│   └── mobile.spec.ts         # Mobile responsiveness tests
│
├── context/                   # React context
│   ├── AuthContext.tsx        # Auth state, login/logout, purchase status
│   └── FranchiseContext.tsx   # Franchise state, team info, refreshFranchise
│
├── api/                       # API client
│   ├── client.ts              # Fetch wrapper with 30 API methods
│   └── hooks.ts               # 30 React Query hooks
│
└── lib/
    └── utils.ts               # Helper functions (cn, getStatColor, etc.)
```

---

## Product Overview

### What This Is
- Single-player basketball franchise management simulation
- Browser-based game at sportsleagueoffice.com/basketball
- One-time $10 purchase via Stripe (no subscriptions)
- Modeled after NBA 2K MyTeam / Madden Franchise mode

### Pages/Routes
```
sportsleagueoffice.com/                    # Marketing landing page
sportsleagueoffice.com/login               # Auth (login/signup)
sportsleagueoffice.com/basketball          # Game entry (requires purchase)
sportsleagueoffice.com/basketball/...      # All game routes below
```

### Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | UI framework |
| | Custom Tailwind Components | Component library (light theme) |
| | TanStack Query | Server state/caching |
| | React Router v6 | Client-side routing |
| **Backend** | Node.js + Express | API server |
| | TypeScript | Type safety |
| **Database** | PostgreSQL | Primary data store |
| **Payments** | Stripe | $10 one-time purchase |
| **Auth** | JWT + bcryptjs | User accounts & sessions |
| **Hosting** | Hetzner Cloud VPS | Frontend + Backend |
| **Planned** | React Three Fiber | 3D game visualization (Phase 6) |

---

## Current Progress

**Status:** PHASE 10 COMPLETE
**Last Updated:** 2026-01-03
**Current Phase:** Phase 10 Complete - Multi-Franchise, Development, CPU AI

### Live URLs:
- **Landing Page:** https://sportsleagueoffice.com/
- **Login:** https://sportsleagueoffice.com/login
- **Signup:** https://sportsleagueoffice.com/signup
- **Team Selection:** https://sportsleagueoffice.com/basketball/select-team (after purchase)
- **Game:** https://sportsleagueoffice.com/basketball (requires purchase + team)
- **My Franchises:** https://sportsleagueoffice.com/basketball/franchises
- **Development:** https://sportsleagueoffice.com/basketball/development
- **API Health:** https://sportsleagueoffice.com/api/health

### What's Working:
- [x] Full React UI with white EA FIFA-style theme
- [x] Dashboard with user's franchise info prominently displayed
- [x] Teams page with division groupings
- [x] Team detail page with full roster
- [x] Players page with position filters and pagination
- [x] Player detail page with attribute stat bars
- [x] Standings page by division
- [x] **Stats page** - League leaders by category, team rankings
- [x] Database - 30 teams, 510 players, 47 traits
- [x] All API endpoints working
- [x] Game simulation engine (possession-by-possession)
- [x] Games page with simulation controls
- [x] Box score display with quarter scores
- [x] Player and team stats tracking
- [x] Franchise system linked to user accounts
- [x] Team selection page as forced entry point
- [x] 82-game schedule generation
- [x] Season progression (advance day, auto-simulation)
- [x] Schedule page with calendar view
- [x] Playoffs with play-in tournament and bracket
- [x] Best-of-7 series simulation
- [x] Championship tracking
- [x] User authentication (signup/login with JWT)
- [x] Landing page with features and $10 pricing
- [x] Stripe checkout integration
- [x] Protected routes (requires purchase)
- [x] Complete game loop with no dead ends
- [x] All phase transitions working (preseason → season → playoffs → offseason)
- [x] Multi-season support (can play through unlimited seasons)
- [x] **Draft page** - Generate draft class, run lottery, make picks (offseason)
- [x] **Free Agency page** - Browse/sign free agents, salary cap info
- [x] **Trades page** - Propose trades, accept/reject, trade history
- [x] **Mobile responsive** - 44px touch targets, responsive tables, no overflow
- [x] **E2E testing** - Playwright tests for auth, routing, mobile
- [x] **SSL** - HTTPS working on sportsleagueoffice.com
- [x] **Analytics** - Clicky tracking installed
- [x] **Multiple Franchises** - Create and manage multiple save files per user
- [x] **Franchise Manager page** - List, create, switch, delete franchises
- [x] **Player Development page** - View player growth phases, peak age, projections
- [x] **Player Development System** - 3-phase development (growth → peak → decline)
- [x] **Hidden Stats** - Work ethic, coachability, durability affect development
- [x] **CPU AI Trade Responses** - CPU teams evaluate and respond to trade proposals
- [x] **CPU AI Free Agency** - CPU teams sign free agents based on strategy

### Database Stats:
| Table | Count |
|-------|-------|
| Teams | 30 |
| Players | 510 (450 rostered + 60 FA) |
| Traits | 47 |
| Seasons | 1 |
| Games | Active (simulation working) |
| Schedule | 435 games per season |
| Franchises | User-selectable |
| Playoff Series | Dynamic (play-in + 4 rounds) |
| Users | Active (auth working) |
| Sessions | Active (JWT refresh tokens) |

### Testing:
```bash
cd client
npm test              # Run all E2E tests
npm run test:prod     # Test against production
npm run test:headed   # Run with visible browser
```

### Next Up (Phase 11 - Visual Polish):
- 3D game visualization (Three.js/React Three Fiber)
- Game highlights/play-by-play viewer
- Career stats and Hall of Fame tracking
- Advanced stat visualizations
- Performance optimization

---

## IMPLEMENTATION PLAN

We build systematically, phase by phase. Mark tasks `[x]` as completed.

---

### PHASE 0: Project Setup + Hetzner Deploy (DO FIRST)
**Goal:** Monorepo running locally AND deployed to Hetzner

#### 0.1 Monorepo Structure
- [x] Create project folders (client, server, shared)
- [x] Initialize package.json files
- [x] Set up TypeScript configs
- [x] Configure path aliases

#### 0.2 Server Setup
- [x] Initialize Express + TypeScript
- [x] Install dependencies (express, pg, cors, dotenv)
- [x] Create basic server entry point
- [x] Add health check endpoint `/api/health`

#### 0.3 Client Setup
- [x] Create Vite + React + TypeScript app
- [x] Install Tailwind CSS (configured for white theme)
- [x] Create custom component library (Button, Card, Badge, etc.)
- [x] Create basic App shell with routing

#### 0.4 Local Database Setup
- [x] Create docker-compose.yml (Postgres + Redis)
- [x] Create .env files (local + production)
- [ ] Test local database connection

#### 0.5 Hetzner Server Setup
- [x] Verify/create VPS (existing: 178.156.146.91)
- [x] Install Node.js, PM2, Nginx, PostgreSQL (already installed)
- [x] Set up PostgreSQL database (sportsleagueoffice)
- [x] Configure Nginx reverse proxy
- [ ] Set up SSL with Let's Encrypt (needs DNS pointed first)

#### 0.6 Deploy Pipeline
- [x] Create deploy script (deploy.sh)
- [x] Deploy server to Hetzner
- [x] Deploy client build to Hetzner
- [x] Verify live at http://178.156.146.91:8080

#### 0.7 Verify Everything
- [ ] Local: Server runs on port 3001 (need Docker for DB)
- [ ] Local: Client runs on port 5173
- [x] Production: http://178.156.146.91:8080 loads ✓
- [x] Production: API responds ✓

**Phase 0 Complete When:** App runs locally AND live on Hetzner

### Hetzner Server Info
| Item | Value |
|------|-------|
| **IP** | 178.156.146.91 |
| **SSH** | `ssh -i ~/.ssh/jmodernize root@178.156.146.91` |
| **App URL** | http://178.156.146.91:8080 (temp) |
| **API Port** | 3001 (internal) |
| **PM2 Process** | slo-api |
| **App Directory** | /opt/sportsleagueoffice |
| **Database** | PostgreSQL: sportsleagueoffice (user: hoops) |
| **Nginx Config** | /etc/nginx/sites-available/sportsleagueoffice |

### Deploy Commands
```bash
# Quick deploy (Linux/Mac with rsync)
./deploy.sh

# Manual deploy (Windows or without rsync)
# 1. Build locally
cd client && npm run build && cd ..
cd server && npm run build && cd ..

# 2. Upload built files
scp -i ~/.ssh/jmodernize -r server/dist/* root@178.156.146.91:/opt/sportsleagueoffice/server/dist/
scp -i ~/.ssh/jmodernize server/package.json server/package-lock.json root@178.156.146.91:/opt/sportsleagueoffice/server/
scp -i ~/.ssh/jmodernize -r client/dist/* root@178.156.146.91:/opt/sportsleagueoffice/client/dist/

# 3. Install deps and restart
ssh -i ~/.ssh/jmodernize root@178.156.146.91 "cd /opt/sportsleagueoffice/server && npm install --production && pm2 restart slo-api"
```

### DNS Setup Required
Point sportsleagueoffice.com A record to: **178.156.146.91**
Then run: `sudo certbot --nginx -d sportsleagueoffice.com -d www.sportsleagueoffice.com`

---

### PHASE 1: Database & Core Data ✓ COMPLETE
**Goal:** All 30 teams and players in database

#### 1.1 Database Schema
- [x] Create migrations folder structure
- [x] Migration: teams table (001_create_teams.sql)
- [x] Migration: players table (002_create_players.sql)
- [x] Migration: player_attributes table (003_create_player_attributes.sql)
- [x] Migration: traits table + player_traits (004_create_traits.sql)
- [x] Migration: seasons + standings tables (005_create_standings.sql)
- [x] Run all migrations on Hetzner

#### 1.2 Seed Data
- [x] Create seed file for all 30 NBA-style teams (001_teams.ts)
- [x] Seed 47 traits (002_traits.ts)
- [x] Create player generator with archetypes (003_player_generator.ts)
- [x] Run main seed script (seed.ts)

#### 1.3 API Endpoints
- [x] GET /api/teams - List all 30 teams
- [x] GET /api/teams/:id - Team with roster
- [x] GET /api/players - Paginated player list
- [x] GET /api/players/:id - Player with attributes
- [x] GET /api/traits - All traits
- [x] GET /api/standings - Season standings
- [x] GET /api/season - Current season info

**Phase 1 Status:** ✓ COMPLETE - 30 teams, 510 players, 47 traits in database

---

### PHASE 2: Client UI (White Theme) ✓ COMPLETE
**Goal:** View teams, players, standings in browser

#### 2.1 Client - API Layer
- [x] Create api/client.ts with fetch wrapper
- [x] Create React Query hooks for all endpoints (useTeams, usePlayers, useStandings, etc.)
- [x] Test data fetching

#### 2.2 Client - Layout (White Theme)
- [x] Create Layout component with sidebar navigation
- [x] Style sidebar (white theme, EA FIFA style)
- [x] Create PageTemplate and PageHeader components
- [x] Set up React Router routes

#### 2.3 Client - Pages (Basic)
- [x] Dashboard page (stats overview, conference standings, top players)
- [x] Teams list page (grouped by division)
- [x] Team detail page (roster with stats)
- [x] Players list page (with position filter, pagination)
- [x] Player detail page (full attributes with stat bars)
- [x] Standings page (by division)

#### 2.4 Components Created
- Base UI: Button, Card, Badge, Input, Table, StatBar
- Layout: Layout, Sidebar, PageTemplate, PageHeader
- Domain: TeamCard, TeamLogo, PlayerCard

**Phase 2 Status:** ✓ COMPLETE - Live at http://sportsleagueoffice.com/basketball

---

### PHASE 3: Simulation Engine ✓ COMPLETE
**Goal:** Simulate realistic basketball games

#### 3.1 Core Simulation
- [x] Create simulation/types.ts
- [x] Create possession engine
- [x] Implement shot selection logic
- [x] Implement shot probability (use GAME_DESIGN formulas)

#### 3.2 Advanced Features
- [x] Implement attribute effects on shot probability
- [x] Implement trait effects with tier multipliers (bronze/silver/gold/HOF)
- [x] Add clutch moment modifiers
- [x] Add fatigue system with recovery on bench

#### 3.3 Game Flow
- [x] 4-quarter game structure (12 min quarters)
- [x] Substitution logic (fatigue-based, foul trouble)
- [x] Overtime handling (5 min periods)
- [x] Play-by-play generation

#### 3.4 API Integration
- [x] POST /api/games/simulate - Run simulation
- [x] GET /api/games - List recent games
- [x] GET /api/games/:id - Game details with box score
- [x] Save game results to database
- [x] Calculate and store player stats
- [x] Update standings after games

#### 3.5 UI - Game Viewing
- [x] Games page with simulation controls
- [x] Game result page with box score
- [x] Quarter-by-quarter scoring
- [x] Team stats comparison
- [x] Player stats table

#### 3.6 Files Created
- server/src/simulation/types.ts - All simulation types
- server/src/simulation/shots.ts - Shot probability calculations
- server/src/simulation/possession.ts - Possession engine
- server/src/simulation/engine.ts - Main game engine
- server/src/db/migrations/006_create_games.sql - Games tables
- client/src/pages/GamesPage.tsx - Games list and simulation
- client/src/pages/GameDetailPage.tsx - Box score display

**Phase 3 Status:** ✓ COMPLETE - Simulation engine working at http://sportsleagueoffice.com/basketball/games

---

### PHASE 4: Season & Franchise Mode ✓ COMPLETE
**Goal:** Play through full seasons

#### 4.1 Schedule Generation
- [x] Implement 82-game schedule algorithm
- [x] Balance home/away games
- [x] Respect scheduling rules

#### 4.2 Season Progression
- [x] Advance day functionality
- [x] Simulate other games automatically
- [x] Update standings after each game

#### 4.3 Playoffs
- [x] Play-in tournament logic
- [x] 16-team bracket generation
- [x] Best-of-7 series tracking
- [x] Champion determination

#### 4.4 Franchise Save System
- [x] Create franchise table
- [x] Team selection flow
- [x] Save/load game state
- [ ] Multi-season support (deferred)

#### 4.5 CPU AI (Basic)
- [ ] CPU lineup management (deferred)
- [ ] CPU rotation decisions (deferred)
- [ ] Basic trade evaluation (deferred)

#### 4.6 Files Created
- server/src/db/migrations/007_create_schedule.sql - Schedule & franchise tables
- server/src/schedule/generator.ts - 82-game schedule generator
- server/src/playoffs/engine.ts - Playoffs engine with play-in and bracket
- client/src/pages/SchedulePage.tsx - Schedule page with team selection
- client/src/pages/PlayoffsPage.tsx - Playoffs bracket and simulation

**Phase 4 Status:** ✓ COMPLETE - Full season mode with playoffs at http://sportsleagueoffice.com/basketball/playoffs

---

### PHASE 5: Auth & Payments ✓ COMPLETE
**Goal:** Users can buy and access the game

#### 5.1 Authentication
- [x] User table migration (008_create_users.sql)
- [x] POST /api/auth/signup
- [x] POST /api/auth/login
- [x] POST /api/auth/logout
- [x] POST /api/auth/refresh
- [x] GET /api/auth/me
- [x] Session/JWT handling
- [x] Auth middleware

#### 5.2 Stripe Integration
- [x] POST /api/payments/checkout - Creates Stripe checkout session
- [x] POST /api/payments/webhook - Handles payment success
- [x] GET /api/payments/status - Check purchase status
- [x] Purchase verification with markUserPurchased()

#### 5.3 Landing Page
- [x] Create marketing page at / (LandingPage.tsx)
- [x] Pricing section ($10 one-time)
- [x] Feature highlights (6 features)
- [x] CTA to signup/buy

#### 5.4 Access Control
- [x] Gate /basketball routes (PurchaseRequiredRoute)
- [x] Redirect unpaid users to landing page
- [x] AuthContext with isAuthenticated/hasPurchased

#### 5.5 Files Created
- server/src/auth/index.ts - JWT auth with bcryptjs
- server/src/db/migrations/008_create_users.sql - Users & sessions tables
- client/src/context/AuthContext.tsx - Auth context provider
- client/src/pages/LandingPage.tsx - Marketing landing page
- client/src/pages/LoginPage.tsx - Login form
- client/src/pages/SignupPage.tsx - Signup form

**Phase 5 Status:** ✓ COMPLETE - Auth & Payments deployed at http://178.156.146.91:8080

---

### PHASE 6: Game Systems (GAME_DESIGN.md Alignment)
**Goal:** Implement missing game mechanics from GAME_DESIGN.md

- [x] Fix trait tier multipliers (0.5/0.75/1.0/1.5)
- [x] Add missing 14 player attributes
- [x] Implement Hot/Cold streakiness system
- [x] Add hidden attributes (peak_age, durability, etc.)
- [x] Create Draft system (lottery, prospects, picks)
- [x] Create Free Agency system (contracts, salary cap)
- [x] Create Trading system (proposals, evaluation)
- [x] Implement Player Development/Aging
- [x] Add Advanced Statistics (PER, TS%, BPM, Win Shares)
- [x] Implement CPU AI for other teams

**Phase 6 Status:** ✓ COMPLETE

---

### PHASE 7: Game Flow & User Experience
**Goal:** Fix the broken user journey - make it clear and guided

#### The Problem (Audit Findings):
1. User enters game with NO team selection prompt
2. Dashboard shows league data, not user's franchise
3. Team selection hidden on Schedule page (users don't find it)
4. Franchises aren't linked to user accounts (multi-user broken)
5. No onboarding or guided flow after purchase

#### The Solution (Simple Flow):

```
PURCHASE COMPLETE
      ↓
TEAM SELECTION (forced first screen)
  - "Welcome! Select your team to manage"
  - Grid of 30 teams by division
  - Click team → franchise created
      ↓
MY FRANCHISE (new home page)
  - Team logo, record, current phase
  - Quick actions: Start Season, View Schedule
  - Season progress indicator
      ↓
SEASON LOOP
  - Advance Day → Play Games → Standings update
  - End of season → Playoffs → Offseason
  - Offseason → Draft, FA, Dev → New Season
```

#### Implementation Tasks:

- [x] 7.1 Add user_id filtering to franchise API (link franchise to user)
- [x] 7.2 Create FranchiseContext to track user's team globally
- [x] 7.3 Create TeamSelectionPage as forced entry point
- [x] 7.4 Update Dashboard to show user's franchise (not league overview)
- [x] 7.5 Add franchise check wrapper - redirect if no franchise selected
- [x] 7.6 Update sidebar to show current team
- [x] 7.7 Remove Settings link, added Logout button

#### Files Created/Modified:
- `server/src/db/migrations/014_franchise_user_link.sql` - Links franchises to users
- `server/src/routes/franchise.ts` - Added auth middleware, user_id filtering
- `client/src/context/FranchiseContext.tsx` - New context for franchise state
- `client/src/pages/TeamSelectionPage.tsx` - New forced team selection page
- `client/src/pages/Dashboard.tsx` - Now shows user's franchise
- `client/src/components/layout/Sidebar.tsx` - Shows current team, logout button
- `client/src/App.tsx` - Added FranchiseProvider, FranchiseRequiredRoute

**Phase 7 Status:** COMPLETE

---

### PHASE 8: Game Flow Audit & Fixes ✓ COMPLETE
**Goal:** Ensure smooth game loop with no dead ends

#### Issues Found & Fixed (3 Audit Rounds):

**Round 1 - Critical Fixes:**
- [x] Fixed payment API response mismatch (`url` → `checkout_url`)
- [x] Added `/season/finalize-playoffs` endpoint for playoffs → offseason transition
- [x] Added "Continue to Offseason" button in PlayoffsPage after Finals
- [x] Fixed Start Playoffs button condition (shows in `playoffs` phase, not `regular_season`)
- [x] Created migration `015_add_season_number_to_franchises.sql`

**Round 2 - Wiring Fixes:**
- [x] Added auth middleware to `POST /schedule/generate`
- [x] Moved playoff mutations to PlayoffsPage with `refreshFranchise()` calls
- [x] Ensured all mutations invalidate queries AND refresh franchise context

**Round 3 - Auth Fixes:**
- [x] Added auth middleware to `POST /playoffs/start`
- [x] Added auth middleware to `POST /playoffs/simulate`

#### Complete Game Loop Verified:
```
Team Selection → Preseason (Generate Schedule) → Start Season
     ↓
Regular Season (Advance Day/Week/To Playoffs)
     ↓
Playoffs Phase → Start Playoffs (Play-In) → Simulate Series
     ↓
Finals Complete → Continue to Offseason
     ↓
Offseason (Process Changes) → Start New Season
     ↓
Back to Preseason (Season 2, 3, 4...)
```

#### Files Modified:
- `server/src/routes/payments.ts` - Fixed response keys
- `server/src/routes/season.ts` - Added `/finalize-playoffs` endpoint
- `server/src/routes/schedule.ts` - Added auth middleware
- `server/src/routes/playoffs.ts` - Added auth middleware to start/simulate
- `server/src/db/migrations/015_add_season_number_to_franchises.sql` - New migration
- `client/src/api/client.ts` - Added `finalizePlayoffs` API method
- `client/src/pages/PlayoffsPage.tsx` - Fixed buttons, added transitions, refreshFranchise()

**Phase 8 Status:** ✓ COMPLETE - All transitions verified, no dead ends

---

### PHASE 9: Polish & Launch
**Goal:** Production-ready game

- [ ] Configure Stripe environment variables on server
- [x] Mobile responsiveness audit & fixes (Phase 9.1)
- [ ] 3D game visualization (Three.js)
- [ ] Performance optimization
- [x] Deploy to production domain (https://sportsleagueoffice.com)
- [x] SSL certificate setup (Let's Encrypt via Certbot)
- [ ] Launch!

#### 9.1 Mobile Responsiveness Fixes (COMPLETE)
**Audited and fixed mobile issues across all pages:**

**Core Layout Changes:**
- Added hamburger menu for mobile navigation (Layout.tsx, Sidebar.tsx)
- Sidebar now slides in/out on mobile with backdrop
- Mobile header shows team abbreviation
- Responsive padding: `p-4 md:p-6` across layout

**Component Fixes:**
- Card: `px-4 py-3 md:px-6 md:py-4` for responsive padding
- Button: Increased min-height to 36-44px for touch targets
- PageHeader: Stacks title/action on mobile, smaller text sizes
- All headings use responsive sizing (e.g., `text-xl md:text-2xl`)

**Page-Specific Fixes:**
- LandingPage: Responsive hero text, feature grid, pricing card
- Dashboard: Franchise header stacks on mobile, 2-col stats grid
- All pages: Text truncation, responsive gaps, mobile-first grids

---

## CURRENT TASK

**Phase:** 8 COMPLETE - Game Flow Audit & Fixes
**Status:** All phases 1-8 complete! Ready for Phase 9 (Polish)

### What's Working:
- ✓ Landing page with pricing at /
- ✓ User authentication (signup/login/logout)
- ✓ JWT session management with refresh tokens
- ✓ Stripe checkout integration ($10 purchase)
- ✓ Protected /basketball routes (require purchase)
- ✓ Full UI: Dashboard, Teams, Players, Standings, Games, Schedule, Playoffs
- ✓ Database: 30 teams, 510 players, 47 traits, schedule, franchises, playoffs
- ✓ Game simulation engine (possession-by-possession)
- ✓ Franchise system with team selection
- ✓ 82-game schedule generation
- ✓ Season progression (advance day, auto-sim)
- ✓ Playoffs with play-in and bracket
- ✓ Championship tracking

### Live URLs:
```
https://sportsleagueoffice.com/                        # Landing page
https://sportsleagueoffice.com/login                   # Login
https://sportsleagueoffice.com/signup                  # Signup
https://sportsleagueoffice.com/basketball              # Game (requires purchase)
https://sportsleagueoffice.com/basketball/schedule     # Franchise & Schedule
https://sportsleagueoffice.com/basketball/playoffs     # Playoff bracket
https://sportsleagueoffice.com/api/health              # API health check
```

### User Flow:
1. Visit landing page → See features and $10 pricing
2. Click "Get Started" → Redirect to login/signup
3. Create account → Redirect back to landing page
4. Click "Purchase Now" → Stripe checkout ($10)
5. Complete payment → Redirect to team selection
6. Select team → Franchise created, go to Dashboard
7. Generate schedule → Start season
8. Play through: Regular Season → Playoffs → Offseason
9. Start new season → Repeat unlimited times

### Stripe Setup Required:
Set these environment variables on server:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

---

## API Endpoints

### Auth & Payments
```
POST   /api/auth/signup           - Create account
POST   /api/auth/login            - Login
POST   /api/auth/logout           - Logout
POST   /api/auth/refresh          - Refresh JWT token
GET    /api/auth/me               - Current user
POST   /api/payments/checkout     - Create Stripe checkout session
POST   /api/payments/webhook      - Stripe webhook handler
GET    /api/payments/status       - Check purchase status
```

### Teams
```
GET    /api/teams                 - List all 30 teams
GET    /api/teams/:id             - Team details with roster
```

### Players
```
GET    /api/players               - List players (paginated, filterable)
GET    /api/players/:id           - Player details with attributes/traits
```
Query params for `/api/players`: `page`, `limit`, `position`, `freeAgents=true`

### League Data
```
GET    /api/standings             - League standings by conference
GET    /api/traits                - All 47 player traits
GET    /api/season                - Current season info
POST   /api/season/start          - Start new season
```

### Franchise
```
GET    /api/franchise             - Current franchise data
POST   /api/franchise/select      - Select team to manage
```

### Schedule
```
POST   /api/schedule/generate     - Generate 82-game schedule
GET    /api/schedule              - Get schedule (filterable by team/date/month)
GET    /api/schedule/upcoming     - Next N games for a team
```

### Games
```
GET    /api/games                 - List recent games
GET    /api/games/:id             - Game details with box score
POST   /api/games/simulate        - Simulate single game
```

### Playoffs
```
GET    /api/playoffs              - Current playoff bracket state
POST   /api/playoffs/start        - Start play-in tournament
POST   /api/playoffs/simulate     - Simulate playoff game
GET    /api/playoffs/standings    - Playoff seeding standings
```

### Season Progression
```
POST   /api/season/advance/day    - Advance one day (simulates all games)
POST   /api/season/advance/week   - Advance one week
POST   /api/season/advance/playoffs - Advance to playoffs
POST   /api/season/finalize-playoffs - End playoffs, transition to offseason
POST   /api/season/offseason      - Process offseason (player dev, aging)
POST   /api/season/new            - Start new season
```

---

## Project Structure

```
sportsleagueoffice/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/        # Base components (Button, Card, etc.)
│   │   │   ├── layout/    # Layout, Sidebar, PageTemplate
│   │   │   ├── team/      # TeamCard, TeamLogo
│   │   │   └── player/    # PlayerCard, StatBar
│   │   ├── pages/         # All page components
│   │   ├── context/       # AuthContext, FranchiseContext
│   │   ├── api/           # API client + React Query hooks
│   │   └── lib/           # Utilities (cn, getStatColor, etc.)
│   ├── .env.example       # Environment template
│   └── package.json
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── index.ts       # App entry (51 lines - routes mounted here)
│   │   ├── routes/        # Modular API routes
│   │   │   ├── index.ts   # Route aggregator
│   │   │   ├── teams.ts
│   │   │   ├── players.ts
│   │   │   ├── games.ts
│   │   │   ├── franchise.ts
│   │   │   ├── schedule.ts
│   │   │   ├── season.ts
│   │   │   ├── playoffs.ts
│   │   │   ├── standings.ts
│   │   │   ├── traits.ts
│   │   │   ├── auth.ts
│   │   │   └── payments.ts
│   │   ├── services/
│   │   │   └── simulation.ts  # loadTeamForSimulation, selectStarters
│   │   ├── simulation/    # Game engine
│   │   │   ├── engine.ts      # Main game loop (530 lines)
│   │   │   ├── possession.ts  # Possession logic (712 lines)
│   │   │   ├── shots.ts       # Shot probability (~250 lines)
│   │   │   ├── types.ts       # Simulation types (~200 lines)
│   │   │   └── index.ts       # Module exports
│   │   ├── schedule/      # Schedule generator
│   │   │   └── generator.ts   # 82-game algorithm (227 lines)
│   │   ├── playoffs/      # Playoffs engine
│   │   │   ├── engine.ts      # Bracket/series logic (~280 lines)
│   │   │   └── index.ts       # Module exports
│   │   ├── auth/          # JWT auth + bcrypt
│   │   │   └── index.ts       # Auth functions (264 lines)
│   │   └── db/
│   │       ├── pool.ts    # PostgreSQL connection
│   │       ├── migrations/ # 15 SQL migrations
│   │       └── seeds/     # Teams, traits, player generator
│   ├── .env.example       # Environment template
│   └── package.json
│
├── shared/                 # Shared TypeScript types
│   └── types/
│       ├── team.ts
│       ├── player.ts
│       └── index.ts
│
├── GAME_DESIGN.md         # Complete game design (283KB)
├── CLAUDE.md              # This file
├── UPDATES.md             # Project changelog
├── SSL_SETUP.md           # SSL certificate setup guide
├── deploy.sh              # Hetzner deployment script
└── docker-compose.yml     # Local dev (Postgres + Redis)
```

---

## Reference

- **Full Game Design**: See `GAME_DESIGN.md` for complete specifications
  - All 42 attributes with formulas (Section 4.2)
  - All 50+ traits with effects (Section 4.4)
  - All 30 team profiles (Appendix B.1)
  - UI specifications (Appendix C)
  - Statistics system (Appendix D)
  - Player generation (Appendix E)

---

## Quick Start Commands

```bash
# 1. Start databases
docker-compose up -d

# 2. Run migrations
cd server && npm run migrate

# 3. Seed data (30 teams, players)
npm run seed

# 4. Start backend
npm run dev

# 5. Start frontend (new terminal)
cd client && npm run dev

# 6. Open browser
open http://localhost:5173
```
