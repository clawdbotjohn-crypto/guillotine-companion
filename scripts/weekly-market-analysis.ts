import {
  computeErrorMetrics,
  median,
  spearmanCorrelation,
  type EvaluatedBid,
} from './bidding-strategy-analysis.ts';

export const MARKET_STRATEGIES = [
  ['max-vorp', 'Max VORP'],
  ['middle-vorp', 'Middle VORP'],
  ['vorp', 'Current-team VoRP'],
  ['corrected-safe', 'Corrected Safe'],
  ['corrected-weeks-starter', 'Corrected Weeks as Starter'],
] as const;

export type MarketStrategyId = typeof MARKET_STRATEGIES[number][0];

/**
 * Owner-supplied exclusion proof. This intentionally contains only public analysis dimensions,
 * never a player/manager/league/transaction identifier. It must match exactly one canonical win.
 */
export const OWNER_DIRECTED_EXCLUSION = Object.freeze({
  marker: 'owner-directed-outlier-01',
  decisionWeek: 3,
  actualBid: 234,
  outcome: 'won' as const,
});

export const SERIOUS_BID_MINIMUM_EXCLUSIVE = 5;
export const MATERIAL_MEDIAN_DIFFERENCE_DOLLARS = 5;

export interface WeeklyAnalysisEvent {
  event: string;
  player: string;
  batch: string;
  decisionWeek: number;
  actualBid: number;
  outcome: 'won' | 'legitimate-loss';
  preBidFaab: number;
  suggestions: Record<MarketStrategyId, number> & Record<string, number>;
}

export interface RatioSummary {
  total: number;
  defined: number;
  arithmeticMean: number | null;
  geometricMean: number | null;
  median: number | null;
}

export interface TargetRatioRow {
  label: string;
  week: number;
  winningBid: number;
  seriousMedianBid: number | null;
  allBidMedian: number;
  seriousBidCount: number;
  allBidCount: number;
  allBidMedianMateriallyDifferent: boolean;
  faabCensored: boolean;
  censoredObservationCount: number;
  winningRatios: Record<MarketStrategyId, number | null>;
  marketRatios: Record<MarketStrategyId, number | null>;
}

export interface WeeklyTopThree {
  week: number;
  rows: TargetRatioRow[];
  winnerMultipliers: Record<MarketStrategyId, RatioSummary>;
  marketMultipliers: Record<MarketStrategyId, RatioSummary>;
}

export interface MarketMetric {
  id: MarketStrategyId;
  label: string;
  n: number;
  mae: number;
  medianAbsoluteError: number;
  signedBias: number;
  rSquared: number | null;
  spearman: number | null;
}

export interface MarketMetricGroup {
  week: number | null;
  clusters: number;
  seriousMedianClusters: number;
  metrics: MarketMetric[];
  winningMetrics: MarketMetric[];
  allBidMedianMetrics: MarketMetric[];
  closest: string | null;
  closestWinning: string | null;
  closestAllBid: string | null;
  materiallyDifferentClusters: number;
}

export interface ClusterMultiplierGroup {
  week: number | null;
  observed: 'winning' | 'serious-median';
  summaries: Record<MarketStrategyId, RatioSummary>;
}

export interface HeldOutScaleMetric extends MarketMetric {
  fitWeek: number;
  testWeek: number;
  scaleEstimator: 'median';
  fittedMultiplier: number;
}

export interface WeeklyMarketView {
  excludedOwnerDirected: boolean;
  eligibleWeeks: number[];
  topThree: WeeklyTopThree[];
  marketMetrics: MarketMetricGroup[];
  clusterMultipliers: ClusterMultiplierGroup[];
  heldOutScaleMetrics: {
    winning: HeldOutScaleMetric[];
    seriousMedian: HeldOutScaleMetric[];
  };
  marketClusterCount: number;
  seriousMedianClusterCount: number;
}

export interface WeeklyMarketAnalysis {
  policy: {
    seriousBidRule: string;
    materialMedianDifferenceDollars: number;
    ratioDefinition: string;
    zeroDenominatorRule: string;
    faabCensorRule: string;
  };
  exclusion: {
    marker: string;
    proof: string;
    canonicalMatchCount: number;
  };
  ownerDirected: WeeklyMarketView;
  withExcludedTarget: WeeklyMarketView;
}

interface Cluster {
  key: string;
  week: number;
  winner: WeeklyAnalysisEvent;
  events: WeeklyAnalysisEvent[];
  seriousMedian: number | null;
  allMedian: number;
  materiallyDifferent: boolean;
  isOwnerDirected: boolean;
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function ratio(observed: number | null, intrinsic: number): number | null {
  return observed != null && Number.isFinite(observed) && Number.isFinite(intrinsic) && intrinsic > 0
    ? observed / intrinsic : null;
}

export function summarizeRatios(values: Array<number | null>): RatioSummary {
  const defined = values.filter((value): value is number => value != null && Number.isFinite(value) && value >= 0);
  const arithmeticMean = mean(defined);
  const geometricMean = defined.length
    ? defined.some((value) => value === 0) ? 0 : Math.exp(defined.reduce((sum, value) => sum + Math.log(value), 0) / defined.length)
    : null;
  return {
    total: values.length,
    defined: defined.length,
    arithmeticMean,
    geometricMean,
    median: defined.length ? median(defined) : null,
  };
}

export function unfittedRSquared(actual: number[], predicted: number[]): number | null {
  if (actual.length !== predicted.length || actual.length < 2) return null;
  const actualMean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
  const sse = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const sst = actual.reduce((sum, value) => sum + (value - actualMean) ** 2, 0);
  return sst > 0 ? 1 - sse / sst : null;
}

function ownerProofMatch(event: WeeklyAnalysisEvent): boolean {
  return event.outcome === OWNER_DIRECTED_EXCLUSION.outcome
    && event.decisionWeek === OWNER_DIRECTED_EXCLUSION.decisionWeek
    && event.actualBid === OWNER_DIRECTED_EXCLUSION.actualBid;
}

function clusterKey(event: WeeklyAnalysisEvent): string {
  return `${event.decisionWeek}:${event.player}`;
}

function buildClusters(events: WeeklyAnalysisEvent[]): { clusters: Cluster[]; ownerMatchCount: number } {
  const ownerMatches = events.filter(ownerProofMatch);
  if (ownerMatches.length !== 1) {
    throw new Error(`Owner-directed anonymized proof must match exactly one canonical win; matched ${ownerMatches.length}`);
  }
  const ownerCluster = clusterKey(ownerMatches[0]);
  const groups = new Map<string, WeeklyAnalysisEvent[]>();
  for (const event of events) {
    const key = clusterKey(event);
    const rows = groups.get(key) ?? [];
    rows.push(event);
    groups.set(key, rows);
  }
  const clusters: Cluster[] = [];
  for (const [key, playerWeekRows] of groups) {
    const winners = playerWeekRows.filter((event) => event.outcome === 'won')
      .sort((a, b) => b.actualBid - a.actualBid || a.batch.localeCompare(b.batch) || a.event.localeCompare(b.event));
    if (!winners.length) continue;
    // A player can clear more than once in one decision week. Select the highest
    // canonical winning market and retain only legitimate competitors from that
    // winner's processing batch rather than mixing distinct auctions.
    const winner = winners[0];
    const rows = playerWeekRows.filter((event) => event.batch === winner.batch);
    const serious = rows.filter((event) => event.actualBid > SERIOUS_BID_MINIMUM_EXCLUSIVE).map((event) => event.actualBid);
    const all = rows.map((event) => event.actualBid);
    const seriousMedian = serious.length ? median(serious) : null;
    const allMedian = median(all);
    clusters.push({
      key,
      week: winner.decisionWeek,
      winner,
      events: [...rows].sort((a, b) => b.actualBid - a.actualBid || a.event.localeCompare(b.event)),
      seriousMedian,
      allMedian,
      materiallyDifferent: seriousMedian != null
        && Math.abs(seriousMedian - allMedian) >= MATERIAL_MEDIAN_DIFFERENCE_DOLLARS,
      isOwnerDirected: key === ownerCluster,
    });
  }
  clusters.sort((a, b) => a.week - b.week || b.winner.actualBid - a.winner.actualBid || a.key.localeCompare(b.key));
  return { clusters, ownerMatchCount: ownerMatches.length };
}

function observedValue(cluster: Cluster, observed: 'winning' | 'seriousMedian' | 'allMedian'): number | null {
  return observed === 'winning' ? cluster.winner.actualBid : cluster[observed];
}

function metricRows(
  clusters: Cluster[],
  observed: 'winning' | 'seriousMedian' | 'allMedian',
  multipliers?: Partial<Record<MarketStrategyId, number>>,
): MarketMetric[] {
  return MARKET_STRATEGIES.map(([id, label]) => {
    const rows: EvaluatedBid[] = clusters.flatMap((cluster) => {
      const actual = observedValue(cluster, observed);
      const intrinsic = cluster.winner.suggestions[id];
      const predicted = intrinsic * (multipliers?.[id] ?? 1);
      if (actual == null || intrinsic <= 0 || !Number.isFinite(predicted)) return [];
      return [{
        eventId: cluster.key,
        clusterId: cluster.key,
        strategy: id,
        actual,
        predicted,
        originalFaab: 1,
        preBidFaab: 1,
      }];
    });
    const metrics = computeErrorMetrics(rows);
    if (!metrics) {
      return { id, label, n: 0, mae: Number.NaN, medianAbsoluteError: Number.NaN, signedBias: Number.NaN, rSquared: null, spearman: null };
    }
    return {
      id,
      label,
      n: metrics.n,
      mae: metrics.mae,
      medianAbsoluteError: metrics.medianAbsoluteError,
      signedBias: metrics.signedBias,
      rSquared: unfittedRSquared(rows.map((row) => row.actual), rows.map((row) => row.predicted)),
      spearman: spearmanCorrelation(rows.map((row) => row.actual), rows.map((row) => row.predicted)),
    };
  });
}

function closest(metrics: MarketMetric[]): string | null {
  const ranked = metrics.filter((row) => Number.isFinite(row.mae))
    .sort((a, b) => a.mae - b.mae || a.label.localeCompare(b.label));
  return ranked[0]?.label ?? null;
}

function targetRow(cluster: Cluster, index: number): TargetRatioRow {
  const label = `W${cluster.week} target ${index + 1}`;
  return {
    label,
    week: cluster.week,
    winningBid: cluster.winner.actualBid,
    seriousMedianBid: cluster.seriousMedian,
    allBidMedian: cluster.allMedian,
    seriousBidCount: cluster.events.filter((event) => event.actualBid > SERIOUS_BID_MINIMUM_EXCLUSIVE).length,
    allBidCount: cluster.events.length,
    allBidMedianMateriallyDifferent: cluster.materiallyDifferent,
    faabCensored: cluster.winner.actualBid >= cluster.winner.preBidFaab,
    censoredObservationCount: cluster.events.filter((event) => event.actualBid >= event.preBidFaab).length,
    winningRatios: Object.fromEntries(MARKET_STRATEGIES.map(([id]) => [id, ratio(cluster.winner.actualBid, cluster.winner.suggestions[id])])) as Record<MarketStrategyId, number | null>,
    marketRatios: Object.fromEntries(MARKET_STRATEGIES.map(([id]) => [id, ratio(cluster.seriousMedian, cluster.winner.suggestions[id])])) as Record<MarketStrategyId, number | null>,
  };
}

function clusterMultiplierGroup(
  clusters: Cluster[],
  week: number | null,
  observed: 'winning' | 'serious-median',
): ClusterMultiplierGroup {
  const selected = week == null ? clusters : clusters.filter((cluster) => cluster.week === week);
  return {
    week,
    observed,
    summaries: Object.fromEntries(MARKET_STRATEGIES.map(([id]) => [id, summarizeRatios(selected.map((cluster) => {
      const actual = observed === 'winning' ? cluster.winner.actualBid : cluster.seriousMedian;
      return ratio(actual, cluster.winner.suggestions[id]);
    }))])) as Record<MarketStrategyId, RatioSummary>,
  };
}

function heldOutScaleMetrics(
  clusters: Cluster[],
  fitWeek: number,
  testWeek: number,
  observed: 'winning' | 'seriousMedian',
): HeldOutScaleMetric[] {
  const fitClusters = clusters.filter((cluster) => cluster.week === fitWeek && observedValue(cluster, observed) != null);
  const testClusters = clusters.filter((cluster) => cluster.week === testWeek && observedValue(cluster, observed) != null);
  const multipliers = Object.fromEntries(MARKET_STRATEGIES.map(([id]) => {
    const summary = summarizeRatios(fitClusters.map((cluster) => ratio(observedValue(cluster, observed), cluster.winner.suggestions[id])));
    return [id, summary.median];
  })) as Record<MarketStrategyId, number | null>;
  const validMultipliers = Object.fromEntries(Object.entries(multipliers).filter((entry): entry is [MarketStrategyId, number] => entry[1] != null));
  return metricRows(testClusters, observed, validMultipliers).flatMap((row) => {
    const fittedMultiplier = multipliers[row.id];
    return fittedMultiplier == null ? [] : [{ ...row, fitWeek, testWeek, scaleEstimator: 'median' as const, fittedMultiplier }];
  });
}

function buildView(allClusters: Cluster[], excludedOwnerDirected: boolean): WeeklyMarketView {
  const clusters = excludedOwnerDirected ? allClusters.filter((cluster) => !cluster.isOwnerDirected) : allClusters;
  const eligibleWeeks = [...new Set(clusters.map((cluster) => cluster.week))].sort((a, b) => a - b);
  const topThree = eligibleWeeks.map((week): WeeklyTopThree => {
    const weekClusters = clusters.filter((cluster) => cluster.week === week);
    const unique = new Map<string, Cluster>();
    for (const cluster of weekClusters) {
      const prior = unique.get(cluster.winner.player);
      if (!prior || cluster.winner.actualBid > prior.winner.actualBid
        || (cluster.winner.actualBid === prior.winner.actualBid && cluster.key.localeCompare(prior.key) < 0)) {
        unique.set(cluster.winner.player, cluster);
      }
    }
    const selected = [...unique.values()]
      .sort((a, b) => b.winner.actualBid - a.winner.actualBid || a.key.localeCompare(b.key))
      .slice(0, 3);
    const rows = selected.map(targetRow);
    return {
      week,
      rows,
      winnerMultipliers: Object.fromEntries(MARKET_STRATEGIES.map(([id]) => [id, summarizeRatios(rows.map((row) => row.winningRatios[id]))])) as Record<MarketStrategyId, RatioSummary>,
      marketMultipliers: Object.fromEntries(MARKET_STRATEGIES.map(([id]) => [id, summarizeRatios(rows.map((row) => row.marketRatios[id]))])) as Record<MarketStrategyId, RatioSummary>,
    };
  });
  const metricGroups = [null, ...eligibleWeeks].map((week): MarketMetricGroup => {
    const selected = week == null ? clusters : clusters.filter((cluster) => cluster.week === week);
    const metrics = metricRows(selected.filter((cluster) => cluster.seriousMedian != null), 'seriousMedian');
    const winningMetrics = metricRows(selected, 'winning');
    const allBidMedianMetrics = metricRows(selected, 'allMedian');
    return {
      week,
      clusters: selected.length,
      seriousMedianClusters: selected.filter((cluster) => cluster.seriousMedian != null).length,
      metrics,
      winningMetrics,
      allBidMedianMetrics,
      closest: closest(metrics),
      closestWinning: closest(winningMetrics),
      closestAllBid: closest(allBidMedianMetrics),
      materiallyDifferentClusters: selected.filter((cluster) => cluster.materiallyDifferent).length,
    };
  });
  const clusterMultipliers = [null, ...eligibleWeeks].flatMap((week) => [
    clusterMultiplierGroup(clusters, week, 'winning'),
    clusterMultiplierGroup(clusters, week, 'serious-median'),
  ]);
  const adjacentWeekPairs = eligibleWeeks.slice(1).map((testWeek, index) => ({
    fitWeek: eligibleWeeks[index],
    testWeek,
  }));
  return {
    excludedOwnerDirected,
    eligibleWeeks,
    topThree,
    marketMetrics: metricGroups,
    clusterMultipliers,
    heldOutScaleMetrics: {
      winning: adjacentWeekPairs.flatMap(({ fitWeek, testWeek }) => heldOutScaleMetrics(clusters, fitWeek, testWeek, 'winning')),
      seriousMedian: adjacentWeekPairs.flatMap(({ fitWeek, testWeek }) => heldOutScaleMetrics(clusters, fitWeek, testWeek, 'seriousMedian')),
    },
    marketClusterCount: clusters.length,
    seriousMedianClusterCount: clusters.filter((cluster) => cluster.seriousMedian != null).length,
  };
}

export function buildWeeklyMarketAnalysis(events: WeeklyAnalysisEvent[]): WeeklyMarketAnalysis {
  const { clusters, ownerMatchCount } = buildClusters(events);
  return {
    policy: {
      seriousBidRule: `canonical bid > $${SERIOUS_BID_MINIMUM_EXCLUSIVE}`,
      materialMedianDifferenceDollars: MATERIAL_MEDIAN_DIFFERENCE_DOLLARS,
      ratioDefinition: 'observed winning or serious-market median bid / intrinsic same-week strategy suggestion',
      zeroDenominatorRule: 'undefined and excluded from aggregates, with coverage reported',
      faabCensorRule: 'observed bid >= reconstructed pre-bid FAAB',
    },
    exclusion: {
      marker: OWNER_DIRECTED_EXCLUSION.marker,
      proof: `private GET-only catalog match plus exact position/total fingerprints in both reconstructed snapshots map uniquely to one canonical completed W${OWNER_DIRECTED_EXCLUSION.decisionWeek} win at $${OWNER_DIRECTED_EXCLUSION.actualBid}`,
      canonicalMatchCount: ownerMatchCount,
    },
    ownerDirected: buildView(clusters, true),
    withExcludedTarget: buildView(clusters, false),
  };
}
