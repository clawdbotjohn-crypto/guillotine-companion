// App shell with routing

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/app-store';

// Placeholder pages — will be implemented in build phase
function HomePage() {
  return <div className="min-h-screen bg-body text-primary p-4">
    <h1 className="font-display text-2xl uppercase tracking-wider">Guillotine Companion</h1>
    <p className="text-secondary mt-2">Enter your Sleeper username to get started.</p>
  </div>;
}

function HubPage() {
  return <div className="p-4"><h1 className="font-display text-xl uppercase">Hub</h1></div>;
}

function WaiversPage() {
  return <div className="p-4"><h1 className="font-display text-xl uppercase">Waivers</h1></div>;
}

function LeaguePage() {
  return <div className="p-4"><h1 className="font-display text-xl uppercase">League</h1></div>;
}

function TeamsPage() {
  return <div className="p-4"><h1 className="font-display text-xl uppercase">Teams</h1></div>;
}

export function App() {
  const { selectedLeagueId } = useAppStore();

  return (
    <div className="min-h-screen bg-body text-primary">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/hub" element={selectedLeagueId ? <HubPage /> : <Navigate to="/" />} />
        <Route path="/waivers" element={selectedLeagueId ? <WaiversPage /> : <Navigate to="/" />} />
        <Route path="/league" element={selectedLeagueId ? <LeaguePage /> : <Navigate to="/" />} />
        <Route path="/teams" element={selectedLeagueId ? <TeamsPage /> : <Navigate to="/" />} />
        <Route path="/teams/:rosterId" element={selectedLeagueId ? <TeamsPage /> : <Navigate to="/" />} />
      </Routes>
    </div>
  );
}
