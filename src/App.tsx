import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomNav } from './components/BottomNav';
import {
  HomePage,
  LeaguePickerPage,
  TeamSelectPage,
  HubPage,
  WaiversPage,
  LeaguePage,
  TeamsPage,
} from './pages';

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/leagues" element={<LeaguePickerPage />} />
        <Route path="/team-select" element={<TeamSelectPage />} />
        <Route path="/hub" element={<HubPage />} />
        <Route path="/waivers" element={<WaiversPage />} />
        <Route path="/league" element={<LeaguePage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
