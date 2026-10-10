// Waivers page — recommended bids per strategy, weekly context, and predicted winning bid.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, ShoppingCart, Info, RefreshCw, UserCheck, Plus, Settings, Trash2 } from 'lucide-react';
import { Button, Card, Skeleton } from '../components/ui';
import { FaabOverBudgetWarning } from '../components/FaabOverBudgetWarning';
import { buildManagerDetailData, type ManagerDetailData } from '../logic/managerDetails';
import { PlayerDetailDialog, type PlayerProjectionState } from '../components/PlayerDetailDialog';
import { buildManagerPredictions, isEligibleBuyerPrediction, managerName, orderManagerPredictions, type ManagerPredictionDisplay } from '../logic/managerPredictionDisplay';
import { formatDisplayCurrency } from '../logic/displayCurrency';
import { ContextDisclosure } from '../components/ContextDisclosure';
import { getCustomRankingsForScope, getLastUsedCustomRanking, useAppStore, useCustomRankingStore, usePlayers } from '../store';
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
  buildFreeAgentTeamImpact,
  type EliminationResult,
  type WeeklyScoredPlayer,
  type WaiverRankingSource,
} from '../logic';
import type { League, Roster } from '../api/types';
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
  type WaiverPlayerRow,
} from '../logic/waivers';
import { getPlayerName, getPlayerPosition } from '../store/players';
import { useBiddingProfiles } from '../hooks/useBiddingProfiles';
import { usePlayerValues } from '../hooks/usePlayerValues';
import {
  getWaiverStrategyExplanation,
  WAIVER_STRATEGIES,
  type DisplayStrategyKey,
} from '../logic/waiverDisplay';
import { resolveBiddingBaseline } from '../logic/waiverStrategies';
import { formatWaiverSourceMetric } from '../logic/playerValueMetrics';
import {
  MAX_CUSTOM_RANKINGS,
  applyFrozenCustomRankingSnapshot,
  createCustomRanking,
  createDefaultCustomRankingConfig,
  customRankingConfigFromBoard,
  customRankingGeneratedSettingsChanged,
  customRankingValue,
  regenerateCustomRanking,
  sortCustomRankingPlayerIds,
  type CustomRanking,
  type CustomRankingConfig,
} from '../logic/customRankings';
import {
  ConfirmDeleteCustomRankingDialog,
  CustomRankingSettingsDialog,
  NewCustomRankingDialog,
} from '../components/CustomRankingDialogs';

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
  strategy: DisplayStrategyKey;
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

interface TeamImpactContext {
  rosters: readonly Roster[];
  league: League;
  elimination: EliminationResult;
  weeklyProjections: ReadonlyMap<string, WeeklyScoredPlayer> | null;
}

export function WaiverPlayerCard({
  row,
  strategy,
  customValue,
  onCustomValueCommit,
  remainingFaab,
  nflTeam,
  age,
  status,
  injuryStatus,
  weeklyPoints,
  weeklyRank,
  byeWeek,
  playingWeek,
  projectionState = 'loaded',
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
  teamImpactContext,
}: {
  row: WaiverPlayerRow;
  strategy: DisplayStrategyKey;
  customValue?: number;
  onCustomValueCommit?: (value: number) => void;
  remainingFaab: number | null;
  nflTeam?: string;
  age?: number | null;
  status?: string | null;
  injuryStatus?: string | null;
  weeklyPoints?: number;
  weeklyRank?: number;
  byeWeek?: number | null;
  playingWeek?: number | null;
  projectionState?: PlayerProjectionState;
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
  teamImpactContext?: TeamImpactContext;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const suggestion = strategy === 'custom' ? undefined : row.suggestions.find((item) => item.strategy === strategy);
  const value = strategy === 'custom' ? (customValue ?? 0) : (suggestion?.value ?? 0);
  const [customInput, setCustomInput] = useState<string | null>(null);
  const cancelCustomEditRef = useRef(false);
  const displayedCustomInput = customInput ?? String(value);
  const commitCustomValue = () => {
    if (cancelCustomEditRef.current) { cancelCustomEditRef.current = false; setCustomInput(null); return; }
    const parsed = Number(displayedCustomInput);
    const normalized = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : value;
    setCustomInput(null);
    if (normalized !== value) onCustomValueCommit?.(normalized);
  };
  const projectionWeek = playingWeek == null ? '—' : playingWeek;
  const weeklyProjection = projectionState === 'loading'
    ? 'Loading…'
    : projectionState === 'error' || projectionState === 'unavailable'
      ? 'Unavailable'
      : `${weeklyPoints == null || weeklyPoints === 0 ? '0' : weeklyPoints.toFixed(1)} pts`;
  const weeklyMeta = playingWeek != null
    ? `W${projectionWeek} ${weeklyProjection}${byeWeek != null ? ` · Bye W${byeWeek}` : ''}`
    : projectionState === 'loading'
      ? 'Projection loading…'
      : projectionState === 'error'
        ? 'Projection unavailable'
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
    : strategy === 'custom'
      ? `${row.name}, custom value ${formatDisplayCurrency(value)}. Open player details`
      : `${row.name}, suggested bid ${formatDisplayCurrency(value)}. Open player details`;
  const teamImpact = useMemo(() => {
    if (!detailsOpen || owner || !teamImpactContext) return undefined;
    return buildFreeAgentTeamImpact({
      playerId: row.playerId,
      playerPosition: row.position,
      selectedRosterId,
      rosters: teamImpactContext.rosters,
      league: teamImpactContext.league,
      elimination: teamImpactContext.elimination,
      weeklyProjections: teamImpactContext.weeklyProjections,
    });
  }, [
    detailsOpen,
    owner,
    row.playerId,
    row.position,
    selectedRosterId,
    teamImpactContext,
  ]);

  return (
    <>
      <Card hover className={`p-0 mb-2 overflow-hidden ${owner ? selectedTeamOwner ? 'border-[#10b981]/70' : 'border-[#2a2d4d]' : ''}`}>
        <div className="flex min-w-0 items-stretch">
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            aria-label={cardLabel}
            data-owner-highlight={owner ? selectedTeamOwner ? 'selected-team' : 'neutral' : undefined}
            className="min-w-0 flex-1 min-h-20 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#818cf8]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate text-sm font-semibold text-[#f0f0ff]">{row.name}</span>
                  {owner && <span role="img" aria-label="Rostered" className={`shrink-0 ${selectedTeamOwner ? 'text-[#6ee7b7]' : 'text-[#8b8eac]'}`}><UserCheck size={14} strokeWidth={1.75} aria-hidden="true" /></span>}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-[#6b6e99]">
                  {row.position} #{row.posRank} · {nflTeam || 'FA'}{playingWeek != null && weeklyRank != null ? ` · W${projectionWeek} #${weeklyRank}` : ''}
                </div>
                {weeklyMeta && <div className="mt-1 truncate text-[10px] text-[#8b8eac]">{weeklyMeta}</div>}
              </div>
              {strategy !== 'custom' && <div className="w-[8.75rem] shrink-0 rounded-lg bg-[#0c0f22] px-2.5 py-2 text-right" data-testid="compact-bid-summary">
                <div data-testid="suggested-bid-row" className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
                  <span className="text-[9px] text-[#6b6e99]">{owner ? 'Current value' : 'Suggested bid'}</span>
                  <span className="inline-flex items-center justify-end gap-1 font-['Space_Mono'] text-base font-bold tabular-nums text-[#10b981]">
                    {!owner && value > 0 && remainingFaab != null && value > remainingFaab && <FaabOverBudgetWarning />}
                    <span>{formatDisplayCurrency(value)}</span>
                  </span>
                </div>
                {owner && <div data-testid="rostered-owner" className="mt-0.5 truncate text-[9px] text-[#8b8eac]">{owner.ownerName}</div>}
                {showPrediction && <div className="mt-0.5 text-[10px] text-[#a5b4fc]">Predicted bid <span className="font-['Space_Mono']">${predictedBid}</span></div>}
              </div>}
            </div>
          </button>
          {strategy === 'custom' && <div className="flex w-[7.75rem] shrink-0 flex-col justify-center border-l border-[#2a2e55] bg-[#0c0f22] px-2.5 py-2 text-right sm:w-[8.75rem]" data-testid="custom-value-region">
            <label htmlFor={`custom-value-${row.playerId}`} className="text-[9px] text-[#6b6e99]">Custom value</label>
            <div className="mt-1 flex items-center rounded-lg border border-[#34386a] bg-[#11142b] px-2 focus-within:border-[#818cf8] focus-within:ring-1 focus-within:ring-[#818cf8]">
              <span className="font-['Space_Mono'] text-sm font-bold text-[#10b981]">$</span>
              <input
                id={`custom-value-${row.playerId}`}
                aria-label={`Custom value for ${row.name}`}
                inputMode="numeric"
                min="0"
                step="1"
                type="number"
                value={displayedCustomInput}
                onChange={(event) => { cancelCustomEditRef.current = false; setCustomInput(event.target.value); }}
                onBlur={commitCustomValue}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitCustomValue();
                  }
                  if (event.key === 'Escape') {
                    cancelCustomEditRef.current = true;
                    setCustomInput(null);
                    event.currentTarget.blur();
                  }
                }}
                className="min-h-9 min-w-0 w-full bg-transparent text-right font-['Space_Mono'] text-base font-bold tabular-nums text-[#10b981] outline-none"
              />
            </div>
            {showPrediction && <div className="mt-1 truncate text-[9px] text-[#a5b4fc]">Predicted bid ${predictedBid}</div>}
          </div>}
        </div>
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
          nextWeek: playingWeek ?? null,
          nextWeekPoints: weeklyPoints ?? null,
          projectionState,
          byeWeek: byeWeek ?? null,
          sourceLabel,
          valueLabel: sourceMetric.label,
          valueDisplay: sourceMetric.display,
          value: row.sourceValue,
          positionRank: row.posRank,
          owned: !!owner,
          ownerLabel: owner ? (selectedTeamOwner ? 'This player is on your selected roster.' : 'This player is currently rostered by another team.') : undefined,
          suggestedBid: owner || strategy === 'custom' ? null : value,
          customValue: !owner && strategy === 'custom' ? value : undefined,
          remainingFaab,
          teamImpact,
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
  const { leagueId, leagueSeason, rosterId, activeStrategy: strategy, setStrategy } = useAppStore();
  const customRankingState = useCustomRankingStore();
  const [newRankingOpen, setNewRankingOpen] = useState(false);
  const [newRankingConfig, setNewRankingConfig] = useState<CustomRankingConfig>(() => createDefaultCustomRankingConfig());
  const newRankingSourceOriginRef = useRef<WaiverRankingSource | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsConfig, setSettingsConfig] = useState<CustomRankingConfig | null>(null);
  const settingsSourceOriginRef = useRef<WaiverRankingSource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomRanking | null>(null);
  const leagueQuery = useLeague(leagueId);
  const usersQuery = useLeagueUsers(leagueId);
  const rostersQuery = useRosters(leagueId);
  const { data: league } = leagueQuery;
  const { data: users } = usersQuery;
  const { data: rosters } = rostersQuery;
  const playersQuery = usePlayers();
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(league, nflStateQuery.data);
  const matchupsQuery = useAllMatchups(leagueId, completedWeek);
  const { data: matchups, isLoading: matchupsLoading } = matchupsQuery;
  const transactionsQuery = useAllTransactions(leagueId, 18);
  const { data: transactions } = transactionsQuery;
  const [rankingSource, setRankingSource] = useState<WaiverRankingSource>('sleeper');
  const customSeason = league?.season ?? leagueSeason ?? '';
  const customRankings = leagueId && customSeason
    ? getCustomRankingsForScope(customRankingState, leagueId, customSeason)
    : [];
  const selectedCustomRanking = leagueId && customSeason
    ? getLastUsedCustomRanking(customRankingState, leagueId, customSeason)
    : undefined;

  const closeNewRankingDialog = () => {
    setNewRankingOpen(false);
    if (newRankingSourceOriginRef.current) setRankingSource(newRankingSourceOriginRef.current);
    newRankingSourceOriginRef.current = null;
  };
  const closeSettingsDialog = () => {
    setSettingsOpen(false);
    setSettingsConfig(null);
    if (settingsSourceOriginRef.current) setRankingSource(settingsSourceOriginRef.current);
    settingsSourceOriginRef.current = null;
  };

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
  const predictionDependenciesFetching = leagueQuery.isFetching
    || usersQuery.isFetching
    || rostersQuery.isFetching
    || playersQuery.isFetching
    || nflStateQuery.isFetching
    || matchupsQuery.isFetching
    || playerValuesModel.isFetching
    || weeklyProjectionQuery.isFetching;

  const biddingProfiles = useBiddingProfiles({
    leagueId,
    league,
    rosters,
    players: playersQuery.data,
    dependenciesFetching: predictionDependenciesFetching,
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
  const weeklyScoredPlayers = useMemo(() => weeklyProjectionQuery.data && league
    ? buildWeeklyScoredPlayers(
      weeklyProjectionQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      getPlayerPosition,
    )
    : null, [weeklyProjectionQuery.data, league]);
  const teamImpactContext = useMemo<TeamImpactContext | undefined>(() => (
    rosters && league && waiverContext
      ? {
        rosters,
        league,
        elimination: waiverContext.elim,
        weeklyProjections: weeklyScoredPlayers,
      }
      : undefined
  ), [rosters, league, waiverContext, weeklyScoredPlayers]);

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

  const sourceInfo = RANKING_SOURCES.find((source) => source.key === rankingSource)!;
  const sourceError = playersQuery.error
    || playerValuesModel.error
    || (rankingSource === 'sleeper' ? nflStateQuery.error : null);
  const dialogSourceUnavailable = !!sourceError
    || (seasonValues != null && seasonValues.size === 0)
    || (rankingSource === 'sleeper' && !!league && !!nflStateQuery.data && league.season !== nflStateQuery.data.season)
    || (rankingSource === 'sleeper' && projectionStartWeek != null && projectionStartWeek > 18);
  useEffect(() => {
    if (!dialogSourceUnavailable || (!newRankingOpen && !settingsOpen)) return;
    const newRankingSourceOrigin = newRankingSourceOriginRef.current;
    const settingsSourceOrigin = settingsSourceOriginRef.current;
    newRankingSourceOriginRef.current = null;
    settingsSourceOriginRef.current = null;
    queueMicrotask(() => {
      if (newRankingOpen) setNewRankingOpen(false);
      if (settingsOpen) {
        setSettingsOpen(false);
        setSettingsConfig(null);
      }
      setRankingSource(settingsSourceOrigin ?? newRankingSourceOrigin ?? rankingSource);
    });
  }, [dialogSourceUnavailable, newRankingOpen, rankingSource, settingsOpen]);

  if (!leagueId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-[#6b6e99] text-sm">Select a league first</p>
      </div>
    );
  }

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
  const currentRowsById = new Map(allRows.map((row) => [row.playerId, row]));
  const customSnapshotRows = selectedCustomRanking
    ? sortCustomRankingPlayerIds(selectedCustomRanking).map((playerId) => {
      const current = currentRowsById.get(playerId);
      if (current) return selectedCustomRanking.mode === 'position-curve'
        ? applyFrozenCustomRankingSnapshot(current, selectedCustomRanking.players[playerId])
        : current;
      const snapshot = selectedCustomRanking.players[playerId];
      return {
        playerId,
        name: snapshot.name,
        position: snapshot.position,
        posRank: snapshot.positionRank,
        rosPoints: 0,
        projectedPointsPerWeek: 0,
        sourceValue: snapshot.sourceValue,
        sourceRank: snapshot.sourceRank,
        starterWeeks: 0,
        possibleStarterWeeks: 0,
        suggestions: [],
        predictedWinningBid: 0,
      } satisfies WaiverPlayerRow;
    }).filter((row) => showRosteredPlayers || !ownership.has(row.playerId))
    : [];
  const displayRows = strategy === 'custom'
    ? customSnapshotRows
    : showRosteredPlayers ? allRows : availableRows;
  const positionRows = posFilter === 'ALL'
    ? displayRows
    : displayRows.filter((row) => row.position === posFilter);
  const filtered = strategy === 'custom'
    ? positionRows
    : sortWaiverRowsByStrategy(positionRows, strategy);
  const weeklyProjectionState: PlayerProjectionState = nflStateQuery.isLoading || weeklyProjectionQuery.isLoading
    ? 'loading'
    : nflStateQuery.isError || weeklyProjectionQuery.isError
      ? 'error'
      : projectionStartWeek == null
        ? 'unavailable'
        : 'loaded';
  const weeklyContext = weeklyProjectionQuery.data && playersQuery.data && league
    ? buildWeeklyProjectionContext(
      weeklyProjectionQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      (playerId) => playersQuery.data?.get(playerId)?.position,
    )
    : new Map();
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
  const customRankingDialogs = <>
    <NewCustomRankingDialog
      open={newRankingOpen}
      config={newRankingConfig}
      rows={allRows}
      atCap={customRankings.length >= MAX_CUSTOM_RANKINGS}
      existingNames={customRankings.map((item) => item.name)}
      onConfigChange={setNewRankingConfig}
      onSourceChange={setRankingSource}
      onClose={closeNewRankingDialog}
      onCreate={(config) => {
        if (!leagueId || !customSeason || rankingSource !== config.baseRankingSource) return;
        const id = globalThis.crypto?.randomUUID?.() ?? `custom-${Date.now()}`;
        const created = createCustomRanking({ id, leagueId, season: customSeason, config, rows: allRows, now: new Date().toISOString() });
        if (customRankingState.addBoard(created)) {
          setStrategy('custom');
          newRankingSourceOriginRef.current = null;
          setRankingSource(config.baseRankingSource);
          setNewRankingOpen(false);
        }
      }}
    />
    <CustomRankingSettingsDialog
      board={settingsOpen ? selectedCustomRanking ?? null : null}
      config={settingsConfig}
      rows={allRows}
      existingNames={customRankings.filter((item) => item.id !== selectedCustomRanking?.id).map((item) => item.name)}
      onConfigChange={setSettingsConfig}
      onSourceChange={setRankingSource}
      onClose={closeSettingsDialog}
      onSave={(config, preserveOverrides) => {
        if (!leagueId || !selectedCustomRanking) return;
        const generatedSettingsChanged = customRankingGeneratedSettingsChanged(selectedCustomRanking, config);
        if (generatedSettingsChanged) {
          if (rankingSource !== config.baseRankingSource) return;
          customRankingState.replaceBoard(regenerateCustomRanking(
            selectedCustomRanking,
            config,
            allRows,
            new Date().toISOString(),
            preserveOverrides,
          ));
        } else {
          customRankingState.updateBoardSettings(leagueId, customSeason, selectedCustomRanking.id, config);
        }
        const sourceAfterSave = generatedSettingsChanged
          ? config.baseRankingSource
          : settingsSourceOriginRef.current ?? rankingSource;
        settingsSourceOriginRef.current = null;
        setRankingSource(sourceAfterSave);
        setSettingsOpen(false);
        setSettingsConfig(null);
      }}
      onReset={(config) => {
        if (!selectedCustomRanking || rankingSource !== config.baseRankingSource) return;
        customRankingState.replaceBoard(regenerateCustomRanking(
          selectedCustomRanking,
          config,
          allRows,
          new Date().toISOString(),
          false,
        ));
        settingsSourceOriginRef.current = null;
        setRankingSource(config.baseRankingSource);
        setSettingsOpen(false);
        setSettingsConfig(null);
      }}
      onDelete={() => {
        setDeleteTarget(selectedCustomRanking ?? null);
        closeSettingsDialog();
      }}
    />
    <ConfirmDeleteCustomRankingDialog
      board={deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={() => {
        if (deleteTarget && leagueId) customRankingState.deleteBoard(leagueId, customSeason, deleteTarget.id);
        setDeleteTarget(null);
      }}
    />
  </>;

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
            onClick={() => {
              setStrategy(s.key);
              if (s.key === 'custom' && selectedCustomRanking) setRankingSource(selectedCustomRanking.baseRankingSource);
            }}
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

      {strategy === 'custom' && <div className="mb-3 flex items-center gap-2">
        <label htmlFor="custom-ranking-select" className="sr-only">Custom ranking</label>
        <select
          id="custom-ranking-select"
          aria-label="Custom ranking"
          value={selectedCustomRanking?.id ?? ''}
          disabled={customRankings.length === 0}
          onChange={(event) => {
            const board = customRankings.find((item) => item.id === event.target.value);
            if (!board || !leagueId || !customSeason) return;
            customRankingState.selectBoard(leagueId, customSeason, board.id);
            setRankingSource(board.baseRankingSource);
          }}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#2a2e55] bg-[#0e1025] px-3 py-2.5 text-xs text-[#f0f0ff] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]"
        >
          {customRankings.length === 0 && <option value="">No custom rankings</option>}
          {customRankings.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
        </select>
        <button type="button" disabled={customRankings.length >= MAX_CUSTOM_RANKINGS} onClick={() => {
          newRankingSourceOriginRef.current = rankingSource;
          setNewRankingConfig(createDefaultCustomRankingConfig(rankingSource, ctx.budget));
          setNewRankingOpen(true);
        }} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-[#34386a] px-3 text-xs font-semibold text-[#c7d2fe] disabled:opacity-40"><Plus size={15} /> New</button>
        <button type="button" aria-label="Custom ranking settings" disabled={!selectedCustomRanking} onClick={() => {
          if (!selectedCustomRanking) return;
          settingsSourceOriginRef.current = rankingSource;
          setRankingSource(selectedCustomRanking.baseRankingSource);
          setSettingsConfig(customRankingConfigFromBoard(selectedCustomRanking));
          setSettingsOpen(true);
        }} className="min-h-11 min-w-11 rounded-lg border border-[#2a2e55] text-[#a5b4fc] disabled:opacity-40"><Settings className="mx-auto" size={16} /></button>
        <button type="button" aria-label="Delete selected custom ranking" disabled={!selectedCustomRanking} onClick={() => setDeleteTarget(selectedCustomRanking ?? null)} className="min-h-11 min-w-11 rounded-lg border border-[#2a2e55] text-[#fda4af] disabled:opacity-40"><Trash2 className="mx-auto" size={16} /></button>
      </div>}

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
              {strategy === 'custom' && customRankings.length === 0
                ? 'Create a custom ranking to set your own player values.'
                : `No ${showRosteredPlayers ? 'players' : 'available free agents'} matched to ${strategy === 'custom' ? 'this custom ranking' : `${sourceInfo.shortLabel} values`}.`}
            </p>
          </Card>
        )}
        {filtered.map((row) => {
          const sug = strategy === 'custom' ? undefined : row.suggestions.find((suggestion) => suggestion.strategy === strategy);
          if (strategy !== 'custom' && !sug) return null;
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
              customValue={selectedCustomRanking ? customRankingValue(selectedCustomRanking, row.playerId) : undefined}
              onCustomValueCommit={selectedCustomRanking && leagueId ? (value) => customRankingState.setOverride(leagueId, customSeason, selectedCustomRanking.id, row.playerId, value) : undefined}
              remainingFaab={remainingFaab}
              nflTeam={player?.team}
              weeklyPoints={weekly?.points}
              weeklyRank={weekly?.positionRank}
              byeWeek={byeWeek}
              playingWeek={projectionStartWeek}
              projectionState={weeklyProjectionState}
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
              teamImpactContext={teamImpactContext}
            />
          );
        })}
      </div>
      {customRankingDialogs}
    </div>
  );
}
