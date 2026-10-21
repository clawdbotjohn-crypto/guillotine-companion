import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useAllMatchups,
  useAllTransactions,
  useLeague,
  useLeagueUsers,
  useNflState,
  useRosters,
  useWeeklyProjections,
} from '../api';
import { Card, Skeleton, StatusBadge } from '../components/ui';
import { usePlayerValues } from '../hooks/usePlayerValues';
import {
  buildRosPositionRankMap,
  buildWeeklyProjectionContext,
  buildWeeklyScoredPlayers,
  buildBiddingTeamStatusMap,
  projectAllTeams,
  classifyCanonicalBidEvents,
  computeEliminations,
  extractBids,
  getActiveRosterIds,
  getCompletedLeagueWeek,
  getProjectionScoring,
  getTeamByeWeek,
} from '../logic';
import {
  buildLeagueContext,
  buildMaxVorpCalibration,
  buildVorpCalibration,
  buildWaiverBoard,
  buildWaiverBoardModel,
  computeAvailablePlayers,
  computeRosteredPlayerOwners,
  type RosteredPlayerOwner,
  type WaiverPlayerRow,
} from '../logic/waivers';
import {
  buildWeeklyBidPlan,
  formatWeeklyLineupGain,
  type WeeklyBidPlan,
  type WeeklyBidRecommendation,
} from '../logic/weeklyBidPlan';
import { managerName } from '../logic/managerPredictionDisplay';
import { getPlayerName, getPlayerPosition } from '../store/players';
import { useAppStore, usePlayers } from '../store';
import { WaiverPlayerCard } from './WaiversPage';

export function WeeklyDropPlayerCard({
  row,
  owner,
  playingWeek,
  weeklyPoints,
  weeklyRank,
  nflTeam,
  age,
  status,
  injuryStatus,
  byeWeek,
  canonicalHistory,
  managerLabels,
  biddingTeamStatuses,
  selectedRosterId,
}: {
  row: WaiverPlayerRow;
  owner: RosteredPlayerOwner;
  playingWeek: number | null;
  weeklyPoints?: number;
  weeklyRank?: number;
  nflTeam?: string;
  age?: number | null;
  status?: string | null;
  injuryStatus?: string | null;
  byeWeek?: number | null;
  canonicalHistory?: ComponentProps<typeof WaiverPlayerCard>['canonicalHistory'];
  managerLabels?: ComponentProps<typeof WaiverPlayerCard>['managerLabels'];
  biddingTeamStatuses?: ComponentProps<typeof WaiverPlayerCard>['biddingTeamStatuses'];
  selectedRosterId?: number | null;
}) {
  return (
    <div
      className="min-w-0 bg-[#ef4444]/[0.045]"
      data-testid="weekly-drop-card"
      data-bid-action="drop"
      role="group"
      aria-label={`Drop ${row.name}`}
    >
      <div className="flex min-h-8 items-center gap-1.5 border-b border-[#ef4444]/25 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#f87171]" aria-hidden="true">
        <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span>Drop</span>
      </div>
      <WaiverPlayerCard
        row={row}
        strategy="safe"
        summaryMode="suggested-bids"
        showCompactBidSummary={false}
        embedded
        remainingFaab={null}
        nflTeam={nflTeam}
        age={age}
        status={status}
        injuryStatus={injuryStatus}
        weeklyPoints={weeklyPoints}
        weeklyRank={weeklyRank}
        byeWeek={byeWeek}
        playingWeek={playingWeek}
        owner={owner}
        selectedRosterId={selectedRosterId}
        suppressSelectedOwnerAccent
        sourceLabel="Sleeper ROS"
        rankingSource="sleeper"
        canonicalHistory={canonicalHistory}
        managerLabels={managerLabels}
        biddingTeamStatuses={biddingTeamStatuses}
      />
    </div>
  );
}

function formatWeeklyLineupGainAria(gain: number): string {
  if (gain > 0 && gain < 0.01) return 'greater than zero and less than 0.01 points';
  if (gain > 0) return `plus ${gain < 0.1 ? gain.toFixed(2) : gain.toFixed(1)} points`;
  if (gain < 0) return `minus ${Math.abs(gain).toFixed(1)} points`;
  return '0.0 points';
}

function targetRowWithBid(recommendation: WeeklyBidRecommendation): WaiverPlayerRow {
  const existingSafe = recommendation.target.suggestions.find((suggestion) => suggestion.strategy === 'safe');
  return {
    ...recommendation.target,
    suggestions: [
      ...recommendation.target.suggestions.filter((suggestion) => suggestion.strategy !== 'safe'),
      existingSafe
        ? { ...existingSafe, value: recommendation.suggestedBid }
        : { strategy: 'safe', label: 'Safe', value: recommendation.suggestedBid, pctOfBudget: null },
    ],
  };
}

export function WeeklyTargetCard({
  recommendation,
  playingWeek,
  remainingFaab,
  weeklyContext,
  players,
  season,
  selectedRosterId,
  canonicalHistory,
  managerLabels,
  biddingTeamStatuses,
  teamImpactContext,
  teamImpactScenario,
}: {
  recommendation: WeeklyBidRecommendation;
  playingWeek: number | null;
  remainingFaab: number;
  weeklyContext: ReturnType<typeof buildWeeklyProjectionContext>;
  players: ReturnType<typeof usePlayers>['data'];
  season: string;
  selectedRosterId?: number | null;
  canonicalHistory?: ComponentProps<typeof WaiverPlayerCard>['canonicalHistory'];
  managerLabels?: ComponentProps<typeof WaiverPlayerCard>['managerLabels'];
  biddingTeamStatuses?: ComponentProps<typeof WaiverPlayerCard>['biddingTeamStatuses'];
  teamImpactContext?: ComponentProps<typeof WaiverPlayerCard>['teamImpactContext'];
  teamImpactScenario?: ComponentProps<typeof WaiverPlayerCard>['teamImpactScenario'];
}) {
  const target = recommendation.target;
  const weekly = weeklyContext.get(target.playerId);
  const player = players?.get(target.playerId);
  const weeklyGainDisplay = formatWeeklyLineupGain(recommendation.weeklyGain);
  return (
    <div
      className="min-w-0 overflow-hidden rounded-xl border border-[#10b981]/45 bg-[#10b981]/[0.045]"
      data-testid="weekly-target-card"
      data-bid-action="add"
      role="group"
      aria-label={`Add ${target.name}; league rank ${recommendation.beforeRank} to ${recommendation.afterRank}; lineup gain ${formatWeeklyLineupGainAria(recommendation.weeklyGain)}; suggested bid $${recommendation.suggestedBid}`}
    >
      <div className="flex min-h-8 items-center gap-1.5 border-b border-[#10b981]/25 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#34d399]" aria-hidden="true">
        <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span>Add</span>
      </div>
      <WaiverPlayerCard
        row={targetRowWithBid(recommendation)}
        strategy="safe"
        summaryMode="suggested-bids"
        embedded
        remainingFaab={remainingFaab}
        nflTeam={player?.team}
        age={player?.age}
        status={player?.status}
        injuryStatus={player?.injury_status}
        weeklyPoints={weekly?.points}
        weeklyRank={weekly?.positionRank}
        byeWeek={getTeamByeWeek(season, player?.team)}
        playingWeek={playingWeek}
        selectedRosterId={selectedRosterId}
        sourceLabel="Sleeper ROS"
        rankingSource="sleeper"
        canonicalHistory={canonicalHistory}
        managerLabels={managerLabels}
        biddingTeamStatuses={biddingTeamStatuses}
        teamImpactContext={teamImpactContext}
        teamImpactScenario={teamImpactScenario}
      />
      <div className="grid grid-cols-1 gap-2 border-t border-[#10b981]/25 bg-[#081c1c]/55 px-3 py-2.5 sm:grid-cols-2" data-testid="weekly-target-impact">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8b8eac]">Next-week gain</span>
          <span className="whitespace-nowrap font-['Space_Mono'] text-sm font-bold text-[#6ee7b7]">{weeklyGainDisplay}</span>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 sm:block sm:text-right">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#8b8eac]">Overall rank</span>
          <span className="whitespace-nowrap font-['Space_Mono'] text-sm font-bold text-[#f0f0ff]">#{recommendation.beforeRank} → #{recommendation.afterRank}</span>
        </div>
      </div>
    </div>
  );
}

export function WeeklyBidAccordionGroup({
  id,
  dropPlayerName,
  targetCount,
  defaultOpen = false,
  dropCard,
  children,
}: {
  id: string;
  dropPlayerName: string;
  targetCount: number;
  defaultOpen?: boolean;
  dropCard: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-targets`;
  const targetCountLabel = `${targetCount} ${targetCount === 1 ? 'target' : 'targets'}`;
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[#2a2e55] bg-[#0b0d20]/80" data-testid="weekly-bid-accordion">
      <div className="min-w-0">{dropCard}</div>
      <button
        type="button"
        aria-label={`${targetCountLabel} for ${dropPlayerName}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-end gap-2 border-t border-[#2a2e55] bg-[#11142b] px-3 py-2 text-left font-['Space_Mono'] text-[10px] font-semibold text-[#8b8eac] transition-colors hover:bg-[#171a38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#818cf8]"
      >
        <span>{targetCountLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div id={panelId} hidden={!open} className="min-w-0 space-y-3 border-t border-[#2a2e55] p-3">
        {children}
      </div>
    </section>
  );
}

export function WeeklyBidSummary({ plan }: { plan: WeeklyBidPlan }) {
  const plannedPickupCount = plan.rows.filter((row) => row.kind === 'position').length;
  return (
    <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Suggested Bids summary">
      <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Survival status</p><div className="mt-1"><StatusBadge status={plan.startingRisk} /></div></Card>
      <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Projected rank</p><p className="mt-1 font-['Space_Mono'] text-lg font-bold text-[#a5b4fc]">{plan.startingRank}/{plan.activeTeamCount}</p></Card>
      <Card hover={false} className="p-3"><p className="text-[9px] uppercase tracking-wider text-[#6b6e99]">FAAB available</p><p className="mt-1 font-['Space_Mono'] text-lg font-bold text-[#10b981]">${plan.initialBudgetRemaining}</p></Card>
      <Card hover={false} className="p-3">
        <div role="group" aria-labelledby="planned-pickups-label" aria-describedby="planned-pickups-description">
          <p id="planned-pickups-label" className="text-[9px] uppercase tracking-wider text-[#6b6e99]">Recommended pickups</p>
          <p className="mt-1 font-['Space_Mono'] text-lg font-bold">{plannedPickupCount}</p>
          <p id="planned-pickups-description" className="sr-only">Conditional position-player pickups modeled</p>
        </div>
      </Card>
    </section>
  );
}

export function WeeklyBidPlanPage() {
  const navigate = useNavigate();
  const { leagueId, rosterId } = useAppStore();
  const leagueQuery = useLeague(leagueId);
  const usersQuery = useLeagueUsers(leagueId);
  const rostersQuery = useRosters(leagueId);
  const playersQuery = usePlayers();
  const nflStateQuery = useNflState();
  const completedWeek = getCompletedLeagueWeek(leagueQuery.data, nflStateQuery.data);
  const matchupsQuery = useAllMatchups(leagueId, completedWeek);
  const transactionsQuery = useAllTransactions(leagueId, 18);
  const valuesModel = usePlayerValues({
    league: leagueQuery.data,
    nflState: nflStateQuery.data,
    players: playersQuery.data,
    source: 'sleeper',
  });
  const playingWeek = valuesModel.startWeek;
  const weeklyQuery = useWeeklyProjections(
    leagueQuery.data?.season ?? null,
    playingWeek,
    !!leagueQuery.data && !!nflStateQuery.data
      && leagueQuery.data.season === nflStateQuery.data.season,
  );
  const canonicalHistoryByPlayer = useMemo(() => {
    const events = transactionsQuery.data && leagueQuery.data
      ? classifyCanonicalBidEvents(
        transactionsQuery.data,
        leagueQuery.data.settings?.waiver_budget ?? 1000,
      )
      : [];
    const byPlayer = new Map<string, typeof events>();
    for (const event of events) {
      const history = byPlayer.get(event.playerId) ?? [];
      history.push(event);
      byPlayer.set(event.playerId, history);
    }
    return byPlayer;
  }, [transactionsQuery.data, leagueQuery.data]);

  const model = useMemo(() => {
    const league = leagueQuery.data;
    const users = usersQuery.data;
    const rosters = rostersQuery.data;
    const players = playersQuery.data;
    const matchups = matchupsQuery.data;
    const ros = valuesModel.values;
    if (!league || !users || !rosters || !players || !matchups || !ros || !weeklyQuery.data
      || rosterId == null || playingWeek == null) return null;

    const elimination = computeEliminations(matchups, rosters, users);
    const activeRosterIds = getActiveRosterIds(elimination);
    const weekly = buildWeeklyScoredPlayers(
      weeklyQuery.data,
      getProjectionScoring(league.scoring_settings?.rec),
      getPlayerPosition,
    );
    const ctx = buildLeagueContext(league, elimination, playingWeek);
    const availablePlayerIds = computeAvailablePlayers(rosters, ros, elimination);
    const vorpCalibration = buildVorpCalibration(ros, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
    const maxVorpCalibration = buildMaxVorpCalibration(ros, ctx.startersPerPos, ctx.teamsRemaining, ctx.budget);
    const boardModel = buildWaiverBoardModel(ros, ctx);
    const availableRows = buildWaiverBoard(
      availablePlayerIds,
      ros,
      ctx,
      extractBids(transactionsQuery.data ?? new Map()),
      getPlayerName,
      {
        sleeperRosProjections: ros,
        replacementTeamCount: ctx.teamsRemaining,
        vorpCalibration,
        maxVorpCalibration,
        boardModel,
        maxPerPos: Number.POSITIVE_INFINITY,
      },
    );
    const rosPositionRanks = buildRosPositionRankMap(ros);
    const rosteredIds = new Set(rosters.flatMap((roster) => roster.players ?? []));
    const allAvailableIds = [...weekly.keys()].filter((playerId) => !rosteredIds.has(playerId));
    const streamRows: WaiverPlayerRow[] = allAvailableIds
      .filter((playerId) => ['DEF', 'K'].includes(weekly.get(playerId)?.position ?? ''))
      .map((playerId) => {
        const projection = weekly.get(playerId)!;
        const playerRos = ros.get(playerId);
        return {
          playerId,
          name: getPlayerName(playerId),
          position: projection.position,
          posRank: rosPositionRanks.get(playerId) ?? 0,
          rosPoints: playerRos?.totalPoints ?? projection.points,
          projectedPointsPerWeek: playerRos?.pointsPerWeek ?? projection.points,
          sourceValue: playerRos?.totalPoints ?? projection.points,
          starterWeeks: 0,
          possibleStarterWeeks: 0,
          suggestions: [{ strategy: 'safe', label: 'Safe', value: 0, pctOfBudget: 0 }],
          predictedWinningBid: 0,
        };
      });
    const biddingTeamStatuses = buildBiddingTeamStatusMap(
      elimination,
      projectAllTeams(rosters, weekly, league, elimination),
    );
    const plan = buildWeeklyBidPlan({
      selectedRosterId: rosterId,
      rosters,
      activeRosterIds,
      lineupPositions: league.roster_positions ?? [],
      weeklyProjections: weekly,
      rosProjections: ros,
      availableRows: [...availableRows, ...streamRows],
      availablePlayerIds: allAvailableIds,
      initialBudget: ctx.budget,
      eliminationsPerWeek: ctx.teamsRemaining > 16 ? 2 : 1,
      valueByPlayerId: new Map([...ros].map(([playerId, value]) => [playerId, value.totalPoints])),
      replacementByPosition: vorpCalibration?.replacementByPosition,
    });
    const rosteredRows = new Map<string, WaiverPlayerRow>();
    for (const playerId of rosters.find((roster) => roster.roster_id === rosterId)?.players ?? []) {
      const projection = ros.get(playerId);
      const position = projection?.position ?? getPlayerPosition(playerId) ?? '—';
      rosteredRows.set(playerId, {
        playerId,
        name: getPlayerName(playerId),
        position,
        posRank: rosPositionRanks.get(playerId) ?? 0,
        rosPoints: projection?.totalPoints ?? 0,
        projectedPointsPerWeek: projection?.pointsPerWeek ?? 0,
        sourceValue: projection?.sourceValue ?? projection?.totalPoints ?? 0,
        sourceRank: projection?.sourceRank,
        starterWeeks: 0,
        possibleStarterWeeks: 0,
        suggestions: [{ strategy: 'safe', label: 'Safe', value: 0, pctOfBudget: 0 }],
        predictedWinningBid: 0,
      });
    }
    return {
      plan,
      elimination,
      weeklyScoredPlayers: weekly,
      biddingTeamStatuses,
      rosteredRows,
      weeklyContext: buildWeeklyProjectionContext(
        weeklyQuery.data,
        getProjectionScoring(league.scoring_settings?.rec),
        (playerId) => players.get(playerId)?.position,
      ),
    };
  }, [
    leagueQuery.data,
    usersQuery.data,
    rostersQuery.data,
    playersQuery.data,
    matchupsQuery.data,
    valuesModel.values,
    weeklyQuery.data,
    rosterId,
    playingWeek,
    transactionsQuery.data,
  ]);

  const isLoading = leagueQuery.isLoading || usersQuery.isLoading || rostersQuery.isLoading
    || playersQuery.isLoading || nflStateQuery.isLoading || matchupsQuery.isLoading
    || valuesModel.isLoading || weeklyQuery.isLoading;
  const error = leagueQuery.error || usersQuery.error || rostersQuery.error || playersQuery.error
    || nflStateQuery.error || matchupsQuery.error || valuesModel.error || weeklyQuery.error;
  const close = () => navigate('/hub');
  const plan = model?.plan;
  const currentRosterPlayerIds = rostersQuery.data
    ?.find((roster) => roster.roster_id === rosterId)?.players ?? [];
  const firstActionablePositionGroup = plan?.rows.find((row) =>
    row.kind === 'position' && row.recommendations.length > 0);
  const teamImpactContext = rostersQuery.data && leagueQuery.data && model
    ? {
      rosters: rostersQuery.data,
      league: leagueQuery.data,
      elimination: model.elimination,
      weeklyProjections: model.weeklyScoredPlayers,
    }
    : undefined;
  const ownershipByPlayer = rostersQuery.data && usersQuery.data
    ? computeRosteredPlayerOwners(rostersQuery.data, usersQuery.data)
    : new Map<string, RosteredPlayerOwner>();
  const managerLabels = rostersQuery.data && usersQuery.data
    ? new Map(rostersQuery.data.map((roster) => [
      roster.roster_id,
      managerName(roster.roster_id, rostersQuery.data!, usersQuery.data!),
    ]))
    : new Map<number, string>();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06060f] px-4 pb-12 pt-4 text-[#f0f0ff] sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="sticky top-0 z-20 -mx-4 mb-5 flex items-center gap-3 border-b border-[#1a1e3a] bg-[#06060f]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <button type="button" onClick={close} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#a5b4fc] hover:bg-[#11142b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]" aria-label="Back to Hub">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-['Orbitron'] text-sm font-bold uppercase tracking-[0.08em]">Suggested Bids</h1>
          </div>
          <button type="button" onClick={close} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#8b8eb8] hover:bg-[#11142b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]" aria-label="Close Suggested Bids">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {isLoading && <div aria-label="Loading Suggested Bids"><Skeleton lines={6} /></div>}
        {!isLoading && error && (
          <Card hover={false} className="p-5">
            <h2 className="font-semibold">Suggested Bids unavailable</h2>
          </Card>
        )}
        {!isLoading && !error && !plan && (
          <Card hover={false} className="p-5">
            <h2 className="font-semibold">No Suggested Bids available</h2>
          </Card>
        )}
        {!isLoading && !error && plan && (
          <>
            <WeeklyBidSummary plan={plan} />
            {plan.rows.length === 0 ? (
              <Card hover={false} className="p-6 text-center">
                <h2 className="font-semibold">No Suggested Bids</h2>
              </Card>
            ) : (
              <section aria-label="Suggested Bids" className="min-w-0 space-y-4">
                {plan.rows.map((row) => {
                  const drop = playersQuery.data?.get(row.dropPlayerId);
                  const dropRow = model.rosteredRows.get(row.dropPlayerId);
                  const dropOwner = ownershipByPlayer.get(row.dropPlayerId);
                  const dropWeekly = model.weeklyContext.get(row.dropPlayerId);
                  if (!dropRow || !dropOwner) return null;
                  const groupKey = `${row.kind}-${row.dropPlayerId}`;
                  return (
                    <WeeklyBidAccordionGroup
                      key={groupKey}
                      id={`weekly-bid-${row.kind}-${row.dropPlayerId}`}
                      dropPlayerName={dropRow.name}
                      targetCount={row.recommendations.length}
                      defaultOpen={row === firstActionablePositionGroup}
                      dropCard={(
                        <WeeklyDropPlayerCard
                          row={dropRow}
                          owner={dropOwner}
                          playingWeek={playingWeek}
                          weeklyPoints={dropWeekly?.points}
                          weeklyRank={dropWeekly?.positionRank}
                          nflTeam={drop?.team}
                          age={drop?.age}
                          status={drop?.status}
                          injuryStatus={drop?.injury_status}
                          byeWeek={getTeamByeWeek(leagueQuery.data?.season ?? '', drop?.team)}
                          canonicalHistory={canonicalHistoryByPlayer.get(row.dropPlayerId) ?? []}
                          managerLabels={managerLabels}
                          biddingTeamStatuses={model?.biddingTeamStatuses}
                          selectedRosterId={rosterId}
                        />
                      )}
                    >
                      {row.recommendations.map((recommendation) => (
                        <WeeklyTargetCard
                          key={recommendation.target.playerId}
                          recommendation={recommendation}
                          playingWeek={playingWeek}
                          remainingFaab={row.scenarioBudgetBefore}
                          weeklyContext={model!.weeklyContext}
                          players={playersQuery.data}
                          season={leagueQuery.data?.season ?? ''}
                          selectedRosterId={rosterId}
                          canonicalHistory={canonicalHistoryByPlayer.get(recommendation.target.playerId) ?? []}
                          managerLabels={managerLabels}
                          biddingTeamStatuses={model?.biddingTeamStatuses}
                          teamImpactContext={teamImpactContext}
                          teamImpactScenario={{
                            selectedRosterPlayerIds: currentRosterPlayerIds,
                            explicitDropPlayerId: recommendation.dropPlayerId,
                          }}
                        />
                      ))}
                    </WeeklyBidAccordionGroup>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
