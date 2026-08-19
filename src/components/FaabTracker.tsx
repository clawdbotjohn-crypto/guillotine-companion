// FAAB Budget Remaining tracker — shows all teams sorted by remaining budget

import { useMemo } from 'react';
import { DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, StatusBadge } from './ui';
import type { Roster, SleeperUser } from '../api/types';
import type { TeamInfo, BidInfo } from '../logic/elimination';

interface FaabTrackerProps {
  rosters: Roster[];
  users: SleeperUser[];
  teams: Map<number, TeamInfo>;
  totalBudget: number;
  bids: BidInfo[];
}

interface TeamFaab {
  rosterId: number;
  displayName: string;
  remaining: number;
  used: number;
  pctSpent: number;
  team: TeamInfo | undefined;
}

function getTeamStatus(team: TeamInfo | undefined): 'champion' | 'runner-up' | 'eliminated' | 'safe' | 'middle' | 'at-risk' {
  if (!team) return 'safe';
  if (team.isChampion) return 'champion';
  if (team.isRunnerUp) return 'runner-up';
  if (team.eliminatedWeek !== null) return 'eliminated';
  return 'safe';
}

export function FaabTracker({ rosters, users, teams, totalBudget, bids }: FaabTrackerProps) {
  const { sorted, leagueTotal, avgRemaining, medianRemaining } = useMemo(() => {
    const userMap = new Map(users.map((u) => [u.user_id, u]));

    const entries: TeamFaab[] = rosters.map((r) => {
      const used = r.settings.waiver_budget_used ?? 0;
      const remaining = totalBudget - used;
      const team = teams.get(r.roster_id);
      const user = userMap.get(r.owner_id);
      const displayName = team?.displayName ?? user?.display_name ?? `Team ${r.roster_id}`;
      return {
        rosterId: r.roster_id,
        displayName,
        remaining,
        used,
        pctSpent: totalBudget > 0 ? (used / totalBudget) * 100 : 0,
        team,
      };
    });

    // Sort by remaining budget descending
    const sorted = entries.sort((a, b) => b.remaining - a.remaining);

    const leagueTotal = totalBudget * rosters.length;
    const remainingValues = sorted.map((e) => e.remaining);
    const avgRemaining = remainingValues.length > 0
      ? remainingValues.reduce((sum, v) => sum + v, 0) / remainingValues.length
      : 0;

    // Median
    const sortedVals = [...remainingValues].sort((a, b) => a - b);
    const mid = Math.floor(sortedVals.length / 2);
    const medianRemaining = sortedVals.length === 0
      ? 0
      : sortedVals.length % 2 === 0
        ? (sortedVals[mid - 1] + sortedVals[mid]) / 2
        : sortedVals[mid];

    return { sorted, leagueTotal, avgRemaining, medianRemaining };
  }, [rosters, users, teams, totalBudget]);

  const deflationData = useMemo(() => {
    if (!bids || bids.length === 0) return [];
    const byWeek = new Map<number, number[]>();
    for (const bid of bids) {
      const arr = byWeek.get(bid.week) ?? [];
      arr.push(bid.amount);
      byWeek.set(bid.week, arr);
    }
    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, amounts]) => ({
        week: `Wk ${week}`,
        maxBid: Math.max(...amounts),
        avgBid: Math.round(amounts.reduce((s, v) => s + v, 0) / amounts.length),
      }));
  }, [bids]);

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#161a3a] rounded-lg p-3 text-center">
          <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">League Total</div>
          <div className="font-['Space_Mono'] text-sm text-[#a5b4fc] font-bold tabular-nums">
            ${leagueTotal}
          </div>
        </div>
        <div className="bg-[#161a3a] rounded-lg p-3 text-center">
          <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Avg Left</div>
          <div className="font-['Space_Mono'] text-sm text-[#f59e0b] font-bold tabular-nums">
            ${avgRemaining.toFixed(0)}
          </div>
        </div>
        <div className="bg-[#161a3a] rounded-lg p-3 text-center">
          <div className="text-[9px] text-[#4a4d77] uppercase tracking-wider">Median</div>
          <div className="font-['Space_Mono'] text-sm text-[#f59e0b] font-bold tabular-nums">
            ${medianRemaining.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={16} className="text-[#a5b4fc]" />
        <h2 className="font-['Orbitron'] text-xs font-bold uppercase tracking-wider text-[#a5b4fc]">
          FAAB Budget Remaining
        </h2>
      </div>

      {/* Team list */}
      <Card hover={false} className="p-4">
        <div className="space-y-3">
          {sorted.map((entry, i) => {
            const status = getTeamStatus(entry.team);
            const isEliminated = status === 'eliminated';

            return (
              <div
                key={entry.rosterId}
                className={`${isEliminated ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-['Space_Mono'] text-[10px] text-[#4a4d77] w-5 text-right tabular-nums">
                      {i + 1}
                    </span>
                    <span className={`text-sm ${isEliminated ? 'text-[#4a4d77]' : 'text-[#f0f0ff]'}`}>
                      {entry.displayName}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <span className="font-['Space_Mono'] text-sm text-[#f59e0b] font-bold tabular-nums">
                    ${entry.remaining}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2 ml-7">
                  <div className="flex-1 h-2 rounded-full bg-[#1a1e3a] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-all duration-300"
                      style={{ width: `${Math.min(entry.pctSpent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    {entry.pctSpent > 70 && <TrendingDown size={10} className="text-[#f43f5e]" />}
                    <span className="font-['Space_Mono'] text-[10px] text-[#4a4d77] tabular-nums w-8 text-right">
                      {entry.pctSpent.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* FAAB Deflation Chart */}
      {deflationData.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-[#a5b4fc]" />
            <h2 className="font-['Orbitron'] text-xs font-bold uppercase tracking-wider text-[#a5b4fc]">
              FAAB Deflation
            </h2>
          </div>
          <Card hover={false} className="p-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deflationData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1e3a" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: '#6b6e99', fontFamily: 'Space Mono', fontSize: 10 }}
                  axisLine={{ stroke: '#1a1e3a' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b6e99', fontFamily: 'Space Mono', fontSize: 10 }}
                  axisLine={{ stroke: '#1a1e3a' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1025',
                    border: '1px solid #2a2e55',
                    borderRadius: 8,
                    color: '#fff',
                    fontFamily: 'Space Mono',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    `$${value}`,
                    name === 'maxBid' ? 'Max Bid' : 'Avg Bid',
                  ]}
                  labelStyle={{ color: '#a5b4fc', fontFamily: 'Orbitron', fontSize: 11 }}
                />
                <Bar dataKey="maxBid" fill="#6366f1" radius={[4, 4, 0, 0]} name="maxBid" />
                <Bar dataKey="avgBid" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="avgBid" />
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]" />
                <span className="font-['Space_Mono'] text-[10px] text-[#6b6e99]">Max Bid</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#8b5cf6]" />
                <span className="font-['Space_Mono'] text-[10px] text-[#6b6e99]">Avg Bid</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
