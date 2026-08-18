import type { LeagueData } from '../useLeagueLoader';
import { getTopBidByWeek } from '../logic';

export default function BiddingHistory({ data }: { data: LeagueData }) {
  const { bids, teams } = data;

  // All bids sorted by week, then amount descending
  const sortedBids = [...bids].sort((a, b) => a.week - b.week || b.amount - a.amount);

  // Top bid per week
  const topBids = getTopBidByWeek(bids);

  return (
    <div>
      {/* Top Bid Summary */}
      <h3 className="text-sm font-semibold mb-3 text-slate-300">Top Bid Per Week</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800">
              <th className="px-3 py-2 text-left text-slate-400">Week</th>
              <th className="px-3 py-2 text-left text-slate-400">Player</th>
              <th className="px-3 py-2 text-slate-400">Pos</th>
              <th className="px-3 py-2 text-right text-slate-400">Amount</th>
            </tr>
          </thead>
          <tbody>
            {topBids.map(bid => (
              <tr key={bid.week} className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="px-3 py-1.5">Wk{bid.week}</td>
                <td className="px-3 py-1.5 text-left font-medium">{bid.playerName}</td>
                <td className="px-3 py-1.5 text-center">
                  <PosBadge pos={bid.position} />
                </td>
                <td className={`px-3 py-1.5 text-right font-bold ${bid.amount >= 100 ? 'text-green-400' : bid.amount >= 25 ? 'text-yellow-400' : 'text-slate-400'}`}>
                  ${bid.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full Bidding History */}
      <h3 className="text-sm font-semibold mb-3 text-slate-300">All Successful Bids ({bids.length} total)</h3>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800">
              <th className="px-2 py-2 text-slate-400">Wk</th>
              <th className="px-2 py-2 text-left text-slate-400">Team</th>
              <th className="px-2 py-2 text-left text-slate-400">Player</th>
              <th className="px-2 py-2 text-slate-400">Pos</th>
              <th className="px-2 py-2 text-right text-slate-400">Bid</th>
            </tr>
          </thead>
          <tbody>
            {sortedBids.map((bid, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-2 py-1 text-center">{bid.week}</td>
                <td className="px-2 py-1 text-left whitespace-nowrap">{teams.get(bid.rosterId)?.displayName || `#${bid.rosterId}`}</td>
                <td className="px-2 py-1 text-left">{bid.playerName}</td>
                <td className="px-2 py-1 text-center"><PosBadge pos={bid.position} /></td>
                <td className={`px-2 py-1 text-right font-semibold ${bid.amount >= 100 ? 'text-green-400' : bid.amount >= 25 ? 'text-yellow-400' : 'text-slate-400'}`}>
                  ${bid.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PosBadge({ pos }: { pos: string }) {
  const colors: Record<string, string> = {
    QB: 'bg-red-900/50 text-red-300',
    RB: 'bg-blue-900/50 text-blue-300',
    WR: 'bg-green-900/50 text-green-300',
    TE: 'bg-yellow-900/50 text-yellow-300',
    K: 'bg-purple-900/50 text-purple-300',
    DEF: 'bg-slate-700 text-slate-300',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors[pos] || 'bg-slate-700 text-slate-300'}`}>
      {pos}
    </span>
  );
}
