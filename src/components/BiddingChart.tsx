import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { LeagueData } from '../useLeagueLoader';

const NEON_COLORS = {
  QB: '#f43f5e',
  RB: '#6366f1',
  WR: '#10b981',
  TE: '#f59e0b',
  K: '#a855f7',
  DEF: '#64748b',
};

const tooltipStyle = {
  background: '#0e1025',
  border: '1px solid #2a2e55',
  borderRadius: 12,
  fontFamily: "'Exo 2', sans-serif",
  fontSize: 12,
};

export default function BiddingChart({ data }: { data: LeagueData }) {
  const { bids, weekData } = data;

  const weekNums = [...new Set(bids.map(b => b.week))].sort((a, b) => a - b);

  const positionsByWeek = weekNums.map(week => {
    const weekBids = bids.filter(b => b.week === week);
    const byPos: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
    for (const b of weekBids) {
      const pos = b.position in byPos ? b.position : 'DEF';
      byPos[pos] += b.amount;
    }
    return { week, ...byPos };
  });

  const deflationData = weekNums.map(week => {
    const weekBids = bids.filter(b => b.week === week);
    const max = Math.max(...weekBids.map(b => b.amount), 0);
    const avg = weekBids.length > 0 ? weekBids.reduce((s, b) => s + b.amount, 0) / weekBids.length : 0;
    return { week: `Wk${week}`, max, avg: Math.round(avg), count: weekBids.length };
  });

  return (
    <div className="space-y-6">
      {/* Deflation Chart */}
      <div className="neon-card p-5 fade-up">
        <h4 className="text-xs font-bold tracking-wider mb-4 text-[#f0f0ff]">FAAB Bidding Deflation</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={deflationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e55" />
            <XAxis dataKey="week" stroke="#6b6e99" fontSize={11} fontFamily="'Space Mono', monospace" />
            <YAxis stroke="#6b6e99" fontSize={11} fontFamily="'Space Mono', monospace" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f0f0ff' }} />
            <Legend wrapperStyle={{ fontFamily: "'Exo 2', sans-serif", fontSize: 11 }} />
            <Bar dataKey="max" fill="rgba(99,102,241,0.3)" stroke="#6366f1" name="Max Bid" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avg" fill="#6366f1" name="Avg Bid" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spending by Position */}
      <div className="neon-card p-5 fade-up" style={{ animationDelay: '100ms' }}>
        <h4 className="text-xs font-bold tracking-wider mb-4 text-[#f0f0ff]">FAAB Spending by Position</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={positionsByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e55" />
            <XAxis dataKey="week" stroke="#6b6e99" fontSize={11} fontFamily="'Space Mono', monospace" tickFormatter={v => `Wk${v}`} />
            <YAxis stroke="#6b6e99" fontSize={11} fontFamily="'Space Mono', monospace" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f0f0ff' }} formatter={(value: any, name: any) => [`$${value}`, name]} />
            <Legend wrapperStyle={{ fontFamily: "'Exo 2', sans-serif", fontSize: 11 }} />
            <Bar dataKey="QB" stackId="a" fill={NEON_COLORS.QB} />
            <Bar dataKey="RB" stackId="a" fill={NEON_COLORS.RB} />
            <Bar dataKey="WR" stackId="a" fill={NEON_COLORS.WR} />
            <Bar dataKey="TE" stackId="a" fill={NEON_COLORS.TE} />
            <Bar dataKey="K" stackId="a" fill={NEON_COLORS.K} />
            <Bar dataKey="DEF" stackId="a" fill={NEON_COLORS.DEF} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Score Trend */}
      <div className="neon-card p-5 fade-up" style={{ animationDelay: '200ms' }}>
        <h4 className="text-xs font-bold tracking-wider mb-4 text-[#f0f0ff]">Weekly Score Ranges</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weekData.map(wd => ({
            week: `Wk${wd.week}`,
            top: Math.round(wd.topScore),
            avg: Math.round(wd.avgScore),
            cutoff: Math.round(wd.cutoffScore),
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e55" />
            <XAxis dataKey="week" stroke="#6b6e99" fontSize={11} fontFamily="'Space Mono', monospace" />
            <YAxis stroke="#6b6e99" fontSize={11} fontFamily="'Space Mono', monospace" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#f0f0ff' }} />
            <Legend wrapperStyle={{ fontFamily: "'Exo 2', sans-serif", fontSize: 11 }} />
            <Line type="monotone" dataKey="top" stroke="#10b981" strokeWidth={2} name="Top Score" dot={false} />
            <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} name="Average" dot={false} />
            <Line type="monotone" dataKey="cutoff" stroke="#f43f5e" strokeWidth={2} name="Cutoff" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
