// Bid Grid — league-wide waiver bid grid organized by week × position

import { useMemo } from 'react';
import type { BidInfo, TeamInfo } from '../logic/elimination';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const;

const POS_HEADER_COLORS: Record<string, string> = {
  QB: '#f43f5e',
  RB: '#6366f1',
  WR: '#10b981',
  TE: '#f59e0b',
  K: '#6b6e99',
  DEF: '#4a4d77',
};

interface BidGridProps {
  bids: BidInfo[];
  weeks: number[];
  teams: Map<number, TeamInfo>;
  totalBudget: number;
  selectedWeek: number | null;
}

export function BidGrid({ bids, weeks, teams, totalBudget, selectedWeek }: BidGridProps) {
  const bigBidThreshold = totalBudget * 0.2;

  // Group bids by `${week}-${position}`
  const grouped = useMemo(() => {
    const map = new Map<string, BidInfo[]>();
    for (const bid of bids) {
      const key = `${bid.week}-${bid.position}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bid);
    }
    // Sort each group by amount descending
    for (const arr of map.values()) {
      arr.sort((a, b) => b.amount - a.amount);
    }
    return map;
  }, [bids]);

  const displayWeeks = selectedWeek ? weeks.filter((w) => w === selectedWeek) : weeks;
  const isExpanded = selectedWeek !== null;

  if (bids.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#4a4d77] text-xs">No waiver bids found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
      <table className="w-full min-w-[600px] border-collapse" style={{ background: '#0e1025' }}>
        {/* Header */}
        <thead>
          <tr style={{ background: '#0a0d1a' }}>
            <th className="sticky left-0 z-10 px-3 py-2.5 text-left text-[10px] font-['Space_Mono'] uppercase tracking-wider text-[#4a4d77]"
              style={{ background: '#0a0d1a', minWidth: 52 }}>
              Wk
            </th>
            {POSITIONS.map((pos) => (
              <th key={pos} className="px-2 py-2.5 text-center text-[10px] font-bold font-['Exo_2'] uppercase tracking-wide"
                style={{ color: POS_HEADER_COLORS[pos], minWidth: isExpanded ? 140 : 90 }}>
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full"
                  style={{ background: `${POS_HEADER_COLORS[pos]}20` }}>
                  {pos}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {displayWeeks.map((week) => (
            <tr key={week} style={{ borderBottom: '1px solid #1a1e3a' }}>
              {/* Sticky week column */}
              <td className="sticky left-0 z-10 px-3 py-2 font-['Space_Mono'] text-xs font-bold text-[#6b6e99] align-top"
                style={{ background: '#0e1025' }}>
                {week}
              </td>

              {/* Position cells */}
              {POSITIONS.map((pos) => {
                const key = `${week}-${pos}`;
                const cellBids = grouped.get(key);

                if (!cellBids || cellBids.length === 0) {
                  return (
                    <td key={pos} className="px-2 py-2 text-center align-top">
                      <span className="text-[#2a2e55] text-xs">—</span>
                    </td>
                  );
                }

                return (
                  <td key={pos} className="px-2 py-2 align-top">
                    <div className={`space-y-1 ${isExpanded ? '' : ''}`}>
                      {cellBids.map((bid, i) => {
                        const isBig = bid.amount >= bigBidThreshold;
                        const team = teams.get(bid.rosterId);
                        const displayName = truncate(bid.playerName, isExpanded ? 18 : 12);

                        return (
                          <div
                            key={`${bid.playerId}-${bid.rosterId}-${i}`}
                            className={`rounded px-1.5 py-1 ${isBig ? 'border-l-2' : ''}`}
                            style={{
                              borderLeftColor: isBig ? '#6366f1' : 'transparent',
                              background: isBig ? 'rgba(99,102,241,0.1)' : 'transparent',
                            }}
                          >
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[11px] text-[#f0f0ff] font-['Exo_2'] truncate" title={bid.playerName}>
                                {displayName}
                              </span>
                              <span className="font-['Space_Mono'] text-[11px] text-[#f59e0b] tabular-nums shrink-0">
                                ${bid.amount}
                              </span>
                            </div>
                            <div className="text-[9px] text-[#4a4d77] font-['Exo_2'] truncate">
                              {team?.displayName ?? `Team ${bid.rosterId}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
