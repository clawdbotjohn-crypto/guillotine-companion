import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './components/BottomNav';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const LeaguePickerPage = lazy(() => import('./pages/LeaguePickerPage').then(m => ({ default: m.LeaguePickerPage })));
const TeamSelectPage = lazy(() => import('./pages/TeamSelectPage').then(m => ({ default: m.TeamSelectPage })));
const HubPage = lazy(() => import('./pages/HubPage').then(m => ({ default: m.HubPage })));
const LeaguePage = lazy(() => import('./pages/LeaguePage').then(m => ({ default: m.LeaguePage })));
const TeamsPage = lazy(() => import('./pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const TeamProfilePage = lazy(() => import('./pages/TeamProfilePage').then(m => ({ default: m.TeamProfilePage })));
const WaiversPage = lazy(() => import('./pages/WaiversPage').then(m => ({ default: m.WaiversPage })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#06060f]">
      <div className="w-6 h-6 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function AppLayout() {
  const location = useLocation();

  // Show bottom nav only on main app pages (not onboarding)
  const showNav = ['/hub', '/waivers', '/league', '/teams'].some((p) =>
    location.pathname.startsWith(p),
  );

  return (
    <>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leagues" element={<LeaguePickerPage />} />
          <Route path="/team-select" element={<TeamSelectPage />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/waivers" element={<WaiversPage />} />
          <Route path="/league" element={<LeaguePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:rosterId" element={<TeamProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
