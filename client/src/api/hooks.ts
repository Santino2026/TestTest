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
export function useStandings() {
  return useQuery({
    queryKey: ['standings'],
    queryFn: api.getStandings,
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
export function useGames(params?: { limit?: number; team_id?: string }) {
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

export function useSelectFranchise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => api.selectFranchise(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franchise'] });
    },
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

export function useGenerateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.generateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
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
