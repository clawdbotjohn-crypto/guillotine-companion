// Waivers page — recommended bids per strategy, weekly context, and predicted winning bid.
import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ShoppingCart, Info, RefreshCw } from 'lucide-react';
import { Button, Card, Skeleton } from '../components/ui';
import { FaabOverBudgetWarning } from '../components/FaabOverBudgetWarning';
import { WaiverManagerPredictions } from '../components/ManagerBiddingProfiles';
import { buildManagerDetailData, type ManagerDetailData } from '../logic/managerDetails';
import { PlayerDetailDialog } from '../components/PlayerDetailDialog';
import { buildManagerPredictions, isEligibleBuyerPrediction, managerName, orderManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import { formatDisplayCurrency } from '../logic/displayCurrency';
import { ContextDisclosure } from '../components/ContextDisclosure';
import { useAppStore, usePlayers } from '../store';
import {
  useLeague,
  useLeagueUsers,
  useRosters,
  useAllMatchups,
  useAllTransactions,
  useNflState,
  useWeeklyProjections,
} from '../api';
import {
  computeEliminations,
  getActiveRosterIds,
  getCompletedLeagueWeek,
  extractBids,
  getProjectionScoring,
  buildWeeklyProjectionContext,
  getTeamByeWeek,
  RANKING_SOURCES,
  buildWeeklyScoredPlayers,
  projectAllTeams,
  computeProjectedLineupGroupRanks,
  classifyCanonicalBidEvents,
  type WaiverRankingSource,
} from '../logic';
import {
  buildLeagueContext,
  buildMaxVorpCalibration,
  buildVorpCalibration,
  buildWaiverBoard,
  buildWaiverBoardModel,
  calculateRemainingFaab,
  computeAvailablePlayers,
  computeRosteredPlayerOwners,
  getReplacementTeamBounds,
  normalizeReplacementTeamTarget,
  sortWaiverRowsByStrategy,
  type RosteredPlayerOwner,
  type StrategyKey,
  type WaiverPlayerRow,
} from '../logic/waivers';
import { getPlayerName, getPlayerPosition } from '../store/players';
import { useBiddingProfiles } from '../hooks/useBiddingProfiles';
import { usePlayerValues } from '../hooks/usePlayerValues';
import {
  getWaiverStrategyExplanation,
  WAIVER_STRATEGIES,
} from '../logic/waiverDisplay';
import { resolveBiddingBaseline } from '../logic/waiverStrategies';
import { formatWaiverSourceMetric } from '../logic/playerValueMetrics';

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
        VoRP team count
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
      <div className="mt-1.5">
        <ContextDisclosure label="About VoRP team count" trigger={<span className="inline-flex items-center gap-1 text-[10px] text-[#6b6e99]"><Info size={12} /> What is this?</span>}>
          Set the number of teams used for VoRP replacement calculations. In a 1-QB league, choosing 16 makes the 16th-best QB the approximate replacement baseline.
        </ContextDisclosure>
      </div>
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
    <section className="mb-3 w-fit">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#6b6e99]">
        <label htmlFor="player-values-source">Player Values</label>
        <ContextDisclosure
          label="About player value sources"
          trigger={<Info size={14} className="text-[#6b6e99]" />}
        >
          <span id="player-values-source-help">Choose your player rankings source.</span>
        </ContextDisclosure>
      </div>
      <select
        id="player-values-source"
        value={value}
        aria-describedby="player-values-source-help"
        onChange={(event) => onChange(event.target.value as WaiverRankingSource)}
        className="min-h-11 w-fit max-w-full rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-xs text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
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
  if (strategy !== 'vorp' && strategy !== 'max-vorp') return null;
  return (
    <>
      {strategy === 'vorp' && <ReplacementTeamSelector
        value={replacementTeamCount}
        max={maxReplacementTeams}
        onChange={onReplacementTeamChange}
      />}
      <VorpSourceNotice
        rankingSource={rankingSource}
        unavailableReason={unavailableReason}
      />
    </>
  );
}

export function WaiverPlayerCard({
  row,
  strategy,
  remainingFaab,
  nflTeam,
  age,
  status,
  injuryStatus,
  weeklyPoints,
  weeklyRank,
  byeWeek,
  currentWeek,
  owner,
  selectedRosterId,
  managerPredictions = [],
  managerDetails = new Map(),
  managerLabels = new Map(),
  showManagerPredictions = false,
  getPlayerName: resolvePlayerName = getPlayerName,
  sourceLabel = 'Sleeper ROS',
  rankingSource = 'sleeper',
  canonicalHistory = [],
}: {
  row: WaiverPlayerRow;
  strategy: StrategyKey;
  remainingFaab: number | null;
  nflTeam?: string;
  age?: number | null;
  status?: string | null;
  injuryStatus?: string | null;
  weeklyPoints?: number;
  weeklyRank?: number;
  byeWeek?: number | null;
  currentWeek?: number | null;
  owner?: RosteredPlayerOwner;
  selectedRosterId?: number | null;
  managerPredictions?: ManagerPredictionDisplay[];
  showManagerPredictions?: boolean;
  managerDetails?: ReadonlyMap<number, ManagerDetailData>;
  managerLabels?: ReadonlyMap<number, string>;
  getPlayerName?: (playerId: string) => string;
  sourceLabel?: string;
  rankingSource?: WaiverRankingSource;
  canonicalHistory?: import('../logic').CanonicalBidEvent[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [predictionsOpen, setPredictionsOpen] = useState(false);
  const suggestion = row.suggestions.find((item) => item.strategy === strategy);
  const value = suggestion?.value ?? 0;
  const projectionWeek = currentWeek == null ? '—' : currentWeek + 1;
  const weeklyMeta = weeklyPoints != null
    ? `W${projectionWeek} ${weeklyPoints.toFixed(1)} pts${byeWeek != null ? ` · Bye W${byeWeek}` : ''}`
    : byeWeek != null ? `Bye W${byeWeek}` : null;
  const selectedTeamOwner = owner?.rosterId === selectedRosterId;
  const sourceMetric = formatWaiverSourceMetric(row, rankingSource);
  const orderedPredictions = orderManagerPredictions(managerPredictions);
  const eligiblePredictions = orderedPredictions.filter(isEligibleBuyerPrediction);
  const predictedBid = eligiblePredictions[0]?.predictedBid;
  const hasPredictionDetails = !owner && showManagerPredictions && managerPredictions.length > 0 && value > 0;
  const showPrediction = hasPredictionDetails && predictedBid != null;
  const cardLabel = owner
    ? `${row.name}, ${selectedTeamOwner ? 'owned by your selected team' : 'rostered by another team'}. Open player details`
    : `${row.name}, suggested bid ${formatDisplayCurrency(value)}. Open player details`;

  return (
    <>
      <Card hover className={`p-0 mb-2 overflow-hidden ${owner ? selectedTeamOwner ? 'border-[#10b981]/70' : 'border-[#2a2d4d]' : ''}`}>
        <div className="flex min-w-0">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          aria-label={cardLabel}
          data-owner-highlight={owner ? selectedTeamOwner ? 'selected-team' : 'neutral' : undefined}
          className="min-w-0 flex-1 min-h-20 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#818cf8]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-[#f0f0ff]">{row.name}</span>
                {owner && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${selectedTeamOwner ? 'bg-[#10b981]/15 text-[#6ee7b7]' : 'bg-[#20243f] text-[#8b8eac]'}`}>Rostered</span>}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-[#6b6e99]">
                {row.position} #{row.posRank} · {nflTeam || 'FA'}{weeklyRank != null ? ` · W${projectionWeek} #${weeklyRank}` : ''}
              </div>
              {weeklyMeta && <div className="mt-1 truncate text-[10px] text-[#8b8eac]">{weeklyMeta}</div>}
            </div>
            <div className="shrink-0 text-right" data-testid="compact-bid-summary">
              <div data-testid="suggested-bid-row" className="flex items-baseline justify-end gap-1.5">
                <span className="text-[9px] uppercase tracking-wider text-[#6b6e99]">{owner ? sourceMetric.label : 'Suggested bid'}</span>
                <span className={`font-['Space_Mono'] text-lg font-bold tabular-nums ${owner ? 'text-[#8b8eac]' : 'text-[#f59e0b]'}`}>{owner ? sourceMetric.display : formatDisplayCurrency(value)}</span>
              </div>
              {showPrediction && <div className="mt-0.5 text-[10px] text-[#a5b4fc]">Predicted bid <span className="font-['Space_Mono']">${predictedBid}</span></div>}
              {!owner && value > 0 && remainingFaab != null && value > remainingFaab && <FaabOverBudgetWarning />}
            </div>
          </div>
        </button>
        {hasPredictionDetails && (
          <button
            type="button"
            aria-label={`${predictionsOpen ? 'Hide' : 'Show'} bid predictions for ${row.name}`}
            aria-expanded={predictionsOpen}
            aria-controls={`player-bids-${row.playerId}`}
            onClick={() => setPredictionsOpen((open) => !open)}
            className="shrink-0 border-l border-[#20264d] px-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3c7] hover:bg-[#161a3a] hover:text-[#f0f0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#818cf8]"
          >
            {predictionsOpen ? 'Hide bids' : 'Bids'}
          </button>
        )}
        </div>
        {hasPredictionDetails && predictionsOpen && (
          <div id={`player-bids-${row.playerId}`} className="border-t border-[#20264d] px-2.5 pb-2.5 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b8eb8]">Bid Predictions</h3>
            <WaiverManagerPredictions predictions={orderedPredictions} detailsByRosterId={managerDetails} getPlayerName={resolvePlayerName} />
          </div>
        )}
      </Card>
      <PlayerDetailDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        data={{
          playerId: row.playerId,
          name: row.name,
          position: row.position,
          team: nflTeam ?? null,
          age,
          status,
          injuryStatus,
          nextWeek: currentWeek == null ? null : currentWeek + 1,
          nextWeekPoints: weeklyPoints ?? null,
          byeWeek: byeWeek ?? null,
          sourceLabel,
          valueLabel: sourceMetric.label,
          valueDisplay: sourceMetric.display,
          value: row.sourceValue,
          positionRank: row.posRank,
          owned: !!owner,
          ownerLabel: owner ? (selectedTeamOwner ? 'This player is on your selected roster.' : 'This player is currently rostered by another team.') : undefined,
          suggestedBid: owner ? null : value,
          managerPredictions: showManagerPredictions ? managerPredictions : [],
          managerDetails,
          managerLabels,
          getPlayerName: resolvePlayerName,
          history: canonicalHistory,
        }}
      />
    </>
  );
}

export const DEFAULT_SHOW_ROSTERED_PLAYERS = false;

export function RosteredPlayersToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mb-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#1a1e3a] px-3 text-xs text-[#8b8ec7]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#6366f1]"
      />
      Show rostered players
    </label>
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
  const { leagueId, rosterId, activeStrategy: strategy, setStrategy } = useAppStore();
  const { data: league } = useLeague(leagueId);
  const { data: users } = useLeagueUsers(leagueId);
  const { data: rosters } = useRosters(leagueId);
  const playersQuery = usePlayers();
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(league, nflStateQuery.data);
  const { data: matchups, isLoading: matchupsLoading } = useAllMatchups(leagueId, completedWeek);
  const transactionsQuery = useAllTransactions(leagueId, 18);
  const { data: transactions } = transactionsQuery;
  const [rankingSource, setRankingSource] = useState<WaiverRankingSource>('sleeper');

  const playerValuesModel = usePlayerValues({
    league,
    nflState: nflStateQuery.data,
    players: playersQuery.data,
    source: rankingSource,
  });
  const projectionStartWeek = playerValuesModel.startWeek;
  const weeklyProjectionQuery = useWeeklyProjections(
    league?.season ?? null,
    projectionStartWeek,
    !!league && !!nflStateQuery.data && league.season === nflStateQuery.data.season,
  );

  const biddingProfiles = useBiddingProfiles({
    leagueId,
    league,
    rosters,
    players: playersQuery.data,
  });

  const [posFilter, setPosFilter] = useState('ALL');
  const [showRosteredPlayers, setShowRosteredPlayers] = useState(DEFAULT_SHOW_ROSTERED_PLAYERS);
  const [replacementTeamSelection, setReplacementTeamSelection] = useState<{
    leagueId: string;
    value: number;
  } | null>(null);
  const replacementTeamTarget = replacementTeamSelection?.leagueId === leagueId
    ? replacementTeamSelection.value
    : null;

  const sleeperRosValues = playerValuesModel.sleeperValues;
  const seasonValues = playerValuesModel.values;


  const canonicalBidEvents = useMemo(
    () => transactions && league
      ? classifyCanonicalBidEvents(transactions, league.settings?.waiver_budget ?? 1000)
      : [],
    [transactions, league],
  );
  const canonicalHistoryByPlayer = useMemo(() => {
    const byPlayer = new Map<string, typeof canonicalBidEvents>();
    for (const event of canonicalBidEvents) {
      const events = byPlayer.get(event.playerId) ?? [];
      events.push(event);
      byPlayer.set(event.playerId, events);
    }
    return byPlayer;
  }, [canonicalBidEvents]);

  const isLoading = matchupsLoading
    || playersQuery.isLoading
    || (rankingSource === 'sleeper' && nflStateQuery.isLoading)
    || playerValuesModel.isLoading;

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
    const maxVorpCalibration = sleeperRosValues
      ? buildMaxVorpCalibration(
        sleeperRosValues,
        ctx.startersPerPos,
        ctx.teamsRemaining,
        ctx.budget,
      )
      : null;
    const boardModel = buildWaiverBoardModel(seasonValues, ctx);
    const boardOptions = {
      sleeperRosProjections: sleeperRosValues ?? undefined,
      replacementTeamCount: normalizedReplacementTarget,
      vorpCalibration,
      maxVorpCalibration,
      boardModel,
    };
    const ownership = computeRosteredPlayerOwners(rosters, users!, elim);
    const allPositivePlayers = [...seasonValues.entries()]
      .filter(([, projection]) => projection.totalPoints > 0)
      .map(([playerId]) => playerId);
    return {
      ctx,
      remainingFaab,
      vorpCalibration,
      maxVorpCalibration,
      ownership,
      availableRows: buildWaiverBoard(
        available,
        seasonValues,
        ctx,
        bids,
        getPlayerName,
        boardOptions,
      ),
      allRows: buildWaiverBoard(
        allPositivePlayers,
        seasonValues,
        ctx,
        bids,
        getPlayerName,
        { ...boardOptions, maxPerPos: Number.POSITIVE_INFINITY },
      ),

    };
  }, [
    waiverContext,
    rosters,
    users,
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
    || playerValuesModel.error
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
          void playerValuesModel.refetch();
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
        onRetry={() => void playerValuesModel.refetch()}
      />,
    );
  }

  if (isLoading || !board) {
    return sourceShell(
      <>
        <p className="text-xs text-[#6b6e99] mb-4">Loading {sourceInfo.description}…</p>
        <Skeleton lines={4} />
      </>,
    );
  }

  const {
    ctx,
    remainingFaab,
    ownership,
    availableRows,
    allRows,
    vorpCalibration,
    maxVorpCalibration,
  } = board;
  const selectedVorpCalibration = strategy === 'max-vorp' ? maxVorpCalibration : vorpCalibration;
  const sleeperUnavailableReason = selectedVorpCalibration
    ? undefined
    : playerValuesModel.isLoading || nflStateQuery.isLoading
      ? 'Sleeper ROS projections are still loading'
      : league && nflStateQuery.data && league.season !== nflStateQuery.data.season
        ? `Sleeper ROS projections are not available for historical season ${league.season}`
        : projectionStartWeek != null && projectionStartWeek > 18
          ? 'the current NFL season has no remaining projection weeks'
          : playerValuesModel.error || nflStateQuery.error
            ? 'Sleeper ROS projections could not be loaded'
            : !sleeperRosValues || sleeperRosValues.size === 0
              ? 'Sleeper returned no usable remaining-season point projections'
              : 'Sleeper ROS projections could not fill every required lineup slot or produce a valid championship calibration';
  const displayRows = showRosteredPlayers ? allRows : availableRows;
  const positionRows = posFilter === 'ALL'
    ? displayRows
    : displayRows.filter((row) => row.position === posFilter);
  const filtered = sortWaiverRowsByStrategy(positionRows, strategy);
  const weeklyContext = weeklyProjectionQuery.data && playersQuery.data && league
    ? buildWeeklyProjectionContext(
      weeklyProjectionQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      (playerId) => playersQuery.data?.get(playerId)?.position,
    )
    : new Map();
  const weeklyScoredPlayers = weeklyProjectionQuery.data && league
    ? buildWeeklyScoredPlayers(
      weeklyProjectionQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      getPlayerPosition,
    )
    : null;
  const projectedTeams = projectAllTeams(rosters!, weeklyScoredPlayers, league, waiverContext!.elim);
  const projectedPositionRanks = computeProjectedLineupGroupRanks(
    projectedTeams,
    weeklyScoredPlayers,
    league,
  ).byRosterId;
  const activeRosterIds = getActiveRosterIds(waiverContext!.elim);
  const playerValues = new Map(allRows.map((row) => [row.playerId, row.sourceValue]));
  const playerPositionRanks = new Map(allRows.map((row) => [row.playerId, row.posRank]));
  const managerLabels = new Map(rosters!.map((roster) => [roster.roster_id, managerName(roster.roster_id, rosters!, users!)]));
  const managerDetails = buildManagerDetailData({
    profiles: biddingProfiles.profiles,
    rosters: rosters!,
    players: playersQuery.data!,
    season: league?.season,
    currentWeek: nflStateQuery.data?.week ?? null,
    playerValues,
    positionRanks: playerPositionRanks,
    projectedPositionRanks,
  });

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
            className={`min-h-11 flex-1 whitespace-nowrap py-2 px-2 text-[10px] font-semibold uppercase tracking-wider rounded-md transition-all
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
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex gap-1">
          {POS_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPosFilter(p)}
              className={`min-h-11 px-2.5 py-1 rounded-md text-[10px] font-bold font-['Space_Mono'] transition-all
                ${posFilter === p ? 'bg-[#6366f1] text-white' : 'bg-[#161a3a] text-[#6b6e99]'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <RosteredPlayersToggle
        checked={showRosteredPlayers}
        onChange={setShowRosteredPlayers}
      />

      <div className="flex items-start gap-1.5 mb-4 text-[10px] text-[#6b6e99]">
        <Info size={12} className="mt-0.5 shrink-0" />
        <span>
          {getWaiverStrategyExplanation(
            strategy,
            normalizedReplacementTarget,
            !!selectedVorpCalibration,
            sleeperUnavailableReason,
          )}
        </span>
      </div>



      {/* Board */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card hover={false} className="p-6 text-center">
            <ShoppingCart className="w-8 h-8 text-[#2a2e55] mx-auto mb-3" />
            <p className="text-[#6b6e99] text-sm">
              No {showRosteredPlayers ? 'players' : 'available free agents'} matched to {sourceInfo.shortLabel} values.
            </p>
          </Card>
        )}
        {filtered.map((row) => {
          const sug = row.suggestions.find((suggestion) => suggestion.strategy === strategy);
          if (!sug) return null;
          const player = playersQuery.data?.get(row.playerId);
          const weekly = weeklyContext.get(row.playerId);
          const byeWeek = getTeamByeWeek(league!.season, player?.team);
          const positionRanks = new Map<number, { rank: number; outOf: number }>();
          for (const [managerRosterId, ranks] of projectedPositionRanks) {
            const rank = ranks.find((item) => item.group === row.position);
            if (rank) positionRanks.set(managerRosterId, { rank: rank.rank, outOf: rank.outOf });
          }
          const biddingBaseline = resolveBiddingBaseline(row);
          const predictions = biddingProfiles.isReady && biddingProfiles.hasHistory
            && biddingBaseline != null
            ? buildManagerPredictions({
              profiles: biddingProfiles.profiles,
              baseline: biddingBaseline,
              rosters: rosters!,
              users: users!,
              initialFaab: ctx.budget,
              activeRosterIds,
              positionRanks,
            })
            : [];
          return (
            <WaiverPlayerCard
              key={row.playerId}
              row={row}
              strategy={strategy}
              remainingFaab={remainingFaab}
              nflTeam={player?.team}
              weeklyPoints={weekly?.points}
              weeklyRank={weekly?.positionRank}
              byeWeek={byeWeek}
              currentWeek={ctx.currentWeek}
              age={player?.age}
              status={player?.status}
              injuryStatus={player?.injury_status}
              owner={ownership.get(row.playerId)}
              selectedRosterId={rosterId}
              managerPredictions={predictions}
              managerDetails={managerDetails}
              managerLabels={managerLabels}
              showManagerPredictions={predictions.length > 0}
              sourceLabel={sourceInfo.shortLabel}
              rankingSource={rankingSource}
              canonicalHistory={canonicalHistoryByPlayer.get(row.playerId) ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}
