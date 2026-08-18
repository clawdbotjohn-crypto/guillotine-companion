import { useState } from 'react';
import { useLeagueLoader } from './useLeagueLoader';
import type { LeagueData } from './useLeagueLoader';
import Scoreboard from './components/Scoreboard';
import BiddingHistory from './components/BiddingHistory';
import TeamView from './components/TeamView';
import BiddingChart from './components/BiddingChart';
import BiddingByPosition from './components/BiddingByPosition';
import { Swords, BarChart3, DollarSign, User, TrendingUp, LayoutGrid } from 'lucide-react';

const DEFAULT_LEAGUE = '1265773116194299904';

function App() {
  const [leagueId, setLeagueId] = useState(DEFAULT_LEAGUE);
  const { load, loading, error, data, progress } = useLeagueLoader();
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'bidding' | 'position-bids' | 'team' | 'chart'>('scoreboard');
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (leagueId.trim()) load(leagueId.trim());
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="border-b border-[#2a2e55]" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1), rgba(236,72,153,0.08))' }}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-black gradient-text tracking-wide">
              <Swords className="inline w-5 h-5 mr-2 align-text-bottom" style={{ color: '#6366f1' }} />
              Guillotine
            </h1>
            <p className="text-xs text-[#6b6e99] mt-1" style={{ fontFamily: "'Exo 2', sans-serif", textTransform: 'none' }}>Sleeper guillotine league analyzer</p>
          </div>

          {/* League Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={leagueId}
              onChange={e => setLeagueId(e.target.value)}
              placeholder="Sleeper League ID"
              className="px-4 py-2 bg-[#0e1025] border border-[#2a2e55] rounded-lg text-[#f0f0ff] placeholder-[#6b6e99] focus:outline-none focus:border-[#6366f1] focus:shadow-[0_0_8px_rgba(99,102,241,0.4)] transition-all text-sm w-56"
              style={{ fontFamily: "'Space Mono', monospace" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-40"
              style={{
                background: loading ? '#2a2e55' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                fontFamily: "'Exo 2', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {loading ? 'Loading...' : 'Analyze'}
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6">
        {/* Loading */}
        {loading && (
          <div className="text-[#6b6e99] text-sm mb-4">
            <div className="animate-pulse" style={{ fontFamily: "'Exo 2', sans-serif" }}>{progress || 'Loading...'}</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="neon-card p-4 mb-4" style={{ borderColor: '#f43f5e', color: '#f43f5e' }}>
            {error}
          </div>
        )}

        {/* Main Content */}
        {data && <Dashboard data={data} activeTab={activeTab} setActiveTab={setActiveTab} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />}
      </div>
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

  // Find champion and runner-up
  const lastWeek = weekData.length > 0 ? weekData[weekData.length - 1] : null;
  const champion = lastWeek ? lastWeek.scores.find(s => s.rank === 1) : null;
  const runnerUp = lastWeek ? lastWeek.scores.find(s => s.rank === 2) : null;
  const championName = champion ? teams.get(champion.rosterId)?.displayName : '—';
  const runnerUpName = runnerUp ? teams.get(runnerUp.rosterId)?.displayName : null;
  const highestBid = Math.max(...bids.map(b => b.amount), 0);
  const highestBidInfo = bids.find(b => b.amount === highestBid);
  const topScore = Math.max(...weekData.map(w => w.topScore), 0);
  const topScoreWeek = weekData.find(w => w.topScore === topScore);

  const tabs = [
    { key: 'scoreboard', label: 'Scoreboard', icon: BarChart3 },
    { key: 'bidding', label: 'Bidding', icon: DollarSign },
    { key: 'position-bids', label: 'By Position', icon: LayoutGrid },
    { key: 'team', label: 'Team View', icon: User },
    { key: 'chart', label: 'Charts', icon: TrendingUp },
  ];

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard label="Teams" value={String(teams.size)} colorClass="gradient-text" delay={0} />
        <SummaryCard label="Champion" value={championName || '—'} colorClass="text-[#10b981]" delay={50} sub={runnerUpName ? `Runner-up: ${runnerUpName}` : undefined} isChampion />
        <SummaryCard label="Weeks Played" value={String(weekData.length)} colorClass="gradient-text" delay={100} />
        <SummaryCard label="Highest Bid" value={`$${highestBid}`} colorClass="text-[#f59e0b]" delay={150} sub={highestBidInfo ? `${highestBidInfo.playerName}` : undefined} />
        <SummaryCard label="Top Score" value={topScore.toFixed(1)} colorClass="text-[#10b981]" delay={200} sub={topScoreWeek ? `Wk${topScoreWeek.week}` : undefined} />
      </div>

      {/* League Info Bar */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-[#f0f0ff] font-semibold" style={{ fontFamily: "'Exo 2', sans-serif" }}>{league.name}</span>
        <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontFamily: "'Orbitron', sans-serif" }}>{league.season}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#2a2e55] overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[#f0f0ff] tab-active'
                  : 'text-[#6b6e99] hover:text-[#f0f0ff]'
              }`}
              style={{ fontFamily: "'Exo 2', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'scoreboard' && <Scoreboard data={data} />}
      {activeTab === 'bidding' && <BiddingHistory data={data} />}
      {activeTab === 'position-bids' && <BiddingByPosition data={data} />}
      {activeTab === 'team' && <TeamView data={data} selectedTeam={selectedTeam} setSelectedTeam={setSelectedTeam} />}
      {activeTab === 'chart' && <BiddingChart data={data} />}
    </>
  );
}

function SummaryCard({ label, value, colorClass, delay, sub, isChampion }: { label: string; value: string; colorClass: string; delay: number; sub?: string; isChampion?: boolean }) {
  return (
    <div
      className="neon-card p-5 text-center fade-up"
      style={{
        animationDelay: `${delay}ms`,
        ...(isChampion ? { borderColor: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.2)' } : {}),
      }}
    >
      <div className="label mb-2">{label}</div>
      <div className={`font-black ${colorClass} ${value.startsWith('$') || /^\d/.test(value) ? 'mono' : ''}`} style={{ fontFamily: /^\d/.test(value) || value.startsWith('$') ? "'Orbitron', sans-serif" : "'Orbitron', sans-serif", fontSize: value.length > 10 ? '16px' : '28px', fontWeight: 900 }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-[#6b6e99] mt-1" style={{ fontFamily: "'Exo 2', sans-serif", textTransform: 'none' }}>{sub}</div>}
    </div>
  );
}

export default App;
