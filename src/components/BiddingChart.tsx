import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { LeagueData } from '../useLeagueLoader';

export default function BiddingChart({ data }: { data: LeagueData }) {
  const { bids, weekData } = data;

  // Aggregate bids by position by week
  const positionsByWeek: { week: number; QB: number; RB: number; WR: number; TE: number; K: number; DEF: number }[] = [];
  const weekNums = [...new Set(bids.map(b => b.week))].sort((a, b) => a - b);

  for (const week of weekNums) {
    const weekBids = bids.filter(b => b.week === week);
    const byPos: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
    for (const b of weekBids) {
      const pos = b.position in byPos ? b.position : 'DEF';
      byPos[pos] += b.amount;
    }
    positionsByWeek.push({ week, ...byPos } as any);
  }

  // Max/Avg bid per week for deflation chart
  const deflationData = weekNums.map(week => {
    const weekBids = bids.filter(b => b.week === week);
    const max = Math.max(...weekBids.map(b => b.amount), 0);
    const avg = weekBids.length > 0 ? weekBids.reduce((s, b) => s + b.amount, 0) / weekBids.length : 0;
    return { week: `Wk${week}`, max, avg: Math.round(avg), count: weekBids.length };
  });

  return (
    <div className="space-y-6">
      {/* Deflation Chart */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-4 text-slate-300">FAAB Bidding Deflation — Max vs Avg Bid</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={deflationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="max" fill="rgba(99,102,241,0.3)" stroke="#6366f1" name="Max Bid" />
            <Bar dataKey="avg" fill="#6366f1" name="Avg Bid" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending by Position */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-4 text-slate-300">Total FAAB Spending by Position per Week</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={positionsByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickFormatter={v => `Wk${v}`} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: any, name: any) => [`$${value}`, name]}
            />
            <Legend />
            <Bar dataKey="QB" stackId="a" fill="#ef4444" />
            <Bar dataKey="RB" stackId="a" fill="#6366f1" />
            <Bar dataKey="WR" stackId="a" fill="#22c55e" />
            <Bar dataKey="TE" stackId="a" fill="#eab308" />
            <Bar dataKey="K" stackId="a" fill="#a855f7" />
            <Bar dataKey="DEF" stackId="a" fill="#64748b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score Trend */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-4 text-slate-300">Weekly Score Ranges (Top / Avg / Cutoff)</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weekData.map(wd => ({
            week: `Wk${wd.week}`,
            top: Math.round(wd.topScore),
            avg: Math.round(wd.avgScore),
            cutoff: Math.round(wd.cutoffScore),
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Legend />
            <Line type="monotone" dataKey="top" stroke="#22c55e" strokeWidth={2} name="Top Score" dot={false} />
            <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} name="Average" dot={false} />
            <Line type="monotone" dataKey="cutoff" stroke="#ef4444" strokeWidth={2} name="Cutoff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
