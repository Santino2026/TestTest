# Sports League Office - Project Updates

## Current Status: Phase 5 Complete
**Date:** January 3, 2026

---

## What's Live

**URL:** http://178.156.146.91:8080

### Pages
| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page with features & pricing | No |
| `/login` | User login | No |
| `/signup` | User registration | No |
| `/games` | Game selection (Basketball / College Football) | Yes |
| `/basketball` | Basketball game dashboard | Yes + Purchase |
| `/basketball/teams` | All 30 teams | Yes + Purchase |
| `/basketball/players` | Player database (510 players) | Yes + Purchase |
| `/basketball/standings` | League standings | Yes + Purchase |
| `/basketball/schedule` | Season schedule & franchise | Yes + Purchase |
| `/basketball/playoffs` | Playoff bracket | Yes + Purchase |
| `/basketball/games` | Game simulation | Yes + Purchase |

---

## Completed Phases

### Phase 1: Database & Core Data
- 30 NBA-style teams with real divisions/conferences
- 510 players (450 rostered + 60 free agents)
- 47 player traits with tier system (Bronze/Silver/Gold/HOF)
- Player attributes system (42 attributes)
- PostgreSQL database on Hetzner

### Phase 2: Client UI
- React + TypeScript + Vite
- Tailwind CSS with consistent dark theme
- All pages: Dashboard, Teams, Players, Standings, Games
- EA FIFA-inspired white theme for game UI

### Phase 3: Simulation Engine
- Possession-by-possession game simulation
- Shot selection based on player attributes
- Trait effects with tier multipliers
- Fatigue and substitution system
- Overtime handling
- Full box scores with player/team stats

### Phase 4: Season & Franchise Mode
- 82-game schedule generation
- Franchise system with team selection
- Season progression (advance day)
- Play-in tournament
- 16-team playoff bracket
- Best-of-7 series simulation
- Championship tracking

### Phase 5: Auth & Payments
- User registration/login with JWT
- Session management with refresh tokens
- Stripe checkout integration ($10)
- Protected routes
- Game selection screen
- Purchase modal
- Consistent dark theme across all pages

---

## User Flow

```
1. Landing Page (/)
   ↓
2. Sign Up (/signup)
   ↓
3. Game Selection (/games)
   - Basketball tile → Purchase Modal → Stripe → /basketball
   - College Football tile → "Coming Soon"
   ↓
4. Basketball Dashboard (/basketball)
   - Select team → Generate schedule → Play season → Playoffs → Championship
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| State | React Query, Context API |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Payments | Stripe |
| Hosting | Hetzner VPS (178.156.146.91) |
| Process Manager | PM2 |
| Web Server | Nginx |

---

## Server Info

| Item | Value |
|------|-------|
| IP | 178.156.146.91 |
| SSH | `ssh -i ~/.ssh/jmodernize root@178.156.146.91` |
| App URL | http://178.156.146.91:8080 |
| API | http://178.156.146.91:8080/api |
| PM2 Process | slo-api |
| App Directory | /opt/sportsleagueoffice |
| Database | PostgreSQL: sportsleagueoffice (user: hoops) |

---

## Database Stats

| Table | Count |
|-------|-------|
| teams | 30 |
| players | 510 |
| traits | 47 |
| users | 2 |
| sessions | Active |
| franchises | 1 |
| games | Active |
| schedule | 435/season |
| playoff_series | Dynamic |

---

## Accounts with Access

| Email | Has Purchase |
|-------|--------------|
| j@modernizegames.com | Yes |
| test@example.com | Yes |

---

## Remaining Setup

### Stripe (Required for real payments)
```bash
ssh -i ~/.ssh/jmodernize root@178.156.146.91
nano /opt/sportsleagueoffice/server/.env
# Add:
# STRIPE_SECRET_KEY=sk_live_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
pm2 restart slo-api
```

### DNS (Required for domain)
1. Point sportsleagueoffice.com A record → 178.156.146.91
2. Run: `sudo certbot --nginx -d sportsleagueoffice.com`

---

## Phase 6 (Future)

- [ ] 3D game visualization (Three.js)
- [ ] Player development/aging
- [ ] Draft system
- [ ] Free agency
- [ ] Trade system
- [ ] CPU AI improvements
- [ ] Mobile responsiveness
- [ ] College Football game

---

## Recent Changes (Jan 3, 2026)

1. Added Game Selection page at `/games`
2. Created Purchase Modal for buying games
3. Updated user flow: Login → Game Select → Purchase → Play
4. Made all auth pages use consistent dark theme
5. Added College Football "Coming Soon" tile
6. Granted j@modernizegames.com full access
