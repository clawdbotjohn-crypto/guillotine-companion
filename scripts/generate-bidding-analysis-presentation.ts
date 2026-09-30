import { spawnSync } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  STRATEGIES,
  contextFor,
  enrichEvents,
  evaluationRows,
  fixtureProjections,
  type AnalysisFixture,
  type EnrichedEvent,
  type StrategyId,
} from './analyze-bidding-strategies.ts';
import {
  ANALYSIS_POLICY,
  bootstrapMaeInterval,
  computeErrorMetrics,
  flagIsolatedOutliers,
  type ErrorMetrics,
  type EvaluatedBid,
} from './bidding-strategy-analysis.ts';
import {
  MARKET_STRATEGIES as ALL_MARKET_STRATEGIES,
  buildWeeklyMarketAnalysis,
  type WeeklyMarketAnalysis,
} from './weekly-market-analysis.ts';
import { plainFiveBulletAnswer } from './weekly-market-report.ts';
import { renderBehavioralAuditHtml } from './behavioral-audit.ts';
import {
  buildOfflinePlayerValues,
  commonHorizonTeamCount,
  rankCorrelation,
  summarizeDistribution,
  type OfflinePlayerValues,
} from './middle-vorp-analysis.ts';

const OWNER_SUMMARY_STRATEGIES = ALL_MARKET_STRATEGIES.filter(([id]) => id !== 'middle-vorp');
const OWNER_SUMMARY_IDS = new Set(OWNER_SUMMARY_STRATEGIES.map(([id]) => id));

const FIXTURE_PATH = 'scripts/fixtures/bidding-strategy-seamex-2026.json';
const HTML_PATH = 'docs/analysis/bidding-strategy-accuracy-seamex-2026.html';
const PDF_PATH = 'docs/analysis/bidding-strategy-accuracy-seamex-2026.pdf';

const STYLES: Record<StrategyId, { color: string; dash: string; marker: string }> = {
  'max-vorp': { color: '#126e82', dash: '', marker: 'circle' },
  'middle-vorp': { color: '#1f6a50', dash: '6 3', marker: 'hexagon' },
  vorp: { color: '#8a4f00', dash: '8 4', marker: 'square' },
  'corrected-safe': { color: '#345995', dash: '3 3', marker: 'diamond' },
  'corrected-weeks-starter': { color: '#7b2cbf', dash: '7 3', marker: 'triangle' },
  safe: { color: '#6941c6', dash: '2 4', marker: 'diamond' },
  aggressive: { color: '#c23831', dash: '10 3 2 3', marker: 'triangle' },
  'weeks-starter': { color: '#477a22', dash: '5 4', marker: 'cross' },
};

interface StrategyMetric {
  id: StrategyId;
  label: string;
  metrics: ErrorMetrics;
  interval: [number, number] | null;
}

interface SensitivityRow {
  label: string;
  shortLabel: string;
  n: number;
  metrics: StrategyMetric[];
}

export interface PresentationModel {
  fixtureLabel: string;
  dataThrough: string;
  budget: number;
  usable: EnrichedEvent[];
  wins: EnrichedEvent[];
  serious: EnrichedEvent[];
  seriousWins: EnrichedEvent[];
  competitive: EnrichedEvent[];
  coverage: Array<{ id: StrategyId; label: string; covered: number; total: number; rate: number }>;
  allMetrics: StrategyMetric[];
  winningMetrics: StrategyMetric[];
  seriousMetrics: StrategyMetric[];
  sensitivity: SensitivityRow[];
  managerRows: EvaluatedBid[];
  managerWinRows: EvaluatedBid[];
  managerMetrics: ErrorMetrics;
  managerWinMetrics: ErrorMetrics;
  sampleWinner: StrategyMetric;
  seriousSampleWinner: StrategyMetric;
  robustLeaders: string[];
  snapshotWeeks: number[];
  provenance: string;
  weeklyAnalysis: WeeklyMarketAnalysis;
  weeklyBullets: string[];
  currentState: {
    week: number;
    teamsRemaining: number;
    targetTeams: number;
    contentHash: string;
    projectionCount: number;
    rows: OfflinePlayerValues[];
  };
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function number(value: number | null, digits = 1): string {
  return value != null && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function strategyMetrics(events: EnrichedEvent[], budget: number): StrategyMetric[] {
  return STRATEGIES.map(([id, label]) => {
    const rows = evaluationRows(events, id, budget);
    const metrics = computeErrorMetrics(rows);
    if (!metrics) throw new Error(`No metrics for ${label}`);
    return { id, label, metrics, interval: bootstrapMaeInterval(rows) };
  });
}

function lowest(rows: StrategyMetric[]): StrategyMetric {
  return [...rows].sort((a, b) => a.metrics.mae - b.metrics.mae || a.label.localeCompare(b.label))[0];
}

export function rSquared(rows: Array<Pick<EvaluatedBid, 'actual' | 'predicted'>>): number | null {
  if (rows.length < 2) return null;
  const actualMean = rows.reduce((sum, row) => sum + row.actual, 0) / rows.length;
  const sse = rows.reduce((sum, row) => sum + (row.actual - row.predicted) ** 2, 0);
  const sst = rows.reduce((sum, row) => sum + (row.actual - actualMean) ** 2, 0);
  return sst > 0 ? 1 - sse / sst : null;
}

export function buildPresentationModel(fixture: AnalysisFixture): PresentationModel {
  const { usable } = enrichEvents(fixture);
  const budget = fixture.league.initialFaab;
  const wins = usable.filter((event) => event.outcome === 'won');
  const serious = usable.filter((event) => !event.token);
  const seriousWins = wins.filter((event) => !event.token);
  const clusterKey = (event: EnrichedEvent) => `${event.decisionWeek}:${event.batch}:${event.player}`;
  const clusterSizes = new Map<string, number>();
  for (const event of serious) clusterSizes.set(clusterKey(event), (clusterSizes.get(clusterKey(event)) ?? 0) + 1);
  const competitive = serious.filter((event) => (clusterSizes.get(clusterKey(event)) ?? 0) >= 2);
  const competitiveKeys = [...new Set(competitive.map(clusterKey))];
  const coverage = STRATEGIES.map(([id, label]) => {
    let covered = 0;
    for (const key of competitiveKeys) {
      const cluster = competitive.filter((event) => clusterKey(event) === key);
      const prediction = cluster[0].suggestions[id];
      const actuals = cluster.map((event) => event.actualBid);
      if (prediction >= Math.min(...actuals) && prediction <= Math.max(...actuals)) covered += 1;
    }
    return { id, label, covered, total: competitiveKeys.length, rate: covered / competitiveKeys.length };
  });
  const outliers = flagIsolatedOutliers(usable.map((event) => ({
    eventId: event.event, clusterId: clusterKey(event), actualBid: event.actualBid, originalFaab: budget,
  })));
  const sensitivitySubsets: Array<[string, string, EnrichedEvent[]]> = [
    ['All usable winning bids', 'All wins', wins],
    ['Non-token winning bids', 'Non-token', seriousWins],
    ['Non-token; ratio-gap flag removed', '− Ratio-gap', seriousWins.filter((event) => !outliers.ratioGap.has(event.event))],
    ['Non-token; MAD flag removed', '− MAD', seriousWins.filter((event) => !outliers.mad.has(event.event))],
    ['Non-token; IQR flag removed', '− IQR', seriousWins.filter((event) => !outliers.iqr.has(event.event))],
  ];
  const sensitivity = sensitivitySubsets.map(([label, shortLabel, events]) => ({
    label, shortLabel, n: events.length, metrics: strategyMetrics(events, budget),
  }));
  const managerRows = usable.filter((event) => event.managerForecast != null).map((event): EvaluatedBid => ({
    eventId: event.event,
    clusterId: clusterKey(event),
    strategy: 'walk-forward-manager',
    actual: event.actualBid,
    predicted: event.managerForecast!,
    originalFaab: budget,
    preBidFaab: Math.max(1, event.preBidFaab),
  }));
  const winIds = new Set(wins.map((event) => event.event));
  const managerWinRows = managerRows.filter((row) => winIds.has(row.eventId));
  const managerMetrics = computeErrorMetrics(managerRows);
  const managerWinMetrics = computeErrorMetrics(managerWinRows);
  if (!managerMetrics || !managerWinMetrics) throw new Error('Manager forecast subsets unexpectedly empty');
  const snapshotWeeks = fixture.snapshots.filter((snapshot) => snapshot.available).map((snapshot) => snapshot.requestedDecisionWeek);
  const winningMetrics = strategyMetrics(wins, budget);
  const seriousMetrics = strategyMetrics(serious, budget);
  const seriousSampleWinner = lowest(strategyMetrics(seriousWins, budget));
  const robustLeaders = sensitivity.slice(2).map((row) => lowest(row.metrics).label);
  const weeklyAnalysis = buildWeeklyMarketAnalysis(usable);
  const weeklyBullets = plainFiveBulletAnswer(weeklyAnalysis);
  const latestSnapshot = [...fixture.snapshots].filter((snapshot) => snapshot.available && snapshot.projections?.length)
    .sort((a, b) => b.requestedDecisionWeek - a.requestedDecisionWeek)[0];
  if (!latestSnapshot) throw new Error('Presentation requires a latest available projection snapshot');
  const latestContext = contextFor(fixture, latestSnapshot.requestedDecisionWeek);
  const currentState = {
    week: latestSnapshot.requestedDecisionWeek,
    teamsRemaining: latestContext.teamsRemaining,
    targetTeams: commonHorizonTeamCount(latestContext.teamsRemaining),
    contentHash: latestSnapshot.contentHash ?? 'missing-content-hash',
    projectionCount: latestSnapshot.projectionCount ?? latestSnapshot.projections!.length,
    rows: buildOfflinePlayerValues(fixtureProjections(latestSnapshot), latestContext),
  };
  return {
    fixtureLabel: fixture.competitionLabel,
    dataThrough: fixture.source.dataThrough,
    budget,
    usable,
    wins,
    serious,
    seriousWins,
    competitive,
    coverage,
    allMetrics: strategyMetrics(usable, budget),
    winningMetrics,
    seriousMetrics,
    sensitivity,
    managerRows,
    managerWinRows,
    managerMetrics,
    managerWinMetrics,
    sampleWinner: lowest(winningMetrics),
    seriousSampleWinner,
    robustLeaders,
    snapshotWeeks,
    provenance: `Reconstructed W${snapshotWeeks.join('–W')} projection snapshots • transaction-ledger FAAB • anonymized fixture v${fixture.fixtureVersion}`,
    weeklyAnalysis,
    weeklyBullets,
    currentState,
  };
}

function marker(x: number, y: number, id: StrategyId, size = 4): string {
  const style = STYLES[id];
  if (style.marker === 'square') return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="${style.color}"/>`;
  if (style.marker === 'diamond') return `<path d="M${x} ${y - size - 1} L${x + size + 1} ${y} L${x} ${y + size + 1} L${x - size - 1} ${y} Z" fill="${style.color}"/>`;
  if (style.marker === 'triangle') return `<path d="M${x} ${y - size - 1} L${x + size + 1} ${y + size} L${x - size - 1} ${y + size} Z" fill="${style.color}"/>`;
  if (style.marker === 'cross') return `<path d="M${x - size} ${y - size} L${x + size} ${y + size} M${x + size} ${y - size} L${x - size} ${y + size}" stroke="${style.color}" stroke-width="2.5"/>`;
  return `<circle cx="${x}" cy="${y}" r="${size}" fill="${style.color}"/>`;
}

function figure(title: string, metadata: string, svg: string, note = ''): string {
  return `<figure class="panel chart-panel"><div class="panel-heading"><div><p class="eyebrow">Evidence view</p><h3>${escapeHtml(title)}</h3></div></div>${svg}<figcaption><span>${escapeHtml(metadata)}</span>${note ? `<strong>${escapeHtml(note)}</strong>` : ''}</figcaption></figure>`;
}

function horizontalBars(
  title: string,
  rows: Array<{ id: StrategyId; label: string; value: number; secondary?: number }>,
  metadata: string,
  options: { suffix?: string; secondaryLabel?: string; primaryLabel?: string; note?: string; max?: number } = {},
): string {
  const width = 760, left = 155, right = 66, top = options.secondaryLabel ? 58 : 34;
  const rowHeight = options.secondaryLabel ? 48 : 36;
  const height = top + rows.length * rowHeight + 34;
  const maxValue = options.max ?? Math.max(...rows.flatMap((row) => [row.value, row.secondary ?? 0])) * 1.12;
  const plotWidth = width - left - right;
  const ticks = [0, .25, .5, .75, 1];
  const grid = ticks.map((tick) => {
    const x = left + plotWidth * tick;
    return `<line x1="${x}" y1="${top - 12}" x2="${x}" y2="${height - 26}" stroke="#d8d6cc"/><text x="${x}" y="${height - 8}" text-anchor="middle">${number(maxValue * tick, maxValue <= 1 ? 2 : 0)}${options.suffix ?? ''}</text>`;
  }).join('');
  const bars = rows.map((row, index) => {
    const y = top + index * rowHeight;
    const primaryWidth = Math.max(1, row.value / maxValue * plotWidth);
    const primary = `<rect x="${left}" y="${y}" width="${primaryWidth}" height="${options.secondaryLabel ? 14 : 20}" rx="3" fill="${STYLES[row.id].color}"/><text class="value" x="${Math.min(left + primaryWidth + 7, width - 42)}" y="${y + (options.secondaryLabel ? 11 : 15)}">${number(row.value, row.value <= 1 ? 2 : 1)}${options.suffix ?? ''}</text>`;
    const secondary = row.secondary == null ? '' : `<rect x="${left}" y="${y + 19}" width="${Math.max(1, row.secondary / maxValue * plotWidth)}" height="14" rx="3" fill="url(#hatch-${row.id})" stroke="${STYLES[row.id].color}"/><text class="value" x="${Math.min(left + row.secondary / maxValue * plotWidth + 7, width - 42)}" y="${y + 30}">${number(row.secondary, row.secondary <= 1 ? 2 : 1)}${options.suffix ?? ''}</text>`;
    return `<text class="row-label" x="${left - 12}" y="${y + (options.secondaryLabel ? 18 : 15)}" text-anchor="end">${escapeHtml(row.label)}</text>${primary}${secondary}`;
  }).join('');
  const patterns = rows.map((row) => `<pattern id="hatch-${row.id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="${STYLES[row.id].color}" stroke-width="3"/></pattern>`).join('');
  const legend = options.secondaryLabel ? `<g class="legend"><rect x="${left}" y="15" width="13" height="13" fill="#3a3d42"/><text x="${left + 19}" y="26">${escapeHtml(options.primaryLabel ?? 'Primary')}</text><rect x="${left + 150}" y="15" width="13" height="13" fill="url(#hatch-${rows[0].id})" stroke="#3a3d42"/><text x="${left + 169}" y="26">${escapeHtml(options.secondaryLabel)}</text></g>` : '';
  const svg = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${slug(title)}-title ${slug(title)}-desc"><title id="${slug(title)}-title">${escapeHtml(title)}</title><desc id="${slug(title)}-desc">Horizontal bar chart. Values are written beside every bar; lower MAE is better.</desc><defs>${patterns}</defs>${grid}${legend}${bars}</svg>`;
  return figure(title, metadata, svg, options.note);
}

function signedBiasChart(model: PresentationModel): string {
  const rows = model.winningMetrics;
  const width = 760, left = 155, right = 60, top = 34, rowHeight = 38, height = 260;
  const min = -30, max = 10, plotWidth = width - left - right;
  const scale = (value: number) => left + (value - min) / (max - min) * plotWidth;
  const zero = scale(0);
  const ticks = [-30, -20, -10, 0, 10].map((tick) => `<line x1="${scale(tick)}" y1="20" x2="${scale(tick)}" y2="${height - 28}" stroke="${tick === 0 ? '#23262b' : '#d8d6cc'}" stroke-width="${tick === 0 ? 2 : 1}"/><text x="${scale(tick)}" y="${height - 9}" text-anchor="middle">${tick > 0 ? '+' : ''}${tick}</text>`).join('');
  const marks = rows.map((row, index) => {
    const value = row.metrics.signedBias, x = scale(value), y = top + index * rowHeight;
    return `<text class="row-label" x="${left - 12}" y="${y + 15}" text-anchor="end">${escapeHtml(row.label)}</text><rect x="${Math.min(zero, x)}" y="${y}" width="${Math.max(2, Math.abs(x - zero))}" height="20" rx="3" fill="${STYLES[row.id].color}"/><text class="value" x="${value < 0 ? x - 6 : x + 6}" y="${y + 15}" text-anchor="${value < 0 ? 'end' : 'start'}">${value > 0 ? '+' : ''}${number(value, 1)}</text>`;
  }).join('');
  return figure('Signed bias on winning bids', `n=${model.wins.length} winning bids • ${model.provenance}`, `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="bias-title bias-desc"><title id="bias-title">Signed prediction bias</title><desc id="bias-desc">Negative bars indicate underprediction and positive bars overprediction. Values are dollars.</desc>${ticks}${marks}</svg>`, 'Negative = underpredicts; zero is ideal.');
}

function rankCoverageChart(model: PresentationModel): string {
  const rows = model.winningMetrics.map((row) => ({
    id: row.id,
    label: row.label,
    value: (row.metrics.spearman ?? 0) * 100,
    secondary: (model.coverage.find((item) => item.id === row.id)?.rate ?? 0) * 100,
  }));
  return horizontalBars('Rank signal and serious-cluster coverage', rows, `Rank: n=${model.wins.length} wins; coverage: n=${model.coverage[0].total} competitive target clusters • ${model.provenance}`, {
    suffix: '%', primaryLabel: 'Spearman ρ × 100', secondaryLabel: 'Inside observed range', max: 80,
    note: 'Higher is better; the two measures answer different questions.',
  });
}

function sensitivityChart(model: PresentationModel): string {
  const width = 760, height = 350, left = 62, right = 30, top = 46, bottom = 90;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const values = model.sensitivity.flatMap((row) => row.metrics.map((item) => item.metrics.mae));
  const min = Math.floor(Math.min(...values) / 5) * 5 - 5, max = Math.ceil(Math.max(...values) / 5) * 5 + 5;
  const x = (index: number) => left + index * plotWidth / (model.sensitivity.length - 1);
  const y = (value: number) => top + (max - value) / (max - min) * plotHeight;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = min + (max - min) * index / 4, yy = y(value);
    return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#d8d6cc"/><text x="${left - 10}" y="${yy + 4}" text-anchor="end">${number(value, 0)}</text>`;
  }).join('');
  const lines = STRATEGIES.map(([id, label]) => {
    const points = model.sensitivity.map((row, index) => ({ x: x(index), y: y(row.metrics.find((item) => item.id === id)!.metrics.mae) }));
    return `<path d="${points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ')}" fill="none" stroke="${STYLES[id].color}" stroke-width="3" stroke-dasharray="${STYLES[id].dash}"/>${points.map((point) => marker(point.x, point.y, id, 4)).join('')}<text x="${points.at(-1)!.x - 3}" y="${points.at(-1)!.y - 9}" text-anchor="end" fill="${STYLES[id].color}" font-weight="700">${escapeHtml(label)}</text>`;
  }).join('');
  const labels = model.sensitivity.map((row, index) => `<text transform="translate(${x(index) + 4} ${height - bottom + 18}) rotate(32)" text-anchor="start"><tspan>${escapeHtml(row.shortLabel)}</tspan><tspan x="0" dy="15">n=${row.n}</tspan></text>`).join('');
  const svg = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="sensitivity-title sensitivity-desc"><title id="sensitivity-title">Winning-bid MAE sensitivity</title><desc id="sensitivity-desc">Line chart comparing strategy MAE after token and three independently defined outlier filters. Lower is better; leaders are reported from each filter.</desc>${grid}<text x="16" y="${top + plotHeight / 2}" transform="rotate(-90 16 ${top + plotHeight / 2})" text-anchor="middle">MAE ($) — lower is better</text>${lines}${labels}</svg>`;
  return figure('Token and outlier sensitivity', `Winning subsets n=${model.sensitivity.map((row) => row.n).join('/')} in displayed order • ${model.provenance}`, svg, `Filter leaders in order: ${model.sensitivity.map((row) => lowest(row.metrics).label).join('; ')}. This is descriptive sensitivity, not default-selection proof.`);
}

function scatterPanel(title: string, rows: EvaluatedBid[], id: StrategyId | 'manager', maxValue: number, x0: number, y0: number, size: number): string {
  const pad = 34, inner = size - pad - 10;
  const sx = (value: number) => x0 + pad + value / maxValue * inner;
  const sy = (value: number) => y0 + size - pad - value / maxValue * inner;
  const color = id === 'manager' ? '#1f6a50' : STYLES[id].color;
  const points = rows.map((row) => `<circle cx="${sx(row.actual)}" cy="${sy(row.predicted)}" r="2.8" fill="${color}" fill-opacity=".5" stroke="#fff" stroke-width=".5"/>`).join('');
  const r2 = rSquared(rows);
  return `<g><text x="${x0 + 8}" y="${y0 + 16}" font-weight="800">${escapeHtml(title)}</text><text x="${x0 + 8}" y="${y0 + 31}" class="small">n=${rows.length} · prediction R²*=${r2 == null ? '—' : number(r2, 2)}</text><rect x="${x0 + pad}" y="${y0 + 38}" width="${inner}" height="${inner}" fill="#fbfaf6" stroke="#d8d6cc"/><line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(maxValue)}" y2="${sy(maxValue)}" stroke="#222" stroke-width="1.5" stroke-dasharray="5 4"/>${points}<text x="${x0 + pad + inner / 2}" y="${y0 + size - 4}" text-anchor="middle" class="small">Actual bid ($)</text><text x="${x0 + 9}" y="${y0 + 38 + inner / 2}" text-anchor="middle" class="small" transform="rotate(-90 ${x0 + 9} ${y0 + 38 + inner / 2})">Predicted ($)</text><text x="${sx(maxValue) - 2}" y="${sy(maxValue) + 12}" text-anchor="end" class="small">identity</text></g>`;
}

function smallMultiples(model: PresentationModel): string {
  const size = 244, gap = 8, width = size * 3 + gap * 2, height = size * Math.ceil(STRATEGIES.length / 3) + gap * (Math.ceil(STRATEGIES.length / 3) - 1);
  const maxValue = 300;
  const panels = STRATEGIES.map(([id, label], index) => scatterPanel(label, evaluationRows(model.wins, id, model.budget), id, maxValue, (index % 3) * (size + gap), Math.floor(index / 3) * (size + gap), size)).join('');
  const svg = `<svg class="chart scatter" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="scatter-title scatter-desc"><title id="scatter-title">Actual versus predicted winning bids by strategy</title><desc id="scatter-desc">Eight small-multiple scatter plots. Dashed diagonal is perfect prediction. Points below it underpredict; points above overpredict.</desc>${panels}</svg>`;
  return figure('Actual vs. predicted: where errors happen', `n=${model.wins.length} winning bids per strategy • reconstructed W${model.snapshotWeeks.join('–W')} • anonymized targets`, svg, '* Prediction R² is scored against the identity line with no regression refit. It is not fitted-regression R² and may be negative.');
}

function managerChart(model: PresentationModel): string {
  const width = 760, size = 310;
  const panels = scatterPanel('All forecastable bids', model.managerRows, 'manager', 250, 20, 5, size)
    + scatterPanel('Forecastable wins', model.managerWinRows, 'manager', 250, 395, 5, size);
  return figure('Manager-adjusted walk-forward forecasts', `n=${model.managerRows.length} all forecastable / n=${model.managerWinRows.length} wins • strict prior-batch subset • ${model.provenance}`, `<svg class="chart" viewBox="0 0 ${width} 320" role="img" aria-labelledby="manager-title manager-desc"><title id="manager-title">Manager adjusted forecasts</title><desc id="manager-desc">Two actual-versus-predicted scatter plots with identity lines. This subset is smaller than the intrinsic-strategy sample.</desc>${panels}</svg>`, 'Separate subset: 106 of 239 usable bids lacked sufficient prior-only manager evidence.');
}

function metricTable(title: string, rows: StrategyMetric[], subset: string, provenance: string): string {
  return `<div class="table-wrap"><table><caption><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subset)} • ${escapeHtml(provenance)}</span></caption><thead><tr><th scope="col">Strategy</th><th scope="col">n</th><th scope="col">MAE ↓</th><th scope="col">95% bootstrap MAE CI</th><th scope="col">Median AE ↓</th><th scope="col">Bias</th><th scope="col">Spearman ρ ↑</th><th scope="col">Within tolerance ↑</th><th scope="col">Actual range</th><th scope="col">Predicted range</th></tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><span class="swatch" style="--swatch:${STYLES[row.id].color}"></span>${escapeHtml(row.label)}</th><td>${row.metrics.n}</td><td>${number(row.metrics.mae)}</td><td>${row.interval ? `${number(row.interval[0])}–${number(row.interval[1])}` : '—'}</td><td>${number(row.metrics.medianAbsoluteError)}</td><td>${row.metrics.signedBias > 0 ? '+' : ''}${number(row.metrics.signedBias)}</td><td>${row.metrics.spearman == null ? '—' : number(row.metrics.spearman, 2)}</td><td>${number(row.metrics.withinToleranceRate * 100)}%</td><td>$${number(row.metrics.actualMin, 0)}–$${number(row.metrics.actualMax, 0)}</td><td>$${number(row.metrics.predictedMin, 0)}–$${number(row.metrics.predictedMax, 0)}</td></tr>`).join('')}</tbody></table></div>`;
}

function weeklyMultiplierChart(model: PresentationModel, kind: 'winner' | 'market'): string {
  const weeks = model.weeklyAnalysis.ownerDirected.topThree;
  const width = 760, height = 300, left = 54, right = 26, top = 40, bottom = 58;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.max(0.5, ...weeks.flatMap((week) => OWNER_SUMMARY_STRATEGIES.map(([id]) => (kind === 'winner'
    ? week.winnerMultipliers[id].arithmeticMean
    : week.marketMultipliers[id].arithmeticMean) ?? 0))) * 1.2;
  const y = (value: number) => top + (max - value) / max * plotHeight;
  const weekWidth = plotWidth / Math.max(1, weeks.length);
  const barWidth = Math.min(22, weekWidth / 6);
  const bars = weeks.map((week, weekIndex) => {
    const center = left + weekWidth * weekIndex + weekWidth / 2;
    const label = `<text x="${center}" y="${height - 18}" text-anchor="middle" class="row-label">W${week.week}</text>`;
    const perStrategy = OWNER_SUMMARY_STRATEGIES.map(([id], strategyIndex) => {
      const value = (kind === 'winner' ? week.winnerMultipliers[id].arithmeticMean : week.marketMultipliers[id].arithmeticMean) ?? 0;
      const barX = center - (OWNER_SUMMARY_STRATEGIES.length / 2) * (barWidth + 5) + strategyIndex * (barWidth + 5);
      return `<rect x="${barX}" y="${y(value)}" width="${barWidth}" height="${Math.max(1, top + plotHeight - y(value))}" rx="3" fill="${STYLES[id].color}"/><text x="${barX + barWidth / 2}" y="${y(value) - 4}" text-anchor="middle" class="small">${number(value, 2)}×</text>`;
    }).join('');
    return `<g>${label}${perStrategy}</g>`;
  }).join('');
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = max * (index / 4);
    const yy = y(value);
    return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#d8d6cc"/><text x="${left - 8}" y="${yy + 4}" text-anchor="end">${number(value, 1)}×</text>`;
  }).join('');
  const legend = OWNER_SUMMARY_STRATEGIES.map(([id, label], index) => `<g transform="translate(${left + index * 145} 14)"><rect width="12" height="12" fill="${STYLES[id].color}"/><text x="18" y="10">${escapeHtml(label)}</text></g>`).join('');
  const title = kind === 'winner' ? 'Weekly top-three winning multipliers' : 'Weekly top-three serious-market multipliers';
  const note = kind === 'winner'
    ? 'Arithmetic mean of winning/intrinsic ratios across each week\'s top-three unique winners.'
    : 'Arithmetic mean of serious-median/intrinsic ratios across each week\'s top-three unique winners.';
  const svg = `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${slug(title)}-title ${slug(title)}-desc"><title id="${slug(title)}-title">${escapeHtml(title)}</title><desc id="${slug(title)}-desc">Grouped bar chart for weekly arithmetic multipliers across the four required owner-summary methods.</desc>${grid}${legend}${bars}</svg>`;
  return figure(title, `Owner-directed view (${model.weeklyAnalysis.exclusion.marker} excluded); same-week snapshots only • ${model.provenance}`, svg, note);
}

function weeklyMultiplierTable(model: PresentationModel): string {
  const rows = model.weeklyAnalysis.ownerDirected.topThree.flatMap((week) => [
    ...OWNER_SUMMARY_STRATEGIES.map(([id, label]) => ({ week: week.week, observed: 'Winning bid', label, summary: week.winnerMultipliers[id] })),
    ...OWNER_SUMMARY_STRATEGIES.map(([id, label]) => ({ week: week.week, observed: 'Serious-market median', label, summary: week.marketMultipliers[id] })),
  ]).map((row) => `<tr><th scope="row">W${row.week}</th><td>${row.observed}</td><td>${escapeHtml(row.label)}</td><td>${row.summary.defined}/${row.summary.total}</td><td>${number(row.summary.arithmeticMean, 2)}×</td><td>${number(row.summary.geometricMean, 2)}×</td><td>${number(row.summary.median, 2)}×</td></tr>`).join('');
  return `<div class="table-wrap"><table><caption><strong>Exact weekly top-three multipliers</strong><span>Observed/intrinsic; arithmetic mean is primary, with geometric mean, median, and zero-denominator coverage.</span></caption><thead><tr><th scope="col">Week</th><th scope="col">Observation</th><th scope="col">Strategy</th><th scope="col">Coverage</th><th scope="col">Arithmetic mean</th><th scope="col">Geometric mean</th><th scope="col">Median</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function weeklyMarketMetricTable(model: PresentationModel): string {
  const groups = model.weeklyAnalysis.ownerDirected.marketMetrics;
  const rows = groups.flatMap((group) => [
    ...group.winningMetrics.filter((metric) => OWNER_SUMMARY_IDS.has(metric.id)).map((metric) => ({ scope: group.week == null ? 'Overall' : `W${group.week}`, observation: 'Canonical winner', closest: group.closestWinning, metric })),
    ...group.metrics.filter((metric) => OWNER_SUMMARY_IDS.has(metric.id)).map((metric) => ({ scope: group.week == null ? 'Overall' : `W${group.week}`, observation: 'Serious median', closest: group.closest, metric })),
    ...group.allBidMedianMetrics.filter((metric) => OWNER_SUMMARY_IDS.has(metric.id)).map((metric) => ({ scope: group.week == null ? 'Overall' : `W${group.week}`, observation: 'All-bid sensitivity', closest: group.closestAllBid, metric })),
  ]).map(({ scope, observation, closest, metric }) => `<tr><th scope="row">${scope}</th><td>${observation}</td><td>${escapeHtml(metric.label)}${metric.label === closest ? ' ★' : ''}</td><td>${metric.n}</td><td>${number(metric.mae, 1)}</td><td>${number(metric.medianAbsoluteError, 1)}</td><td>${metric.signedBias > 0 ? '+' : ''}${number(metric.signedBias, 1)}</td><td>${number(metric.rSquared, 2)}</td><td>${number(metric.spearman, 2)}</td></tr>`).join('');
  return `<div class="table-wrap"><table><caption><strong>Median-market fit: overall, by week, and all-bid sensitivity</strong><span>★ lowest MAE within scope; bias = intrinsic − observed. Raw prediction R²* uses fixed strategy dollars with no regression refit.</span></caption><thead><tr><th scope="col">Scope</th><th scope="col">Observation</th><th scope="col">Strategy</th><th scope="col">n</th><th scope="col">MAE</th><th scope="col">Median AE</th><th scope="col">Bias</th><th scope="col">Raw prediction R²*</th><th scope="col">Spearman ρ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function clusterMultiplierTable(model: PresentationModel): string {
  const rows = model.weeklyAnalysis.ownerDirected.clusterMultipliers.flatMap((group) => OWNER_SUMMARY_STRATEGIES.map(([id, label]) => {
    const summary = group.summaries[id];
    return `<tr><th scope="row">${group.week == null ? 'Season' : `W${group.week}`}</th><td>${group.observed === 'winning' ? 'Canonical winner' : 'Serious median'}</td><td>${escapeHtml(label)}</td><td>${summary.defined}/${summary.total}</td><td>${number(summary.arithmeticMean, 3)}</td><td>${number(summary.geometricMean, 3)}</td><td>${number(summary.median, 3)}</td></tr>`;
  })).join('');
  return `<div class="table-wrap"><table><caption><strong>Weekly and season multipliers</strong><span>Observed bid divided by intrinsic suggestion; arithmetic, geometric, and median summaries are all shown.</span></caption><thead><tr><th>Scope</th><th>Observation</th><th>Strategy</th><th>Defined/total</th><th>Arithmetic ×</th><th>Geometric ×</th><th>Median ×</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function heldOutScaleTable(model: PresentationModel): string {
  const groups = [
    ['Canonical winner', model.weeklyAnalysis.ownerDirected.heldOutScaleMetrics.winning],
    ['Serious median', model.weeklyAnalysis.ownerDirected.heldOutScaleMetrics.seriousMedian],
  ] as const;
  const rows = groups.flatMap(([observation, metrics]) => metrics.filter((metric) => OWNER_SUMMARY_IDS.has(metric.id)).map((metric) => `<tr><th scope="row">${observation}</th><td>${escapeHtml(metric.label)}</td><td>W${metric.fitWeek}→W${metric.testWeek}</td><td>${number(metric.fittedMultiplier, 3)}×</td><td>${metric.n}</td><td>${number(metric.mae, 1)}</td><td>${metric.signedBias > 0 ? '+' : ''}${number(metric.signedBias, 1)}</td><td>${number(metric.rSquared, 2)}</td><td>${number(metric.spearman, 2)}</td></tr>`)).join('');
  return `<div class="table-wrap"><table><caption><strong>Prior-week-fitted held-out scale</strong><span>Each prior eligible week's median multiplier is fit once, then applied to the next eligible week without refitting. Raw held-out R²* remains an unfitted prediction score.</span></caption><thead><tr><th>Observation</th><th>Strategy</th><th>Fit→test</th><th>Multiplier</th><th>n</th><th>MAE</th><th>Bias</th><th>Raw R²*</th><th>ρ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function exclusionSensitivity(model: PresentationModel): string {
  const owner = model.weeklyAnalysis.ownerDirected.marketMetrics.find((row) => row.week == null)!;
  const raw = model.weeklyAnalysis.withExcludedTarget.marketMetrics.find((row) => row.week == null)!;
  const rows = [
    ['Owner-directed exclusion', owner.seriousMedianClusters, owner.closest ?? '—', ...owner.metrics.filter((row) => OWNER_SUMMARY_IDS.has(row.id)).map((row) => `$${number(row.mae, 1)}`)],
    ['Raw evidence retained', raw.seriousMedianClusters, raw.closest ?? '—', ...raw.metrics.filter((row) => OWNER_SUMMARY_IDS.has(row.id)).map((row) => `$${number(row.mae, 1)}`)],
  ];
  return `<div class="table-wrap"><table><caption><strong>Compact with-vs-without sensitivity</strong><span>${escapeHtml(model.weeklyAnalysis.exclusion.proof)}; marker only, with no private identity stored.</span></caption><thead><tr><th scope="col">View</th><th scope="col">Clusters</th><th scope="col">Closest</th>${OWNER_SUMMARY_STRATEGIES.map(([, label]) => `<th scope="col">${escapeHtml(label)} MAE</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row">${row[0]}</th>${row.slice(1).map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function weeklyTargetTable(model: PresentationModel): string {
  const targets = model.weeklyAnalysis.ownerDirected.topThree.flatMap((week) => week.rows);
  const strategyHeaders = OWNER_SUMMARY_STRATEGIES.map(([, label]) => `<th scope="col">${escapeHtml(label)}</th>`).join('');
  const winningRows = targets.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>W${row.week}</td><td>$${number(row.winningBid, 0)}</td><td>${row.faabCensored ? 'yes' : 'no'}</td>${OWNER_SUMMARY_STRATEGIES.map(([id]) => `<td>${number(row.winningRatios[id], 2)}×</td>`).join('')}</tr>`).join('');
  const marketRows = targets.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>W${row.week}</td><td>${row.seriousMedianBid == null ? '—' : `$${number(row.seriousMedianBid, 1)}`}</td><td>${row.censoredObservationCount}</td>${OWNER_SUMMARY_STRATEGIES.map(([id]) => `<td>${number(row.marketRatios[id], 2)}×</td>`).join('')}</tr>`).join('');
  return `<div class="table-wrap"><table><caption><strong>Top-three winning-bid ratios (privacy-safe labels)</strong><span>Canonical winning bid ÷ intrinsic suggestion; exact FAAB equality is labeled censored.</span></caption><thead><tr><th scope="col">Target</th><th scope="col">Week</th><th scope="col">Winning bid</th><th scope="col">FAAB-censored</th>${strategyHeaders}</tr></thead><tbody>${winningRows}</tbody></table></div><div class="table-wrap"><table><caption><strong>Top-three serious-market ratios (privacy-safe labels)</strong><span>Serious median ÷ intrinsic suggestion; competitors are canonical legitimate failures with bid &gt; $5.</span></caption><thead><tr><th scope="col">Target</th><th scope="col">Week</th><th scope="col">Serious median</th><th scope="col">Censored obs.</th>${strategyHeaders}</tr></thead><tbody>${marketRows}</tbody></table></div>`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function css(): string {
  return `
:root{--ink:#202328;--muted:#62676f;--paper:#f5f2e9;--card:#fffef9;--rule:#d8d6cc;--accent:#b8342e;--teal:#126e82;--green:#1f6a50;--amber:#8a4f00;color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--paper);color:var(--ink);font-synthesis:none}*{box-sizing:border-box}body{margin:0;background:linear-gradient(135deg,#ebe7da 0,#f8f6ef 42%,#ece9df 100%);line-height:1.48}.report{max-width:1180px;margin:0 auto;padding:34px 28px 80px}.executive{min-height:calc(100vh - 68px);display:grid;align-content:center;gap:22px;border-top:10px solid var(--ink)}.kicker,.eyebrow{font-size:.72rem;line-height:1.2;letter-spacing:.14em;text-transform:uppercase;font-weight:850;color:var(--accent);margin:0 0 8px}.masthead{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(260px,.72fr);gap:36px;align-items:end}.masthead h1{font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.35rem,6vw,5.5rem);line-height:.94;letter-spacing:-.045em;margin:.1em 0 .16em;max-width:900px}.deck{font-size:clamp(1rem,1.7vw,1.25rem);max-width:760px;color:#44484e;margin:0}.stamp{border-left:1px solid var(--rule);padding-left:20px;color:var(--muted);font-size:.88rem}.stamp strong{color:var(--ink);display:block;font-size:1.05rem}.five-bullets{background:#1f2227;color:#f7f4ec;padding:18px;border-left:6px solid var(--teal)}.five-bullets h2{font-family:Georgia,serif;margin:0 0 10px;font-size:1.35rem}.five-bullets ul{margin:0;padding-left:1.2em;display:grid;gap:7px}.verdict-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.verdict{background:var(--card);border:1px solid var(--rule);padding:18px 18px 16px;min-height:150px}.verdict.sample{border-top:5px solid var(--accent)}.verdict.robust{border-top:5px solid var(--green)}.verdict.action{border-top:5px solid var(--teal)}.verdict .big{font-family:Georgia,serif;font-size:2.15rem;line-height:1;margin:.28em 0 .16em}.verdict p{margin:0;color:var(--muted)}.takeaways{display:grid;grid-template-columns:1.25fr .75fr;gap:16px}.takeaways>div{background:#24282d;color:#f7f4ec;padding:20px}.takeaways h2{font-family:Georgia,serif;font-size:1.45rem;margin:0 0 10px}.takeaways ul{padding-left:1.2em;margin:0;display:grid;gap:7px}.warning{background:#f5e5c9!important;color:#3c2c14!important;border-left:6px solid #b87812}.warning strong{display:block;margin-bottom:5px}.page-break{height:62px;border-bottom:1px solid var(--rule);margin-bottom:62px}.section-head{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.7fr);gap:28px;align-items:end;margin:64px 0 22px}.section-head h2{font-family:Georgia,serif;font-size:clamp(2rem,4vw,3.4rem);line-height:1;margin:0}.section-head p{color:var(--muted);margin:0}.chart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0}.panel{background:var(--card);border:1px solid var(--rule);box-shadow:0 8px 28px rgba(41,38,31,.06);break-inside:avoid}.chart-panel{padding:18px}.panel-heading h3{font-family:Georgia,serif;font-size:1.35rem;margin:0}.chart{display:block;width:100%;height:auto;margin-top:8px;overflow:visible}.chart text{font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:12px;fill:#4a4f56}.chart .row-label{font-size:12px;font-weight:700;fill:#25282d}.chart .value{font-size:11px;font-weight:800;fill:#25282d}.chart .small{font-size:10px}.chart .legend text{font-size:11px}figcaption{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--rule);padding-top:10px;color:var(--muted);font-size:.77rem}figcaption strong{color:var(--ink);text-align:right}.full{grid-column:1/-1}.table-wrap{background:var(--card);border:1px solid var(--rule);overflow-x:auto;margin:16px 0 22px;break-inside:avoid}table{width:100%;border-collapse:collapse;font-size:.88rem;min-width:720px}caption{text-align:left;padding:16px 18px 12px;border-bottom:1px solid var(--rule)}caption strong,caption span{display:block}caption strong{font-family:Georgia,serif;font-size:1.2rem}caption span{color:var(--muted);font-size:.75rem;margin-top:3px}th,td{padding:10px 12px;border-bottom:1px solid #e8e5dc;text-align:right;font-variant-numeric:tabular-nums}th:first-child,td:first-child{text-align:left}thead th{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#f5f2e9}tbody tr:last-child>*{border-bottom:0}.swatch{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--swatch);margin-right:7px}.callout-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}.callout{padding:17px;border:1px solid var(--rule);background:var(--card);break-inside:avoid}.callout h3{font-family:Georgia,serif;margin:0 0 6px}.callout p{margin:0;color:var(--muted);font-size:.9rem}.formula-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.formula{background:var(--card);border-left:5px solid var(--teal);padding:16px;break-inside:avoid}.formula h3{font-family:Georgia,serif;margin:0 0 4px}.formula code{display:block;background:#ece9df;padding:7px 9px;margin:8px 0;font-size:.84rem;white-space:normal}.formula p{font-size:.88rem;color:var(--muted);margin:0}.method-note{background:#24282d;color:#f7f4ec;padding:20px;margin:20px 0}.method-note h3{font-family:Georgia,serif;margin:0 0 8px}.method-note p{margin:0;color:#d9d9d4}.footer{margin-top:60px;padding-top:18px;border-top:1px solid var(--rule);display:flex;justify-content:space-between;color:var(--muted);font-size:.78rem}@media(max-width:760px){html,body{max-width:100%;overflow-x:hidden}.report{width:100vw;max-width:100vw;padding:18px 14px 50px;overflow:hidden}.executive,section,.masthead,.verdict-grid,.takeaways,.section-head,.chart-grid,.panel{min-width:0;max-width:100%}.executive{min-height:auto;padding-top:16px}.masthead,.section-head,.takeaways{grid-template-columns:1fr}.masthead{gap:18px}.stamp{border-left:0;border-top:1px solid var(--rule);padding:12px 0 0}.verdict-grid,.callout-grid,.formula-grid,.chart-grid{grid-template-columns:1fr}.verdict{min-height:0}.full{grid-column:auto}.page-break{height:28px;margin-bottom:36px}.section-head{margin-top:42px;gap:10px}.chart-panel{padding:12px}figcaption{display:block}figcaption strong{display:block;text-align:left;margin-top:5px}.scatter{min-width:670px}.chart-panel:has(.scatter){overflow-x:auto}.footer{display:block}.footer span{display:block;margin-top:4px}}@media print{@page{size:Letter;margin:.42in}html,body{max-width:none;overflow:visible}.report{width:auto;max-width:none;padding:0;overflow:visible}.executive{height:9.55in;min-height:0;align-content:start;gap:12px}.masthead{grid-template-columns:minmax(0,1.8fr) minmax(210px,.72fr);gap:20px;align-items:end}.masthead h1{font-size:3.2rem}.deck{font-size:.9rem}.stamp{border-top:0;border-left:1px solid var(--rule);padding:0 0 0 14px;font-size:.72rem}.five-bullets{padding:12px}.five-bullets h2{font-size:1.02rem}.five-bullets ul{gap:4px;font-size:.74rem}.verdict-grid{grid-template-columns:repeat(3,1fr)}.verdict{min-height:118px;padding:12px}.verdict .big{font-size:1.6rem}.takeaways{grid-template-columns:1.25fr .75fr;font-size:.76rem}.takeaways>div{padding:12px}.section-head{grid-template-columns:minmax(0,1fr) minmax(220px,.7fr);margin:28px 0 14px}.chart-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.callout-grid{grid-template-columns:repeat(3,1fr)}.formula-grid{grid-template-columns:repeat(3,1fr);gap:7px}.method-note{break-inside:avoid}.full{grid-column:1/-1}main>section:not(.executive){break-before:page}.page-break{display:none}.panel{box-shadow:none}.chart-panel{padding:12px}.chart-panel:has(.scatter){overflow:visible}.scatter{min-width:0}.table-wrap{margin:10px 0 14px;overflow:visible}.formula{padding:9px}.formula p{font-size:.74rem}.footer{display:none}body{background:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
}

function middleVorpSection(model: PresentationModel): string {
  const eligibleWeeks = model.weeklyAnalysis.ownerDirected.eligibleWeeks;
  const eligibleWeekLabel = eligibleWeeks.map((week) => `W${week}`).join(', ');
  const nextDecisionWeek = (eligibleWeeks.at(-1) ?? model.currentState.week) + 1;
  const rows = model.currentState.rows;
  const methods = [
    ['maxVorp', 'Max VORP'],
    ['middleVorp', 'Middle VORP'],
    ['currentVorp', 'Current-team VoRP'],
    ['correctedSafe', 'Corrected Safe'],
    ['correctedWeeksStarter', 'Corrected Weeks as Starter'],
  ] as const;
  const distributions = methods.map(([key, label]) => {
    const summary = summarizeDistribution(rows.map((row) => row[key]));
    return `<tr><th scope="row">${label}</th><td>${summary.n}</td><td>${summary.positive}</td><td>${number(summary.mean)}</td><td>${number(summary.median)}</td><td>${number(summary.p75)}</td><td>$${number(summary.max, 0)}</td><td>$${number(summary.total, 0)}</td></tr>`;
  }).join('');
  const ordering = (key: 'maxVorp' | 'middleVorp' | 'currentVorp') => [...rows].sort((a, b) => b[key] - a[key] || a.playerId.localeCompare(b.playerId)).slice(0, 12).map((row) => `${row.playerId} (${row.position}${row.positionRank}, $${row[key]})`).join(', ');
  const top = [...rows].sort((a, b) => b.middleVorp - a.middleVorp || a.playerId.localeCompare(b.playerId)).slice(0, 12)
    .map((row) => `<tr><th scope="row">${row.playerId} (${row.position}${row.positionRank})</th><td>$${row.middleVorp}</td><td>$${row.maxVorp}</td><td>${row.maxVorpStage ?? '—'} teams</td><td>$${row.currentVorp}</td><td>$${row.correctedSafe}</td><td>$${row.correctedWeeksStarter}</td></tr>`).join('');
  const divergence = [...rows].filter((row) => row.middleVorp > 0 && row.maxVorp !== row.middleVorp && row.currentVorp !== row.middleVorp)
    .sort((a, b) => Math.max(Math.abs(b.middleVorp - b.maxVorp), Math.abs(b.middleVorp - b.currentVorp)) - Math.max(Math.abs(a.middleVorp - a.maxVorp), Math.abs(a.middleVorp - a.currentVorp)) || a.playerId.localeCompare(b.playerId))
    .slice(0, 8).map((row) => `<tr><th scope="row">${row.playerId} (${row.position}${row.positionRank})</th><td>$${row.middleVorp}</td><td>$${row.maxVorp}</td><td>${row.maxVorpStage ?? '—'} teams</td><td>$${row.currentVorp}</td></tr>`).join('');
  const cutoffs = methods.flatMap(([key, label]) => ['QB', 'RB', 'WR', 'TE'].map((position) => {
    const positive = rows.filter((row) => row.position === position && row[key] > 0);
    return `<tr><th scope="row">${label}</th><td>${position}</td><td>${positive.length}</td><td>${positive.length ? Math.max(...positive.map((row) => row.positionRank)) : '—'}</td></tr>`;
  })).join('');
  const correlations = [
    ['Max VORP', rankCorrelation(rows, 'middleVorp', 'maxVorp')],
    ['Current-team VoRP', rankCorrelation(rows, 'middleVorp', 'currentVorp')],
    ['Corrected Safe', rankCorrelation(rows, 'middleVorp', 'correctedSafe')],
    ['Corrected Weeks as Starter', rankCorrelation(rows, 'middleVorp', 'correctedWeeksStarter')],
    ['67% horizon', rankCorrelation(rows, 'middleVorp', 'horizon67')],
    ['33% horizon', rankCorrelation(rows, 'middleVorp', 'horizon33')],
  ].map(([label, value]) => `<tr><th scope="row">Middle vs ${label}</th><td>${number(value as number, 3)}</td></tr>`).join('');
  const horizon = [
    ['67%', Math.max(4, Math.ceil(model.currentState.teamsRemaining * 0.67)), 'horizon67'],
    ['50% ceil', model.currentState.targetTeams, 'middleVorp'],
    ['50% floor', Math.max(4, Math.floor(model.currentState.teamsRemaining * 0.5)), 'horizon50Floor'],
    ['33%', Math.max(4, Math.ceil(model.currentState.teamsRemaining * 0.33)), 'horizon33'],
  ] as const;
  const horizonRows = horizon.map(([label, teams, key]) => {
    const summary = summarizeDistribution(rows.map((row) => row[key]));
    return `<tr><th scope="row">${label}</th><td>${teams}</td><td>${summary.positive}</td><td>$${number(summary.mean)}</td><td>$${number(summary.max, 0)}</td><td>${number(rankCorrelation(rows, 'middleVorp', key) ?? 1, 3)}</td></tr>`;
  }).join('');
  const historicalRows = horizon.map(([label, _teams, key]) => {
    const evaluated: EvaluatedBid[] = model.usable.filter((event) => event.outcome === 'won' && !(event.decisionWeek === 3 && event.actualBid === 234)).flatMap((event) => {
      const predicted = key === 'middleVorp' ? event.suggestions['middle-vorp'] : event.middleSensitivity[key];
      return predicted > 0 ? [{ eventId: event.event, clusterId: event.batch, strategy: key, actual: event.actualBid, predicted, originalFaab: model.budget, preBidFaab: event.preBidFaab }] : [];
    });
    const metrics = computeErrorMetrics(evaluated);
    return `<tr><th scope="row">${label}</th><td>${metrics?.n ?? 0}</td><td>${metrics ? number(metrics.mae, 1) : '—'}</td><td>${metrics ? number(metrics.signedBias, 1) : '—'}</td><td>${metrics?.spearman == null ? '—' : number(metrics.spearman, 3)}</td></tr>`;
  }).join('');
  return `<section aria-labelledby="middle-title"><header class="section-head"><div><p class="kicker">00 · Candidate decision</p><h2 id="middle-title">Middle VORP stays analysis-only.</h2></div><p>One shared horizon: targetTeams = max(4, ceil(teamsRemaining / 2)). At the latest reproducible W${model.currentState.week} state, ${model.currentState.teamsRemaining} teams map to ${model.currentState.targetTeams}. It never maximizes a different stage per player.</p></header><div class="takeaways"><div><h2>Recommendation: retain analysis-only</h2><ul><li>Conceptually cleaner than per-player Max VORP stage selection.</li><li>Only ${eligibleWeekLabel} are evaluable and all ${eligibleWeeks.length} projection snapshots are reconstructed.</li><li>W${nextDecisionWeek}+ exact pre-waiver captures must confirm held-out error, bias, rank quality, and 33%/50%/67% stability before any default review.</li></ul></div><div class="warning"><strong>Privacy-safe current input</strong>W${model.currentState.week}, ${model.currentState.projectionCount} stored rows / ${model.currentState.rows.length} supported QB/RB/WR/TE players, hash ${model.currentState.contentHash.slice(0, 16)}…; aliases only, no league/manager identity or raw payload.</div></div><div class="table-wrap"><table><caption><strong>Current-state dollar distributions</strong><span>Full supported QB/RB/WR/TE projection population; positive counts make each method's support explicit.</span></caption><thead><tr><th>Method</th><th>n</th><th>Positive</th><th>Mean</th><th>Median</th><th>P75</th><th>Max</th><th>Total</th></tr></thead><tbody>${distributions}</tbody></table></div><div class="table-wrap"><table><caption><strong>Positional positive-price cutoffs</strong><span>Deepest positive rank by method and position.</span></caption><thead><tr><th>Method</th><th>Position</th><th>Positive</th><th>Deepest rank</th></tr></thead><tbody>${cutoffs}</tbody></table></div><div class="note"><strong>Top-12 ordering.</strong><br><strong>Max:</strong> ${ordering('maxVorp')}<br><strong>Middle:</strong> ${ordering('middleVorp')}<br><strong>Current:</strong> ${ordering('currentVorp')}</div><div class="table-wrap"><table><caption><strong>Middle VORP top 12 and exact prices</strong><span>Max-selected stage explains the per-player maximization contrast.</span></caption><thead><tr><th>Alias (position rank)</th><th>Middle</th><th>Max</th><th>Max stage</th><th>Current</th><th>Corrected Safe</th><th>Corrected Weeks</th></tr></thead><tbody>${top}</tbody></table></div><div class="table-wrap"><table><caption><strong>Concrete divergence examples</strong><span>Largest dollar gaps among players with positive Middle VORP.</span></caption><thead><tr><th>Alias</th><th>Middle</th><th>Max</th><th>Max-selected stage</th><th>Current</th></tr></thead><tbody>${divergence}</tbody></table></div><div class="chart-grid"><div class="table-wrap"><table><caption><strong>Rank correlations</strong></caption><thead><tr><th>Pair</th><th>ρ</th></tr></thead><tbody>${correlations}</tbody></table></div><div class="table-wrap"><table><caption><strong>Common-horizon sensitivity</strong><span>Floor/ceil sensitivity stays explicit; unit tests cover the odd 27→14 versus 13 boundary.</span></caption><thead><tr><th>Horizon</th><th>Teams</th><th>Positive</th><th>Mean</th><th>Max</th><th>ρ vs 50%</th></tr></thead><tbody>${horizonRows}</tbody></table></div></div><div class="table-wrap"><table><caption><strong>Historical common-horizon sensitivity</strong><span>Canonical winning bids, owner-directed exclusion applied; odd-team observations keep floor versus ceil differences visible.</span></caption><thead><tr><th>Horizon</th><th>n</th><th>MAE</th><th>Bias</th><th>ρ</th></tr></thead><tbody>${historicalRows}</tbody></table></div></section>`;
}

export function renderBiddingPresentation(model: PresentationModel): string {
  const winningBars = horizontalBars('Winning-bid error by strategy', model.winningMetrics.map((row) => ({ id: row.id, label: row.label, value: row.metrics.mae })), `n=${model.wins.length} usable winning bids • ${model.provenance}`, { note: `Lower MAE is better. ${model.sampleWinner.label} is best in this observed sample—not a universal winner.` });
  const allWinner = lowest(model.allMetrics);
  const seriousWinner = lowest(model.seriousMetrics);
  const allSeriousBars = horizontalBars('All-bid vs. serious-bid error', model.allMetrics.map((row) => ({ id: row.id, label: row.label, value: row.metrics.mae, secondary: model.seriousMetrics.find((item) => item.id === row.id)!.metrics.mae })), `All n=${model.usable.length}; serious/non-token n=${model.serious.length} • ${model.provenance}`, { primaryLabel: 'All valid bids', secondaryLabel: 'Serious bids (> $5)', note: `${allWinner.label} has the lowest all-bid MAE; ${seriousWinner.label} has the lowest serious-bid MAE.` });
  const stableRobustLeader = new Set(model.robustLeaders).size === 1 ? model.robustLeaders[0] : null;
  const managerR2 = rSquared(model.managerRows), managerWinR2 = rSquared(model.managerWinRows);
  const weeklyBullets = model.weeklyBullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('');
  const eligibleWeeks = model.weeklyAnalysis.ownerDirected.eligibleWeeks;
  const eligibleWeekLabel = eligibleWeeks.map((week) => `W${week}`).join(', ');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(model.fixtureLabel)} bidding strategy evidence</title><style>${css()}</style></head><body><main class="report">
<section class="executive" aria-labelledby="report-title"><header class="masthead"><div><p class="kicker">Owner briefing · decision evidence</p><h1 id="report-title">What did real waiver bids tell us?</h1><p class="deck">A replay of production strategies plus analysis-only Middle VORP and corrected PR #13 curves against ${model.usable.length} anonymized bids from ${model.fixtureLabel}. Useful signal, but not enough stable evidence to crown a default.</p></div><div class="stamp"><strong>Evidence window</strong>Reconstructed decision weeks W${model.snapshotWeeks.join(' and W')}<br><strong>Data through</strong>${escapeHtml(model.dataThrough)}<br><strong>Scope</strong>One 32-team league · $${model.budget} FAAB</div></header>
<div class="takeaways"><div><h2>Five-bullet answer</h2><ul>${weeklyBullets}</ul></div><div class="warning"><strong>Scope guardrail</strong>${eligibleWeekLabel} have like-for-like same-week reconstructed snapshots; earlier-week fallbacks are never backfilled. Aggressive is omitted here because it is derived from Safe.</div></div>
<div class="verdict-grid"><article class="verdict sample"><p class="eyebrow">Closest median market</p><div class="big">${escapeHtml(model.weeklyAnalysis.ownerDirected.marketMetrics.find((row) => row.week == null)!.closest ?? '—')}</div><p>Lowest MAE across owner-directed player/week clusters; competing claims stay within the canonical winner's processing batch.</p></article><article class="verdict robust"><p class="eyebrow">Strategy × scale</p><div class="big">Separate them</div><p>Intrinsic formulas describe target shape; observed/intrinsic multipliers estimate weekly market scale.</p></article><article class="verdict action"><p class="eyebrow">Product decision</p><div class="big">Hold</div><p>${eligibleWeeks.length} reconstructed weeks do not support manager-style claims or a production default change.</p></article></div>
</section><div class="page-break" aria-hidden="true"></div>
${middleVorpSection(model)}
<section aria-labelledby="weekly-title"><header class="section-head"><div><p class="kicker">01 · Weekly multiplier answer</p><h2 id="weekly-title">Shape is not scale.</h2></div><p>Top-three canonical winners and serious market medians use observed bid ÷ intrinsic same-week suggestion. Arithmetic mean is primary; geometric mean, median, and coverage expose ratio skew and zero denominators.</p></header><div class="warning"><strong>Important metric label</strong>Every value labeled <b>raw prediction R²*</b> keeps strategy dollar predictions fixed on the identity line. It is not the goodness-of-fit R² from a regression trained on these bids. Negative values are valid and mean the fixed predictions lose to the observed-mean baseline—not that correlation is negative.</div><div class="chart-grid">${weeklyMultiplierChart(model, 'winner')}${weeklyMultiplierChart(model, 'market')}</div>${weeklyMultiplierTable(model)}${weeklyTargetTable(model)}${weeklyMarketMetricTable(model)}${clusterMultiplierTable(model)}${heldOutScaleTable(model)}${exclusionSensitivity(model)}<div class="method-note"><h3>Interpretation boundary</h3><p>The owner-directed marker is excluded only from this labeled analysis; raw canonical evidence remains in the sensitivity row. Serious means bid &gt; $5, failed claims must be legitimate same-target competitors, and FAAB-limited observations are marked censored. This supports a strategy-shape × market-scale hypothesis, not individual manager-style conclusions from ${eligibleWeeks.length} reconstructed weeks.</p></div></section>
${renderBehavioralAuditHtml()}
<section aria-labelledby="accuracy-title"><header class="section-head"><div><p class="kicker">02 · Prior accuracy study</p><h2 id="accuracy-title">Price fit depends on the question.</h2></div><p>Winning-bid error asks who best estimates the clearing price. All-bid error also includes failed claims and token bids. Lower MAE is better; bias shows direction.</p></header><div class="chart-grid">${winningBars}${allSeriousBars}${signedBiasChart(model)}${rankCoverageChart(model)}</div>${metricTable('Winning-bid scorecard', model.winningMetrics, `n=${model.wins.length}; subset=usable winning bids`, model.provenance)}${metricTable('All and serious scorecard — all bids', model.allMetrics, `n=${model.usable.length}; subset=all formula-usable bids`, model.provenance)}${metricTable('All and serious scorecard — serious bids', model.seriousMetrics, `n=${model.serious.length}; subset=non-token bids > $5`, model.provenance)}</section>
<section aria-labelledby="robust-title"><header class="section-head"><div><p class="kicker">03 · Stability</p><h2 id="robust-title">Sensitivity stays explicit across filters.</h2></div><p>These filters were declared before inspecting winners and applied independently. They are sensitivity checks, not permission to delete inconvenient evidence.</p></header>${sensitivityChart(model)}<div class="callout-grid"><article class="callout"><h3>Token threshold</h3><p>Low intent means bid ≤ max($1, 1% of original FAAB) = $5. Tokens remain in the all-bid view and are separated here.</p></article><article class="callout"><h3>Three outlier lenses</h3><p>Ratio-gap flagged 1 isolated top; MAD flagged 3; IQR flagged 4. Independent robust rules test whether one extreme drives the conclusion.</p></article><article class="callout"><h3>Honest conclusion</h3><p><strong>${model.sampleWinner.label} is the sample winner.</strong> ${stableRobustLeader ? `<strong>${stableRobustLeader}</strong> also leads all three predeclared robust filters.` : 'No single strategy leads all three robust filters.'} Treat this as descriptive evidence, not a default-setting result.</p></article></div></section>
<section aria-labelledby="behavior-title"><header class="section-head"><div><p class="kicker">04 · Behavior</p><h2 id="behavior-title">Identity lines expose the misses.</h2></div><p>Each dot is an anonymized winning target. A perfect forecast lies on the dashed diagonal; below it underpredicts. Extreme observed bids stretch beyond every intrinsic strategy; Aggressive reaches higher than the others, but still underpredicts the largest win.</p></header>${smallMultiples(model)}${managerChart(model)}<div class="table-wrap"><table><caption><strong>Manager-adjusted subset</strong><span>Strict prior-batch walk-forward • ${escapeHtml(model.provenance)} • smaller, non-comparable subset</span></caption><thead><tr><th scope="col">Forecast subset</th><th scope="col">n</th><th scope="col">MAE</th><th scope="col">Median AE</th><th scope="col">Bias</th><th scope="col">Spearman ρ</th><th scope="col">Prediction R²*</th><th scope="col">Within tolerance</th></tr></thead><tbody><tr><th scope="row">All forecastable bids</th><td>${model.managerMetrics.n}</td><td>${number(model.managerMetrics.mae)}</td><td>${number(model.managerMetrics.medianAbsoluteError)}</td><td>+${number(model.managerMetrics.signedBias)}</td><td>${number(model.managerMetrics.spearman ?? Number.NaN, 2)}</td><td>${number(managerR2 ?? Number.NaN, 2)}</td><td>${number(model.managerMetrics.withinToleranceRate * 100)}%</td></tr><tr><th scope="row">Forecastable wins</th><td>${model.managerWinMetrics.n}</td><td>${number(model.managerWinMetrics.mae)}</td><td>${number(model.managerWinMetrics.medianAbsoluteError)}</td><td>${number(model.managerWinMetrics.signedBias)}</td><td>${number(model.managerWinMetrics.spearman ?? Number.NaN, 2)}</td><td>${number(managerWinR2 ?? Number.NaN, 2)}</td><td>${number(model.managerWinMetrics.withinToleranceRate * 100)}%</td></tr></tbody></table></div></section>
<section aria-labelledby="methods-title"><header class="section-head"><div><p class="kicker">05 · How to read the math</p><h2 id="methods-title">Measures, assumptions, and guardrails.</h2></div><p>All formulas are evaluated on dollars unless marked normalized. Predictions are intrinsic strategy values; manager forecasts are capped at reconstructed pre-bid FAAB.</p></header><div class="formula-grid"><article class="formula"><h3>MAE</h3><code>MAE = (1/n) Σ |predicted − actual|</code><p>Average dollar miss. Easy to interpret; extreme bids still matter.</p></article><article class="formula"><h3>Median absolute error</h3><code>Median AE = median(|predicted − actual|)</code><p>The typical dollar miss; less sensitive to a small number of extremes.</p></article><article class="formula"><h3>Signed bias</h3><code>Bias = (1/n) Σ (predicted − actual)</code><p>Negative means systematic underprediction; positive means overprediction.</p></article><article class="formula"><h3>Spearman rank correlation</h3><code>ρ = Pearson correlation(rank(actual), rank(predicted))</code><p>Tests whether expensive targets rank above cheap ones. Ties receive average ranks.</p></article><article class="formula"><h3>Prediction R² (unfitted)</h3><code>R² = 1 − SSE / SST</code><p>This is the standard predictive score against the observed-mean baseline, but <strong>not fitted-regression R²</strong>. Strategy dollars remain fixed on the identity line. A negative value means they are worse than predicting the observed mean; it does not mean negative correlation.</p></article><article class="formula"><h3>Normalized FAAB error</h3><code>mean(|predicted/FAAB − actual/FAAB|)</code><p>Reported against original $${model.budget} and reconstructed pre-bid manager FAAB. It compares budget share, not willingness.</p></article><article class="formula"><h3>Cluster-bootstrap interval</h3><code>2,000 resamples of player × processing-batch clusters</code><p>Fixed seed ${ANALYSIS_POLICY.bootstrapSeed}; percentile 2.5%–97.5%. Keeps correlated win/loss claims together. It does not repair snapshot-history error.</p></article><article class="formula"><h3>Coverage</h3><code>predicted ∈ [lowest serious loss, winning bid]</code><p>Computed on ${model.coverage[0].total} competitive player/batch clusters. It asks whether a strategy falls inside observed serious bidding range.</p></article><article class="formula"><h3>Outlier rules</h3><code>ratio ≥ 2× + $50 gap; MAD &gt; median + 3×1.4826×MAD; IQR &gt; Q3 + 1.5×IQR</code><p>MAD/IQR also require a $25 gap; minimum cluster sizes are 3 and 4. Flags are independent and never silently deleted.</p></article><article class="formula"><h3>Within tolerance</h3><code>|predicted − actual| ≤ max($5, 20% of actual)</code><p>A practical accuracy band shown alongside continuous error measures.</p></article></div><div class="method-note"><h3>Provenance boundary</h3><p>All ${model.usable.length} formula-usable events use same-week reconstructed W${model.snapshotWeeks.join('/W')} projection snapshots and transaction-ledger FAAB reconstruction. Reconstructed means captured after the canonical cutoff; it is not proof of what managers saw. Earlier-week fallbacks are excluded rather than substituted. No identities, league identifier, player names/IDs, manager names/IDs, raw payload, or credentials appear in this artifact. Regenerate deterministically with <code>npm run analyze:bidding:presentation</code>.</p></div></section>
<footer class="footer"><span>${escapeHtml(model.fixtureLabel)} · anonymized fixture · deterministic report</span><span>Generated with <code>npm run analyze:bidding:presentation</code></span></footer></main></body></html>`;
}

export function normalizePdfMetadata(pdf: Buffer): Buffer {
  const text = pdf.toString('latin1');
  const creationMatches = text.match(/\/CreationDate \(D:\d{14}\+00'00'\)/g) ?? [];
  const modifiedMatches = text.match(/\/ModDate \(D:\d{14}\+00'00'\)/g) ?? [];
  if (creationMatches.length !== 1 || modifiedMatches.length !== 1) {
    throw new Error(`Unexpected Chromium PDF metadata shape: creation=${creationMatches.length}, modified=${modifiedMatches.length}`);
  }
  return Buffer.from(text
    .replace(/\/CreationDate \(D:\d{14}\+00'00'\)/, "/CreationDate (D:20260925230008+00'00')")
    .replace(/\/ModDate \(D:\d{14}\+00'00'\)/, "/ModDate (D:20260925230008+00'00')"), 'latin1');
}

async function findChromium(): Promise<string | null> {
  for (const candidate of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    try { await access(candidate, constants.X_OK); return candidate; } catch { /* try next */ }
  }
  return null;
}

async function main(): Promise<void> {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, 'utf8')) as AnalysisFixture;
  const model = buildPresentationModel(fixture);
  const html = renderBiddingPresentation(model);
  await writeFile(HTML_PATH, html);
  console.log(`Wrote ${HTML_PATH}`);
  if (process.argv.includes('--pdf')) {
    const chromium = await findChromium();
    if (!chromium) throw new Error('No Chromium executable found; generate PDF by printing the HTML from a browser.');
    const result = spawnSync(chromium, [
      '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--no-pdf-header-footer', `--print-to-pdf=${resolve(PDF_PATH)}`, pathToFileURL(resolve(HTML_PATH)).href,
    ], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Chromium PDF generation failed (${result.status}): ${result.stderr}`);
    await writeFile(PDF_PATH, normalizePdfMetadata(await readFile(PDF_PATH)));
    console.log(`Wrote ${PDF_PATH} with ${basename(chromium)} (deterministic metadata)`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
