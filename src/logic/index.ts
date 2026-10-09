export {
  computeEliminations,
  getCompletedLeagueWeek,
  getUpcomingPlayingWeek,
  getActiveRosterIds,
  extractBids,
  isGuillotineLeague,
  type WeekResult,
  type TeamScore,
  type TeamInfo,
  type EliminationResult,
  type BidInfo,
} from './elimination';

export {
  buildLiveScoringModel,
  formatLiveUpdatedAt,
  getLiveFreshness,
  getLiveDataUpdatedAt,
  getLiveRefreshInterval,
  getRemainingGameFraction,
  isWithinLiveGameWindow,
  LIVE_FRESHNESS_MS,
  LIVE_REFRESH_MS,
  LIVE_STALE_MS,
  riskLabel,
  type LiveFreshness,
  type LiveProjectionQuality,
  type LiveScoringModel,
  type LiveTeamScore,
} from './liveScoring';

export {
  getProjectionScoring,
  getProjectionPoints,
  getRestOfSeasonStartWeek,
  sumRestOfSeasonProjections,
  buildWeeklyScoredPlayers,
  buildWeeklyProjectionContext,
  getTeamByeWeek,
  type ProjectionScoring,
  type RosPlayerProjection,
  type WeeklyScoredPlayer,
  type WeeklyPlayerProjection,
} from './projections';

export {
  RANKING_SOURCES,
  getReceptionScoring,
  hasSuperflex,
  getFantasyProsScoring,
  normalizePlayerName,
  buildExternalRankingMap,
  type WaiverRankingSource,
} from './rankingSources';

export {
  formatCurrentRank,
  formatProjectedCurrentRank,
  riskForActiveRank,
  getCurrentElimsPerWeek,
  parseLineupSlots,
  projectBestLineup,
  projectAllTeams,
  computeProjectedLineupGroupRanks,
  computePositionGroupRanks,
  computeHistoricalRanks,
  computeAllRosterHistoricalRanks,
  orderTeamProjections,
  type LineupSlots,
  type TeamProjection,
  type ProjectedLineupGroup,
  type ProjectedLineupGroupRank,
  type ProjectedLineupGroupRankings,
  type PosGroupRank,
  type HistoricalRank,
  type AllRosterHistoricalRank,
} from './analytics';

export {
  buildFreeAgentTeamImpact,
  type FreeAgentTeamImpact,
  type AvailableFreeAgentTeamImpact,
  type UnavailableFreeAgentTeamImpact,
  type TeamImpactMetric,
} from './teamImpact';

export {
  rankQuartile,
  faabQuartile,
  faabQuartileLabel,
  type QuartileBand,
  type FaabQuartileBand,
} from './rankingQuartiles';

export {
  resolvePlayerAcquisition,
  buildHubRosterRows,
  buildUpcomingByeWarnings,
  getHubByeWindowWeek,
  type AcquisitionKind,
  type PlayerAcquisition,
  type HubRosterRow,
  type HubByeWarning,
  type BuildHubRosterRowsOptions,
} from './hubRoster';

export {
  BIDDING_PROFILE_MODEL_V1,
  BIDDING_PROFILE_MODEL_V2,
  classifyCanonicalBidEvents,
  selectTopCanonicalBids,
  styleForMultiplier,
  evaluateBidEvidence,
  buildManagerBiddingProfiles,
  predictManagerBid,
  buildSnapshotRosProjections,
  buildHistoricalSetupContext,
  calculateHistoricalBaseline,
  type BidOutcome,
  type FaabReconstruction,
  type ManagerBidStyle,
  type ManagerBidConfidence,
  type CanonicalBidEvent,
  type HistoricalBaselineEvidence,
  type ManagerBidEvidence,
  type ManagerBiddingProfile,
  type ManagerBidPrediction,
} from './biddingProfiles';

export { BIDDING_BASELINE, DEFAULT_WAIVER_STRATEGY, WAIVER_STRATEGY_REGISTRY, resolveBiddingBaseline, resolveStrategyBid, type StrategyKey } from './waiverStrategies';

export {
  buildMaxVorpPlayerValues,
  buildModeledPositionRanks,
  collectRosterPlayerIds,
  summarizeRosterValue,
  rankActiveRosterValues,
  buildSelectedRosterValueDisplay,
  rankActiveRosterPositionValues,
  type RosterValueSummary,
  type RankedRosterValue,
  type SelectedRosterValueDisplay,
  type RosterPositionValueRank,
} from './playerValues';
