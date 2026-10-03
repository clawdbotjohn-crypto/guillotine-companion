import {
  MARKET_STRATEGIES as ALL_MARKET_STRATEGIES,
  type HeldOutScaleMetric,
  type MarketMetric,
  type MarketMetricGroup,
  type MarketStrategyId,
  type RatioSummary,
  type WeeklyMarketAnalysis,
  type WeeklyMarketView,
  type WeeklyTopThree,
  summarizeRatios,
} from './weekly-market-analysis.ts';

const OWNER_SUMMARY_STRATEGIES = ALL_MARKET_STRATEGIES.filter(([id]) => id !== 'middle-vorp');
const OWNER_SUMMARY_IDS = new Set(OWNER_SUMMARY_STRATEGIES.map(([id]) => id));

function ownerMetrics(metrics: MarketMetric[]): MarketMetric[] {
  return metrics.filter((row) => OWNER_SUMMARY_IDS.has(row.id));
}

function ownerClosest(metrics: MarketMetric[]): string {
  return ownerMetrics(metrics).reduce((best, row) => row.mae < best.mae ? row : best).label;
}

function number(value: number | null, digits = 2): string {
  return value != null && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>): string {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

function ratioList(summary: Record<MarketStrategyId, RatioSummary>): string {
  return OWNER_SUMMARY_STRATEGIES.map(([id, label]) => {
    const value = summary[id];
    return `${label} a/g/m ${number(value.arithmeticMean)}/${number(value.geometricMean)}/${number(value.median)}× (coverage ${value.defined}/${value.total})`;
  }).join('; ');
}

function pooledTopThree(weeks: WeeklyTopThree[], kind: 'winningRatios' | 'marketRatios'): Record<MarketStrategyId, RatioSummary> {
  return Object.fromEntries(ALL_MARKET_STRATEGIES.map(([id]) => [
    id,
    summarizeRatios(weeks.flatMap((week) => week.rows.map((row) => row[kind][id]))),
  ])) as Record<MarketStrategyId, RatioSummary>;
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${number(value)}`;
}

function fitList(metrics: MarketMetric[]): string {
  return ownerMetrics(metrics).map((row) =>
    `${row.label} R² ${number(row.rSquared, 2)}, MAE ${number(row.mae, 1)}, ρ ${number(row.spearman, 2)}, n=${row.n}`,
  ).join('; ');
}

function metricFor(metrics: MarketMetric[], label: string): MarketMetric {
  const metric = ownerMetrics(metrics).find((row) => row.label === label);
  if (!metric) throw new Error(`Missing owner-summary metric for ${label}`);
  return metric;
}

function weekMetric(view: WeeklyMarketView, week: number): MarketMetricGroup {
  const value = view.marketMetrics.find((row) => row.week === week);
  if (!value) throw new Error(`Missing market metrics for W${week}`);
  return value;
}

/** Exactly five owner-facing bullets, ordered before every detailed appendix section. */
export function plainFiveBulletAnswer(analysis: WeeklyMarketAnalysis): string[] {
  const view = analysis.ownerDirected;
  const weeks = [...view.topThree].sort((a, b) => a.week - b.week);
  if (!weeks.length) throw new Error('Five-bullet answer requires at least one eligible same-week snapshot');
  const latest = weeks.at(-1)!;
  const previous = weeks.at(-2);
  const latestMetrics = weekMetric(view, latest.week);
  const overall = view.marketMetrics.find((row) => row.week == null);
  if (!overall) throw new Error('Five-bullet answer requires cumulative market metrics');

  const latestLeader = ownerClosest(latestMetrics.metrics);
  const overallLeader = ownerClosest(overall.metrics);
  const latestLeaderMetric = metricFor(latestMetrics.metrics, latestLeader);
  const previousLeader = previous ? ownerClosest(weekMetric(view, previous.week).metrics) : null;
  const previousSameMetric = previous ? metricFor(weekMetric(view, previous.week).metrics, latestLeader) : null;
  const leaderChange = previous && previousLeader && previousSameMetric
    ? ` Versus W${previous.week}, ${latestLeader}'s MAE changed ${latestLeaderMetric.mae - previousSameMetric.mae >= 0 ? '+' : ''}${number(latestLeaderMetric.mae - previousSameMetric.mae, 1)}; leadership ${previousLeader === latestLeader ? 'was unchanged' : `changed ${previousLeader} → ${latestLeader}`}.`
    : ' No prior eligible week exists for a week-over-week comparison.';

  const trend = previous
    ? OWNER_SUMMARY_STRATEGIES.flatMap(([id]) => {
      const current = latest.marketMultipliers[id].arithmeticMean;
      const prior = previous.marketMultipliers[id].arithmeticMean;
      return current == null || prior == null ? [] : [current - prior];
    })
    : [];
  const up = trend.filter((delta) => delta > 0).length;
  const down = trend.filter((delta) => delta < 0).length;
  const trendText = previous && trend.length
    ? `Material trend W${previous.week}→W${latest.week}: serious-market top-three arithmetic multipliers rose for ${up}/${trend.length} comparable methods and fell for ${down}/${trend.length} (Δ range ${signed(Math.min(...trend))}× to ${signed(Math.max(...trend))}×).`
    : `Material trend: ${previous ? `W${previous.week} and W${latest.week} have no comparable multiplier coverage` : `only W${latest.week} is eligible`}, so no week-over-week direction can be claimed.`;

  return [
    `Newest supported week W${latest.week} top-three winning multipliers (arithmetic/geometric/median; coverage): ${ratioList(latest.winnerMultipliers)}. Pooled season-to-date top-three: ${ratioList(pooledTopThree(weeks, 'winningRatios'))}.`,
    `Newest supported week W${latest.week} top-three serious-market multipliers (arithmetic/geometric/median; coverage): ${ratioList(latest.marketMultipliers)}. Pooled season-to-date top-three: ${ratioList(pooledTopThree(weeks, 'marketRatios'))}.`,
    `Serious-market raw identity fit — W${latest.week}: ${fitList(latestMetrics.metrics)}. Cumulative: ${fitList(overall.metrics)}. R² is an unfitted prediction score, not fitted-regression R².`,
    `Closest current strategy: W${latest.week} ${latestLeader} (MAE ${number(latestLeaderMetric.mae, 1)}).${leaderChange} Cumulative leader: ${overallLeader} (MAE ${number(metricFor(overall.metrics, overallLeader).mae, 1)}).`,
    `${trendText} Recommendation: do not change any formula from this small reconstructed sample; treat shape and market scale separately. Provenance caveat: deterministic anonymized fixture from read-only Supabase tables projection_snapshot_runs and projection_snapshot_values and Sleeper GET /v1/league/[private], /v1/players/nfl, and /v1/league/[private]/transactions/{week}; same-week snapshots are reconstructed, not proof of the pre-waiver forecast.`,
  ];
}

function aggregateRows(week: WeeklyTopThree, kind: 'winnerMultipliers' | 'marketMultipliers'): Array<Array<string | number>> {
  return OWNER_SUMMARY_STRATEGIES.map(([id, label]) => {
    const summary = week[kind][id];
    return [label, `${summary.defined}/${summary.total}`, number(summary.arithmeticMean), number(summary.geometricMean), number(summary.median)];
  });
}

function metricRows(group: MarketMetricGroup, allBid = false): Array<Array<string | number>> {
  const metrics = allBid ? group.allBidMedianMetrics : group.metrics;
  return ownerMetrics(metrics).map((row) => [
    row.label,
    row.n,
    number(row.mae, 1),
    number(row.medianAbsoluteError, 1),
    `${row.signedBias > 0 ? '+' : ''}${number(row.signedBias, 1)}`,
    number(row.rSquared, 2),
    number(row.spearman, 2),
  ]);
}

function metricSummary(metrics: MarketMetric[]): string {
  return ownerMetrics(metrics).map((row) => `${row.label} MAE ${number(row.mae, 1)}`).join('; ');
}

function heldOutRows(metrics: HeldOutScaleMetric[]): Array<Array<string | number>> {
  return metrics.filter((row) => OWNER_SUMMARY_IDS.has(row.id)).map((row) => [
    row.label,
    `${row.fitWeek}→${row.testWeek}`,
    number(row.fittedMultiplier, 3),
    row.n,
    number(row.mae, 1),
    number(row.medianAbsoluteError, 1),
    `${row.signedBias > 0 ? '+' : ''}${number(row.signedBias, 1)}`,
    number(row.rSquared, 2),
    number(row.spearman, 2),
  ]);
}

function sensitivityLine(analysis: WeeklyMarketAnalysis): string {
  const without = analysis.ownerDirected.marketMetrics.find((row) => row.week == null)!;
  const withTarget = analysis.withExcludedTarget.marketMetrics.find((row) => row.week == null)!;
  return `Without ${analysis.exclusion.marker}: n=${without.seriousMedianClusters}, closest=${ownerClosest(without.metrics)} (${metricSummary(without.metrics)}). With the marked target: n=${withTarget.seriousMedianClusters}, closest=${ownerClosest(withTarget.metrics)} (${metricSummary(withTarget.metrics)}).`;
}

export function renderWeeklyMarketMarkdown(analysis: WeeklyMarketAnalysis): string {
  const view = analysis.ownerDirected;
  const bullets = plainFiveBulletAnswer(analysis).map((bullet) => `- ${bullet}`).join('\n');
  const topSections = view.topThree.map((week) => {
    const targetRows = week.rows.map((row) => [
      row.label,
      `$${row.winningBid}`,
      row.faabCensored ? 'yes' : 'no',
      ...OWNER_SUMMARY_STRATEGIES.map(([id]) => number(row.winningRatios[id])),
    ]);
    const marketRows = week.rows.map((row) => [
      row.label,
      row.seriousMedianBid == null ? '—' : `$${number(row.seriousMedianBid, 1)}`,
      `${row.seriousBidCount}/${row.allBidCount}`,
      row.censoredObservationCount,
      `$${number(row.allBidMedian, 1)}${row.allBidMedianMateriallyDifferent ? ' †' : ''}`,
      ...OWNER_SUMMARY_STRATEGIES.map(([id]) => number(row.marketRatios[id])),
    ]);
    return `### W${week.week} — Analysis A: top-three winning prices\n\n` +
      markdownTable(['Privacy-safe target', 'Winning bid', 'FAAB-censored?', ...OWNER_SUMMARY_STRATEGIES.map(([, label]) => `${label} ratio`)], targetRows) +
      `\n\n${markdownTable(['Strategy', 'Defined/total', 'Arithmetic mean ×', 'Geometric mean ×', 'Median ×'], aggregateRows(week, 'winnerMultipliers'))}\n\n` +
      `### W${week.week} — Analysis C: top-three median-market prices\n\n` +
      markdownTable(['Privacy-safe target', 'Serious median', 'Serious/all n', 'Censored observations', 'All-bid median', ...OWNER_SUMMARY_STRATEGIES.map(([, label]) => `${label} ratio`)], marketRows) +
      `\n\n${markdownTable(['Strategy', 'Defined/total', 'Arithmetic mean ×', 'Geometric mean ×', 'Median ×'], aggregateRows(week, 'marketMultipliers'))}\n\n` +
      `† All-bid median differs from the serious-bid median by at least $${analysis.policy.materialMedianDifferenceDollars}.`;
  }).join('\n\n');
  const marketSections = view.marketMetrics.map((group) => {
    const label = group.week == null ? 'Overall' : `W${group.week}`;
    return `### ${label}\n\n` +
      `Canonical winning-bid clusters: ${group.clusters}; closest=${ownerClosest(group.winningMetrics)}. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.\n\n` +
      markdownTable(['Strategy', 'n', 'MAE', 'Median AE', 'Bias (intrinsic−winning)', 'Raw prediction R²*', 'Spearman ρ'], ownerMetrics(group.winningMetrics).map((row) => [
        row.label, row.n, number(row.mae, 1), number(row.medianAbsoluteError, 1), `${row.signedBias > 0 ? '+' : ''}${number(row.signedBias, 1)}`, number(row.rSquared, 2), number(row.spearman, 2),
      ])) +
      `\n\nSerious median clusters: ${group.seriousMedianClusters}/${group.clusters}; closest=${ownerClosest(group.metrics)}.\n\n` +
      markdownTable(['Strategy', 'n', 'MAE', 'Median AE', 'Bias (intrinsic−market)', 'Raw prediction R²*', 'Spearman ρ'], metricRows(group)) +
      `\n\n**All-bid-median sensitivity** (${group.materiallyDifferentClusters} materially changed clusters; closest=${ownerClosest(group.allBidMedianMetrics)}):\n\n` +
      markdownTable(['Strategy', 'n', 'MAE', 'Median AE', 'Bias (intrinsic−market)', 'Raw prediction R²*', 'Spearman ρ'], metricRows(group, true));
  }).join('\n\n');
  const multiplierSections = view.clusterMultipliers.map((group) => {
    const scope = group.week == null ? 'Season aggregate' : `W${group.week}`;
    return `### ${scope} — ${group.observed}\n\n${markdownTable(
      ['Strategy', 'Defined/total', 'Arithmetic mean ×', 'Geometric mean ×', 'Median ×'],
      OWNER_SUMMARY_STRATEGIES.map(([id, label]) => {
        const summary = group.summaries[id];
        return [label, `${summary.defined}/${summary.total}`, number(summary.arithmeticMean), number(summary.geometricMean), number(summary.median)];
      }),
    )}`;
  }).join('\n\n');
  const heldOut = `### Prior-week-fitted held-out scale — canonical winners\n\n` +
    markdownTable(['Strategy', 'Fit→test week', 'Prior-week median multiplier', 'Test-week n', 'MAE', 'Median AE', 'Bias', 'Raw held-out R²*', 'Spearman ρ'], heldOutRows(view.heldOutScaleMetrics.winning)) +
    `\n\n### Prior-week-fitted held-out scale — serious medians\n\n` +
    markdownTable(['Strategy', 'Fit→test week', 'Prior-week median multiplier', 'Test-week n', 'MAE', 'Median AE', 'Bias', 'Raw held-out R²*', 'Spearman ρ'], heldOutRows(view.heldOutScaleMetrics.seriousMedian));
  return `## Five-bullet answer: weekly price multipliers\n\n${bullets}\n\n` +
`## Weekly top-three and median-market appendix\n\n` +
`This owner-directed view compares the four required owner-summary methods: **Max VORP, current-team VoRP, Corrected Safe, and Corrected Weeks as Starter**. Middle VORP is kept only in its separately labeled analysis appendix. Legacy Aggressive is excluded because it is derived from legacy Safe. Only events with an exact or explicitly reconstructed same-decision-week snapshot join are eligible; the eligible decision weeks are ${analysis.ownerDirected.eligibleWeeks.map((week) => `W${week}`).join(', ')}. “Serious” is strictly **bid > $5**. Ratios are **observed/intrinsic**, not intrinsic/observed. A zero intrinsic denominator is undefined, excluded from arithmetic/geometric/median aggregation, and counted in coverage. A winning or competing bid at its reconstructed pre-bid FAAB is marked as FAAB-censored because latent willingness may be higher.\n\n` +
`${topSections}\n\n` +
`## Analysis B: median serious market versus intrinsic strategy\n\n` +
`Each player/week cluster selects its highest canonical completed winner, then includes only legitimate failed competing claims proven against that winner in the same processing batch. Metrics use one median observation per eligible player/week, avoiding duplicate weight from contingency/drop paths or a second clearing cycle. **Raw prediction R²*** is the standard predictive score against the observed-mean baseline, but it is **not the R² from a fitted regression**: strategy dollars are held fixed on the identity line rather than refit to bids. It may be negative when fixed predictions are worse than the mean-only baseline; that does not mean negative correlation. R² and Spearman are shown only when at least two non-constant observations make them meaningful.\n\n` +
`${marketSections}\n\n` +
`## Weekly and season multiplier summaries\n\n${multiplierSections}\n\n` +
`## Prior-week-fitted held-out scale check\n\nEach multiplier is fit **only** as the prior eligible week's median observed/intrinsic ratio, then applied without refitting to the next eligible week. It is never fit and scored on the same observations. Raw held-out R²* retains the same prediction-score meaning.\n\n${heldOut}\n\n` +
`## Owner-directed exclusion sensitivity\n\n` +
`The underlying canonical evidence is retained. The primary view excludes only the deterministic anonymized marker **${analysis.exclusion.marker}**, established by ${analysis.exclusion.proof}; no private name or identifier is stored or printed. ${sensitivityLine(analysis)}\n\n` +
`## Shape × scale interpretation\n\n` +
`The four owner-summary strategies describe **target shape**—which players should cost relatively more—while the observed/intrinsic multipliers estimate a separate **market scale** for each week. The rank and error results can motivate a future model that combines strategy shape with a pooled week/market scale. They do **not** identify an individual manager style: ${analysis.ownerDirected.eligibleWeeks.length} reconstructed weeks and sparse manager histories are insufficient for that claim.\n`;
}
