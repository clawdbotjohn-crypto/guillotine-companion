// Hub Page — Your team's command center
// Phase 1: Shows team overview, elimination status, basic stats

import { useAppStore, usePlayers } from '../store';
import {
  useLeague,
  useLeagueUsers,
  useRosters,
  useAllMatchups,
  useAllTransactions,
  useLeagueHistory,
} from '../api';
import { computeEliminations, extractBids } from '../logic';
import { Card, StatCard, StatusBadge, Skeleton, PositionBadge } from '../components/ui';
import { SeasonPicker } from '../components/SeasonPicker';
import { useSwitchSeason } from '../hooks/useSwitchSeason';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function HubPage() {
  const navigate = useNavigate();
  const { leagueId, leagueName, leagueSeason, rootLeagueId, rosterId, teamName, reset } = useAppStore();

  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { isLoading: playersLoading } = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);
  const { data: transactions } = useAllTransactions(leagueId, 18);
  const { data: leagueHistory, isLoading: historyLoading } = useLeagueHistory(rootLeagueId);
  const handleSwitchSeason = useSwitchSeason();

  const seasons = (leagueHistory || [])
    .map((l) => ({ leagueId: l.league_id, season: l.season, name: l.name }))
    .reverse(); // oldest to newest (left to right)

  const isLoading = matchupsLoading || playersLoading;

  if (!leagueId || !rosterId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-[#6b6e99] text-sm mb-4">No team selected</p>
        <button onClick={() => navigate('/')} className="text-[#6366f1] underline text-sm">
          Select a league
        </button>
      </div>
    );
  }

  if (isLoading || !matchups || !rosters || !users) {
    return (
      <div className="px-6 py-8 max-w-lg mx-auto space-y-6">
        <Skeleton lines={2} />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} hover={false} className="p-4">
              <Skeleton lines={2} />
            </Card>
          ))}
        </div>
        <Card hover={false} className="p-4">
          <Skeleton lines={4} />
        </Card>
      </div>
    );
  }

  // Compute eliminations
  const elimResult = computeEliminations(matchups, rosters, users);
  const myTeam = elimResult.teams.get(rosterId);
  const bids = transactions ? extractBids(transactions) : [];
  const myBids = bids.filter((b) => b.rosterId === rosterId);

  // Find my current stats
  const lastWeek = elimResult.weeks[elimResult.weeks.length - 1];
  const myLastScore = lastWeek?.scores.find((s) => s.rosterId === rosterId);

  // FAAB budget
  const myRoster = rosters.find((r) => r.roster_id === rosterId);
  const totalBudget = league?.settings?.waiver_budget ?? 1000;
  const budgetUsed = myRoster?.settings?.waiver_budget_used ?? 0;
  const budgetRemaining = totalBudget - budgetUsed;

  // Total points scored
  const totalPoints = elimResult.weeks.reduce((sum, w) => {
    const s = w.scores.find((s) => s.rosterId === rosterId);
    return sum + (s?.points || 0);
  }, 0);

  // Determine status
  let status: 'champion' | 'runner-up' | 'eliminated' | 'safe' | 'at-risk' | 'middle' = 'middle';
  if (myTeam?.isChampion) status = 'champion';
  else if (myTeam?.isRunnerUp) status = 'runner-up';
  else if (myTeam?.eliminatedWeek) status = 'eliminated';
  else if (myLastScore) {
    const rank = myLastScore.rank;
    const total = lastWeek.teamsRemaining;
    if (rank <= Math.ceil(total / 3)) status = 'safe';
    else if (rank >= Math.ceil((total * 2) / 3)) status = 'at-risk';
  }

  // Week-by-week scores for sparkline
  const weekScores = elimResult.weeks
    .map((w) => {
      const s = w.scores.find((s) => s.rosterId === rosterId);
      return s ? { week: w.week, points: s.points, rank: s.rank, total: w.teamsRemaining } : null;
    })
    .filter(Boolean) as { week: number; points: number; rank: number; total: number }[];

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff]">
            {teamName}
          </h1>
          <p className="text-xs text-[#6b6e99] mt-0.5">{leagueName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <button
            onClick={() => { reset(); navigate('/'); }}
            className="text-[#4a4d77] hover:text-[#f43f5e] transition-colors p-1"
            title="Switch league"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Season Picker */}
      <SeasonPicker
        seasons={seasons}
        currentSeason={leagueSeason || ''}
        onSelect={handleSwitchSeason}
        isLoading={historyLoading}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          label="Current Rank"
          value={myLastScore ? `${myLastScore.rank}/${lastWeek.teamsRemaining}` : '—'}
          accentColor={status === 'safe' ? '#10b981' : status === 'at-risk' ? '#f43f5e' : '#6366f1'}
        />
        <StatCard
          label="FAAB Remaining"
          value={`$${budgetRemaining}`}
          subtext={`of $${totalBudget}`}
          accentColor="#f59e0b"
        />
        <StatCard
          label="Total Points"
          value={totalPoints.toFixed(1)}
          subtext={`${elimResult.weeks.length} weeks`}
        />
        <StatCard
          label="Last Score"
          value={myLastScore?.points.toFixed(1) || '—'}
          subtext={myLastScore ? `Wk ${lastWeek.week}` : undefined}
        />
      </div>

      {/* Week-by-week scores */}
      <Card hover={false} className="p-4 mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99] mb-3">
          Week-by-Week Performance
        </h2>
        <div className="space-y-1.5">
          {weekScores.map((ws) => {
            const pct = ws.rank / ws.total;
            const color = pct <= 0.33 ? '#10b981' : pct >= 0.67 ? '#f43f5e' : '#f59e0b';
            return (
              <div key={ws.week} className="flex items-center gap-3 text-sm">
                <span className="text-[#4a4d77] text-xs font-['Space_Mono'] w-8">W{ws.week}</span>
                <div className="flex-1 h-2 bg-[#161a3a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(10, (ws.points / (lastWeek.topScore || 1)) * 100)}%`,
                      background: color,
                    }}
                  />
                </div>
                <span className="font-['Space_Mono'] text-xs text-[#f0f0ff] w-14 text-right tabular-nums">
                  {ws.points.toFixed(1)}
                </span>
                <span
                  className="font-['Space_Mono'] text-[10px] w-10 text-right tabular-nums"
                  style={{ color }}
                >
                  {ws.rank}/{ws.total}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent bids */}
      {myBids.length > 0 && (
        <Card hover={false} className="p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99] mb-3">
            Recent Pickups
          </h2>
          <div className="space-y-2">
            {myBids.slice(-5).reverse().map((bid, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <PositionBadge position={bid.position} />
                  <span className="text-[#f0f0ff]">{bid.playerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-['Space_Mono'] text-xs text-[#f59e0b] tabular-nums">${bid.amount}</span>
                  <span className="text-[10px] text-[#4a4d77]">Wk{bid.week}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
