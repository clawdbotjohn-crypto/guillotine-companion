// Waivers page — recommended bids per strategy, weekly context, and predicted winning bid.
import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ShoppingCart, Info, RefreshCw } from 'lucide-react';
import { Button, Card, Skeleton } from '../components/ui';
import { FaabOverBudgetWarning } from '../components/FaabOverBudgetWarning';
import { WaiverManagerPredictions } from '../components/ManagerBiddingProfiles';
import { buildManagerDetailData, type ManagerDetailData } from '../logic/managerDetails';
import { buildManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import { ContextDisclosure } from '../components/ContextDisclosure';
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
  getActiveRosterIds,
  getCompletedLeagueWeek,
  extractBids,
  getProjectionScoring,
  getRestOfSeasonStartWeek,
  sumRestOfSeasonProjections,
  buildExternalRankingMap,
  buildWeeklyProjectionContext,
  getTeamByeWeek,
  RANKING_SOURCES,
  buildWeeklyScoredPlayers,
  projectAllTeams,
  computeProjectedLineupGroupRanks,
  type WaiverRankingSource,
} from '../logic';
import {
  buildLeagueContext,
  buildVorpCalibration,
  buildWaiverBoard,
  calculateRemainingFaab,
  computeAvailablePlayers,
  computeRosteredPlayerOwners,
  getReplacementTeamBounds,
  getWeeksAsStarterBid,
  normalizeReplacementTeamTarget,
  sortWaiverRowsByStrategy,
  type RosteredPlayerOwner,
  type StrategyKey,
  type WaiverPlayerRow,
} from '../logic/waivers';
import { getPlayerName, getPlayerPosition } from '../store/players';
import { useBiddingProfiles } from '../hooks/useBiddingProfiles';
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

export function WaiverPlayerCard({
  row,
  strategy,
  remainingFaab,
  nflTeam,
  weeklyPoints,
  isUpcomingBye,
  byeWeek,
  currentWeek,
  owner,
  selectedRosterId,
  managerPredictions = [],
  managerDetails = new Map(),
  showManagerPredictions = false,
  getPlayerName: resolvePlayerName = getPlayerName,
}: {
  row: WaiverPlayerRow;
  strategy: StrategyKey;
  remainingFaab: number | null;
  nflTeam?: string | null;
  weeklyPoints?: number | null;
  weeklyRank?: number | null;
  isUpcomingBye?: boolean;
  byeWeek: number | null;
  currentWeek: number;
  injuryStatus?: string | null;
  owner?: RosteredPlayerOwner;
  selectedRosterId?: number | null;
  managerPredictions?: ManagerPredictionDisplay[];
  managerDetails?: ReadonlyMap<number, ManagerDetailData>;
  showManagerPredictions?: boolean;
  getPlayerName?: (playerId: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const suggestion = row.suggestions.find((item) => item.strategy === strategy);
  if (!suggestion) return null;
  const isOwnedBySelectedTeam = owner != null && owner.rosterId === selectedRosterId;
  const hasPositiveValue = suggestion.value != null && suggestion.value > 0;
  const hasManagerPredictions = !owner && hasPositiveValue && showManagerPredictions && managerPredictions.length > 0;
  const highestManagerPrediction = hasManagerPredictions
    ? Math.max(...managerPredictions.map((prediction) => prediction.predictedBid))
    : null;
  const canExpand = hasManagerPredictions;
  const nextWeek = currentWeek + 1;
  const projectionLabel = isUpcomingBye
    ? `W${nextWeek} bye`
    : weeklyPoints != null
      ? `W${nextWeek} ${weeklyPoints.toFixed(1)} pts`
      : `W${nextWeek} no projection`;
  const byeLabel = byeWeek == null ? 'Bye unavailable' : `Bye W${byeWeek}`;

  return (
    <Card hover={false} className={`${isOwnedBySelectedTeam ? 'border-[#10b981] border-l-4 border-l-[#10b981]' : ''}`}>
      <article
        aria-label={`${row.name}, ${owner ? `rostered by ${owner.ownerName}` : 'available'}${isOwnedBySelectedTeam ? ', owned by your selected team' : ''}`}
        aria-disabled={owner ? 'true' : undefined}
        data-owner-highlight={isOwnedBySelectedTeam ? 'selected-team' : 'neutral'}
      >
        <button
          type="button"
          aria-expanded={canExpand ? isOpen : undefined}
          aria-controls={canExpand ? `player-bids-${row.playerId}` : undefined}
          disabled={!canExpand}
          onClick={() => canExpand && setIsOpen((open) => !open)}
          className={`block w-full rounded-xl p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6366f1] ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-[#f0f0ff]">{row.name}</span>
                {owner && <span className="shrink-0 rounded bg-[rgba(100,116,139,0.18)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">Rostered</span>}
              </div>
              <p className="mt-0.5 truncate text-[10px] font-['Space_Mono'] text-[#8b8ec7]">
                {row.position} #{row.posRank}{nflTeam ? ` · ${nflTeam}` : ''}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[#6b6e99]">{projectionLabel} · {byeLabel}</p>
              {owner && <p className="mt-0.5 truncate text-[9px] text-[#6b6e99]">{owner.ownerName}</p>}
            </div>

            <div className="w-[8.75rem] shrink-0 rounded-lg bg-[#0c0f22] px-2.5 py-2 text-right" data-testid="compact-bid-summary">
              <div className="flex items-center justify-end gap-1 font-['Space_Mono'] text-base font-bold tabular-nums text-[#10b981]">
                {!owner && remainingFaab != null && suggestion.value != null && suggestion.value > remainingFaab && <FaabOverBudgetWarning />}
                <span>{suggestion.value == null ? 'Unavailable' : `$${suggestion.value}`}</span>
              </div>
              <p className="text-[9px] text-[#6b6e99]">{owner ? 'Current value' : 'Suggested bid'}</p>
              {highestManagerPrediction != null && (
                <p className="mt-1 text-[9px] font-semibold text-[#fbbf24]">
                  Predicted bid <span className="font-['Space_Mono'] tabular-nums">${highestManagerPrediction}</span>
                </p>
              )}
            </div>
            {canExpand && <ChevronDown size={14} className={`mt-3 shrink-0 text-[#6b6e99] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />}
          </div>
        </button>

        {canExpand && isOpen && (
          <div id={`player-bids-${row.playerId}`} className="animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="border-t border-[#1a1e3a] px-2.5 pb-2.5 pt-2">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8b8eb8]">Bid Predictions</h3>
              <WaiverManagerPredictions predictions={managerPredictions} detailsByRosterId={managerDetails} getPlayerName={resolvePlayerName} />
            </div>
          </div>
        )}
      </article>
    </Card>
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
  const { leagueId, rosterId } = useAppStore();
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

  const biddingProfiles = useBiddingProfiles({
    leagueId,
    league,
    rosters,
    players: playersQuery.data,
  });

  const [strategy, setStrategy] = useState<StrategyKey>(DEFAULT_WAIVER_STRATEGY);
  const [posFilter, setPosFilter] = useState('ALL');
  const [showRosteredPlayers, setShowRosteredPlayers] = useState(DEFAULT_SHOW_ROSTERED_PLAYERS);
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
    const boardOptions = {
      sleeperRosProjections: sleeperRosValues ?? undefined,
      replacementTeamCount: normalizedReplacementTarget,
      vorpCalibration,
    };
    const ownership = computeRosteredPlayerOwners(rosters, users!, elim);
    const allPositivePlayers = [...seasonValues.entries()]
      .filter(([, projection]) => projection.totalPoints > 0)
      .map(([playerId]) => playerId);
    return {
      ctx,
      remainingFaab,
      vorpCalibration,
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
  } = board;
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
          const isUpcomingBye = byeWeek != null && projectionStartWeek != null && byeWeek === projectionStartWeek;
          const positionRanks = new Map<number, { rank: number; outOf: number }>();
          for (const [managerRosterId, ranks] of projectedPositionRanks) {
            const rank = ranks.find((item) => item.group === row.position);
            if (rank) positionRanks.set(managerRosterId, { rank: rank.rank, outOf: rank.outOf });
          }
          const weeksAsStarterBaseline = getWeeksAsStarterBid(row);
          const predictions = biddingProfiles.hasHistory && !biddingProfiles.error
            && weeksAsStarterBaseline != null
            ? buildManagerPredictions({
              profiles: biddingProfiles.profiles,
              baseline: weeksAsStarterBaseline,
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
              isUpcomingBye={isUpcomingBye}
              byeWeek={byeWeek}
              currentWeek={ctx.currentWeek}
              injuryStatus={player?.injury_status}
              owner={ownership.get(row.playerId)}
              selectedRosterId={rosterId}
              managerPredictions={predictions}
              managerDetails={managerDetails}
              showManagerPredictions={predictions.length > 0}
            />
          );
        })}
      </div>
    </div>
  );
}
