import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, Franchise } from '@/api/client';
import { useAuth } from './AuthContext';

interface FranchiseContextType {
  // Current active franchise
  franchise: Franchise | null;
  // All user's franchises
  franchises: Franchise[];
  isLoading: boolean;
  hasFranchise: boolean;
  // Actions
  selectTeam: (teamId: string) => Promise<void>;
  createFranchise: (teamId: string, name?: string) => Promise<void>;
  switchFranchise: (franchiseId: string) => Promise<void>;
  deleteFranchise: (franchiseId: string) => Promise<void>;
  updateFranchise: (franchiseId: string, updates: { name?: string; difficulty?: string }) => Promise<void>;
  refreshFranchise: () => Promise<void>;
  refreshFranchises: () => Promise<void>;
  clearFranchise: () => void;
}

const FranchiseContext = createContext<FranchiseContextType | undefined>(undefined);

export function FranchiseProvider({ children }: { children: ReactNode }) {
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, hasPurchased } = useAuth();

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

  const refreshFranchise = useCallback(async () => {
    if (!isAuthenticated || !hasPurchased) {
      setFranchise(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getFranchise();
      setFranchise(data);
    } catch (error) {
      console.error('Failed to fetch franchise:', error);
      setFranchise(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, hasPurchased]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([refreshFranchise(), refreshFranchises()]);
      setIsLoading(false);
    };
    loadAll();
  }, [refreshFranchise, refreshFranchises]);

  const selectTeam = async (teamId: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to select a team');
    }
    const selected = await api.selectFranchise(teamId);
    setFranchise(selected);
    await refreshFranchises();
  };

  const createFranchise = async (teamId: string, name?: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to create a franchise');
    }
    const created = await api.createFranchise(teamId, name);
    setFranchise(created);
    await refreshFranchises();
  };

  const switchFranchise = async (franchiseId: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to switch franchises');
    }
    const switched = await api.switchFranchise(franchiseId);
    setFranchise(switched);
    await refreshFranchises();
  };

  const deleteFranchise = async (franchiseId: string) => {
    if (!isAuthenticated || !hasPurchased) {
      throw new Error('Must be logged in with a purchase to delete a franchise');
    }
    await api.deleteFranchise(franchiseId);
    await refreshFranchise();
    await refreshFranchises();
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
