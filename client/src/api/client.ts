// API Client - connects to backend
// In production, use relative /api path (served by nginx)
// In development, use VITE_API_URL env var or default to localhost
const API_BASE = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Token management
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return accessToken;
}

// Auth error handler - redirects to login when auth fails
let onAuthError: (() => void) | null = null;

export function setAuthErrorHandler(handler: () => void) {
  onAuthError = handler;
}

// Mutex for token refresh - prevents race condition when multiple requests get 401
let refreshPromise: Promise<boolean> | null = null;

async function doTokenRefresh(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      setTokens(data.access_token, data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function refreshTokenWithMutex(): Promise<boolean> {
  // If refresh already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh and store promise
  refreshPromise = doTokenRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  // Add auth header if we have a token
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  // If unauthorized, try to refresh the token
  if (response.status === 401) {
    if (refreshToken) {
      const refreshed = await refreshTokenWithMutex();

      if (refreshed) {
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          headers,
          ...options,
        });

        if (!retryResponse.ok) {
          let errorMessage = `API Error: ${retryResponse.status}`;
          try {
            const errorData = await retryResponse.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            const errorText = await retryResponse.text();
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }
        return retryResponse.json();
      } else {
        clearTokens();
        onAuthError?.();
        throw new Error('Session expired. Please log in again.');
      }
    } else {
      clearTokens();
      onAuthError?.();
      throw new Error('Please log in to continue.');
    }
  }

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Response wasn't JSON, try text
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// Types
export interface Team {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  primary_color: string;
  secondary_color: string;
  arena_name: string;
  championships: number;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  team_id: string | null;
  position: string;
  archetype: string;
  height_inches: number;
  weight_lbs: number;
  age: number;
  jersey_number: number;
  years_pro: number;
  overall: number;
  potential: number;
  team_name?: string;
  team_abbrev?: string;
  // Attributes (when fetched with full details)
  three_point?: number;
  mid_range?: number;
  inside_scoring?: number;
  layup?: number;
  ball_handling?: number;
  passing_accuracy?: number;
  speed?: number;
  strength?: number;
  vertical?: number;
  stamina?: number;
  interior_defense?: number;
  perimeter_defense?: number;
  steal?: number;
  block?: number;
  defensive_rebound?: number;
  offensive_rebound?: number;
  basketball_iq?: number;
}

export interface Standing {
  id: number;
  team_id: string;
  wins: number;
  losses: number;
  home_wins: number;
  home_losses: number;
  away_wins: number;
  away_losses: number;
  conference_wins: number;
  conference_losses: number;
  division_wins: number;
  division_losses: number;
  points_for: number;
  points_against: number;
  streak: number;
  last_10_wins: number;
  name: string;
  city: string;
  abbreviation: string;
  conference: string;
  division: string;
  primary_color: string;
  secondary_color: string;
}

export interface Season {
  id: number;
  season_number: number;
  status: string;
  current_day: number;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
}

export interface Game {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
  status: string;
  completed_at: string;
  home_team_name: string;
  home_abbrev: string;
  away_team_name: string;
  away_abbrev: string;
}

export interface GameQuarter {
  quarter: number;
  home_points: number;
  away_points: number;
}

export interface TeamGameStats {
  team_id: string;
  name: string;
  abbreviation: string;
  is_home: boolean;
  points: number;
  fgm: number;
  fga: number;
  fg_pct: number;
  three_pm: number;
  three_pa: number;
  three_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}

export interface PlayerGameStats {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team_id: string;
  minutes: number;
  points: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  plus_minus: number;
  is_starter: boolean;
}

export interface GameDetail extends Game {
  quarters: GameQuarter[];
  team_stats: TeamGameStats[];
  player_stats: PlayerGameStats[];
}

export interface SimulationResult {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  winner_id: string;
  is_overtime: boolean;
  overtime_periods: number;
  quarters: { quarter: number; home_points: number; away_points: number; plays: any[] }[];
  home_stats: TeamGameStats;
  away_stats: TeamGameStats;
  home_player_stats: PlayerGameStats[];
  away_player_stats: PlayerGameStats[];
  plays: any[];
}

export interface PlayersResponse {
  players: Player[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TeamWithRoster extends Team {
  roster: Player[];
}

export interface Franchise {
  id: string;
  team_id: string;
  season_id: number;
  current_day: number;
  phase: 'preseason' | 'regular_season' | 'all_star' | 'awards' | 'playoffs' | 'offseason';
  offseason_phase?: 'review' | 'lottery' | 'draft' | 'free_agency' | 'training_camp' | null;
  all_star_complete?: boolean;
  seasons_played: number;
  championships: number;
  playoff_appearances: number;
  total_wins: number;
  total_losses: number;
  difficulty: string;
  team_name: string;
  abbreviation: string;
  city: string;
  primary_color: string;
  secondary_color: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  preseason_wins?: number;
  preseason_losses?: number;
  name?: string;
  is_active?: boolean;
  season_number?: number;
  created_at?: string;
  last_played_at?: string;
}

export interface ScheduledGame {
  id: string;
  season_id: number;
  game_id: string | null;
  home_team_id: string;
  away_team_id: string;
  game_number: number;
  game_date: string;
  status: 'scheduled' | 'completed' | 'simulated';
  is_user_game: boolean;
  is_preseason?: boolean;
  home_team_name: string;
  home_abbrev: string;
  home_color: string;
  away_team_name: string;
  away_abbrev: string;
  away_color: string;
  home_score?: number;
  away_score?: number;
  winner_id?: string;
}

export interface UserGameResult {
  game_id: string;
  won: boolean;
  user_score: number;
  opponent_score: number;
  opponent_name: string;
  is_overtime?: boolean;
  overtime_periods?: number;
}

export interface AdvanceDayResult {
  day: number;
  date: string;
  phase: string;
  games_played: number;
  results: {
    game_id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
    is_user_game: boolean;
  }[];
  user_game_result?: UserGameResult;
}

export interface PlayoffSeries {
  id: string;
  season_id: number;
  round: number;
  conference: string | null;
  series_number: number;
  higher_seed_id: string;
  lower_seed_id: string;
  higher_seed_wins: number;
  lower_seed_wins: number;
  winner_id: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  higher_seed_name: string;
  higher_abbrev: string;
  lower_seed_name: string;
  lower_abbrev: string;
  winner_name?: string;
  winner_abbrev?: string;
}

export interface PlayoffState {
  round: number;
  series: PlayoffSeries[];
  isComplete: boolean;
  champion: string | null;
}

export interface PlayoffStandings {
  eastern: { team_id: string; name: string; abbreviation: string; wins: number; losses: number }[];
  western: { team_id: string; name: string; abbreviation: string; wins: number; losses: number }[];
}

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  has_purchased: boolean;
  purchased_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResult {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface PaymentStatus {
  has_purchased: boolean;
  purchased_at: string | null;
}

// Stats Types
export interface StatLeader {
  player_id: string;
  first_name: string;
  last_name: string;
  team_id: string;
  team_abbrev: string;
  position: string;
  stat_value: number;
  games_played: number;
}

export interface PlayerSeasonStats {
  player_id: string;
  first_name: string;
  last_name: string;
  team_abbrev: string;
  position: string;
  games_played: number;
  minutes_per_game: number;
  points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
  steals_per_game: number;
  blocks_per_game: number;
  fg_pct: number;
  three_pct: number;
  ft_pct: number;
}

export interface PlayerGameLog {
  game_id: string;
  date: string;
  opponent_abbrev: string;
  is_home: boolean;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  result: 'W' | 'L';
}

export interface TeamSeasonStats {
  team_id: string;
  name: string;
  abbreviation: string;
  games_played: number;
  points_per_game: number;
  opponent_points_per_game: number;
  rebounds_per_game: number;
  assists_per_game: number;
  fg_pct: number;
  three_pct: number;
}

export interface TeamRanking {
  team_id: string;
  name: string;
  abbreviation: string;
  primary_color: string;
  offensive_rating: number;
  defensive_rating: number;
  net_rating: number;
  pace: number;
}

// Draft Types
export interface DraftProspect {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  archetype: string;
  age: number;
  height_inches: number;
  overall: number;
  potential: number;
  projected_pick: number;
}

export interface LotteryOdds {
  team_id: string;
  team_name: string;
  abbreviation: string;
  record: string;
  odds_pct: number;
}

export interface LotteryResult {
  order: { pick: number; team_id: string; team_name: string; abbreviation: string }[];
  message: string;
}

export interface DraftPick {
  pick_number: number;
  round: number;
  team_id: string;
  team_name: string;
  abbreviation: string;
  player_id?: string;
  player_name?: string;
}

// Free Agency Types
export interface FreeAgent {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  age: number;
  overall: number;
  asking_salary: number;
  asking_years: number;
}

export interface TeamSalary {
  team_id: string;
  total_salary: number;
  cap_space: number;
  salary_cap: number;
  luxury_tax: number;
  roster_count: number;
  over_cap: boolean;
  mle_used: boolean;
  mle_available: boolean;
  mle_amount: number;
}

export interface FATransaction {
  id: string;
  player_name: string;
  team_name: string;
  team_abbrev: string;
  type: 'signed' | 'released';
  salary?: number;
  years?: number;
  date: string;
}

// Trade Types
export interface Trade {
  id: string;
  proposing_team_id: string;
  proposing_team_name: string;
  receiving_team_id: string;
  receiving_team_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  proposed_at: string;
  players_offered: { id: string; name: string; overall: number }[];
  players_requested: { id: string; name: string; overall: number }[];
}

export interface TradeOffer {
  receiving_team_id: string;
  players_offered: string[];
  players_requested: string[];
  picks_offered?: string[];
  picks_requested?: string[];
}

export interface TradeEvaluation {
  fair_value: number;
  team_value: number;
  is_fair: boolean;
  reasoning: string;
}

export interface Award {
  id: string;
  season_id: number;
  award_type: string;
  player_id: string;
  team_id: string;
  votes: number;
  stat_value: number;
  first_name: string;
  last_name: string;
  position: string;
  team_name: string;
  team_abbrev: string;
  primary_color: string;
  label: string;
}

// Player Development Types
export interface PlayerDevelopment {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  archetype: string;
  age: number;
  overall: number;
  potential: number;
  years_pro: number;
  peak_age: number;
  work_ethic: number;
  coachability: number;
  durability: number;
  phase: 'development' | 'peak' | 'decline';
  years_to_peak: number;
  projection: string;
}

// API Functions
export const api = {
  // Teams
  getTeams: () => fetchAPI<Team[]>('/teams'),
  getTeam: (id: string) => fetchAPI<TeamWithRoster>(`/teams/${id}`),

  // Players
  getPlayers: (params?: { page?: number; limit?: number; position?: string; freeAgents?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.position) searchParams.set('position', params.position);
    if (params?.freeAgents) searchParams.set('freeAgents', 'true');
    const query = searchParams.toString();
    return fetchAPI<PlayersResponse>(`/players${query ? `?${query}` : ''}`);
  },
  getPlayer: (id: string) => fetchAPI<Player>(`/players/${id}`),
  getTeamDevelopment: (teamId: string) => fetchAPI<PlayerDevelopment[]>(`/players/team/${teamId}/development`),

  // League
  getStandings: (params?: { season_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.season_id) searchParams.set('season_id', params.season_id.toString());
    const query = searchParams.toString();
    return fetchAPI<Standing[]>(`/standings${query ? `?${query}` : ''}`);
  },
  getSeason: () => fetchAPI<Season>('/season'),
  getTraits: () => fetchAPI<Trait[]>('/traits'),

  // Games
  getGames: (params?: { limit?: number; team_id?: string; season_id?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.team_id) searchParams.set('team_id', params.team_id);
    if (params?.season_id) searchParams.set('season_id', params.season_id);
    const query = searchParams.toString();
    return fetchAPI<Game[]>(`/games${query ? `?${query}` : ''}`);
  },
  getGame: (id: string) => fetchAPI<GameDetail>(`/games/${id}`),
  simulateGame: (homeTeamId: string, awayTeamId: string, saveResult = true) =>
    fetchAPI<SimulationResult>('/games/simulate', {
      method: 'POST',
      body: JSON.stringify({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        save_result: saveResult
      }),
    }),

  // Franchise
  getFranchise: () => fetchAPI<Franchise | null>('/franchise'),
  getFranchises: () => fetchAPI<Franchise[]>('/franchise/list'),
  selectFranchise: (teamId: string) =>
    fetchAPI<Franchise>('/franchise/select', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId }),
    }),
  createFranchise: (teamId: string, name?: string) =>
    fetchAPI<Franchise>('/franchise/create', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, name }),
    }),
  switchFranchise: (franchiseId: string) =>
    fetchAPI<Franchise>(`/franchise/${franchiseId}/switch`, {
      method: 'POST',
    }),
  updateFranchise: (franchiseId: string, updates: { name?: string; difficulty?: string }) =>
    fetchAPI<Franchise>(`/franchise/${franchiseId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteFranchise: (franchiseId: string) =>
    fetchAPI<{ success: boolean }>(`/franchise/${franchiseId}`, {
      method: 'DELETE',
    }),

  // Schedule
  generateSchedule: () =>
    fetchAPI<{ message: string; total_games: number }>('/schedule/generate', {
      method: 'POST',
    }),
  getSchedule: (params?: { team_id?: string; season_id?: number; date?: string; month?: string; include_preseason?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.team_id) searchParams.set('team_id', params.team_id);
    if (params?.season_id) searchParams.set('season_id', params.season_id.toString());
    if (params?.date) searchParams.set('date', params.date);
    if (params?.month) searchParams.set('month', params.month);
    if (params?.include_preseason) searchParams.set('include_preseason', params.include_preseason);
    const query = searchParams.toString();
    return fetchAPI<ScheduledGame[]>(`/schedule${query ? `?${query}` : ''}`);
  },
  getUpcomingGames: (teamId: string, limit = 10) =>
    fetchAPI<ScheduledGame[]>(`/schedule/upcoming?team_id=${teamId}&limit=${limit}`),

  // Season Advancement
  startSeason: () =>
    fetchAPI<{ message: string; phase: string }>('/season/start', { method: 'POST' }),
  advancePreseasonDay: () =>
    fetchAPI<{
      day: number;
      date: string;
      phase: string;
      games_played: number;
      results: any[];
      user_game_result?: UserGameResult;
      preseason_complete: boolean;
    }>('/season/advance/preseason', { method: 'POST' }),
  advancePreseasonAll: () =>
    fetchAPI<{
      message: string;
      days_simulated: number;
      phase: string;
      current_day: number;
      games_played: number;
      user_games: any[];
    }>('/season/advance/preseason/all', { method: 'POST' }),
  finalizePlayoffs: () =>
    fetchAPI<{ message: string; champion_id: string; user_is_champion: boolean; phase: string }>(
      '/season/finalize-playoffs',
      { method: 'POST' }
    ),
  advanceDay: () =>
    fetchAPI<AdvanceDayResult>('/season/advance/day', { method: 'POST' }),
  advanceToPlayoffs: () =>
    fetchAPI<{
      message: string;
      days_simulated: number;
      phase: string;
      user_record: { wins: number; losses: number };
      top_standings: any[];
    }>('/season/advance/playoffs', { method: 'POST' }),
  startPlayoffsFromAwards: () =>
    fetchAPI<{ message: string; phase: string }>('/season/advance/start-playoffs', { method: 'POST' }),

  // Offseason
  processOffseason: () =>
    fetchAPI<{
      message: string;
      summary: {
        total_players: number;
        improved: number;
        declined: number;
        unchanged: number;
        retirements: number;
        contracts_expired: number;
      };
      top_improvers: any[];
      biggest_declines: any[];
      retirements: any[];
    }>('/season/offseason', { method: 'POST' }),
  startNewSeason: () =>
    fetchAPI<{ message: string; season_id: number; season_number: number; phase: string; current_day: number }>(
      '/season/new',
      { method: 'POST' }
    ),

  // Offseason
  getOffseasonState: () =>
    fetchAPI<{
      phase: string;
      offseason_phase: string;
      next_phase: string | null;
      can_start_new_season: boolean;
    }>('/season/offseason'),
  advanceOffseasonPhase: () =>
    fetchAPI<{
      message: string;
      previous_phase: string;
      offseason_phase: string;
      phase_label: string;
      can_start_new_season: boolean;
    }>('/season/offseason/advance', { method: 'POST' }),
  skipToOffseasonPhase: (targetPhase: string) =>
    fetchAPI<{
      message: string;
      offseason_phase: string;
      phase_label: string;
      can_start_new_season: boolean;
    }>('/season/offseason/skip-to', {
      method: 'POST',
      body: JSON.stringify({ target_phase: targetPhase }),
    }),

  // Playoffs
  getPlayoffs: () => fetchAPI<PlayoffState>('/playoffs'),
  getPlayoffStandings: () => fetchAPI<PlayoffStandings>('/playoffs/standings'),
  startPlayoffs: () =>
    fetchAPI<{ message: string; round: number; roundName: string }>('/playoffs/start', {
      method: 'POST',
    }),
  simulatePlayoffGame: (seriesId: string) =>
    fetchAPI<{
      game_id: string;
      home_team: string;
      away_team: string;
      home_score: number;
      away_score: number;
      winner: string;
      series_complete: boolean;
      series_winner: string | null;
    }>('/playoffs/simulate', {
      method: 'POST',
      body: JSON.stringify({ series_id: seriesId }),
    }),
  simulatePlayoffSeries: (seriesId: string) =>
    fetchAPI<{
      series_id: string;
      winner_id: string;
      winner_name: string;
      final_score: string;
      games_played: number;
      games: Array<{
        game_id: string;
        home_team: string;
        away_team: string;
        home_score: number;
        away_score: number;
        winner: string;
      }>;
    }>('/playoffs/simulate/series', {
      method: 'POST',
      body: JSON.stringify({ series_id: seriesId }),
    }),
  simulatePlayoffRound: () =>
    fetchAPI<{
      round: number;
      round_name: string;
      series_completed: number;
      results: Array<{
        series_id: string;
        winner_id: string;
        winner_name: string;
        final_score: string;
      }>;
      playoffs_complete: boolean;
      next_round?: number;
      next_round_name?: string;
    }>('/playoffs/simulate/round', { method: 'POST' }),
  simulatePlayoffAll: () =>
    fetchAPI<{
      champion_id: string;
      champion_name: string;
      rounds_simulated: number;
      finals_result: {
        winner_name: string;
        loser_name: string;
        final_score: string;
      };
    }>('/playoffs/simulate/all', { method: 'POST' }),

  // Auth
  signup: (email: string, password: string, name?: string) =>
    fetchAPI<AuthResult>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    fetchAPI<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    fetchAPI<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  getMe: () => fetchAPI<User>('/auth/me'),

  // Payments
  createCheckout: () =>
    fetchAPI<{ checkout_url: string; session_id: string }>('/payments/checkout', {
      method: 'POST',
    }),
  getPaymentStatus: () => fetchAPI<PaymentStatus>('/payments/status'),

  // Stats
  getStatLeaders: (params?: { stat?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.stat) searchParams.set('stat', params.stat);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return fetchAPI<StatLeader[]>(`/stats/leaders${query ? `?${query}` : ''}`);
  },
  getPlayerStats: (playerId: string) => fetchAPI<PlayerSeasonStats>(`/stats/player/${playerId}`),
  getPlayerGameLog: (playerId: string) => fetchAPI<PlayerGameLog[]>(`/stats/player/${playerId}/games`),
  getTeamStats: (teamId: string) => fetchAPI<TeamSeasonStats>(`/stats/team/${teamId}`),
  getTeamRankings: () => fetchAPI<TeamRanking[]>('/stats/rankings'),

  // Draft
  getDraftProspects: () => fetchAPI<DraftProspect[]>('/draft/prospects'),
  generateDraftClass: () => fetchAPI<{ message: string; count: number }>('/draft/generate', { method: 'POST' }),
  getLotteryOdds: () => fetchAPI<LotteryOdds[]>('/draft/lottery/odds'),
  runLottery: () => fetchAPI<LotteryResult>('/draft/lottery/run', { method: 'POST' }),
  getDraftOrder: () => fetchAPI<DraftPick[]>('/draft/order'),
  makeDraftPick: (playerId: string) => fetchAPI<{ message: string; player: DraftProspect }>('/draft/pick', {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  }),

  // Free Agency
  getFreeAgents: (params?: { position?: string; minOverall?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.position) searchParams.set('position', params.position);
    if (params?.minOverall) searchParams.set('min_overall', params.minOverall.toString());
    const query = searchParams.toString();
    return fetchAPI<FreeAgent[]>(`/freeagency${query ? `?${query}` : ''}`);
  },
  getTeamSalary: (teamId: string) => fetchAPI<TeamSalary>(`/freeagency/team/${teamId}/salary`),
  signFreeAgent: (playerId: string, years: number, salary: number) => {
    const body = { player_id: playerId, years: years, salary: salary };
    console.log('signFreeAgent sending:', body);
    return fetchAPI<{ message: string }>('/freeagency/sign', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  releasePlayer: (playerId: string) =>
    fetchAPI<{ message: string }>('/freeagency/release', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    }),
  getFATransactions: () => fetchAPI<FATransaction[]>('/freeagency/transactions'),

  // Trades
  getTradeDeadlineStatus: () =>
    fetchAPI<{
      trades_allowed: boolean;
      message?: string;
      deadline_day: number;
      current_day: number;
      days_until_deadline?: number;
    }>('/trades/deadline'),
  getTradeProposals: (teamId: string) => fetchAPI<Trade[]>(`/trades/team/${teamId}`),
  proposeTrade: (offer: TradeOffer) =>
    fetchAPI<{ trade_id: string; message: string }>('/trades/propose', {
      method: 'POST',
      body: JSON.stringify(offer),
    }),
  evaluateTrade: (tradeId: string, teamId: string) =>
    fetchAPI<TradeEvaluation>(`/trades/${tradeId}/evaluate/${teamId}`),
  acceptTrade: (tradeId: string) =>
    fetchAPI<{ message: string }>(`/trades/${tradeId}/accept`, { method: 'POST' }),
  rejectTrade: (tradeId: string) =>
    fetchAPI<{ message: string }>(`/trades/${tradeId}/reject`, { method: 'POST' }),
  getTradeHistory: () => fetchAPI<Trade[]>('/trades/history'),

  // CPU AI
  processCPUFreeAgency: (userTeamId: string) =>
    fetchAPI<{
      message: string;
      signings_count: number;
      signings: Array<{
        team_id: string;
        team_name: string;
        player_id: string;
        player_name: string;
        salary: number;
        reasoning: string[];
      }>;
    }>('/ai/freeagency', {
      method: 'POST',
      body: JSON.stringify({ user_team_id: userTeamId }),
    }),
  processCPUTrades: (userTeamId: string) =>
    fetchAPI<{
      message: string;
      responses_count: number;
      responses: Array<{
        trade_id: string;
        proposing_team: string;
        receiving_team: string;
        action: 'accepted' | 'rejected';
        reasoning: string[];
      }>;
    }>('/ai/trades', {
      method: 'POST',
      body: JSON.stringify({ user_team_id: userTeamId }),
    }),

  // Awards
  getAwards: (params?: { season_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.season_id) searchParams.set('season_id', params.season_id.toString());
    const query = searchParams.toString();
    return fetchAPI<Record<string, Award[]>>(`/awards${query ? `?${query}` : ''}`);
  },
  calculateAwards: () =>
    fetchAPI<{
      message: string;
      awards_count: number;
      awards: Array<{ type: string; label: string }>;
    }>('/awards/calculate', { method: 'POST' }),
  setFinalsMvp: (playerId: string) =>
    fetchAPI<{ message: string }>('/awards/fmvp', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    }),

  // Draft AI
  getDraftState: () =>
    fetchAPI<{
      picks_made: number;
      current_pick: number;
      current_round: number;
      pick_in_round: number;
      is_draft_complete: boolean;
      current_team: { team_id: string; team_name: string; abbreviation: string } | null;
      is_user_pick: boolean;
      user_team_id: string;
    }>('/draft/state'),
  getTeamNeeds: () =>
    fetchAPI<{
      needs: Array<{
        position: string;
        need_score: number;
        starter_overall: number;
        depth: number;
      }>;
    }>('/draft/needs'),
  makeAIPick: () =>
    fetchAPI<{
      pick: number;
      round: number;
      team_name: string;
      team_abbreviation: string;
      player_name: string;
      position: string;
      overall: number;
      potential: number;
      next_pick: number;
      is_next_user_pick: boolean;
      is_draft_complete: boolean;
    }>('/draft/ai-pick', { method: 'POST' }),
  simToPick: () =>
    fetchAPI<{
      picks_made: number;
      picks: Array<{
        pick: number;
        round: number;
        team_name: string;
        team_abbreviation: string;
        player_name: string;
        position: string;
        overall: number;
        potential: number;
      }>;
      current_pick: number;
      is_user_pick: boolean;
      is_draft_complete: boolean;
    }>('/draft/sim-to-pick', { method: 'POST' }),
  autoDraft: () =>
    fetchAPI<{
      message: string;
      total_picks: number;
      user_picks: Array<{
        pick: number;
        round: number;
        team_name: string;
        player_name: string;
        position: string;
        overall: number;
        potential: number;
      }>;
      all_picks: Array<{
        pick: number;
        round: number;
        team_name: string;
        player_name: string;
        position: string;
        overall: number;
        potential: number;
        is_user_pick: boolean;
      }>;
    }>('/draft/auto-draft', { method: 'POST' }),

  // All-Star Weekend
  getAllStarState: () =>
    fetchAPI<{
      season_id: number;
      all_star_day: number;
      current_day: number;
      is_all_star_weekend: boolean;
      all_star_complete: boolean;
      selections_made: boolean;
      events_complete: {
        rising_stars: boolean;
        skills: boolean;
        three_point: boolean;
        dunk: boolean;
        game: boolean;
      };
      all_events_complete: boolean;
    }>('/allstar/state'),
  selectAllStars: (params?: { player_id?: string }) =>
    fetchAPI<{
      message: string;
      east: Array<{
        player_id: string;
        name: string;
        team: string;
        position: string;
        is_starter: boolean;
        is_captain: boolean;
      }>;
      west: Array<{
        player_id: string;
        name: string;
        team: string;
        position: string;
        is_starter: boolean;
        is_captain: boolean;
      }>;
    }>('/allstar/select', { method: 'POST', body: JSON.stringify(params || {}) }),
  getAllStarRosters: () =>
    fetchAPI<{
      east: Array<{
        player_id: string;
        first_name: string;
        last_name: string;
        position: string;
        overall: number;
        team_name: string;
        team_abbr: string;
        is_starter: boolean;
        is_captain: boolean;
        votes: number;
      }>;
      west: Array<{
        player_id: string;
        first_name: string;
        last_name: string;
        position: string;
        overall: number;
        team_name: string;
        team_abbr: string;
        is_starter: boolean;
        is_captain: boolean;
        votes: number;
      }>;
      east_captain: any;
      west_captain: any;
    }>('/allstar/rosters'),
  getRisingStars: () =>
    fetchAPI<{
      rookies: Array<{
        player_id: string;
        first_name: string;
        last_name: string;
        position: string;
        overall: number;
        team_name: string;
        ppg: number;
        rpg: number;
        apg: number;
      }>;
      sophomores: Array<{
        player_id: string;
        first_name: string;
        last_name: string;
        position: string;
        overall: number;
        team_name: string;
        ppg: number;
        rpg: number;
        apg: number;
      }>;
    }>('/allstar/rising-stars'),
  simulateRisingStars: () =>
    fetchAPI<{
      event_type: string;
      mvp_id: string;
      mvp_name: string;
      winning_team: string;
      winning_score: number;
      losing_score: number;
      details: any;
    }>('/allstar/simulate/rising-stars', { method: 'POST' }),
  simulateSkillsChallenge: () =>
    fetchAPI<{
      event_type: string;
      winner_id: string;
      winner_name: string;
      runner_up_id: string;
      runner_up_name: string;
      details: any;
    }>('/allstar/simulate/skills', { method: 'POST' }),
  simulateThreePointContest: () =>
    fetchAPI<{
      event_type: string;
      winner_id: string;
      winner_name: string;
      runner_up_id: string;
      runner_up_name: string;
      details: any;
    }>('/allstar/simulate/three-point', { method: 'POST' }),
  simulateDunkContest: () =>
    fetchAPI<{
      event_type: string;
      winner_id: string;
      winner_name: string;
      runner_up_id: string;
      runner_up_name: string;
      details: any;
    }>('/allstar/simulate/dunk', { method: 'POST' }),
  simulateAllStarGame: () =>
    fetchAPI<{
      event_type: string;
      mvp_id: string;
      mvp_name: string;
      winning_team: string;
      winning_score: number;
      losing_score: number;
      details: any;
    }>('/allstar/simulate/game', { method: 'POST' }),
  simulateAllStarWeekend: () =>
    fetchAPI<{
      message: string;
      events_simulated: number;
      results: Array<{
        event_type: string;
        winner_name?: string;
        mvp_name?: string;
        winning_team?: string;
        winning_score?: number;
        losing_score?: number;
      }>;
    }>('/allstar/simulate/all', { method: 'POST' }),
  getAllStarResults: () =>
    fetchAPI<{
      events: Array<{
        event_type: string;
        winner_id?: string;
        winner_name?: string;
        runner_up_id?: string;
        runner_up_name?: string;
        mvp_id?: string;
        mvp_name?: string;
        winning_team?: string;
        winning_score?: number;
        losing_score?: number;
        details: any;
        simulated_at: string;
      }>;
    }>('/allstar/results'),
  completeAllStar: () =>
    fetchAPI<{
      message: string;
      new_phase: string;
      current_day: number;
    }>('/allstar/complete', { method: 'POST' }),
};
