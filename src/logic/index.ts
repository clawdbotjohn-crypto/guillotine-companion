export {
  computeEliminations,
  getCompletedLeagueWeek,
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
  type AcquisitionKind,
  type PlayerAcquisition,
  type HubRosterRow,
  type HubByeWarning,
  type BuildHubRosterRowsOptions,
} from './hubRoster';

export {
  BIDDING_PROFILE_MODEL_V1,
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
