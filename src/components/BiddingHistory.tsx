import type { LeagueData } from '../useLeagueLoader';
import { getTopBidByWeek } from '../logic';
import PosBadge from './PosBadge';

export default function BiddingHistory({ data }: { data: LeagueData }) {
  const { bids, teams } = data;
  const sortedBids = [...bids].sort((a, b) => a.week - b.week || b.amount - a.amount);
  const topBids = getTopBidByWeek(bids);

  return (
    <div className="space-y-6">
      {/* Top Bid Summary */}
      <div className="neon-card overflow-hidden fade-up">
        <h3 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">Top Bid Per Week</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="label px-4 py-2 text-left border-b border-[#2a2e55]">Week</th>
                <th className="label px-4 py-2 text-left border-b border-[#2a2e55]">Player</th>
                <th className="label px-4 py-2 text-center border-b border-[#2a2e55]">Pos</th>
                <th className="label px-4 py-2 text-right border-b border-[#2a2e55]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {topBids.map(bid => (
                <tr key={bid.week} className="hover:bg-[rgba(99,102,241,0.05)] transition-colors border-b border-[rgba(42,46,85,0.4)]">
                  <td className="px-4 py-2.5 mono text-sm">Wk{bid.week}</td>
                  <td className="px-4 py-2.5 text-left font-medium text-[#f0f0ff]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{bid.playerName}</td>
                  <td className="px-4 py-2.5 text-center"><PosBadge pos={bid.position} /></td>
                  <td className={`px-4 py-2.5 text-right font-bold mono ${bid.amount >= 100 ? 'text-[#f59e0b]' : bid.amount >= 25 ? 'text-[#f59e0b] opacity-70' : 'text-[#6b6e99]'}`}>
                    ${bid.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Bidding History */}
      <div className="neon-card overflow-hidden fade-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-xs font-bold tracking-wider px-5 pt-4 pb-3 text-[#f0f0ff]">
          All Successful Bids
          <span className="ml-2 text-[#6b6e99] font-normal" style={{ fontFamily: "'Space Mono', monospace" }}>({bids.length})</span>
        </h3>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10" style={{ background: '#0e1025' }}>
              <tr>
                <th className="label px-3 py-2 text-center border-b border-[#2a2e55]">Wk</th>
                <th className="label px-3 py-2 text-left border-b border-[#2a2e55]">Team</th>
                <th className="label px-3 py-2 text-left border-b border-[#2a2e55]">Player</th>
                <th className="label px-3 py-2 text-center border-b border-[#2a2e55]">Pos</th>
                <th className="label px-3 py-2 text-right border-b border-[#2a2e55]">Bid</th>
              </tr>
            </thead>
            <tbody>
              {sortedBids.map((bid, i) => (
                <tr key={i} className="hover:bg-[rgba(99,102,241,0.05)] transition-colors border-b border-[rgba(42,46,85,0.4)]">
                  <td className="px-3 py-2 text-center mono">{bid.week}</td>
                  <td className="px-3 py-2 text-left whitespace-nowrap text-[#f0f0ff]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{teams.get(bid.rosterId)?.displayName || `#${bid.rosterId}`}</td>
                  <td className="px-3 py-2 text-left text-[#f0f0ff]" style={{ fontFamily: "'Exo 2', sans-serif" }}>{bid.playerName}</td>
                  <td className="px-3 py-2 text-center"><PosBadge pos={bid.position} /></td>
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
