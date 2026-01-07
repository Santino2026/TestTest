import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FranchiseProvider, useFranchise } from './context/FranchiseContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import PlayersPage from './pages/PlayersPage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import StandingsPage from './pages/StandingsPage';
import GameDetailPage from './pages/GameDetailPage';
import SchedulePage from './pages/SchedulePage';
import StatsPage from './pages/StatsPage';
import TradesPage from './pages/TradesPage';
import FranchisesPage from './pages/FranchisesPage';
import DevelopmentPage from './pages/DevelopmentPage';
import RosterPage from './pages/RosterPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import GameSelectPage from './pages/GameSelectPage';
import TeamSelectionPage from './pages/TeamSelectionPage';

function AuthRequiredRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PurchaseRequiredRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasPurchased, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPurchased) {
    return <Navigate to="/games" replace />;
  }

  return <>{children}</>;
}

function FranchiseRequiredRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasPurchased, isLoading: authLoading } = useAuth();
  const { isLoading: franchiseLoading, franchise, hasCheckedOnce } = useFranchise();

  // Wait for both auth and franchise to finish loading
  if (authLoading || franchiseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPurchased) {
    return <Navigate to="/games" replace />;
  }

  // Only redirect to select-team if we've confirmed there's no franchise after checking
  // This prevents redirect loops during navigation when state is temporarily null
  if (!franchise && hasCheckedOnce) {
    return <Navigate to="/basketball/select-team" replace />;
  }

  // If we haven't checked yet but loading is done, show loading (edge case)
  if (!franchise && !hasCheckedOnce) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Game selection - requires auth only */}
      <Route
        path="/games"
        element={
          <AuthRequiredRoute>
            <GameSelectPage />
          </AuthRequiredRoute>
        }
      />

      {/* Team selection - requires purchase but not franchise */}
      <Route
        path="/basketball/select-team"
        element={
          <PurchaseRequiredRoute>
            <TeamSelectionPage />
          </PurchaseRequiredRoute>
        }
      />

      {/* Franchises management - requires purchase but not an active franchise */}
      <Route
        path="/basketball/franchises"
        element={
          <PurchaseRequiredRoute>
            <Layout />
          </PurchaseRequiredRoute>
        }
      >
        <Route index element={<FranchisesPage />} />
      </Route>

      {/* Basketball game routes - require purchase AND franchise */}
      <Route
        path="/basketball"
        element={
          <FranchiseRequiredRoute>
            <Layout />
          </FranchiseRequiredRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:id" element={<TeamDetailPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="players/:id" element={<PlayerDetailPage />} />
        <Route path="standings" element={<StandingsPage />} />
        <Route path="games/:id" element={<GameDetailPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        {/* Legacy routes - redirect to unified Season page */}
        <Route path="playoffs" element={<Navigate to="/basketball/schedule" replace />} />
        <Route path="awards" element={<Navigate to="/basketball/schedule" replace />} />
        <Route path="all-star" element={<Navigate to="/basketball/schedule" replace />} />
        <Route path="draft" element={<Navigate to="/basketball/schedule" replace />} />
        <Route path="free-agency" element={<Navigate to="/basketball/schedule" replace />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route path="development" element={<DevelopmentPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <FranchiseProvider>
        <AppRoutes />
      </FranchiseProvider>
    </AuthProvider>
  );
}

export default App;
