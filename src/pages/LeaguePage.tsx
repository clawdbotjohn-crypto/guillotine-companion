// League page — League-wide analytics view
// Phase 1: Basic scoreboard + elimination timeline

import { useState } from 'react';
import { useAppStore, usePlayers } from '../store';
import { useLeague, useLeagueUsers, useRosters, useAllMatchups, useAllTransactions, useLeagueHistory } from '../api';
import { computeEliminations, extractBids } from '../logic';
import { Card, Skeleton, StatusBadge, PositionBadge } from '../components/ui';
import { Trophy, Medal, Calendar } from 'lucide-react';
import { BidGrid } from '../components/BidGrid';
import { FaabTracker } from '../components/FaabTracker';
import { SeasonPicker } from '../components/SeasonPicker';
import { useSwitchSeason } from '../hooks/useSwitchSeason';

export function LeaguePage() {
  const { leagueId, leagueName, leagueSeason, rootLeagueId } = useAppStore();
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
    .reverse();

  const [activeView, setActiveView] = useState<'scoreboard' | 'bids' | 'grid' | 'faab' | 'timeline'>('scoreboard');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const isLoading = matchupsLoading || playersLoading;

  if (!leagueId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">Select a league first</p>
      </div>
    );
  }

  if (isLoading || !matchups || !rosters || !users) {
    return (
      <div className="px-6 py-8 pb-24 max-w-lg mx-auto">
        <Skeleton lines={3} />
      </div>
    );
  }

  const elimResult = computeEliminations(matchups, rosters, users);
  const bids = transactions ? extractBids(transactions) : [];
  const hasWeekData = elimResult.weeks.length > 0;
  const currentWeek = selectedWeek ?? elimResult.weeks.length;
  const weekData = elimResult.weeks.find((w) => w.week === currentWeek);
  const leagueStatus = league?.status ?? '';

  const views = [
    { key: 'scoreboard' as const, label: 'Scores' },
    { key: 'bids' as const, label: 'Bids' },
    { key: 'grid' as const, label: 'Grid' },
    { key: 'faab' as const, label: 'FAAB' },
    { key: 'timeline' as const, label: 'Timeline' },
  ];

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-1">
        League
      </h1>
      <p className="text-xs text-[#6b6e99] mb-6">{leagueName}</p>

      {/* Season Picker */}
      <SeasonPicker
        seasons={seasons}
        currentSeason={leagueSeason || ''}
        onSelect={handleSwitchSeason}
        isLoading={historyLoading}
      />

      {/* View Toggle */}
      <div className="flex gap-1 bg-[#0a0d1a] rounded-lg p-1 mb-6">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-200
              ${activeView === v.key
                ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)]'
                : 'text-[#4a4d77] hover:text-[#6b6e99]'
              }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Pre-season: no week data */}
      {!hasWeekData && (
        <Card hover={false} className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#161a3a] flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-[#6366f1]" />
            </div>
            <h2 className="text-[#f0f0ff] font-semibold text-base mb-1">
              No scores yet
            </h2>
            <p className="text-[#6b6e99] text-sm mb-2">
              {leagueStatus === 'pre_draft'
                ? 'The league has been created but the draft hasn\'t started.'
                : leagueStatus === 'drafting'
                ? 'The draft is in progress — scores will appear after Week 1.'
                : 'The season hasn\'t kicked off yet. Check back after Week 1.'}
            </p>
          </div>
        </Card>
      )}

      {/* Week picker */}
      {hasWeekData && activeView !== 'timeline' && activeView !== 'grid' && activeView !== 'faab' && (
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {elimResult.weeks.map((w) => (
            <button
              key={w.week}
              onClick={() => setSelectedWeek(w.week)}
              className={`shrink-0 w-9 h-9 rounded-lg text-xs font-['Space_Mono'] font-bold transition-all
                ${currentWeek === w.week
                  ? 'bg-[#6366f1] text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                  : 'bg-[#161a3a] text-[#6b6e99] hover:bg-[#1a1e3a]'
                }`}
            >
              {w.week}
            </button>
          ))}
        </div>
      )}

      {/* Scoreboard View */}
      {activeView === 'scoreboard' && !weekData && hasWeekData && (
        <Card hover={false} className="p-6">
          <p className="text-[#6b6e99] text-sm text-center">No scores for this week yet</p>
        </Card>
      )}
      {activeView === 'scoreboard' && weekData && (
        <div>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-[#161a3a] rounded-lg p-3 text-center">
              <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Top</div>
              <div className="font-['Space_Mono'] text-sm text-[#10b981] font-bold tabular-nums">
                {weekData.topScore.toFixed(1)}
              </div>
            </div>
            <div className="bg-[#161a3a] rounded-lg p-3 text-center">
              <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Avg</div>
              <div className="font-['Space_Mono'] text-sm text-[#a5b4fc] font-bold tabular-nums">
                {weekData.avgScore.toFixed(1)}
              </div>
            </div>
            <div className="bg-[#161a3a] rounded-lg p-3 text-center">
              <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Cutoff</div>
              <div className="font-['Space_Mono'] text-sm text-[#f43f5e] font-bold tabular-nums">
                {weekData.cutoffScore.toFixed(1)}
              </div>
            </div>
          </div>

          {/* All scores */}
          <Card hover={false} className="p-4">
            <div className="space-y-1.5">
              {weekData.scores.map((s) => {
                const team = elimResult.teams.get(s.rosterId);
                const isEliminated = weekData.eliminated.includes(s.rosterId);
                const isChampion = weekData.isFinals && s.rosterId === elimResult.champion;
                const isRunnerUp = weekData.isFinals && s.rosterId === elimResult.runnerUp;
                const pct = s.rank / weekData.teamsRemaining;
                const color = isChampion
                  ? '#f59e0b'
                  : isRunnerUp
                  ? '#9ca3af'
                  : isEliminated
                  ? '#f43f5e'
                  : pct <= 0.33
                  ? '#10b981'
                  : pct >= 0.67
                  ? '#f59e0b'
                  : '#a5b4fc';

                return (
                  <div
                    key={s.rosterId}
                    className={`flex items-center justify-between py-1.5 ${isEliminated ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-['Space_Mono'] text-[10px] w-5 text-right tabular-nums"
                        style={{ color }}
                      >
                        {s.rank}
                      </span>
                      {isChampion && (
                        <Trophy size={14} className="text-[#f59e0b] shrink-0" />
                      )}
                      {isRunnerUp && (
                        <Medal size={14} className="text-[#9ca3af] shrink-0" />
                      )}
                      <span className={`text-sm ${isEliminated ? 'line-through text-[#4a4d77]' : 'text-[#f0f0ff]'}`}>
                        {team?.displayName}
                      </span>
                      {isChampion && (
                        <StatusBadge status="champion" />
                      )}
                      {isRunnerUp && (
                        <StatusBadge status="runner-up" />
                      )}
                      {isEliminated && (
                        <StatusBadge status="eliminated" />
                      )}
                    </div>
                    <span className="font-['Space_Mono'] text-xs tabular-nums" style={{ color }}>
                      {s.points.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Bids View */}
      {activeView === 'bids' && (
        <Card hover={false} className="p-4">
          <div className="space-y-2">
            {bids
              .filter((b) => b.week === currentWeek)
              .sort((a, b) => b.amount - a.amount)
              .map((bid, i) => {
                const team = elimResult.teams.get(bid.rosterId);
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <PositionBadge position={bid.position} />
                      <div>
                        <div className="text-[#f0f0ff]">{bid.playerName}</div>
                        <div className="text-[10px] text-[#4a4d77]">{team?.displayName}</div>
                      </div>
                    </div>
                    <span className="font-['Space_Mono'] text-xs text-[#f59e0b] tabular-nums">${bid.amount}</span>
                  </div>
                );
              })}
            {bids.filter((b) => b.week === currentWeek).length === 0 && (
              <p className="text-[#4a4d77] text-xs text-center py-4">No bids this week</p>
            )}
          </div>
        </Card>
      )}

      {/* Grid View */}
      {activeView === 'grid' && (
        <div>
          {/* Week filter for grid */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide">
            <button
              onClick={() => setSelectedWeek(null)}
              className={`shrink-0 px-3 h-9 rounded-lg text-xs font-['Space_Mono'] font-bold transition-all
                ${selectedWeek === null
                  ? 'bg-[#6366f1] text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                  : 'bg-[#161a3a] text-[#6b6e99] hover:bg-[#1a1e3a]'
                }`}
            >
              All
            </button>
            {elimResult.weeks.map((w) => (
              <button
                key={w.week}
                onClick={() => setSelectedWeek(w.week)}
                className={`shrink-0 w-9 h-9 rounded-lg text-xs font-['Space_Mono'] font-bold transition-all
                  ${selectedWeek === w.week
                    ? 'bg-[#6366f1] text-white shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                    : 'bg-[#161a3a] text-[#6b6e99] hover:bg-[#1a1e3a]'
                  }`}
              >
                {w.week}
              </button>
            ))}
          </div>
          <BidGrid
            bids={bids}
            weeks={elimResult.weeks.map((w) => w.week)}
            teams={elimResult.teams}
            totalBudget={100}
            selectedWeek={selectedWeek}
          />
        </div>
      )}

      {/* FAAB View */}
      {activeView === 'faab' && rosters && users && (
        <FaabTracker
          rosters={rosters}
          users={users}
          teams={elimResult.teams}
          totalBudget={league?.settings?.waiver_budget ?? 1000}
          bids={bids}
        />
      )}

      {/* Timeline View */}
      {activeView === 'timeline' && (
        <div className="space-y-2">
          {elimResult.weeks.map((w) => (
            <div key={w.week} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#161a3a] flex items-center justify-center
                  font-['Space_Mono'] text-xs text-[#6b6e99] font-bold">
                  {w.week}
                </div>
                {w.week < elimResult.weeks.length && (
                  <div className="w-px flex-1 bg-[#2a2e55] mt-1" />
                )}
              </div>
              <Card hover={false} className="flex-1 p-3 mb-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b6e99]">{w.teamsRemaining} teams</span>
                  {w.isFinals && <StatusBadge status="champion" />}
                </div>
                {w.eliminated.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {w.eliminated.map((id) => {
                      const team = elimResult.teams.get(id);
                      const score = w.scores.find((s) => s.rosterId === id);
                      return (
                        <div key={id} className="flex items-center justify-between text-xs">
                          <span className="text-[#f43f5e]">{team?.displayName}</span>
                          <span className="font-['Space_Mono'] text-[#4a4d77] tabular-nums">
                            {score?.points.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {w.isFinals && w.scores.length === 2 && (
                  <div className="mt-1.5 space-y-0.5">
                    {w.scores.map((s) => {
                      const team = elimResult.teams.get(s.rosterId);
                      const isChamp = s.rosterId === elimResult.champion;
                      return (
                        <div key={s.rosterId} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {isChamp ? (
                              <Trophy size={12} className="text-[#f59e0b] shrink-0" />
                            ) : (
                              <Medal size={12} className="text-[#9ca3af] shrink-0" />
                            )}
                            <span className={isChamp ? 'text-[#f59e0b] font-bold' : 'text-[#9ca3af]'}>
                              {team?.displayName}
                            </span>
                          </div>
                          <span className="font-['Space_Mono'] tabular-nums text-[#a5b4fc]">
                            {s.points.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
