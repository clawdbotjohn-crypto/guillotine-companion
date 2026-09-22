// Waivers page — recommended bids per strategy + predicted winning bid + budget floor.
import { useMemo, useState } from 'react';
import { ShoppingCart, Info } from 'lucide-react';
import { Card, Skeleton, PositionBadge } from '../components/ui';
import { useAppStore, usePlayers } from '../store';
import { useLeague, useLeagueUsers, useRosters, useAllMatchups, useAllTransactions } from '../api';
import { computeEliminations, extractBids, buildPlayerSeasons } from '../logic';
import {
  buildLeagueContext,
  buildWaiverBoard,
  computeAvailablePlayers,
  type StrategyKey,
} from '../logic/waivers';
import { getPlayerName } from '../store/players';

const STRATEGIES: { key: StrategyKey; label: string }[] = [
  { key: 'safe', label: 'Safe' },
  { key: 'exponential', label: 'Exp. Starter' },
  { key: 'weeks-starter', label: 'Weeks-as-Starter' },
  { key: 'vorp', label: 'VoRP' },
];

const POS_FILTERS = ['ALL', 'QB', 'RB', 'WR', 'TE'];

export function WaiversPage() {
  const { leagueId } = useAppStore();
  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const { isLoading: playersLoading } = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);
  const { data: transactions } = useAllTransactions(leagueId, 18);

  const [strategy, setStrategy] = useState<StrategyKey>('safe');
  const [posFilter, setPosFilter] = useState('ALL');
  const [budgetFloor, setBudgetFloor] = useState(0);

  const isLoading = matchupsLoading || playersLoading;

  const board = useMemo(() => {
    if (!matchups || !rosters || !users || !league) return null;
    const elim = computeEliminations(matchups, rosters, users);
    const seasons = buildPlayerSeasons(matchups);
    const bids = transactions ? extractBids(transactions) : [];
    const ctx = buildLeagueContext(league, elim);
    const available = computeAvailablePlayers(rosters, seasons, elim);
    return {
      ctx,
      rows: buildWaiverBoard(available, seasons, ctx, bids, getPlayerName, {
        budgetFloor: budgetFloor || undefined,
        remaining: ctx.budget, // per-player; UI note explains this is generic FA board
      }),
    };
  }, [matchups, rosters, users, league, transactions, budgetFloor]);

  if (!leagueId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">Select a league first</p>
      </div>
    );
  }

  if (isLoading || !board) {
    return (
      <div className="px-6 py-8 pb-24 max-w-lg mx-auto">
        <Skeleton lines={4} />
      </div>
    );
  }

  const { ctx, rows } = board;
  const filtered = posFilter === 'ALL' ? rows : rows.filter((r) => r.position === posFilter);
  const stratIdx = STRATEGIES.findIndex((s) => s.key === strategy);

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-1">
        Waivers
      </h1>
      <p className="text-xs text-[#6b6e99] mb-4">
        Budget ${ctx.budget} · {ctx.teamsRemaining} teams left · ~{ctx.weeksRemaining} wks to final
      </p>

      {/* Strategy toggle */}
      <div className="flex gap-1 bg-[#0a0d1a] rounded-lg p-1 mb-3 overflow-x-auto">
        {STRATEGIES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStrategy(s.key)}
            className={`flex-1 whitespace-nowrap py-2 px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all
              ${strategy === s.key
                ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                : 'text-[#4a4d77] hover:text-[#6b6e99]'
              }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Position filter + budget floor */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex gap-1">
          {POS_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPosFilter(p)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-['Space_Mono'] transition-all
                ${posFilter === p ? 'bg-[#6366f1] text-white' : 'bg-[#161a3a] text-[#6b6e99]'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-[#6b6e99] uppercase tracking-wider">
          Floor $
          <input
            type="number"
            value={budgetFloor || ''}
            onChange={(e) => setBudgetFloor(Number(e.target.value) || 0)}
            placeholder="0"
            className="w-16 px-2 py-1 bg-[#0e1025] border border-[#2a2e55] rounded-md text-[#f0f0ff]
              text-xs font-['Space_Mono'] outline-none focus:border-[#6366f1]"
          />
        </label>
      </div>

      <div className="flex items-start gap-1.5 mb-4 text-[10px] text-[#4a4d77]">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          Values are % of your league's FAAB budget. Projections use season-to-date scoring averages.
          "Predicted" = likely winning bid from this league's historical spending at that position.
        </span>
      </div>

      {/* Board */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card hover={false} className="p-6 text-center">
            <ShoppingCart className="w-8 h-8 text-[#2a2e55] mx-auto mb-3" />
            <p className="text-[#6b6e99] text-sm">No available free agents with scoring data yet.</p>
          </Card>
        )}
        {filtered.map((row) => {
          const sug = row.suggestions[stratIdx];
          return (
            <Card key={row.playerId} hover={false} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <PositionBadge position={row.position} />
                  <div className="min-w-0">
                    <div className="text-sm text-[#f0f0ff] truncate">{row.name}</div>
                    <div className="text-[10px] text-[#4a4d77] font-['Space_Mono']">
                      {row.position}#{row.posRank} · {row.avgPoints.toFixed(1)} ppg
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="font-['Space_Mono'] text-base text-[#10b981] font-bold tabular-nums">
                    ${sug.value}
                  </div>
                  <div className="text-[9px] text-[#4a4d77] uppercase tracking-wide">
                    {sug.pctOfBudget.toFixed(0)}% · {sug.label}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1a1e3a]">
                <span className="text-[10px] text-[#6b6e99] uppercase tracking-wider">Predicted winning bid</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-['Space_Mono'] text-xs text-[#f59e0b] tabular-nums">
                    ${row.predictedWinningBid}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded-full
                      ${row.predictedConfidence === 'high' ? 'bg-[rgba(16,185,129,0.15)] text-[#10b981]'
                        : row.predictedConfidence === 'medium' ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                        : 'bg-[rgba(100,116,139,0.15)] text-[#64748b]'}`}
                  >
                    {row.predictedConfidence}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
