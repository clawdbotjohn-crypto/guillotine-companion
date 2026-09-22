// Waivers page — recommended bids per strategy, weekly context, and predicted winning bid.
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
  useFantasyProsRankings,
  useWeeklyProjections,
} from '../api';
import {
  computeEliminations,
  extractBids,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  sumRestOfSeasonProjections,
  buildExternalRankingMap,
  buildWeeklyProjectionContext,
  getTeamByeWeek,
  RANKING_SOURCES,
  type WaiverRankingSource,
} from '../logic';
import {
  buildLeagueContext,
  buildVorpCalibration,
  buildWaiverBoard,
  calculateRemainingFaab,
  computeAvailablePlayers,
  getReplacementTeamBounds,
  normalizeReplacementTeamTarget,
  sortWaiverRowsByStrategy,
  type StrategyKey,
  type WaiverPlayerRow,
} from '../logic/waivers';
import { getPlayerName } from '../store/players';
import {
  DEFAULT_WAIVER_STRATEGY,
  getWaiverStrategyExplanation,
  WAIVER_STRATEGIES,
} from '../logic/waiverDisplay';

const POS_FILTERS = ['ALL', 'QB', 'RB', 'WR', 'TE'];

export function ReplacementTeamSelector({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (teams: number) => void;
}) {
  const options = Array.from({ length: Math.max(0, max - 3) }, (_, index) => max - index);
  return (
    <section className="mb-4">
      <label
        htmlFor="replacement-team-depth"
        className="block text-[10px] uppercase tracking-wider text-[#6b6e99] mb-1.5"
      >
        Replacement/startable depth teams
      </label>
      <select
        id="replacement-team-depth"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-xs text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
      >
        {options.map((teams) => (
          <option key={teams} value={teams}>{teams} teams</option>
        ))}
      </select>
      <p className="mt-1.5 text-[10px] text-[#4a4d77]">
        Defines the optimized lineup pool used to set replacement level.
      </p>
    </section>
  );
}

export function RankingSourceSelector({
  value,
  onChange,
}: {
  value: WaiverRankingSource;
  onChange: (source: WaiverRankingSource) => void;
}) {
  return (
    <section className="mb-4">
      <label
        htmlFor="player-values-source"
        className="block text-[10px] uppercase tracking-wider text-[#6b6e99] mb-1.5"
      >
        Player Values
      </label>
      <select
        id="player-values-source"
        value={value}
        onChange={(event) => onChange(event.target.value as WaiverRankingSource)}
        className="w-full rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-xs text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
      >
        {RANKING_SOURCES.map((source) => (
          <option key={source.key} value={source.key}>{source.label}</option>
        ))}
      </select>
    </section>
  );
}

export function VorpSourceNotice({
  rankingSource,
  unavailableReason,
}: {
  rankingSource: WaiverRankingSource;
  unavailableReason?: string;
}) {
  if (rankingSource === 'sleeper' && !unavailableReason) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-lg border px-3 py-2.5 text-[11px] leading-relaxed ${unavailableReason
        ? 'border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.08)] text-[#fbbf24]'
        : 'border-[rgba(99,102,241,0.35)] bg-[rgba(99,102,241,0.08)] text-[#a5b4fc]'}`}
    >
      VoRP uses Sleeper ROS projected fantasy points independently of the selected Player Values source.
      {unavailableReason ? ` VoRP is unavailable: ${unavailableReason}.` : ''}
    </div>
  );
}

export function VorpControls({
  strategy,
  replacementTeamCount,
  maxReplacementTeams,
  onReplacementTeamChange,
  rankingSource,
  unavailableReason,
}: {
  strategy: StrategyKey;
  replacementTeamCount: number;
  maxReplacementTeams: number;
  onReplacementTeamChange: (teams: number) => void;
  rankingSource: WaiverRankingSource;
  unavailableReason?: string;
}) {
  if (strategy !== 'vorp') return null;
  return (
    <>
      <ReplacementTeamSelector
        value={replacementTeamCount}
        max={maxReplacementTeams}
        onChange={onReplacementTeamChange}
      />
      <VorpSourceNotice
        rankingSource={rankingSource}
        unavailableReason={unavailableReason}
      />
    </>
  );
}

export function PredictedWinningBidFooter({
  strategy,
  row,
}: {
  strategy: StrategyKey;
  row: Pick<WaiverPlayerRow, 'predictedWinningBid' | 'predictedConfidence'>;
}) {
  if (strategy === 'aggressive') return null;
  return (
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
    !!league && !!nflStateQuery.data && league.season === nflStateQuery.data.season,
  );
  const fantasyCalcQuery = useFantasyCalcRankings(league, rankingSource === 'fantasycalc');
  const fantasyProsQuery = useFantasyProsRankings(league, rankingSource === 'fantasypros');
  const weeklyProjectionQuery = useWeeklyProjections(
    league?.season ?? null,
    projectionStartWeek,
    !!league && !!nflStateQuery.data && league.season === nflStateQuery.data.season,
  );

  const [strategy, setStrategy] = useState<StrategyKey>(DEFAULT_WAIVER_STRATEGY);
  const [posFilter, setPosFilter] = useState('ALL');
  const [replacementTeamSelection, setReplacementTeamSelection] = useState<{
    leagueId: string;
    value: number;
  } | null>(null);
  const replacementTeamTarget = replacementTeamSelection?.leagueId === leagueId
    ? replacementTeamSelection.value
    : null;

  const sleeperRosValues = useMemo(() => {
    if (!playersQuery.data || !league || !projectionWeeksQuery.data) return null;
    return sumRestOfSeasonProjections(
      projectionWeeksQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      (playerId) => playersQuery.data.get(playerId)?.position,
    );
  }, [projectionWeeksQuery.data, playersQuery.data, league]);

  const seasonValues = useMemo(() => {
    if (!playersQuery.data || !league) return null;
    if (rankingSource === 'sleeper') return sleeperRosValues;
    if (rankingSource === 'fantasycalc') {
      if (!fantasyCalcQuery.data) return null;
      return buildExternalRankingMap(fantasyCalcQuery.data.players, playersQuery.data).projections;
    }
    if (!fantasyProsQuery.data) return null;
    return buildExternalRankingMap(fantasyProsQuery.data.players, playersQuery.data).projections;
  }, [
    rankingSource,
    sleeperRosValues,
    fantasyCalcQuery.data,
    fantasyProsQuery.data,
    playersQuery.data,
    league,
  ]);

  const selectedSourceQuery = rankingSource === 'sleeper'
    ? projectionWeeksQuery
    : rankingSource === 'fantasycalc'
      ? fantasyCalcQuery
      : fantasyProsQuery;
  const isLoading = matchupsLoading
    || playersQuery.isLoading
    || (rankingSource === 'sleeper' && nflStateQuery.isLoading)
    || selectedSourceQuery.isLoading;

  const waiverContext = useMemo(() => {
    if (!matchups || !rosters || !users || !league) return null;
    const elim = computeEliminations(matchups, rosters, users);
    return { elim, ctx: buildLeagueContext(league, elim, projectionStartWeek ?? undefined) };
  }, [matchups, rosters, users, league, projectionStartWeek]);

  const replacementBounds = getReplacementTeamBounds(waiverContext?.ctx.teamsRemaining ?? 4);
  const normalizedReplacementTarget = normalizeReplacementTeamTarget(
    replacementTeamTarget,
    waiverContext?.ctx.teamsRemaining ?? 4,
  );

  const board = useMemo(() => {
    if (!waiverContext || !rosters || !seasonValues) return null;
    const { elim, ctx } = waiverContext;
    const bids = transactions ? extractBids(transactions) : [];
    const selectedRoster = rosterId == null
      ? undefined
      : rosters.find((roster) => roster.roster_id === rosterId);
    const remainingFaab = calculateRemainingFaab(ctx.budget, selectedRoster);
    const available = computeAvailablePlayers(rosters, seasonValues, elim);
    const vorpCalibration = sleeperRosValues
      ? buildVorpCalibration(
        sleeperRosValues,
        ctx.startersPerPos,
        normalizedReplacementTarget,
        ctx.budget,
      )
      : null;
    return {
      ctx,
      remainingFaab,
      vorpCalibration,
      rows: buildWaiverBoard(available, seasonValues, ctx, bids, getPlayerName, {
        sleeperRosProjections: sleeperRosValues ?? undefined,
        replacementTeamCount: normalizedReplacementTarget,
        vorpCalibration,
      }),
    };
  }, [
    waiverContext,
    rosters,
    seasonValues,
    transactions,
    rosterId,
    sleeperRosValues,
    normalizedReplacementTarget,
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
      <VorpControls
        strategy={strategy}
        replacementTeamCount={normalizedReplacementTarget}
        maxReplacementTeams={replacementBounds.max}
        onReplacementTeamChange={(value) => setReplacementTeamSelection({ leagueId, value })}
        rankingSource={rankingSource}
      />
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

  const { ctx, remainingFaab, rows, vorpCalibration } = board;
  const sleeperUnavailableReason = vorpCalibration
    ? undefined
    : projectionWeeksQuery.isLoading || nflStateQuery.isLoading
      ? 'Sleeper ROS projections are still loading'
      : league && nflStateQuery.data && league.season !== nflStateQuery.data.season
        ? `Sleeper ROS projections are not available for historical season ${league.season}`
        : projectionStartWeek != null && projectionStartWeek > 18
          ? 'the current NFL season has no remaining projection weeks'
          : projectionWeeksQuery.error || nflStateQuery.error
            ? 'Sleeper ROS projections could not be loaded'
            : !sleeperRosValues || sleeperRosValues.size === 0
              ? 'Sleeper returned no usable remaining-season point projections'
              : 'Sleeper ROS projections could not fill every required lineup slot or produce a valid championship calibration';
  const positionRows = posFilter === 'ALL' ? rows : rows.filter((r) => r.position === posFilter);
  const filtered = sortWaiverRowsByStrategy(positionRows, strategy);
  const weeklyContext = weeklyProjectionQuery.data && playersQuery.data && league
    ? buildWeeklyProjectionContext(
      weeklyProjectionQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      (playerId) => playersQuery.data?.get(playerId)?.position,
    )
    : new Map();

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
      <VorpControls
        strategy={strategy}
        replacementTeamCount={normalizedReplacementTarget}
        maxReplacementTeams={replacementBounds.max}
        onReplacementTeamChange={(value) => setReplacementTeamSelection({ leagueId, value })}
        rankingSource={rankingSource}
        unavailableReason={sleeperUnavailableReason}
      />

      {/* Strategy toggle */}
      <div className="flex gap-1 bg-[#0a0d1a] rounded-lg p-1 mb-3 overflow-x-auto">
        {WAIVER_STRATEGIES.map((s) => (
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

      {/* Position filter */}
      <div className="flex gap-1 mb-4">
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

      <div className="flex items-start gap-1.5 mb-4 text-[10px] text-[#6b6e99]">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          {getWaiverStrategyExplanation(
            strategy,
            normalizedReplacementTarget,
            !!vorpCalibration,
            sleeperUnavailableReason,
          )}
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
          const sug = row.suggestions.find((suggestion) => suggestion.strategy === strategy);
          if (!sug) return null;
          const player = playersQuery.data?.get(row.playerId);
          const weekly = weeklyContext.get(row.playerId);
          const byeWeek = getTeamByeWeek(league!.season, player?.team);
          const byeText = byeWeek == null
            ? 'Bye unavailable'
            : byeWeek < ctx.currentWeek
              ? `Bye passed (W${byeWeek})`
              : `Bye W${byeWeek}`;
          const isUpcomingBye = byeWeek != null && projectionStartWeek != null && byeWeek === projectionStartWeek;
          const weeklyText = isUpcomingBye
            ? 'Next week: Bye'
            : weekly
              ? `Next week: ${weekly.points.toFixed(1)} pts · ${row.position}${weekly.positionRank}`
              : 'Next week: No projection';
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
                        <>{rankingSource === 'fantasypros' && row.sourceRank != null
                          ? `ECR #${row.sourceRank}`
                          : `${sourceInfo.metricLabel} ${row.sourceValue.toFixed(1)}`}</>
                      )}
                    </div>
                    {strategy === 'weeks-starter' ? (
                      <div className="text-[10px] text-[#8b8ec7] font-['Space_Mono']">
                        {row.starterWeeks}/{row.possibleStarterWeeks} weeks as starter
                      </div>
                    ) : null}
                    <div className="text-[10px] text-[#8b8ec7] font-['Space_Mono']">
                      {weeklyText} · {byeText}
                    </div>
                    {player?.injury_status ? (
                      <span className="inline-block mt-1 rounded bg-[rgba(245,158,11,0.15)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-[#f59e0b]">
                        {player.injury_status}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="flex items-center justify-end gap-1.5 font-['Space_Mono'] text-base text-[#10b981] font-bold tabular-nums">
                    {remainingFaab != null && sug.value != null && sug.value > remainingFaab && <FaabOverBudgetWarning />}
                    <span>{sug.value == null ? 'Unavailable' : `$${sug.value}`}</span>
                  </div>
                  <div className="text-[9px] text-[#4a4d77] uppercase tracking-wide">
                    {sug.pctOfBudget == null ? 'Sleeper ROS required' : `${sug.pctOfBudget.toFixed(0)}% · ${sug.label}`}
                  </div>
                </div>
              </div>
              <PredictedWinningBidFooter strategy={strategy} row={row} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
