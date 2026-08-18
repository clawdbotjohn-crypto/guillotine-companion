import { useState } from 'react';
import type { LeagueData } from '../useLeagueLoader';
import PosBadge from './PosBadge';

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

export default function BiddingByPosition({ data }: { data: LeagueData }) {
  const { bids, teams } = data;
  const [selectedPos, setSelectedPos] = useState<string>('ALL');

  // Group bids by week and position
  const weeks = [...new Set(bids.map(b => b.week))].sort((a, b) => a - b);

  // Summary by position
  const posSummary = POSITIONS.map(pos => {
    const posBids = bids.filter(b => b.position === pos);
    const total = posBids.reduce((s, b) => s + b.amount, 0);
    const count = posBids.length;
    const maxBid = count > 0 ? Math.max(...posBids.map(b => b.amount)) : 0;
    const avgBid = count > 0 ? Math.round(total / count) : 0;
    return { pos, total, count, maxBid, avgBid };
  });

  // Top bids per week per position
  const weeklyTopBids = weeks.map(week => {
    const weekBids = bids.filter(b => b.week === week);
    const byPos: Record<string, { playerName: string; amount: number; teamName: string }[]> = {};
    for (const pos of POSITIONS) {
      const posBids = weekBids.filter(b => b.position === pos).sort((a, b) => b.amount - a.amount);
      byPos[pos] = posBids.slice(0, 3).map(b => ({
        playerName: b.playerName,
        amount: b.amount,
        teamName: teams.get(b.rosterId)?.displayName || `#${b.rosterId}`,
      }));
    }
    return { week, byPos };
  });

  const filteredBids = selectedPos === 'ALL'
    ? [...bids].sort((a, b) => b.amount - a.amount)
    : bids.filter(b => b.position === selectedPos).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      {/* Position Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {posSummary.map(ps => (
          <div key={ps.pos} className="neon-card p-4 text-center fade-up cursor-pointer" onClick={() => setSelectedPos(ps.pos === selectedPos ? 'ALL' : ps.pos)} style={selectedPos === ps.pos ? { borderColor: '#6366f1', boxShadow: '0 4px 20px rgba(99,102,241,0.15)' } : {}}>
            <PosBadge pos={ps.pos} />
            <div className="mt-2 mono text-lg font-bold text-[#f59e0b]">${ps.total}</div>
            <div className="text-[10px] text-[#6b6e99] mt-1" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              {ps.count} bids · avg ${ps.avgBid}
            </div>
            <div className="text-[10px] text-[#6b6e99]" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              max ${ps.maxBid}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Position Breakdown */}
      <div className="neon-card overflow-hidden fade-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">
          Top Bids by Position per Week
          {selectedPos !== 'ALL' && (
            <button onClick={() => setSelectedPos('ALL')} className="ml-3 text-[10px] text-[#6366f1] hover:text-[#8b5cf6]" style={{ fontFamily: "'Exo 2', sans-serif", textTransform: 'none', fontWeight: 400 }}>
              Show all positions
            </button>
          )}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="label px-4 py-2 text-left border-b border-[#2a2e55]">Week</th>
                {(selectedPos === 'ALL' ? POSITIONS : [selectedPos]).map(pos => (
                  <th key={pos} className="label px-4 py-2 text-left border-b border-[#2a2e55]">
                    <PosBadge pos={pos} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyTopBids.map(({ week, byPos }) => (
                <tr key={week} className="hover:bg-[rgba(99,102,241,0.05)] transition-colors border-b border-[rgba(42,46,85,0.4)]">
                  <td className="px-4 py-2.5 mono font-medium">Wk{week}</td>
                  {(selectedPos === 'ALL' ? POSITIONS : [selectedPos]).map(pos => (
                    <td key={pos} className="px-4 py-2.5 text-left align-top">
                      {byPos[pos]?.length ? (
                        <div className="space-y-1">
                          {byPos[pos].map((b, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="mono text-[#f59e0b] font-semibold text-[11px]">${b.amount}</span>
                              <span className="text-[#f0f0ff] text-[11px]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{b.playerName}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#2a2e55]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtered bid list */}
      <div className="neon-card overflow-hidden fade-up" style={{ animationDelay: '200ms' }}>
        <h3 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">
          {selectedPos === 'ALL' ? 'All Bids by Amount' : `${selectedPos} Bids`}
          <span className="ml-2 text-[#6b6e99] font-normal mono">({filteredBids.length})</span>
        </h3>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: '#0e1025' }}>
              <tr>
                <th className="label px-3 py-2 text-center border-b border-[#2a2e55]">Wk</th>
                <th className="label px-3 py-2 text-left border-b border-[#2a2e55]">Player</th>
                <th className="label px-3 py-2 text-center border-b border-[#2a2e55]">Pos</th>
                <th className="label px-3 py-2 text-left border-b border-[#2a2e55]">Team</th>
                <th className="label px-3 py-2 text-right border-b border-[#2a2e55]">Bid</th>
              </tr>
            </thead>
            <tbody>
              {filteredBids.slice(0, 100).map((bid, i) => (
                <tr key={i} className="hover:bg-[rgba(99,102,241,0.05)] transition-colors border-b border-[rgba(42,46,85,0.4)]">
                  <td className="px-3 py-2 text-center mono">{bid.week}</td>
                  <td className="px-3 py-2 text-left text-[#f0f0ff]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{bid.playerName}</td>
                  <td className="px-3 py-2 text-center"><PosBadge pos={bid.position} /></td>
                  <td className="px-3 py-2 text-left text-[#6b6e99]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{teams.get(bid.rosterId)?.displayName || `#${bid.rosterId}`}</td>
                  <td className={`px-3 py-2 text-right font-semibold mono ${bid.amount >= 100 ? 'text-[#f59e0b]' : bid.amount >= 25 ? 'text-[#f59e0b] opacity-70' : 'text-[#6b6e99]'}`}>
                    ${bid.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
