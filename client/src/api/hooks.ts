import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Teams
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: () => api.getTeam(id),
    enabled: !!id,
  });
}

// Players
export function usePlayers(params?: { page?: number; limit?: number; position?: string; freeAgents?: boolean }) {
  return useQuery({
    queryKey: ['players', params],
    queryFn: () => api.getPlayers(params),
  });
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['players', id],
    queryFn: () => api.getPlayer(id),
    enabled: !!id,
  });
}

// League
export function useStandings(params?: { season_id?: number }) {
  return useQuery({
    queryKey: ['standings', params?.season_id],
    queryFn: () => api.getStandings(params),
  });
}

export function useSeason() {
  return useQuery({
    queryKey: ['season'],
    queryFn: api.getSeason,
  });
}

export function useTraits() {
  return useQuery({
    queryKey: ['traits'],
    queryFn: api.getTraits,
  });
}

// Games
export function useGames(params?: { limit?: number; team_id?: string; season_id?: string }) {
  return useQuery({
    queryKey: ['games', params],
    queryFn: () => api.getGames(params),
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ['games', id],
    queryFn: () => api.getGame(id),
    enabled: !!id,
  });
}

export function useSimulateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ homeTeamId, awayTeamId }: { homeTeamId: string; awayTeamId: string }) =>
      api.simulateGame(homeTeamId, awayTeamId),
    onSuccess: () => {
      // Invalidate games and standings after simulation
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    },
  });
}

// Franchise
export function useFranchise() {
  return useQuery({
    queryKey: ['franchise'],
    queryFn: api.getFranchise,
  });
}

// Schedule
export function useSchedule(params?: { team_id?: string; date?: string; month?: string }) {
  return useQuery({
    queryKey: ['schedule', params],
    queryFn: () => api.getSchedule(params),
  });
}

export function useUpcomingGames(teamId: string, limit = 10) {
  return useQuery({
    queryKey: ['schedule', 'upcoming', teamId, limit],
    queryFn: () => api.getUpcomingGames(teamId, limit),
    enabled: !!teamId,
  });
}

// Season Advancement
export function useAdvanceDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.advanceDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
    },
  });
}

export function useStartSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.startSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['season'] });
    },
  });
}

export function useAdvancePreseasonDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.advancePreseasonDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useAdvancePreseasonAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.advancePreseasonAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['season'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

// Playoffs
export function usePlayoffs() {
  return useQuery({
    queryKey: ['playoffs'],
    queryFn: api.getPlayoffs,
  });
}

export function usePlayoffStandings() {
  return useQuery({
    queryKey: ['playoffs', 'standings'],
    queryFn: api.getPlayoffStandings,
  });
}

export function useStartPlayoffs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.startPlayoffs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
    },
  });
}

export function useStartPlayoffsFromAwards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.startPlayoffsFromAwards,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
    },
  });
}

export function useSimulatePlayoffGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => api.simulatePlayoffGame(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useSimulatePlayoffSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => api.simulatePlayoffSeries(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useSimulatePlayoffRound() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulatePlayoffRound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useSimulatePlayoffAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulatePlayoffAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playoffs'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
    },
  });
}

// Offseason
export function useOffseasonState() {
  return useQuery({
    queryKey: ['offseason'],
    queryFn: api.getOffseasonState,
  });
}

export function useAdvanceOffseasonPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.advanceOffseasonPhase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offseason'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['season'] });
    },
  });
}

export function useSkipToOffseasonPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetPhase: string) => api.skipToOffseasonPhase(targetPhase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offseason'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['season'] });
    },
  });
}

export function useStartNewSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.startNewSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
      queryClient.invalidateQueries({ queryKey: ['season'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      queryClient.invalidateQueries({ queryKey: ['offseason'] });
    },
  });
}

// Awards
export function useAwards(params?: { season_id?: number }) {
  return useQuery({
    queryKey: ['awards', params?.season_id],
    queryFn: () => api.getAwards(params),
  });
}

// Draft AI
export function useDraftState() {
  return useQuery({
    queryKey: ['draft', 'state'],
    queryFn: api.getDraftState,
  });
}

export function useTeamNeeds() {
  return useQuery({
    queryKey: ['draft', 'needs'],
    queryFn: api.getTeamNeeds,
  });
}

// All-Star Weekend
export function useAllStarState() {
  return useQuery({
    queryKey: ['allstar', 'state'],
    queryFn: api.getAllStarState,
  });
}

export function useSelectAllStars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.selectAllStars,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
    },
  });
}

export function useAllStarRosters() {
  return useQuery({
    queryKey: ['allstar', 'rosters'],
    queryFn: api.getAllStarRosters,
  });
}

export function useRisingStars() {
  return useQuery({
    queryKey: ['allstar', 'rising-stars'],
    queryFn: api.getRisingStars,
  });
}

export function useSimulateRisingStars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulateRisingStars,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
    },
  });
}

export function useSimulateSkillsChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulateSkillsChallenge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
    },
  });
}

export function useSimulateThreePointContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulateThreePointContest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
    },
  });
}

export function useSimulateDunkContest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulateDunkContest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
    },
  });
}

export function useSimulateAllStarGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulateAllStarGame,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
    },
  });
}

export function useSimulateAllStarWeekend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.simulateAllStarWeekend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
    },
  });
}

export function useAllStarResults() {
  return useQuery({
    queryKey: ['allstar', 'results'],
    queryFn: api.getAllStarResults,
  });
}

export function useCompleteAllStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.completeAllStar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allstar'] });
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
    },
  });
}

// Trade Deadline
export function useTradeDeadlineStatus() {
  return useQuery({
    queryKey: ['trades', 'deadline'],
    queryFn: api.getTradeDeadlineStatus,
  });
}
