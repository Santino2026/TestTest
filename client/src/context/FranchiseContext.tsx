import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, Franchise } from '@/api/client';
import { useAuth } from './AuthContext';

interface FranchiseContextType {
  // Current active franchise
  franchise: Franchise | null;
  // All user's franchises
  franchises: Franchise[];
  isLoading: boolean;
  hasFranchise: boolean;
  hasCheckedOnce: boolean;
  // Actions
  selectTeam: (teamId: string) => Promise<void>;
  createFranchise: (teamId: string, name?: string) => Promise<void>;
  switchFranchise: (franchiseId: string) => Promise<void>;
  deleteFranchise: (franchiseId: string) => Promise<void>;
  updateFranchise: (franchiseId: string, updates: { name?: string; difficulty?: string }) => Promise<void>;
  refreshFranchise: () => Promise<boolean>;
  refreshFranchises: () => Promise<void>;
  clearFranchise: () => void;
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

export function FranchiseProvider({ children }: { children: ReactNode }) {
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const { isAuthenticated, hasPurchased } = useAuth();
  const queryClient = useQueryClient();
  const hasLoadedRef = useRef(false);
  const lastAuthStateRef = useRef({ isAuthenticated, hasPurchased });

  // Helper to invalidate all season-related caches when franchise changes
  const invalidateSeasonCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['games'] });
    queryClient.invalidateQueries({ queryKey: ['schedule'] });
    queryClient.invalidateQueries({ queryKey: ['standings'] });
    queryClient.invalidateQueries({ queryKey: ['playoffs'] });
    queryClient.invalidateQueries({ queryKey: ['franchise'] });
  }, [queryClient]);

  const refreshFranchises = useCallback(async () => {
    if (!isAuthenticated || !hasPurchased) {
      setFranchises([]);
      return;
    }

    try {
      const data = await api.getFranchises();
      setFranchises(data);
    } catch (error) {
      console.error('Failed to fetch franchises:', error);
      setFranchises([]);
    }
  }, [isAuthenticated, hasPurchased]);

  // Returns true if we actually made an API call (auth was ready)
  const refreshFranchise = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !hasPurchased) {
      setFranchise(null);
      // Don't set isLoading false here - let the caller handle it
      // This prevents hasCheckedOnce from being set prematurely
      return false;
    }

    try {
      const data = await api.getFranchise();
      setFranchise(data);
      return true;
    } catch (error) {
      console.error('Failed to fetch franchise:', error);
      // Only clear franchise on explicit API errors, not network issues
      // This prevents navigation issues when the API temporarily fails
      if ((error as Error).message?.includes('401') || (error as Error).message?.includes('403')) {
        setFranchise(null);
      }
      // Otherwise keep existing franchise state to prevent redirect loops
      return true; // Still counts as a valid check attempt
    }
  }, [isAuthenticated, hasPurchased]);

  useEffect(() => {
    // Check if auth state actually changed to avoid unnecessary re-fetches during navigation
    const authStateChanged =
      lastAuthStateRef.current.isAuthenticated !== isAuthenticated ||
      lastAuthStateRef.current.hasPurchased !== hasPurchased;

    lastAuthStateRef.current = { isAuthenticated, hasPurchased };

    // Only reload if this is the first load OR auth state changed
    if (!hasLoadedRef.current || authStateChanged) {
      const loadAll = async () => {
        setIsLoading(true);
        const [didCheck] = await Promise.all([refreshFranchise(), refreshFranchises()]);
        setIsLoading(false);
        // Only mark as checked if we actually made an API call (auth was ready)
        // This prevents redirect to select-team before auth finishes loading
        if (didCheck) {
          setHasCheckedOnce(true);
        }
        hasLoadedRef.current = true;
      };
      loadAll();
    }
  }, [refreshFranchise, refreshFranchises, isAuthenticated, hasPurchased]);

  const selectTeam = async (teamId: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to select a team');
    }
    const selected = await api.selectFranchise(teamId);
    setFranchise(selected);
    await refreshFranchises();
    invalidateSeasonCaches();
  };

  const createFranchise = async (teamId: string, name?: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to create a franchise');
    }
    const created = await api.createFranchise(teamId, name);
    setFranchise(created);
    await refreshFranchises();
    invalidateSeasonCaches();
  };

  const switchFranchise = async (franchiseId: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to switch franchises');
    }
    const switched = await api.switchFranchise(franchiseId);
    setFranchise(switched);
    await refreshFranchises();
    invalidateSeasonCaches();
  };

  const deleteFranchise = async (franchiseId: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to delete a franchise');
    }
    await api.deleteFranchise(franchiseId);
    await refreshFranchise();
    await refreshFranchises();
    invalidateSeasonCaches();
  };

  const updateFranchise = async (franchiseId: string, updates: { name?: string; difficulty?: string }) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to update a franchise');
    }
    const updated = await api.updateFranchise(franchiseId, updates);
    if (franchise?.id === franchiseId) {
      setFranchise(updated);
    }
    await refreshFranchises();
  };

  const clearFranchise = () => {
    setFranchise(null);
    setFranchises([]);
  };

  const value = {
    franchise,
    franchises,
    isLoading,
    hasFranchise: !!franchise,
    hasCheckedOnce,
    selectTeam,
    createFranchise,
    switchFranchise,
    deleteFranchise,
    updateFranchise,
    refreshFranchise,
    refreshFranchises,
    clearFranchise,
  };

  return <FranchiseContext.Provider value={value}>{children}</FranchiseContext.Provider>;
}

export function useFranchise() {
  const context = useContext(FranchiseContext);
  if (context === undefined) {
    throw new Error('useFranchise must be used within a FranchiseProvider');
  }
  return context;
}
