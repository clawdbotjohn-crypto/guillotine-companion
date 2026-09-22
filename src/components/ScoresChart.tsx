// Scores-by-week scatter chart — every team's weekly score, user's team highlighted.
import { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from './ui';
import type { EliminationResult } from '../logic/elimination';

interface ScoresChartProps {
  elim: EliminationResult;
  selectedRosterId: number | null;
}

interface Dot {
  week: number;
  points: number;
  rosterId: number;
  name: string;
  isMine: boolean;
  eliminated: boolean;
}

export function ScoresChart({ elim, selectedRosterId }: ScoresChartProps) {
  const { others, mine, cutoffLine } = useMemo(() => {
    const others: Dot[] = [];
    const mine: Dot[] = [];
    const cutoffLine: { week: number; points: number; name: string; rosterId: number; isMine: boolean; eliminated: boolean }[] = [];
    for (const w of elim.weeks) {
      for (const s of w.scores) {
        const info = elim.teams.get(s.rosterId);
        const dot: Dot = {
          week: w.week,
          points: Number(s.points.toFixed(1)),
          rosterId: s.rosterId,
          name: info?.displayName ?? `Team ${s.rosterId}`,
          isMine: s.rosterId === selectedRosterId,
          eliminated: w.eliminated.includes(s.rosterId),
        };
        if (dot.isMine) mine.push(dot);
        else others.push(dot);
      }
      cutoffLine.push({ week: w.week, points: Number(w.cutoffScore.toFixed(1)), name: 'Cutoff', rosterId: -1, isMine: false, eliminated: false });
    }
    return { others, mine, cutoffLine };
  }, [elim, selectedRosterId]);

  if (elim.weeks.length === 0) return null;

  return (
    <Card hover={false} className="p-4 mb-4">
      <h2 className="font-['Orbitron'] text-xs font-bold uppercase tracking-wider text-[#a5b4fc] mb-3">
        Scores by Week
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1e3a" />
          <XAxis
            type="number" dataKey="week" name="Week"
            domain={[0.5, elim.weeks.length + 0.5]}
            ticks={elim.weeks.map((w) => w.week)}
            tick={{ fill: '#6b6e99', fontFamily: 'Space Mono', fontSize: 10 }}
            axisLine={{ stroke: '#1a1e3a' }} tickLine={false}
          />
          <YAxis
            type="number" dataKey="points" name="Points"
            tick={{ fill: '#6b6e99', fontFamily: 'Space Mono', fontSize: 10 }}
            axisLine={{ stroke: '#1a1e3a' }} tickLine={false}
          />
          <ZAxis range={[40, 120]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: '#2a2e55' }}
            contentStyle={{
              backgroundColor: '#0e1025', border: '1px solid #2a2e55', borderRadius: 8,
              color: '#fff', fontFamily: 'Space Mono', fontSize: 12,
            }}
            formatter={(value, name) => [value, name]}
            labelStyle={{ display: 'none' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={({ payload }: any) => {
              if (!payload || !payload.length) return null;
              const d = payload[0].payload as Dot;
              return (
                <div style={{ background: '#0e1025', border: '1px solid #2a2e55', borderRadius: 8, padding: 8, fontFamily: 'Space Mono', fontSize: 11 }}>
                  <div style={{ color: d.isMine ? '#10b981' : '#a5b4fc' }}>{d.name}</div>
                  <div style={{ color: '#6b6e99' }}>Wk {d.week} · {d.points} pts</div>
                </div>
              );
            }}
          />
          {/* Others (dim) */}
          <Scatter name="League" data={others} fill="#3a3f6b">
            {others.map((d, i) => (
              <Cell key={i} fill={d.eliminated ? '#f43f5e' : '#3a3f6b'} fillOpacity={d.eliminated ? 0.55 : 0.5} />
            ))}
          </Scatter>
          {/* Cutoff markers */}
          <Scatter name="Cutoff" data={cutoffLine} fill="#f59e0b" shape="cross" fillOpacity={0.7} />
          {/* Mine (bright, large) */}
          <Scatter name="My Team" data={mine} fill="#10b981">
            {mine.map((_, i) => (
              <Cell key={i} fill="#10b981" stroke="#0f0" strokeWidth={0} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        <Legend color="#10b981" label="Your team" />
        <Legend color="#3a3f6b" label="League" />
        <Legend color="#f59e0b" label="Cutoff" />
        <Legend color="#f43f5e" label="Eliminated" />
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="font-['Space_Mono'] text-[10px] text-[#6b6e99]">{label}</span>
    </div>
  );
}
