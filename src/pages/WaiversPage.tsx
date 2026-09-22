// Waivers page — recommended bids per strategy + predicted winning bid + budget floor.
import { useMemo, useState } from 'react';
import { AlertTriangle, ShoppingCart, Info, RefreshCw } from 'lucide-react';
import { Button, Card, Skeleton, PositionBadge } from '../components/ui';
import { FaabOverBudgetWarning } from '../components/FaabOverBudgetWarning';
import { useAppStore, usePlayers } from '../store';
import {
  useLeague,
  useLeagueUsers,
  useRosters,
  useAllMatchups,
  useAllTransactions,
  useNflState,
  useRestOfSeasonProjectionWeeks,
} from '../api';
import {
  computeEliminations,
  extractBids,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  sumRestOfSeasonProjections,
} from '../logic';
import {
  buildLeagueContext,
  buildWaiverBoard,
  calculateRemainingFaab,
  computeAvailablePlayers,
  sortWaiverRowsByStrategy,
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

function ProjectionErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-6 py-8 pb-24 max-w-lg mx-auto">
      <Card hover={false} className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-[#f59e0b] mx-auto mb-3" />
        <h2 className="text-sm font-semibold text-[#f0f0ff] mb-2">
          Sleeper rest-of-season projections unavailable
        </h2>
        <p className="text-xs text-[#6b6e99] mb-4">{message}</p>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw size={13} className="inline mr-1.5" /> Retry
          </Button>
        )}
      </Card>
    </div>
  );
}

export function WaiversPage() {
  const { leagueId, rosterId } = useAppStore();
  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const playersQuery = usePlayers();
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, 18);
  const { data: transactions } = useAllTransactions(leagueId, 18);
  const nflStateQuery = useNflState();

  const projectionStartWeek = useMemo(() => {
    if (!league || !nflStateQuery.data || league.season !== nflStateQuery.data.season) return null;
    return getRestOfSeasonStartWeek(nflStateQuery.data);
  }, [league, nflStateQuery.data]);
  const projectionWeeksQuery = useRestOfSeasonProjectionWeeks(
    league?.season ?? null,
    projectionStartWeek,
  );

  const [strategy, setStrategy] = useState<StrategyKey>('safe');
  const [posFilter, setPosFilter] = useState('ALL');
  const [budgetFloor, setBudgetFloor] = useState(0);

  const rosProjections = useMemo(() => {
    if (!projectionWeeksQuery.data || !playersQuery.data || !league) return null;
    const scoring = getProjectionScoring(league.scoring_settings?.rec);
    return sumRestOfSeasonProjections(
      projectionWeeksQuery.data,
      scoring,
      (playerId) => playersQuery.data.get(playerId)?.position,
    );
  }, [projectionWeeksQuery.data, playersQuery.data, league]);

  const isLoading = matchupsLoading
    || playersQuery.isLoading
    || nflStateQuery.isLoading
    || projectionWeeksQuery.isLoading;

  const board = useMemo(() => {
    if (!matchups || !rosters || !users || !league || !rosProjections || projectionStartWeek == null) {
      return null;
    }
    const elim = computeEliminations(matchups, rosters, users);
    const bids = transactions ? extractBids(transactions) : [];
    const ctx = buildLeagueContext(league, elim, projectionStartWeek);
    const selectedRoster = rosterId == null
      ? undefined
      : rosters.find((roster) => roster.roster_id === rosterId);
    const remainingFaab = calculateRemainingFaab(ctx.budget, selectedRoster);
    const available = computeAvailablePlayers(rosters, rosProjections, elim);
    return {
      ctx,
      remainingFaab,
      rows: buildWaiverBoard(available, rosProjections, ctx, bids, getPlayerName, {
        budgetFloor: budgetFloor || undefined,
        remaining: remainingFaab ?? undefined,
      }),
    };
  }, [
    matchups,
    rosters,
    users,
    league,
    rosProjections,
    projectionStartWeek,
    transactions,
    budgetFloor,
    rosterId,
  ]);

  if (!leagueId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">Select a league first</p>
      </div>
    );
  }

  const projectionError = nflStateQuery.error || playersQuery.error || projectionWeeksQuery.error;
  if (projectionError) {
    return (
      <ProjectionErrorState
        message={projectionError instanceof Error ? projectionError.message : 'Sleeper returned an unknown error.'}
        onRetry={() => {
          if (nflStateQuery.error) void nflStateQuery.refetch();
          if (playersQuery.error) void playersQuery.refetch();
          if (projectionWeeksQuery.error) void projectionWeeksQuery.refetch();
        }}
      />
    );
  }

  if (league && nflStateQuery.data && league.season !== nflStateQuery.data.season) {
    return (
      <ProjectionErrorState
        message={`League season ${league.season} is not the current Sleeper NFL season (${nflStateQuery.data.season}). Historical season projections are not substituted for ROS data.`}
      />
    );
  }

  if (projectionStartWeek != null && projectionStartWeek > 18) {
    return (
      <ProjectionErrorState message="Sleeper reports that week 18 is complete, so there are no remaining weekly projections." />
    );
  }

  if (rosProjections && rosProjections.size === 0) {
    return (
      <ProjectionErrorState
        message="Sleeper returned no usable weekly projection totals for this league's scoring format. Historical averages were not used instead."
        onRetry={() => void projectionWeeksQuery.refetch()}
      />
    );
  }

  if (isLoading || !board) {
    return (
      <div className="px-6 py-8 pb-24 max-w-lg mx-auto">
        <p className="text-xs text-[#6b6e99] mb-4">Loading Sleeper rest-of-season projections…</p>
        <Skeleton lines={4} />
      </div>
    );
  }

  const { ctx, remainingFaab, rows } = board;
  const positionRows = posFilter === 'ALL' ? rows : rows.filter((r) => r.position === posFilter);
  const filtered = sortWaiverRowsByStrategy(positionRows, strategy);
  const stratIdx = STRATEGIES.findIndex((s) => s.key === strategy);

  return (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-1">
        Waivers
      </h1>
      <p className="text-xs text-[#6b6e99] mb-4">
        Budget ${ctx.budget} · Your FAAB remaining {remainingFaab == null ? '—' : `$${remainingFaab}`} ·{' '}
        {ctx.teamsRemaining} teams left · ~{ctx.weeksRemaining} wks to final
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
          Values use Sleeper rest-of-season projections (weekly totals from week {projectionStartWeek} through 18)
          in your league's scoring format. "Predicted" scales each player's Weeks-as-Starter value by this league's historical position-market aggressiveness.
        </span>
      </div>

      {/* Board */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card hover={false} className="p-6 text-center">
            <ShoppingCart className="w-8 h-8 text-[#2a2e55] mx-auto mb-3" />
            <p className="text-[#6b6e99] text-sm">No available free agents with Sleeper ROS projections.</p>
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
                      {row.position}#{row.posRank} · {row.rosPoints.toFixed(1)} ROS pts ·{' '}
                      {row.projectedPointsPerWeek.toFixed(1)}/wk
                    </div>
                    {strategy === 'weeks-starter' ? (
                      <div className="text-[10px] text-[#8b8ec7] font-['Space_Mono']">
                        {row.starterWeeks}/{row.possibleStarterWeeks} weeks as starter
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="flex items-center justify-end gap-1.5 font-['Space_Mono'] text-base text-[#10b981] font-bold tabular-nums">
                    {remainingFaab != null && sug.value > remainingFaab && <FaabOverBudgetWarning />}
                    <span>${sug.value}</span>
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
