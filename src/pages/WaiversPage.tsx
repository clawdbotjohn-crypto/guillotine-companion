// Waivers page — recommended bids per strategy + predicted winning bid + budget floor.
import { useMemo, useState, type ReactNode } from 'react';
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
  useFantasyCalcRankings,
  useFootballAbsurdityRankings,
} from '../api';
import {
  computeEliminations,
  extractBids,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  sumRestOfSeasonProjections,
  buildExternalRankingMap,
  RANKING_SOURCES,
  type WaiverRankingSource,
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

function RankingSourceSelector({
  value,
  onChange,
}: {
  value: WaiverRankingSource;
  onChange: (source: WaiverRankingSource) => void;
}) {
  const active = RANKING_SOURCES.find((source) => source.key === value)!;
  return (
    <section className="mb-4" aria-label="Season-long ranking source">
      <div className="text-[10px] uppercase tracking-wider text-[#6b6e99] mb-1.5">Season-long value source</div>
      <div className="grid grid-cols-3 gap-1 bg-[#0a0d1a] rounded-lg p-1">
        {RANKING_SOURCES.map((source) => (
          <button
            key={source.key}
            type="button"
            onClick={() => onChange(source.key)}
            className={`min-w-0 py-2 px-1 text-[9px] font-semibold rounded-md transition-all ${
              value === source.key
                ? 'bg-[#161a3a] text-[#a5b4fc] ring-1 ring-[#6366f1]'
                : 'text-[#4a4d77] hover:text-[#8b8ec7]'
            }`}
          >
            {source.shortLabel}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-[#8b8ec7]">
        Active: <span className="text-[#c7d2fe] font-semibold">{active.label}</span>
      </p>
    </section>
  );
}

function ProjectionErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
      <Card hover={false} className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-[#f59e0b] mx-auto mb-3" />
        <h2 className="text-sm font-semibold text-[#f0f0ff] mb-2">
          {title} unavailable
        </h2>
        <p className="text-xs text-[#6b6e99] mb-4">{message}</p>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw size={13} className="inline mr-1.5" /> Retry
          </Button>
        )}
      </Card>
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
  const [rankingSource, setRankingSource] = useState<WaiverRankingSource>('sleeper');

  const projectionStartWeek = useMemo(() => {
    if (!league || !nflStateQuery.data || league.season !== nflStateQuery.data.season) return null;
    return getRestOfSeasonStartWeek(nflStateQuery.data);
  }, [league, nflStateQuery.data]);
  const projectionWeeksQuery = useRestOfSeasonProjectionWeeks(
    league?.season ?? null,
    projectionStartWeek,
    18,
    rankingSource === 'sleeper',
  );
  const fantasyCalcQuery = useFantasyCalcRankings(league, rankingSource === 'fantasycalc');
  const footballAbsurdityQuery = useFootballAbsurdityRankings(
    league,
    rankingSource === 'football-absurdity',
  );

  const [strategy, setStrategy] = useState<StrategyKey>('safe');
  const [posFilter, setPosFilter] = useState('ALL');
  const [budgetFloor, setBudgetFloor] = useState(0);

  const seasonValues = useMemo(() => {
    if (!playersQuery.data || !league) return null;
    if (rankingSource === 'sleeper') {
      if (!projectionWeeksQuery.data) return null;
      const scoring = getProjectionScoring(league.scoring_settings?.rec);
      return sumRestOfSeasonProjections(
        projectionWeeksQuery.data,
        scoring,
        (playerId) => playersQuery.data.get(playerId)?.position,
      );
    }
    if (rankingSource === 'fantasycalc') {
      if (!fantasyCalcQuery.data) return null;
      return buildExternalRankingMap(fantasyCalcQuery.data.players, playersQuery.data).projections;
    }
    if (!footballAbsurdityQuery.data) return null;
    return buildExternalRankingMap(
      footballAbsurdityQuery.data.rankings.map((ranking) => ({
        ...ranking,
        value: ranking.vorp,
      })),
      playersQuery.data,
    ).projections;
  }, [
    rankingSource,
    projectionWeeksQuery.data,
    fantasyCalcQuery.data,
    footballAbsurdityQuery.data,
    playersQuery.data,
    league,
  ]);

  const selectedSourceQuery = rankingSource === 'sleeper'
    ? projectionWeeksQuery
    : rankingSource === 'fantasycalc'
      ? fantasyCalcQuery
      : footballAbsurdityQuery;
  const isLoading = matchupsLoading
    || playersQuery.isLoading
    || (rankingSource === 'sleeper' && nflStateQuery.isLoading)
    || selectedSourceQuery.isLoading;

  const valueStartWeek = rankingSource === 'sleeper'
    ? projectionStartWeek ?? undefined
    : nflStateQuery.data
      ? getRestOfSeasonStartWeek(nflStateQuery.data)
      : undefined;

  const board = useMemo(() => {
    if (!matchups || !rosters || !users || !league || !seasonValues) {
      return null;
    }
    const elim = computeEliminations(matchups, rosters, users);
    const bids = transactions ? extractBids(transactions) : [];
    const ctx = buildLeagueContext(league, elim, valueStartWeek);
    const selectedRoster = rosterId == null
      ? undefined
      : rosters.find((roster) => roster.roster_id === rosterId);
    const remainingFaab = calculateRemainingFaab(ctx.budget, selectedRoster);
    const available = computeAvailablePlayers(rosters, seasonValues, elim);
    return {
      ctx,
      remainingFaab,
      rows: buildWaiverBoard(available, seasonValues, ctx, bids, getPlayerName, {
        budgetFloor: budgetFloor || undefined,
        remaining: remainingFaab ?? undefined,
      }),
    };
  }, [
    matchups,
    rosters,
    users,
    league,
    seasonValues,
    valueStartWeek,
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

  const sourceInfo = RANKING_SOURCES.find((source) => source.key === rankingSource)!;
  const sourceError = playersQuery.error
    || selectedSourceQuery.error
    || (rankingSource === 'sleeper' ? nflStateQuery.error : null);
  const sourceShell = (content: ReactNode) => (
    <div className="px-6 py-6 pb-24 max-w-lg mx-auto">
      <h1 className="font-['Orbitron'] text-lg font-bold uppercase tracking-wider text-[#f0f0ff] mb-4">
        Waivers
      </h1>
      <RankingSourceSelector value={rankingSource} onChange={setRankingSource} />
      {content}
    </div>
  );

  if (sourceError) {
    return sourceShell(
      <ProjectionErrorState
        title={sourceInfo.shortLabel}
        message={sourceError instanceof Error ? sourceError.message : 'The ranking source returned an unknown error.'}
        onRetry={() => {
          if (playersQuery.error) void playersQuery.refetch();
          if (rankingSource === 'sleeper' && nflStateQuery.error) void nflStateQuery.refetch();
          void selectedSourceQuery.refetch();
        }}
      />,
    );
  }

  if (rankingSource === 'sleeper' && league && nflStateQuery.data
    && league.season !== nflStateQuery.data.season) {
    return sourceShell(
      <ProjectionErrorState
        title={sourceInfo.shortLabel}
        message={`League season ${league.season} is not the current Sleeper NFL season (${nflStateQuery.data.season}). Historical season projections are not substituted for ROS data.`}
      />,
    );
  }

  if (rankingSource === 'sleeper' && projectionStartWeek != null && projectionStartWeek > 18) {
    return sourceShell(
      <ProjectionErrorState
        title={sourceInfo.shortLabel}
        message="Sleeper reports that week 18 is complete, so there are no remaining weekly projections."
      />,
    );
  }

  if (seasonValues && seasonValues.size === 0) {
    return sourceShell(
      <ProjectionErrorState
        title={sourceInfo.shortLabel}
        message={`${sourceInfo.shortLabel} returned no usable matched season-long values. No fallback source was silently substituted.`}
        onRetry={() => void selectedSourceQuery.refetch()}
      />,
    );
  }

  if (isLoading || !board) {
    return sourceShell(
      <>
        <p className="text-xs text-[#6b6e99] mb-4">Loading {sourceInfo.label}…</p>
        <Skeleton lines={4} />
      </>,
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

      <RankingSourceSelector value={rankingSource} onChange={setRankingSource} />

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
          {rankingSource === 'sleeper'
            ? `Season-long rank and value use Sleeper rest-of-season projections (weeks ${projectionStartWeek}–18) in your league's scoring format.`
            : rankingSource === 'fantasycalc'
              ? 'Season-long rank and value use FantasyCalc redraft market values configured for your reception scoring, team count, and QB format. Weekly Sleeper projections are not mixed into this ranking.'
              : 'Season-long rank and value use Football Absurdity VoRP generated from your league lineup and scoring settings. Weekly Sleeper projections are not mixed into this ranking.'}{' '}
          "Predicted" applies the season-deflation curve to Weeks-as-Starter.
        </span>
      </div>

      {/* Board */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card hover={false} className="p-6 text-center">
            <ShoppingCart className="w-8 h-8 text-[#2a2e55] mx-auto mb-3" />
            <p className="text-[#6b6e99] text-sm">No available free agents matched to {sourceInfo.shortLabel} values.</p>
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
                      {row.position}#{row.posRank} · {rankingSource === 'sleeper' ? (
                        <>{row.rosPoints.toFixed(1)} ROS pts · {row.projectedPointsPerWeek.toFixed(1)}/wk</>
                      ) : (
                        <>{sourceInfo.metricLabel} {row.sourceValue.toFixed(1)}</>
                      )}
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
