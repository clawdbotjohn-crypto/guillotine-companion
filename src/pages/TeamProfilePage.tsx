// Team Profile Page — Detailed view of a single team's season data

import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore, usePlayers } from '../store';
import {
  useLeague,
  useLeagueUsers,
  useRosters,
  useAllMatchups,
  useAllTransactions,
  useDraftPicks,
  useLeagueHistory,
} from '../api';
import { computeEliminations, extractBids } from '../logic';
import { Card, StatCard, StatusBadge, Skeleton, PositionBadge } from '../components/ui';
import { SeasonPicker } from '../components/SeasonPicker';
import { useSwitchSeason } from '../hooks/useSwitchSeason';
import { ArrowLeft, Target, BarChart3, DollarSign } from 'lucide-react';

export function TeamProfilePage() {
  const { rosterId: rosterIdParam } = useParams<{ rosterId: string }>();
  const navigate = useNavigate();
  const rosterId = rosterIdParam ? Number(rosterIdParam) : null;

  const { leagueId, leagueName, leagueSeason, rootLeagueId } = useAppStore();

  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { isLoading: playersLoading } = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);
  const { data: transactions } = useAllTransactions(leagueId, 18);
  const { data: leagueHistory, isLoading: historyLoading } = useLeagueHistory(rootLeagueId);
  const handleSwitchSeason = useSwitchSeason();

  const draftId = league?.draft_id ?? null;
  const { data: draftPicks } = useDraftPicks(draftId);

  const seasons = (leagueHistory || [])
    .map((l) => ({ leagueId: l.league_id, season: l.season, name: l.name }))
    .reverse();

  const isLoading = matchupsLoading || playersLoading;

  if (!leagueId || rosterId === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">No team selected</p>
      </div>
    );
  }

  if (isLoading || !matchups || !rosters || !users) {
    return (
      <div className="px-6 py-8 pb-24 max-w-lg mx-auto space-y-6">
        {/* Back button skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#161a3a] animate-pulse" />
          <Skeleton lines={2} className="flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} hover={false} className="p-4">
              <Skeleton lines={2} />
            </Card>
          ))}
        </div>
        <Card hover={false} className="p-4">
          <Skeleton lines={6} />
        </Card>
      </div>
    );
  }

  const elimResult = computeEliminations(matchups, rosters, users);
  const team = elimResult.teams.get(rosterId);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <p className="text-[#6b6e99] text-sm mb-4">Team not found</p>
        <button onClick={() => navigate(-1)} className="text-[#6366f1] underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  // Determine status
  const lastWeek = elimResult.weeks[elimResult.weeks.length - 1];
  const lastScore = lastWeek?.scores.find((s) => s.rosterId === rosterId);

  let status: 'champion' | 'runner-up' | 'eliminated' | 'safe' | 'at-risk' | 'middle' = 'middle';
  if (team.isChampion) status = 'champion';
  else if (team.isRunnerUp) status = 'runner-up';
  else if (team.eliminatedWeek) status = 'eliminated';
  else if (lastScore) {
    const rank = lastScore.rank;
    const total = lastWeek.teamsRemaining;
    if (rank <= Math.ceil(total / 3)) status = 'safe';
    else if (rank >= Math.ceil((total * 2) / 3)) status = 'at-risk';
  }

  // Week-by-week scores
  const weekScores = elimResult.weeks
    .map((w) => {
      const s = w.scores.find((s) => s.rosterId === rosterId);
      return s
        ? {
            week: w.week,
            points: s.points,
            rank: s.rank,
            total: w.teamsRemaining,
            isElimWeek: team.eliminatedWeek === w.week,
          }
        : null;
    })
    .filter(Boolean) as {
    week: number;
    points: number;
    rank: number;
    total: number;
    isElimWeek: boolean;
  }[];

  // Stats
  const totalPoints = weekScores.reduce((sum, ws) => sum + ws.points, 0);
  const bestWeek = weekScores.reduce(
    (best, ws) => (ws.points > best.points ? ws : best),
    weekScores[0] || { week: 0, points: 0 },
  );
  const avgScore = weekScores.length > 0 ? totalPoints / weekScores.length : 0;

  // Max score across all weeks for bar width normalization
  const maxScore = Math.max(...weekScores.map((ws) => ws.points), 1);

  // FAAB
  const myRoster = rosters.find((r) => r.roster_id === rosterId);
  const totalBudget = league?.settings?.waiver_budget ?? 1000;
  const budgetUsed = myRoster?.settings?.waiver_budget_used ?? 0;
  const budgetRemaining = totalBudget - budgetUsed;

  // Bids
  const allBids = transactions ? extractBids(transactions) : [];
  const teamBids = allBids.filter((b) => b.rosterId === rosterId);
  const totalSpent = teamBids.reduce((s, b) => s + b.amount, 0);
  const biggestBid = teamBids.length > 0 ? Math.max(...teamBids.map((b) => b.amount)) : 0;
  const avgBid = teamBids.length > 0 ? totalSpent / teamBids.length : 0;

  // Draft picks
  const teamDraftPicks = draftPicks
    ? draftPicks.filter((p) => p.roster_id === rosterId).sort((a, b) => a.pick_no - b.pick_no)
    : [];

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="mt-1 p-2 rounded-lg bg-[#161a3a] border border-[#2a2e55] text-[#a5b4fc] hover:text-[#f0f0ff] hover:border-[#6366f1] transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] truncate">
            {team.displayName}
          </h1>
          <p className="text-xs text-[#6b6e99] mt-0.5">{leagueName}</p>
        </div>
        <StatusBadge status={status} className="mt-1.5" />
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
          label="Total Points"
          value={totalPoints.toFixed(1)}
          subtext={`${weekScores.length} weeks`}
          accentColor="#6366f1"
        />
        <StatCard
          label="Best Week"
          value={bestWeek.points.toFixed(1)}
          subtext={bestWeek.week > 0 ? `Week ${bestWeek.week}` : undefined}
          accentColor="#10b981"
        />
        <StatCard
          label="Avg Score"
          value={avgScore.toFixed(1)}
          subtext="per week"
          accentColor="#a5b4fc"
        />
        <StatCard
          label="FAAB Remaining"
          value={`$${budgetRemaining}`}
          subtext={`of $${totalBudget}`}
          accentColor="#f59e0b"
        />
      </div>

      {/* Week-by-Week Performance */}
      <Card hover={false} className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-3.5 h-3.5 text-[#6b6e99]" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99]">
            Week-by-Week Performance
          </h2>
        </div>
        <div className="space-y-1.5">
          {weekScores.map((ws) => {
            const pct = ws.rank / ws.total;
            const color = pct <= 0.33 ? '#10b981' : pct >= 0.67 ? '#f43f5e' : '#f59e0b';
            return (
              <div key={ws.week} className="flex items-center gap-3 text-sm">
                <span className="text-[#4a4d77] text-xs font-['Space_Mono'] w-8">
                  W{ws.week}
                </span>
                <div className="flex-1 h-2 bg-[#161a3a] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(10, (ws.points / maxScore) * 100)}%`,
                      background: color,
                    }}
                  />
                  {ws.isElimWeek && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#f43f5e] ring-2 ring-[#0e1025]" />
                  )}
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
        {team.eliminatedWeek && (
          <div className="mt-3 pt-3 border-t border-[#1a1e3a] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
            <span className="text-[10px] text-[#6b6e99]">
              Eliminated in Week {team.eliminatedWeek}
            </span>
          </div>
        )}
      </Card>

      {/* FAAB Spending */}
      <Card hover={false} className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-3.5 h-3.5 text-[#6b6e99]" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99]">
            FAAB Spending
          </h2>
        </div>
        {teamBids.length > 0 ? (
          <>
            {/* Summary stats */}
            <div className="flex gap-4 mb-3 pb-3 border-b border-[#1a1e3a]">
              <div>
                <div className="text-[10px] text-[#4a4d77] uppercase tracking-wider">Spent</div>
                <div className="font-['Space_Mono'] text-sm text-[#f59e0b] font-bold tabular-nums">
                  ${totalSpent}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#4a4d77] uppercase tracking-wider">Biggest</div>
                <div className="font-['Space_Mono'] text-sm text-[#a5b4fc] font-bold tabular-nums">
                  ${biggestBid}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#4a4d77] uppercase tracking-wider">Avg Bid</div>
                <div className="font-['Space_Mono'] text-sm text-[#6b6e99] font-bold tabular-nums">
                  ${avgBid.toFixed(0)}
                </div>
              </div>
            </div>
            {/* Bid list */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teamBids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <PositionBadge position={bid.position} />
                    <span className="text-[#f0f0ff] truncate max-w-[140px]">
                      {bid.playerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-['Space_Mono'] text-xs text-[#f59e0b] tabular-nums">
                      ${bid.amount}
                    </span>
                    <span className="text-[10px] text-[#4a4d77]">Wk{bid.week}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-[#4a4d77]">No FAAB bids this season</p>
        )}
      </Card>

      {/* Draft Picks */}
      {teamDraftPicks.length > 0 && (
        <Card hover={false} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-3.5 h-3.5 text-[#6b6e99]" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6b6e99]">
              Draft Picks
            </h2>
          </div>
          <div className="space-y-2">
            {teamDraftPicks.map((pick) => (
              <div key={pick.pick_no} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <PositionBadge position={pick.metadata.position} />
                  <span className="text-[#f0f0ff]">
                    {pick.metadata.first_name} {pick.metadata.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-['Space_Mono'] text-[10px] text-[#a5b4fc] tabular-nums">
                    Rd {pick.round}
                  </span>
                  <span className="font-['Space_Mono'] text-[10px] text-[#4a4d77] tabular-nums">
                    #{pick.pick_no}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
