import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api, User, setTokens, clearTokens, getAccessToken, setAuthErrorHandler } from '@/api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPurchased: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Flag to prevent auth error handler from firing immediately after login
  const justLoggedInRef = useRef(false);

  // Register global auth error handler
  useEffect(() => {
    setAuthErrorHandler(() => {
      // Don't clear user if we just logged in (prevents race condition)
      if (justLoggedInRef.current) {
        console.log('Auth error ignored - just logged in');
        return;
      }
      setUser(null);
      // Use window.location for redirect since we can't use hooks here
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setTokens(result.access_token, result.refresh_token);
    // Set flag to prevent auth error handler race condition
    justLoggedInRef.current = true;
    setUser(result.user);
    // Clear the flag after a short delay
    setTimeout(() => {
      justLoggedInRef.current = false;
    }, 3000);
  };

  const signup = async (email: string, password: string, name?: string) => {
    const result = await api.signup(email, password, name);
    setTokens(result.access_token, result.refresh_token);
    // Set flag to prevent auth error handler race condition
    justLoggedInRef.current = true;
    setUser(result.user);
    // Clear the flag after a short delay
    setTimeout(() => {
      justLoggedInRef.current = false;
    }, 3000);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    clearTokens();
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasPurchased: user?.has_purchased ?? false,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
