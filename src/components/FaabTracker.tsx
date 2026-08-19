// FAAB Budget Remaining tracker — shows all teams sorted by remaining budget

import { useMemo } from 'react';
import { DollarSign, TrendingDown } from 'lucide-react';
import { Card, StatusBadge } from './ui';
import type { Roster, SleeperUser } from '../api/types';
import type { TeamInfo } from '../logic/elimination';

interface FaabTrackerProps {
  rosters: Roster[];
  users: SleeperUser[];
  teams: Map<number, TeamInfo>;
  totalBudget: number;
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

export function FaabTracker({ rosters, users, teams, totalBudget }: FaabTrackerProps) {
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
    </div>
  );
}
