// Completed winning waiver acquisitions by week, using the canonical extractBids() output.
import { useId, useMemo } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { BidInfo, TeamInfo } from '../logic/elimination';
import { buildBidChartData, type BidChartPoint } from './bidChartData';
import { Card } from './ui';

const POSITION_COLORS: Record<string, string> = {
  QB: '#f43f5e',
  RB: '#6366f1',
  WR: '#10b981',
  TE: '#f59e0b',
  K: '#64748b',
  DEF: '#64748b',
};

interface BidsChartProps {
  bids: BidInfo[];
  weeks: number[];
  teams: Map<number, TeamInfo>;
  positions?: readonly string[];
}

export function BidsChart({ bids, weeks, teams, positions }: BidsChartProps) {
  const summaryId = useId();
  const { points, summary } = useMemo(
    () => buildBidChartData(bids, weeks, teams, positions),
    [bids, weeks, teams, positions],
  );

  const maxAmount = points.reduce((max, point) => Math.max(max, point.amount), 0);
  const yPadding = Math.max(1, Math.ceil(maxAmount * 0.06));
  const firstWeek = weeks[0] ?? 1;
  const lastWeek = weeks[weeks.length - 1] ?? firstWeek;
  const positionLabel = positions?.length ? positions.join('/') : 'all positions';
  const accessibleSummary = summary
    .map(({ week, count }) => `Week ${week}: ${count} observed ${count === 1 ? 'win' : 'wins'}`)
    .join('; ');

  return (
    <section data-testid="bids-by-week-chart" aria-labelledby={`${summaryId}-title`} className="mb-4">
      <Card hover={false} className="p-4">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2
            id={`${summaryId}-title`}
            className="font-['Orbitron'] text-xs font-bold uppercase tracking-wider text-[#a5b4fc]"
          >
            Bids by Week
          </h2>
          <span className="font-['Space_Mono'] text-[10px] text-[#4a4d77] shrink-0">
            {points.length} observed
          </span>
        </div>

        {points.length === 0 ? (
          <div className="min-h-36 flex items-center justify-center text-center px-4">
            <p className="text-[#4a4d77] text-xs">
              No completed winning waiver bids found for {positionLabel}.
            </p>
          </div>
        ) : (
          <div
            role="img"
            aria-label={`Completed winning waiver bid amounts by week for ${positionLabel}. ${accessibleSummary}.`}
            aria-describedby={summaryId}
          >
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1e3a" />
                <XAxis
                  type="number"
                  dataKey="plotWeek"
                  name="Week"
                  domain={[firstWeek - 0.5, lastWeek + 0.5]}
                  ticks={weeks}
                  tickFormatter={(value) => `W${value}`}
                  tick={{ fill: '#6b6e99', fontFamily: 'Space Mono', fontSize: 9 }}
                  axisLine={{ stroke: '#1a1e3a' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="number"
                  dataKey="amount"
                  name="Winning bid"
                  domain={[-yPadding, maxAmount + yPadding]}
                  tickFormatter={(value) => value < 0 ? '' : `$${value}`}
                  tick={{ fill: '#6b6e99', fontFamily: 'Space Mono', fontSize: 9 }}
                  axisLine={{ stroke: '#1a1e3a' }}
                  tickLine={false}
                  width={46}
                />
                <ZAxis range={[48, 48]} />
                <ReferenceLine y={0} stroke="#f59e0b" strokeOpacity={0.35} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#2a2e55' }}
                  // Recharts' custom tooltip payload is intentionally wider than its public generic.
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  content={({ payload }: any) => {
                    if (!payload?.length) return null;
                    const point = payload[0].payload as BidChartPoint;
                    return <BidTooltip point={point} />;
                  }}
                />
                <Scatter name="Completed winning bids" data={points} shape={<BidDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        <div
          id={summaryId}
          aria-label="Observed winning bid counts by week"
          className="flex gap-2 overflow-x-auto scrollbar-hide pt-2 border-t border-[#1a1e3a]"
        >
          {summary.map(({ week, count }) => (
            <span
              key={week}
              className={`shrink-0 font-['Space_Mono'] text-[9px] ${count > 0 ? 'text-[#a5b4fc]' : 'text-[#4a4d77]'}`}
            >
              W{week} <strong className="font-bold">{count}</strong>
            </span>
          ))}
        </div>
        {points.length > 0 && (
          <p className="mt-2 text-[9px] text-[#4a4d77]">
            Each dot is one completed winning acquisition. Outlined dots are genuine $0 wins.
          </p>
        )}
      </Card>
    </section>
  );
}

interface BidDotProps {
  cx?: number;
  cy?: number;
  payload?: BidChartPoint;
}

function BidDot({ cx = 0, cy = 0, payload }: BidDotProps) {
  if (!payload) return <g />;
  const isZero = payload.amount === 0;
  const color = POSITION_COLORS[payload.position] ?? '#a5b4fc';
  const label = `${payload.playerName}, ${payload.position}, ${payload.teamName}, Week ${payload.week}, winning bid $${payload.amount}`;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isZero ? 5 : 4}
      fill={isZero ? '#0e1025' : color}
      fillOpacity={isZero ? 1 : 0.82}
      stroke={isZero ? '#f59e0b' : color}
      strokeWidth={isZero ? 2 : 1}
      role="img"
      aria-label={label}
      tabIndex={0}
    >
      <title>{label}</title>
    </circle>
  );
}

function BidTooltip({ point }: { point: BidChartPoint }) {
  return (
    <div className="max-w-56 rounded-lg border border-[#2a2e55] bg-[#0e1025] p-2 font-['Space_Mono'] text-[11px] shadow-xl">
      <div className="break-words text-[#f0f0ff]">{point.playerName}</div>
      <div className="break-words text-[#6b6e99]">{point.position} · {point.teamName}</div>
      <div className="mt-1 text-[#f59e0b]">Week {point.week} · ${point.amount} winning bid</div>
    </div>
  );
}
