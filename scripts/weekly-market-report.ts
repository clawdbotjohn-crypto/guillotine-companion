import {
  MARKET_STRATEGIES,
  type MarketMetric,
  type MarketMetricGroup,
  type MarketStrategyId,
  type RatioSummary,
  type WeeklyMarketAnalysis,
  type WeeklyMarketView,
  type WeeklyTopThree,
} from './weekly-market-analysis.ts';

function number(value: number | null, digits = 2): string {
  return value != null && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function markdownTable(headers: string[], rows: Array<Array<string | number>>): string {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

function ratioList(summary: Record<MarketStrategyId, RatioSummary>, field: keyof Pick<RatioSummary, 'arithmeticMean' | 'geometricMean' | 'median'> = 'arithmeticMean'): string {
  return MARKET_STRATEGIES.map(([id, label]) => `${label} ${number(summary[id][field])}× (${summary[id].defined}/${summary[id].total})`).join('; ');
}

function weekMetric(view: WeeklyMarketView, week: number): MarketMetricGroup {
  const value = view.marketMetrics.find((row) => row.week === week);
  if (!value) throw new Error(`Missing market metrics for W${week}`);
  return value;
}

/** Exactly five owner-facing bullets, ordered before every detailed appendix section. */
export function plainFiveBulletAnswer(analysis: WeeklyMarketAnalysis): string[] {
  const view = analysis.ownerDirected;
  const weeks = view.topThree;
  if (weeks.length !== 2) throw new Error(`Five-bullet fixture answer expects exactly two eligible same-week snapshots; got ${weeks.length}`);
  const overall = view.marketMetrics.find((row) => row.week == null)!;
  return [
    `Scope: W${weeks[0].week} and W${weeks[1].week} have same-week reconstructed snapshots. The top three are unique canonical winners after ${analysis.exclusion.marker} (${analysis.exclusion.proof}; proof matches=${analysis.exclusion.canonicalMatchCount}); the closest overall serious-median strategy is ${overall.closest}.`,
    `W${weeks[0].week} top-three winning-price arithmetic multipliers (observed/intrinsic): ${ratioList(weeks[0].winnerMultipliers)}.`,
    `W${weeks[1].week} top-three winning-price arithmetic multipliers (observed/intrinsic): ${ratioList(weeks[1].winnerMultipliers)}.`,
    `W${weeks[0].week} top-three serious-market-median arithmetic multipliers: ${ratioList(weeks[0].marketMultipliers)}; closest across all W${weeks[0].week} eligible market clusters: ${weekMetric(view, weeks[0].week).closest}.`,
    `W${weeks[1].week} top-three serious-market-median arithmetic multipliers: ${ratioList(weeks[1].marketMultipliers)}; closest across all W${weeks[1].week} eligible market clusters: ${weekMetric(view, weeks[1].week).closest}.`,
  ];
}

function aggregateRows(week: WeeklyTopThree, kind: 'winnerMultipliers' | 'marketMultipliers'): Array<Array<string | number>> {
  return MARKET_STRATEGIES.map(([id, label]) => {
    const summary = week[kind][id];
    return [label, `${summary.defined}/${summary.total}`, number(summary.arithmeticMean), number(summary.geometricMean), number(summary.median)];
  });
}

function metricRows(group: MarketMetricGroup, allBid = false): Array<Array<string | number>> {
  const metrics = allBid ? group.allBidMedianMetrics : group.metrics;
  return metrics.map((row) => [
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
  return metrics.map((row) => `${row.label} MAE ${number(row.mae, 1)}`).join('; ');
}

function sensitivityLine(analysis: WeeklyMarketAnalysis): string {
  const without = analysis.ownerDirected.marketMetrics.find((row) => row.week == null)!;
  const withTarget = analysis.withExcludedTarget.marketMetrics.find((row) => row.week == null)!;
  return `Without ${analysis.exclusion.marker}: n=${without.seriousMedianClusters}, closest=${without.closest} (${metricSummary(without.metrics)}). With the marked target: n=${withTarget.seriousMedianClusters}, closest=${withTarget.closest} (${metricSummary(withTarget.metrics)}).`;
}

export function renderWeeklyMarketMarkdown(analysis: WeeklyMarketAnalysis): string {
  const view = analysis.ownerDirected;
  const bullets = plainFiveBulletAnswer(analysis).map((bullet) => `- ${bullet}`).join('\n');
  const topSections = view.topThree.map((week) => {
    const targetRows = week.rows.map((row) => [
      row.label,
      `$${row.winningBid}`,
      row.faabCensored ? 'yes' : 'no',
      ...MARKET_STRATEGIES.map(([id]) => number(row.winningRatios[id])),
    ]);
    const marketRows = week.rows.map((row) => [
      row.label,
      row.seriousMedianBid == null ? '—' : `$${number(row.seriousMedianBid, 1)}`,
      `${row.seriousBidCount}/${row.allBidCount}`,
      row.censoredObservationCount,
      `$${number(row.allBidMedian, 1)}${row.allBidMedianMateriallyDifferent ? ' †' : ''}`,
      ...MARKET_STRATEGIES.map(([id]) => number(row.marketRatios[id])),
    ]);
    return `### W${week.week} — Analysis A: top-three winning prices\n\n` +
      markdownTable(['Privacy-safe target', 'Winning bid', 'FAAB-censored?', ...MARKET_STRATEGIES.map(([, label]) => `${label} ratio`)], targetRows) +
      `\n\n${markdownTable(['Strategy', 'Defined/total', 'Arithmetic mean ×', 'Geometric mean ×', 'Median ×'], aggregateRows(week, 'winnerMultipliers'))}\n\n` +
      `### W${week.week} — Analysis C: top-three median-market prices\n\n` +
      markdownTable(['Privacy-safe target', 'Serious median', 'Serious/all n', 'Censored observations', 'All-bid median', ...MARKET_STRATEGIES.map(([, label]) => `${label} ratio`)], marketRows) +
      `\n\n${markdownTable(['Strategy', 'Defined/total', 'Arithmetic mean ×', 'Geometric mean ×', 'Median ×'], aggregateRows(week, 'marketMultipliers'))}\n\n` +
      `† All-bid median differs from the serious-bid median by at least $${analysis.policy.materialMedianDifferenceDollars}.`;
  }).join('\n\n');
  const marketSections = view.marketMetrics.map((group) => {
    const label = group.week == null ? 'Overall' : `W${group.week}`;
    return `### ${label}\n\n` +
      `Serious median clusters: ${group.seriousMedianClusters}/${group.clusters}; closest=${group.closest}. Undefined strategy zeros are omitted strategy-by-strategy, so n is visible.\n\n` +
      markdownTable(['Strategy', 'n', 'MAE', 'Median AE', 'Bias (intrinsic−market)', 'R²', 'Spearman ρ'], metricRows(group)) +
      `\n\n**All-bid-median sensitivity** (${group.materiallyDifferentClusters} materially changed clusters; closest=${group.closestAllBid}):\n\n` +
      markdownTable(['Strategy', 'n', 'MAE', 'Median AE', 'Bias (intrinsic−market)', 'R²', 'Spearman ρ'], metricRows(group, true));
  }).join('\n\n');
  return `## Five-bullet answer: weekly price multipliers\n\n${bullets}\n\n` +
`## Weekly top-three and median-market appendix\n\n` +
`This owner-directed view compares only **Max VORP, VoRP, Safe, and Weeks as Starter**. Aggressive is excluded because it is derived from Safe. Only events with an exact decision-week snapshot join are eligible; W4 is absent because only a W3 fallback existed. “Serious” is strictly **bid > $5**. Ratios are **observed/intrinsic**, not intrinsic/observed. A zero intrinsic denominator is undefined, excluded from arithmetic/geometric/median aggregation, and counted in coverage. A winning or competing bid at its reconstructed pre-bid FAAB is marked as FAAB-censored because latent willingness may be higher.\n\n` +
`${topSections}\n\n` +
`## Analysis B: median serious market versus intrinsic strategy\n\n` +
`Each player/week cluster selects its highest canonical completed winner, then includes only legitimate failed competing claims proven against that winner in the same processing batch. Metrics use one median observation per eligible player/week, avoiding duplicate weight from contingency/drop paths or a second clearing cycle. R² is the unfitted identity-line diagnostic (and may be negative); it and Spearman are shown only when at least two non-constant observations make them meaningful.\n\n` +
`${marketSections}\n\n` +
`## Owner-directed exclusion sensitivity\n\n` +
`The underlying canonical evidence is retained. The primary view excludes only the deterministic anonymized marker **${analysis.exclusion.marker}**, established by ${analysis.exclusion.proof}; no private name or identifier is stored or printed. ${sensitivityLine(analysis)}\n\n` +
`## Shape × scale interpretation\n\n` +
`The four intrinsic strategies describe **target shape**—which players should cost relatively more—while the observed/intrinsic multipliers estimate a separate **market scale** for each week. The rank and error results can motivate a future model that combines strategy shape with a pooled week/market scale. They do **not** identify an individual manager style: two reconstructed weeks and sparse manager histories are insufficient for that claim.\n`;
}
