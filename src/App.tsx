import { useState } from 'react';
import { useLeagueLoader } from './useLeagueLoader';
import type { LeagueData } from './useLeagueLoader';
import Scoreboard from './components/Scoreboard';
import BiddingHistory from './components/BiddingHistory';
import TeamView from './components/TeamView';
import BiddingChart from './components/BiddingChart';

const DEFAULT_LEAGUE = '1265773116194299904';

function App() {
  const [leagueId, setLeagueId] = useState(DEFAULT_LEAGUE);
  const { load, loading, error, data, progress } = useLeagueLoader();
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'bidding' | 'team' | 'chart'>('scoreboard');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leagueId.trim()) load(leagueId.trim());
  };

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-1">
        🪓 Guillotine <span className="text-indigo-400">Companion</span>
      </h1>
      <p className="text-sm text-slate-400 mb-6">Sleeper guillotine league analyzer</p>

      {/* League Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={leagueId}
          onChange={e => setLeagueId(e.target.value)}
          placeholder="Enter Sleeper League ID"
          className="flex-1 max-w-md px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Loading...' : 'Analyze'}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-slate-400 text-sm mb-4">
          <div className="animate-pulse">{progress || 'Loading...'}</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 mb-4">
          {error}
        </div>
      )}

      {/* Main Content */}
      {data && <Dashboard data={data} activeTab={activeTab} setActiveTab={setActiveTab} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />}
    </div>
  );
}

function Dashboard({ data, activeTab, setActiveTab, selectedTeam, setSelectedTeam }: {
  data: LeagueData;
  activeTab: string;
  setActiveTab: (t: any) => void;
  selectedTeam: number | null;
  setSelectedTeam: (t: number | null) => void;
}) {
  const { league, teams, weekData, bids } = data;
  const champion = weekData.length > 0 ? weekData[weekData.length - 1].scores.find(s => s.rank === 1) : null;
  const championName = champion ? teams.get(champion.rosterId)?.displayName : '—';

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <Card value={String(teams.size)} label="Teams" />
        <Card value={championName || '—'} label="🏆 Champion" color="green" />
        <Card value={String(weekData.length)} label="Weeks Played" />
        <Card value={`$${Math.max(...bids.map(b => b.amount), 0)}`} label="Highest Bid" color="yellow" />
        <Card value={league.season} label="Season" />
        <Card value={league.name.slice(0, 12)} label="League" color="blue" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-700 overflow-x-auto">
        {[
          { key: 'scoreboard', label: '📊 Scoreboard' },
          { key: 'bidding', label: '💰 Bidding History' },
          { key: 'team', label: '👤 Team View' },
          { key: 'chart', label: '📈 Bidding Chart' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'scoreboard' && <Scoreboard data={data} />}
      {activeTab === 'bidding' && <BiddingHistory data={data} />}
      {activeTab === 'team' && <TeamView data={data} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />}
      {activeTab === 'chart' && <BiddingChart data={data} />}
    </>
  );
}

function Card({ value, label, color }: { value: string; label: string; color?: string }) {
  const colorClass = color === 'green' ? 'text-green-400' : color === 'yellow' ? 'text-yellow-400' : color === 'blue' ? 'text-indigo-400' : 'text-white';
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center">
      <div className={`text-xl font-bold ${colorClass} truncate`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

export default App;
