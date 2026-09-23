// League page — League-wide analytics view
// Phase 1: Basic scoreboard + elimination timeline

import { useState } from 'react';
import { useAppStore, usePlayers } from '../store';
import { getPlayerPosition } from '../store/players';
import { useLeague, useLeagueUsers, useRosters, useAllMatchups, useAllTransactions, useLeagueHistory, useNflState, useWeeklyProjections } from '../api';
import {
  buildWeeklyScoredPlayers,
  computeEliminations,
  extractBids,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  projectAllTeams,
} from '../logic';
import { Card, Skeleton, StatusBadge, PositionBadge } from '../components/ui';
import { Trophy, Medal, Calendar } from 'lucide-react';
import { BidGrid } from '../components/BidGrid';
import { ScoresChart } from '../components/ScoresChart';
import { FaabTracker } from '../components/FaabTracker';
import { SeasonPicker } from '../components/SeasonPicker';
import { useSwitchSeason } from '../hooks/useSwitchSeason';

export function LeaguePage() {
  const { leagueId, leagueName, leagueSeason, rootLeagueId, rosterId: selectedRosterId } = useAppStore();
  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { isLoading: playersLoading } = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);
  const { data: transactions } = useAllTransactions(leagueId, 18);
  const { data: leagueHistory, isLoading: historyLoading } = useLeagueHistory(rootLeagueId);
  const nflStateQuery = useNflState();
  const projectionWeek = league && nflStateQuery.data && league.season === nflStateQuery.data.season
    ? getRestOfSeasonStartWeek(nflStateQuery.data)
    : null;
  const weeklyProjectionQuery = useWeeklyProjections(
    league?.season ?? null,
    projectionWeek,
    projectionWeek != null,
  );
  const handleSwitchSeason = useSwitchSeason();

  const seasons = (leagueHistory || [])
    .map((l) => ({ leagueId: l.league_id, season: l.season, name: l.name }))
    .reverse();

  const [activeView, setActiveView] = useState<'scoreboard' | 'bids' | 'faab' | 'timeline'>('scoreboard');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  // Bids tab sub-mode: grid (default) or list. (Combined Bids+Grid per John feedback 2026-09-22)
  const [bidsMode, setBidsMode] = useState<'grid' | 'list'>('grid');
  const [bidPosition, setBidPosition] = useState<'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DEF' | 'K'>('ALL');

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
  const weeklyScoredPlayers = weeklyProjectionQuery.data
    ? buildWeeklyScoredPlayers(
        weeklyProjectionQuery.data,
        getProjectionScoring(league?.scoring_settings?.rec),
        getPlayerPosition,
      )
    : null;
  const projections = projectAllTeams(rosters, weeklyScoredPlayers, league, elimResult);
  const bids = transactions ? extractBids(transactions) : [];
  const positionMatches = (position: string) => bidPosition === 'ALL'
    || position === bidPosition
    || (bidPosition === 'FLEX' && ['RB', 'WR', 'TE'].includes(position));
  const filteredBids = bids.filter((bid) => positionMatches(bid.position));
  const visibleBidPositions = bidPosition === 'ALL'
    ? undefined
    : bidPosition === 'FLEX'
      ? ['RB', 'WR', 'TE']
      : [bidPosition];
  const hasWeekData = elimResult.weeks.length > 0;
  const leagueStatus = league?.status ?? '';

  const views = [
    { key: 'scoreboard' as const, label: 'Scores' },
    { key: 'bids' as const, label: 'Bids' },
    { key: 'faab' as const, label: 'FAAB' },
    { key: 'timeline' as const, label: 'Timeline' },
  ];

  return (
    <div className={`px-6 py-6 pb-24 mx-auto ${activeView === 'scoreboard' ? 'max-w-3xl' : 'max-w-lg'}`}>
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

      {/* Week picker — Bids (list mode) + Grid share the same week filter with an All option */}
      {hasWeekData && activeView === 'bids' && (
        <>
        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 scrollbar-hide">
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
        <div className="flex gap-1 overflow-x-auto pb-3 mb-4 scrollbar-hide" aria-label="Filter bids by position">
          {(['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'DEF', 'K'] as const).map((position) => (
            <button
              key={position}
              type="button"
              onClick={() => setBidPosition(position)}
              className={`shrink-0 px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
                bidPosition === position
                  ? 'bg-[#252a55] text-[#c7d2fe] ring-1 ring-[#6366f1]'
                  : 'bg-[#101329] text-[#5f638f] hover:text-[#a5b4fc]'
              }`}
            >
              {position === 'ALL' ? 'All' : position}
            </button>
          ))}
        </div>
        </>
      )}

      {/* Scoreboard View — Full Season Table */}
      {activeView === 'scoreboard' && hasWeekData && (
        <div>
          {/* Scores-by-week chart with user's team highlighted */}
          <ScoresChart elim={elimResult} selectedRosterId={selectedRosterId} />

          {/* Season aggregate stats */}
          {(() => {
            const seasonTop = Math.max(...elimResult.weeks.map((w) => w.topScore));
            const seasonAvg = elimResult.weeks.reduce((sum, w) => sum + w.avgScore, 0) / elimResult.weeks.length;
            const seasonCut = elimResult.weeks.reduce((sum, w) => sum + w.cutoffScore, 0) / elimResult.weeks.length;
            return (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-[#161a3a] rounded-lg p-3 text-center">
                  <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Season High</div>
                  <div className="font-['Space_Mono'] text-sm text-[#10b981] font-bold tabular-nums">
                    {seasonTop.toFixed(1)}
                  </div>
                </div>
                <div className="bg-[#161a3a] rounded-lg p-3 text-center">
                  <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Avg/Wk</div>
                  <div className="font-['Space_Mono'] text-sm text-[#a5b4fc] font-bold tabular-nums">
                    {seasonAvg.toFixed(1)}
                  </div>
                </div>
                <div className="bg-[#161a3a] rounded-lg p-3 text-center">
                  <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Avg Cut</div>
                  <div className="font-['Space_Mono'] text-sm text-[#f43f5e] font-bold tabular-nums">
                    {seasonCut.toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Full-season data table */}
          <div className="bg-[#0e1025] rounded-lg border border-[#2a2e55] overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[480px]">
              <thead>
                <tr className="bg-[#161a3a]">
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-left px-2 py-2 border-b border-[#2a2e55]">Wk</th>
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-right px-2 py-2 border-b border-[#2a2e55]">Top</th>
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-right px-2 py-2 border-b border-[#2a2e55]">Avg</th>
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-right px-2 py-2 border-b border-[#2a2e55]">Cut</th>
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-right px-2 py-2 border-b border-[#2a2e55]">
                    {selectedRosterId ? (elimResult.teams.get(selectedRosterId)?.displayName ?? 'My Team') : 'My Team'}
                  </th>
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-center px-2 py-2 border-b border-[#2a2e55]">Rank</th>
                  <th className="font-['Orbitron'] text-[10px] text-[#6b6e99] uppercase tracking-wider text-left px-2 py-2 border-b border-[#2a2e55]">Eliminated</th>
                </tr>
              </thead>
              <tbody>
                {elimResult.weeks.map((w, idx) => {
                  const myScore = selectedRosterId
                    ? w.scores.find((s) => s.rosterId === selectedRosterId)
                    : null;
                  const isChampionWeek = w.isFinals && elimResult.champion !== null;
                  const myEliminated = selectedRosterId
                    ? w.eliminated.includes(selectedRosterId)
                    : false;

                  // Rank color
                  let rankColor = '#a5b4fc'; // default middle
                  if (myScore) {
                    if (myEliminated) {
                      rankColor = '#f43f5e';
                    } else if (isChampionWeek && myScore.rosterId === elimResult.champion) {
                      rankColor = '#f59e0b';
                    } else {
                      const pct = myScore.rank / w.teamsRemaining;
                      if (pct <= 0.33) rankColor = '#10b981';
                      else if (pct > 0.67) rankColor = '#f59e0b';
                    }
                  }

                  const elimNames = w.eliminated
                    .map((id) => elimResult.teams.get(id)?.displayName ?? `Team ${id}`)
                    .join(', ');

                  const rowBg = idx % 2 === 0 ? 'bg-[#0a0d1a]' : 'bg-[#0e1025]';

                  return (
                    <tr
                      key={w.week}
                      className={`${rowBg} ${isChampionWeek ? 'border-l-2 border-l-[#f59e0b]' : ''}`}
                    >
                      <td className="font-['Space_Mono'] text-[#f0f0ff] px-2 py-1.5 tabular-nums border-b border-[#2a2e55]">
                        {w.week}
                      </td>
                      <td className="font-['Space_Mono'] text-[#10b981] text-right px-2 py-1.5 tabular-nums border-b border-[#2a2e55]">
                        {w.topScore.toFixed(1)}
                      </td>
                      <td className="font-['Space_Mono'] text-[#a5b4fc] text-right px-2 py-1.5 tabular-nums border-b border-[#2a2e55]">
                        {w.avgScore.toFixed(1)}
                      </td>
                      <td className="font-['Space_Mono'] text-[#f43f5e] text-right px-2 py-1.5 tabular-nums border-b border-[#2a2e55]">
                        {w.cutoffScore.toFixed(1)}
                      </td>
                      <td
                        className="font-['Space_Mono'] text-right px-2 py-1.5 tabular-nums border-b border-[#2a2e55]"
                        style={{ color: myScore ? rankColor : '#4a4d77' }}
                      >
                        {myScore ? myScore.points.toFixed(1) : '—'}
                      </td>
                      <td
                        className="font-['Space_Mono'] text-center px-2 py-1.5 tabular-nums border-b border-[#2a2e55]"
                        style={{ color: rankColor }}
                      >
                        {myScore ? `${myScore.rank}/${w.teamsRemaining}` : '—'}
                      </td>
                      <td className="text-left px-2 py-1.5 border-b border-[#2a2e55] max-w-[150px] truncate">
                        {w.eliminated.length > 0 ? (
                          <span className="text-[#f43f5e] line-through">{elimNames}</span>
                        ) : (
                          <span className="text-[#4a4d77]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bids View — combined Grid (default) + List, mode toggle */}
      {activeView === 'bids' && hasWeekData && (
        <div>
          {/* Grid / List mode toggle */}
          <div className="flex gap-1 bg-[#0a0d1a] rounded-lg p-1 mb-4 w-fit">
            {(['grid', 'list'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setBidsMode(m)}
                className={`px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-md transition-all
                  ${bidsMode === m
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                    : 'text-[#4a4d77] hover:text-[#6b6e99]'
                  }`}
              >
                {m === 'grid' ? 'Grid' : 'List'}
              </button>
            ))}
          </div>

          {bidsMode === 'grid' ? (
            <BidGrid
              bids={filteredBids}
              weeks={elimResult.weeks.map((w) => w.week)}
              teams={elimResult.teams}
              totalBudget={league?.settings?.waiver_budget ?? 1000}
              selectedWeek={selectedWeek}
              positions={visibleBidPositions}
            />
          ) : (
            <Card hover={false} className="p-4">
              <div className="space-y-2">
                {filteredBids
                  .filter((b) => selectedWeek === null || b.week === selectedWeek)
                  .sort((a, b) => (selectedWeek === null ? a.week - b.week || b.amount - a.amount : b.amount - a.amount))
                  .map((bid, i) => {
                    const team = elimResult.teams.get(bid.rosterId);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <PositionBadge position={bid.position} />
                          <div>
                            <div className="text-[#f0f0ff]">{bid.playerName}</div>
                            <div className="text-[10px] text-[#4a4d77]">
                              {selectedWeek === null && <span className="text-[#6366f1] mr-1">W{bid.week}</span>}
                              {team?.displayName}
                            </div>
                          </div>
                        </div>
                        <span className="font-['Space_Mono'] text-xs text-[#f59e0b] tabular-nums">${bid.amount}</span>
                      </div>
                    );
                  })}
                {filteredBids.filter((b) => selectedWeek === null || b.week === selectedWeek).length === 0 && (
                  <p className="text-[#4a4d77] text-xs text-center py-4">
                    No {bidPosition === 'ALL' ? '' : `${bidPosition} `}bids{selectedWeek !== null ? ' this week' : ''}
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* FAAB View */}
      {activeView === 'faab' && rosters && users && (
        <FaabTracker
          rosters={rosters}
          users={users}
          teams={elimResult.teams}
          projections={projections}
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
