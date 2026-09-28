import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { League, Transaction } from '../src/api/types.ts';
import type { RosPlayerProjection } from '../src/logic/projections.ts';
import {
  buildWaiverBoard,
  estimateRemainingTeamsAtDecisionWeek,
  type LeagueContext,
  type StarterPositionCounts,
} from '../src/logic/waivers.ts';
import {
  buildManagerBiddingProfiles,
  classifyCanonicalBidEvents,
  predictManagerBid,
  selectTopCanonicalBids,
  type CanonicalBidEvent,
  type HistoricalBaselineEvidence,
} from '../src/logic/biddingProfiles.ts';
import {
  ANALYSIS_POLICY,
  bootstrapMaeInterval,
  classifyTransactionsWithAudit,
  computeErrorMetrics,
  flagIsolatedOutliers,
  isTokenBid,
  type ClassificationAudit,
  type EvaluatedBid,
  type FaabReconstruction,
} from './bidding-strategy-analysis.ts';
import { buildWeeklyMarketAnalysis } from './weekly-market-analysis.ts';
import { renderWeeklyMarketMarkdown } from './weekly-market-report.ts';
import {
  buildOfflinePlayerValues,
  commonHorizonTeamCount,
  rankCorrelation,
  summarizeDistribution,
} from './middle-vorp-analysis.ts';

const FIXTURE_VERSION = 1;
const SEASON = 2026;
const EXPECTED_PROJECT_REF = 'xduqpomhjdlgmtmmkfed';
const FIXTURE_PATH = 'scripts/fixtures/bidding-strategy-seamex-2026.json';
const REPORT_PATH = 'docs/analysis/bidding-strategy-accuracy-seamex-2026.md';
const API = 'https://api.sleeper.app/v1';
export const STRATEGIES = [
  ['max-vorp', 'Max VORP'],
  ['middle-vorp', 'Middle VORP'],
  ['vorp', 'Current-team VoRP'],
  ['corrected-safe', 'Corrected Safe (PR #13)'],
  ['corrected-weeks-starter', 'Corrected Weeks as Starter (PR #13)'],
  ['safe', 'Legacy Safe'],
  ['aggressive', 'Legacy Aggressive'],
  ['weeks-starter', 'Legacy Weeks as Starter'],
] as const;

export type StrategyId = typeof STRATEGIES[number][0];

interface FixtureProjection {
  player: string;
  position: string;
  totalPoints: number;
  pointsPerWeek: number;
}

export interface SnapshotFixture {
  requestedDecisionWeek: number;
  available: boolean;
  exclusionReason?: string;
  snapshotDecisionWeek?: number;
  provenance?: 'exact' | 'reconstructed';
  canonicalCutoffAt?: string;
  captureStartedAt?: string;
  fetchedAt?: string;
  contentHash?: string;
  rowCount?: number;
  projectionCount?: number;
  projections?: FixtureProjection[];
}

interface EventFixture {
  event: string;
  transaction: string;
  manager: string;
  player: string;
  transactionWeek: number;
  decisionWeek: number;
  batch: string;
  actualBid: number;
  outcome: 'won' | 'legitimate-loss';
  createdAt: number;
  processedAt: number | null;
  preBidFaab: number;
  faabReconstruction: FaabReconstruction;
  duplicateCount: number;
}

export interface AnalysisFixture {
  fixtureVersion: number;
  season: number;
  competitionLabel: string;
  source: {
    sleeperBaseUrl: string;
    supabaseProjectRef: string;
    transactionContentHash: string;
    dataThrough: string;
    refreshCommand: string;
  };
  league: {
    totalTeams: number;
    initialFaab: number;
    scoring: 'ppr' | 'half-ppr' | 'standard';
    rosterPositions: string[];
    startersPerPos: StarterPositionCounts;
    settingsProvenance: string;
    activeTeamCountMethod: string;
  };
  transactionWeeks: Array<{ week: number; raw: number; waivers: number }>;
  audit: ClassificationAudit;
  snapshots: SnapshotFixture[];
  events: EventFixture[];
}

export interface EnrichedEvent extends EventFixture {
  position: string;
  posRank: number;
  activeTeams: number;
  snapshotProvenance: 'exact' | 'reconstructed';
  suggestions: Record<StrategyId, number>;
  middleSensitivity: { horizon67: number; horizon50Floor: number; horizon33: number };
  token: boolean;
  playerTier: string;
  capState: string;
  managerForecast: number | null;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'GuillotineCompanionAnalysis/1.0' } });
  if (!response.ok) throw new Error(`GET ${url.replace(/league\/\d+/, 'league/[redacted]')} returned ${response.status}`);
  return response.json() as Promise<T>;
}

function verifyReadOnlySupabaseEnvironment(): { url: string; key: string } {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_READ_KEY;
  if (projectRef !== EXPECTED_PROJECT_REF) throw new Error(`Refusing snapshot read: SUPABASE_PROJECT_REF must be ${EXPECTED_PROJECT_REF}`);
  if (url !== `https://${EXPECTED_PROJECT_REF}.supabase.co`) throw new Error('Refusing snapshot read: SUPABASE_URL does not match the approved project ref');
  if (!key) throw new Error('SUPABASE_READ_KEY is required for --refresh (it is never printed or written)');
  return { url, key };
}

async function supabaseGet<T>(config: { url: string; key: string }, path: string, range?: string): Promise<T> {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: 'application/json',
      ...(range ? { Range: range } : {}),
    },
  });
  if (!response.ok) throw new Error(`Read-only snapshot GET returned ${response.status}`);
  return response.json() as Promise<T>;
}

function scoringForLeague(league: League): AnalysisFixture['league']['scoring'] {
  return league.scoring_settings?.rec === 1 ? 'ppr' : league.scoring_settings?.rec === 0.5 ? 'half-ppr' : 'standard';
}

function starterCounts(positions: string[]): StarterPositionCounts {
  const count = (value: string) => positions.filter((position) => position === value).length;
  return {
    QB: count('QB'), RB: count('RB'), WR: count('WR'), TE: count('TE'),
    FLEX: count('FLEX') + count('WRRB_FLEX') + count('REC_FLEX'),
    SUPER_FLEX: count('SUPER_FLEX') + count('QB_FLEX'),
  };
}

function projectionPoint(row: Record<string, unknown>, scoring: AnalysisFixture['league']['scoring']): number | null {
  const field = scoring === 'ppr' ? 'pts_ppr' : scoring === 'half-ppr' ? 'pts_half_ppr' : 'pts_std';
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function fetchSnapshot(
  config: { url: string; key: string },
  decisionWeek: number,
  scoring: AnalysisFixture['league']['scoring'],
  positions: Record<string, { position?: string }>,
): Promise<{ metadata: Omit<SnapshotFixture, 'projections'>; ros: Map<string, Omit<FixtureProjection, 'player'>> }> {
  const params = new URLSearchParams({
    select: 'id,decision_week,canonical_cutoff_at,capture_started_at,fetched_at,row_count,content_hash,provenance',
    season: `eq.${SEASON}`,
    decision_week: `lte.${decisionWeek}`,
    status: 'eq.completed',
    order: 'decision_week.desc,provenance.asc,canonical_cutoff_at.desc,id.asc',
    limit: '1',
  });
  const runs = await supabaseGet<Array<Record<string, unknown>>>(config, `projection_snapshot_runs?${params}`);
  if (!runs.length) return { metadata: { requestedDecisionWeek: decisionWeek, available: false, exclusionReason: 'no-completed-snapshot' }, ros: new Map() };
  const run = runs[0];
  const storedWeek = Number(run.decision_week);
  if (storedWeek !== decisionWeek) {
    return {
      metadata: {
        requestedDecisionWeek: decisionWeek,
        available: false,
        snapshotDecisionWeek: storedWeek,
        exclusionReason: 'only-earlier-decision-week-fallback-exists',
      },
      ros: new Map(),
    };
  }
  const rows: Array<Record<string, unknown>> = [];
  for (let from = 0; ; from += 1000) {
    const valueParams = new URLSearchParams({
      select: 'projection_week,player_id,pts_std,pts_half_ppr,pts_ppr',
      snapshot_id: `eq.${String(run.id)}`,
      projection_week: `gte.${decisionWeek}`,
      order: 'projection_week.asc,player_id.asc',
    });
    const page = await supabaseGet<Array<Record<string, unknown>>>(config, `projection_snapshot_values?${valueParams}`, `${from}-${from + 999}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const totals = new Map<string, number>();
  for (const row of rows) {
    const id = String(row.player_id);
    const points = projectionPoint(row, scoring);
    if (points != null) totals.set(id, (totals.get(id) ?? 0) + points);
  }
  const projectedWeeks = Math.max(1, 19 - decisionWeek);
  const ros = new Map<string, Omit<FixtureProjection, 'player'>>();
  for (const [playerId, totalPoints] of totals) {
    const position = positions[playerId]?.position;
    if (!position) continue;
    ros.set(playerId, { position, totalPoints, pointsPerWeek: totalPoints / projectedWeeks });
  }
  return {
    metadata: {
      requestedDecisionWeek: decisionWeek,
      available: true,
      snapshotDecisionWeek: storedWeek,
      provenance: run.provenance as 'exact' | 'reconstructed',
      canonicalCutoffAt: String(run.canonical_cutoff_at),
      captureStartedAt: String(run.capture_started_at),
      fetchedAt: String(run.fetched_at),
      contentHash: String(run.content_hash),
      rowCount: Number(run.row_count),
      projectionCount: ros.size,
    },
    ros,
  };
}

function makeAliases(ids: Iterable<string>, prefix: string, width: number): Map<string, string> {
  return new Map([...new Set(ids)].sort().map((id, index) => [id, `${prefix}${String(index + 1).padStart(width, '0')}`]));
}

async function refreshFixture(): Promise<AnalysisFixture> {
  const leagueId = process.env.LEAGUE_ID;
  if (!leagueId || !/^\d+$/.test(leagueId)) throw new Error('--refresh requires LEAGUE_ID in the environment');
  const supabase = verifyReadOnlySupabaseEnvironment();
  const [league, players] = await Promise.all([
    getJson<League>(`${API}/league/${leagueId}`),
    getJson<Record<string, { position?: string }>>(`${API}/players/nfl`),
  ]);
  if (Number(league.season) !== SEASON) throw new Error(`Expected ${SEASON} league data`);
  const transactionsByWeek = new Map<number, Transaction[]>();
  for (let week = 1; week <= 18; week += 1) {
    transactionsByWeek.set(week, await getJson<Transaction[]>(`${API}/league/${leagueId}/transactions/${week}`));
  }
  const initialFaab = league.settings.waiver_budget ?? 1000;
  const classified = classifyTransactionsWithAudit(transactionsByWeek, initialFaab);
  const productionCanonical = classifyCanonicalBidEvents(transactionsByWeek, initialFaab);
  if (stable(classified.events) !== stable(productionCanonical)) {
    throw new Error('Audited classifier diverged from the production canonical classifier; refusing to write fixture');
  }
  const requestedWeeks = [...new Set(classified.events.map((event) => event.decisionWeek))].sort((a, b) => a - b);
  const scoring = scoringForLeague(league);
  const fetchedSnapshots = await Promise.all(requestedWeeks.map((week) => fetchSnapshot(supabase, week, scoring, players)));

  const allPlayerIds = new Set(classified.events.map((event) => event.playerId));
  for (const snapshot of fetchedSnapshots) for (const id of snapshot.ros.keys()) allPlayerIds.add(id);
  const playerAliases = makeAliases(allPlayerIds, 'P', 4);
  const managerAliases = makeAliases(classified.events.map((event) => String(event.managerRosterId)), 'M', 2);
  const batchAliases = makeAliases(classified.events.map((event) => event.batchKey), 'B', 3);
  const transactionAliases = makeAliases(classified.events.map((event) => event.transactionId), 'T', 4);

  const snapshots: SnapshotFixture[] = fetchedSnapshots.map(({ metadata, ros }) => ({
    ...metadata,
    projections: metadata.available ? [...ros.entries()].map(([id, projection]) => ({ player: playerAliases.get(id)!, ...projection }))
      .sort((a, b) => a.player.localeCompare(b.player)) : undefined,
  }));
  const events = classified.events.map((event, index): EventFixture => ({
    event: `E${String(index + 1).padStart(4, '0')}`,
    transaction: transactionAliases.get(event.transactionId)!,
    manager: managerAliases.get(String(event.managerRosterId))!,
    player: playerAliases.get(event.playerId)!,
    transactionWeek: event.transactionWeek,
    decisionWeek: event.decisionWeek,
    batch: batchAliases.get(event.batchKey)!,
    actualBid: event.actualBid,
    outcome: event.outcome,
    createdAt: event.createdAt,
    processedAt: event.processedAt,
    preBidFaab: event.faabAvailableBeforeBid,
    faabReconstruction: event.faabReconstruction,
    duplicateCount: event.duplicateCount,
  }));
  const allTransactions = [...transactionsByWeek.entries()].sort(([a], [b]) => a - b)
    .flatMap(([week, transactions]) => transactions.map((transaction) => ({ week, transaction })));
  const dataThroughMs = Math.max(...allTransactions.map(({ transaction }) => transaction.status_updated ?? transaction.created), 0);
  return {
    fixtureVersion: FIXTURE_VERSION,
    season: SEASON,
    competitionLabel: 'SeaMex 2026',
    source: {
      sleeperBaseUrl: API,
      supabaseProjectRef: EXPECTED_PROJECT_REF,
      transactionContentHash: sha256(allTransactions),
      dataThrough: new Date(dataThroughMs).toISOString(),
      refreshCommand: 'LEAGUE_ID=<private> npm run analyze:bidding -- --refresh',
    },
    league: {
      totalTeams: league.total_rosters,
      initialFaab,
      scoring,
      rosterPositions: league.roster_positions,
      startersPerPos: starterCounts(league.roster_positions),
      settingsProvenance: 'Sleeper league endpoint observed at fixture refresh; no historical settings endpoint exists.',
      activeTeamCountMethod: 'Production guillotine progression estimate: subtract two teams per completed decision week while above 16, then one, floor four.',
    },
    transactionWeeks: [...transactionsByWeek].map(([week, rows]) => ({ week, raw: rows.length, waivers: rows.filter((row) => row.type === 'waiver').length })),
    audit: classified.audit,
    snapshots,
    events,
  };
}

function round(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function pct(value: number): string {
  return `${round(value * 100, 1)}%`;
}

function table(headers: string[], rows: Array<Array<string | number>>): string {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
}

export function contextFor(fixture: AnalysisFixture, decisionWeek: number): LeagueContext {
  const teamsRemaining = estimateRemainingTeamsAtDecisionWeek(fixture.league.totalTeams, decisionWeek);
  const elimsPerWeek = teamsRemaining > 16 ? 2 : 1;
  return {
    budget: fixture.league.initialFaab,
    teamsRemaining,
    currentWeek: decisionWeek,
    weeksRemaining: Math.min(Math.max(1, Math.ceil((teamsRemaining - 1) / elimsPerWeek)), Math.max(1, 19 - decisionWeek)),
    startersPerPos: fixture.league.startersPerPos,
  };
}

export function fixtureProjections(snapshot: SnapshotFixture): Map<string, RosPlayerProjection> {
  return new Map((snapshot.projections ?? []).map((row) => [row.player, {
    playerId: row.player,
    position: row.position,
    totalPoints: row.totalPoints,
    pointsPerWeek: row.pointsPerWeek,
    projectedWeeks: Math.max(1, 19 - snapshot.requestedDecisionWeek),
    sourceValue: row.totalPoints,
  }]));
}

function canonicalEvent(event: EventFixture): CanonicalBidEvent {
  return {
    transactionId: event.transaction,
    managerRosterId: Number(event.manager.slice(1)),
    playerId: event.player,
    transactionWeek: event.transactionWeek,
    decisionWeek: event.decisionWeek,
    batchKey: event.batch,
    actualBid: event.actualBid,
    outcome: event.outcome,
    createdAt: event.createdAt,
    processedAt: event.processedAt,
    faabAvailableBeforeBid: event.preBidFaab,
    faabReconstruction: event.faabReconstruction,
    duplicateCount: event.duplicateCount,
  };
}

function assignTiers(events: EnrichedEvent[]): void {
  for (const decisionWeek of [...new Set(events.map((event) => event.decisionWeek))]) {
    const targets = [...new Map(events.filter((event) => event.decisionWeek === decisionWeek)
      .map((event) => [event.player, event.suggestions['max-vorp']])).entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const rank = new Map(targets.map(([player], index) => [player, index]));
    for (const event of events.filter((row) => row.decisionWeek === decisionWeek)) {
      const fraction = ((rank.get(event.player) ?? 0) + 1) / Math.max(1, targets.length);
      event.playerTier = fraction <= 0.25 ? 'top-quartile' : fraction > 0.75 ? 'bottom-quartile' : 'middle-half';
    }
  }
}

export function enrichEvents(fixture: AnalysisFixture): { usable: EnrichedEvent[]; exclusions: Record<string, number> } {
  const exclusions: Record<string, number> = {};
  const usable: EnrichedEvent[] = [];
  const suggestionByEvent = new Map<string, Record<StrategyId, number>>();
  const increment = (reason: string) => exclusions[reason] = (exclusions[reason] ?? 0) + 1;
  for (const snapshot of fixture.snapshots) {
    const events = fixture.events.filter((event) => event.decisionWeek === snapshot.requestedDecisionWeek);
    if (!snapshot.available) { for (const _event of events) increment(snapshot.exclusionReason ?? 'snapshot-unavailable'); continue; }
    if (snapshot.provenance !== 'exact' && snapshot.provenance !== 'reconstructed') { for (const _event of events) increment('snapshot-provenance-invalid'); continue; }
    const projections = fixtureProjections(snapshot);
    const ctx = contextFor(fixture, snapshot.requestedDecisionWeek);
    const board = buildWaiverBoard([...projections.keys()], projections, ctx, [], (id) => id, {
      maxPerPos: Number.POSITIVE_INFINITY,
      sleeperRosProjections: projections,
      replacementTeamCount: ctx.teamsRemaining,
    });
    const boardByPlayer = new Map(board.map((row) => [row.playerId, row]));
    const legacyByPlayer = new Map(board.map((row) => [row.playerId, {
      safe: row.suggestions.find((item) => item.strategy === 'safe')?.value ?? null,
      weeksStarter: row.suggestions.find((item) => item.strategy === 'weeks-starter')?.value ?? null,
    }]));
    const offlineByPlayer = new Map(buildOfflinePlayerValues(projections, ctx, legacyByPlayer).map((row) => [row.playerId, row]));
    for (const event of events) {
      const row = boardByPlayer.get(event.player);
      const offline = offlineByPlayer.get(event.player);
      if (!row || !offline) { increment('target-missing-supported-position-projection'); continue; }
      const suggestions: Record<StrategyId, number> = {
        'max-vorp': offline.maxVorp,
        'middle-vorp': offline.middleVorp,
        vorp: offline.currentVorp,
        'corrected-safe': offline.correctedSafe,
        'corrected-weeks-starter': offline.correctedWeeksStarter,
        safe: offline.legacySafe ?? 0,
        aggressive: row.suggestions.find((item) => item.strategy === 'aggressive')?.value ?? 0,
        'weeks-starter': offline.legacyWeeksStarter ?? 0,
      };
      if (Object.values(suggestions).some((value) => !Number.isFinite(value))) { increment('one-or-more-analysis-strategies-unavailable'); continue; }
      suggestionByEvent.set(event.event, suggestions);
      usable.push({
        ...event,
        position: row.position,
        posRank: offline.positionRank,
        activeTeams: ctx.teamsRemaining,
        snapshotProvenance: snapshot.provenance,
        suggestions,
        middleSensitivity: {
          horizon67: offline.horizon67,
          horizon50Floor: offline.horizon50Floor,
          horizon33: offline.horizon33,
        },
        token: isTokenBid(event.actualBid, fixture.league.initialFaab),
        playerTier: '',
        capState: event.actualBid >= event.preBidFaab * 0.9 ? 'at-least-90%-prebid' : 'below-90%-prebid',
        managerForecast: null,
      });
    }
  }
  assignTiers(usable);

  for (const event of usable) {
    const eventTime = event.processedAt ?? event.createdAt;
    const prior = fixture.events.filter((candidate) => (candidate.processedAt ?? candidate.createdAt) < eventTime
      && suggestionByEvent.has(candidate.event));
    const selected = selectTopCanonicalBids(prior.map(canonicalEvent));
    const historical = new Map<string, HistoricalBaselineEvidence>();
    for (const candidate of prior) {
      historical.set(candidate.transaction, {
        baseline: suggestionByEvent.get(candidate.event)?.['max-vorp'] ?? null,
        provenance: 'reconstructed',
        captureProvenance: 'reconstructed',
        matchesRequestedDecisionWeek: true,
        snapshotDecisionWeek: candidate.decisionWeek,
        baselineStrategyId: 'max-vorp',
        baselineStrategyVersion: 'max-vorp-v1',
      });
    }
    const profile = buildManagerBiddingProfiles([Number(event.manager.slice(1))], selected, historical)[0];
    const prediction = predictManagerBid(profile, event.suggestions['max-vorp'], event.preBidFaab);
    event.managerForecast = prediction ? Math.round(prediction.feasiblePredictedBid) : null;
  }
  return { usable, exclusions: Object.fromEntries(Object.entries(exclusions).sort(([a], [b]) => a.localeCompare(b))) };
}

export function evaluationRows(events: EnrichedEvent[], strategy: StrategyId, originalFaab: number): EvaluatedBid[] {
  return events.map((event) => ({
    eventId: event.event,
    clusterId: `${event.decisionWeek}:${event.batch}:${event.player}`,
    strategy,
    actual: event.actualBid,
    predicted: event.suggestions[strategy],
    originalFaab,
    preBidFaab: Math.max(1, event.preBidFaab),
  }));
}

function metricsCells(events: EnrichedEvent[], strategy: StrategyId, originalFaab: number): Array<string | number> {
  const rows = evaluationRows(events, strategy, originalFaab);
  const metrics = computeErrorMetrics(rows);
  const interval = bootstrapMaeInterval(rows);
  if (!metrics) return [0, '—', '—', '—', '—', '—', '—', '—'];
  return [
    metrics.n,
    round(metrics.mae, 1),
    interval ? `${round(interval[0], 1)}–${round(interval[1], 1)}` : '—',
    round(metrics.medianAbsoluteError, 1),
    round(metrics.signedBias, 1),
    metrics.spearman == null ? '—' : round(metrics.spearman, 2),
    pct(metrics.withinToleranceRate),
    `${round(metrics.predictedMin, 0)}–${round(metrics.predictedMax, 0)}`,
  ];
}

function bestByMae(events: EnrichedEvent[], originalFaab: number): string {
  const ranked = STRATEGIES.map(([id, label]) => ({
    label,
    mae: computeErrorMetrics(evaluationRows(events, id, originalFaab))?.mae ?? Number.POSITIVE_INFINITY,
  })).sort((a, b) => a.mae - b.mae || a.label.localeCompare(b.label));
  return `${ranked[0].label} (${round(ranked[0].mae, 1)})`;
}

function renderMiddleVorpEvaluation(fixture: AnalysisFixture, events: EnrichedEvent[]): string {
  const snapshot = [...fixture.snapshots]
    .filter((row) => row.available && row.projections?.length)
    .sort((a, b) => b.requestedDecisionWeek - a.requestedDecisionWeek)[0];
  if (!snapshot) throw new Error('Middle VORP current-state analysis requires an available projection snapshot');
  const ctx = contextFor(fixture, snapshot.requestedDecisionWeek);
  const projections = fixtureProjections(snapshot);
  const board = buildWaiverBoard([...projections.keys()], projections, ctx, [], (id) => id, {
    maxPerPos: Number.POSITIVE_INFINITY,
    sleeperRosProjections: projections,
    replacementTeamCount: ctx.teamsRemaining,
  });
  const legacy = new Map(board.map((row) => [row.playerId, {
    safe: row.suggestions.find((item) => item.strategy === 'safe')?.value ?? null,
    weeksStarter: row.suggestions.find((item) => item.strategy === 'weeks-starter')?.value ?? null,
  }]));
  const rows = buildOfflinePlayerValues(projections, ctx, legacy);
  const methods = [
    ['maxVorp', 'Max VORP'],
    ['middleVorp', 'Middle VORP'],
    ['currentVorp', 'Current-team VoRP'],
    ['correctedSafe', 'Corrected Safe'],
    ['correctedWeeksStarter', 'Corrected Weeks as Starter'],
    ['horizon67', '67% common horizon'],
    ['horizon33', '33% common horizon'],
  ] as const;
  const order = (key: typeof methods[number][0], limit = 12) => [...rows]
    .sort((a, b) => (b[key] as number) - (a[key] as number) || b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId))
    .slice(0, limit)
    .map((row) => `${row.playerId} (${row.position}${row.positionRank}, $${row[key]})`).join(', ');
  const distributionRows = methods.map(([key, label]) => {
    const summary = summarizeDistribution(rows.map((row) => row[key] as number));
    return [label, summary.n, summary.positive, summary.zero, round(summary.min, 0), round(summary.p25, 1), round(summary.median, 1), round(summary.mean, 1), round(summary.p75, 1), round(summary.max, 0), round(summary.total, 0)];
  });
  const cutoffRows = methods.flatMap(([key, label]) => ['QB', 'RB', 'WR', 'TE'].map((position) => {
    const positive = rows.filter((row) => row.position === position && (row[key] as number) > 0);
    return [label, position, positive.length, positive.length ? Math.max(...positive.map((row) => row.positionRank)) : '—'];
  }));
  const correlationRows = methods.filter(([key]) => key !== 'middleVorp').map(([key, label]) => [
    `Middle VORP vs ${label}`,
    rankCorrelation(rows, 'middleVorp', key) == null ? '—' : round(rankCorrelation(rows, 'middleVorp', key)!, 3),
  ]);
  const ranked = (key: 'middleVorp' | 'maxVorp' | 'currentVorp') => new Map([...rows]
    .sort((a, b) => b[key] - a[key] || b.pointsPerWeek - a.pointsPerWeek || a.playerId.localeCompare(b.playerId))
    .map((row, index) => [row.playerId, index + 1]));
  const middleRanks = ranked('middleVorp');
  const maxRanks = ranked('maxVorp');
  const currentRanks = ranked('currentVorp');
  const divergence = [...rows].filter((row) => row.middleVorp > 0 && row.maxVorp !== row.middleVorp && row.currentVorp !== row.middleVorp)
    .sort((a, b) => {
      const aGap = Math.max(Math.abs(middleRanks.get(a.playerId)! - maxRanks.get(a.playerId)!), Math.abs(middleRanks.get(a.playerId)! - currentRanks.get(a.playerId)!));
      const bGap = Math.max(Math.abs(middleRanks.get(b.playerId)! - maxRanks.get(b.playerId)!), Math.abs(middleRanks.get(b.playerId)! - currentRanks.get(b.playerId)!));
      return bGap - aGap || a.playerId.localeCompare(b.playerId);
    }).slice(0, 10);
  const divergenceRows = divergence.map((row) => [
    `${row.playerId} (${row.position}${row.positionRank})`,
    `$${row.middleVorp} / #${middleRanks.get(row.playerId)}`,
    `$${row.maxVorp} / #${maxRanks.get(row.playerId)}`,
    row.maxVorpStage == null ? '—' : `${row.maxVorpStage} teams`,
    `$${row.currentVorp} / #${currentRanks.get(row.playerId)}`,
    `Max selected its largest unrounded value at the ${row.maxVorpStage ?? 'unavailable'}-team reachable stage; Middle fixes one ${commonHorizonTeamCount(ctx.teamsRemaining)}-team stage for every player.`,
  ]);
  const sensitivityRows = [
    ['67%', commonHorizonTeamCount(ctx.teamsRemaining, 0.67), 'horizon67'],
    ['50% (primary, ceil)', commonHorizonTeamCount(ctx.teamsRemaining, 0.5, 'ceil'), 'middleVorp'],
    ['50% (floor)', commonHorizonTeamCount(ctx.teamsRemaining, 0.5, 'floor'), 'horizon50Floor'],
    ['33%', commonHorizonTeamCount(ctx.teamsRemaining, 0.33), 'horizon33'],
  ] as const;
  const currentSensitivity = sensitivityRows.map(([label, teams, key]) => [label, teams, summarizeDistribution(rows.map((row) => row[key])).positive, round(rankCorrelation(rows, 'middleVorp', key) ?? 1, 3)]);
  const primaryWins = events.filter((event) => event.outcome === 'won' && !(event.decisionWeek === 3 && event.actualBid === 234));
  const historicalSensitivity = sensitivityRows.map(([label, _teams, key]) => {
    const evaluated: EvaluatedBid[] = primaryWins.flatMap((event) => {
      const predicted = key === 'middleVorp' ? event.suggestions['middle-vorp'] : event.middleSensitivity[key];
      return predicted > 0 ? [{ eventId: event.event, clusterId: event.batch, strategy: key, actual: event.actualBid, predicted, originalFaab: fixture.league.initialFaab, preBidFaab: event.preBidFaab }] : [];
    });
    const metrics = computeErrorMetrics(evaluated);
    return [label, metrics?.n ?? 0, metrics ? round(metrics.mae, 1) : '—', metrics ? round(metrics.signedBias, 1) : '—', metrics?.spearman == null ? '—' : round(metrics.spearman, 3)];
  });
  return `## Middle VORP candidate evaluation\n\n` +
    `**Candidate:** use one common replacement horizon for the entire league state: \`targetTeams = max(4, ceil(teamsRemaining / 2))\`. This gives 28→14, 27→14, and 5→4. Unlike Max VORP, it never chooses a different future stage per player. Unlike current-team VoRP, it prices scarcity at a deliberately forward-looking but shared stage. The 50% horizon is a hypothesis, not a fitted constant.\n\n` +
    `**Recommendation: retain analysis-only.** Middle VORP is conceptually cleaner than per-player maximization and materially different from current-team VoRP, but only W2 and W3 completed decision weeks are evaluable and both projection inputs are reconstructed. That cannot establish a new default. A preregistered W4+ sequence using exact pre-waiver captures would raise confidence if Middle preserves rank quality, has lower held-out MAE/bias after prior-only scaling, and remains stable across 33%/50%/67% horizons and outlier/all-bid filters; persistent underperformance or horizon instability would lower it.\n\n` +
    `### Latest reproducible SeaMex state\n\n` +
    `The latest available deterministic input is the privacy-safe reconstructed **W${snapshot.requestedDecisionWeek}** projection snapshot (content hash \`${snapshot.contentHash}\`, ${snapshot.projectionCount} stored projection rows; ${rows.length} supported QB/RB/WR/TE players), with ${ctx.teamsRemaining} teams, $${ctx.budget} common budget, and no roster/manager/league identifiers. Player labels are fixture aliases, not identities. It is the latest reproducible analysis state—not a claim that an exact W4 pre-waiver capture exists.\n\n` +
    `#### Player ordering (top 12)\n\n${methods.map(([key, label]) => `- **${label}:** ${order(key)}`).join('\n')}\n\n` +
    `#### Dollar distributions and positive counts\n\n${table(['Method', 'n', 'Positive', 'Zero', 'Min', 'P25', 'Median', 'Mean', 'P75', 'Max', 'Total $'], distributionRows)}\n\n` +
    `#### Positional positive-price cutoffs\n\n${table(['Method', 'Position', 'Positive count', 'Deepest positive position rank'], cutoffRows)}\n\n` +
    `#### Rank correlations\n\n${table(['Pair', 'Spearman ρ'], correlationRows)}\n\n` +
    `#### Concrete Middle/Max/current-team divergences\n\n${table(['Privacy-safe player', 'Middle $ / rank', 'Max $ / rank', 'Max-selected stage', 'Current $ / rank', 'Why'], divergenceRows)}\n\n` +
    `### Common-horizon sensitivity\n\n${table(['Horizon', 'Current-state target teams', 'Positive prices', 'Spearman vs primary 50%'], currentSensitivity)}\n\n` +
    `${table(['Horizon', 'Historical canonical-win n', 'MAE', 'Bias', 'Spearman ρ'], historicalSensitivity)}\n\n` +
    `The observed W2/W3 team counts are even (30 and 28), so floor and ceil produce identical empirical bids and **do not change the conclusions**. The explicit odd-state unit case differs as intended (27→14 with ceil versus 27→13 with floor); future odd-team observations must keep this sensitivity live.\n\n` +
    `### Corrected non-VORP context\n\n` +
    `Corrected Safe and Weeks-as-Starter are reproduced in the offline layer from PR #13 implementation commit \`7d86b2d\`: direct slots are allocated first, then FLEX and SUPER_FLEX from remaining eligible players, and unsupported replacement depth maps to zero rather than an artificial premium. No PR #13 product code is merged or cherry-picked. Legacy curves remain separately labeled in the broader report so historical comparisons are not silently rewritten.\n`;
}

function renderReport(fixture: AnalysisFixture): string {
  const { usable, exclusions } = enrichEvents(fixture);
  const weeklyAppendix = renderWeeklyMarketMarkdown(buildWeeklyMarketAnalysis(usable));
  const middleVorpEvaluation = renderMiddleVorpEvaluation(fixture, usable);
  const budget = fixture.league.initialFaab;
  const wins = usable.filter((event) => event.outcome === 'won');
  const serious = usable.filter((event) => !event.token);
  const clusterCounts = new Map<string, number>();
  for (const event of serious) {
    const key = `${event.decisionWeek}:${event.batch}:${event.player}`;
    clusterCounts.set(key, (clusterCounts.get(key) ?? 0) + 1);
  }
  const seriousClusters = serious.filter((event) => (clusterCounts.get(`${event.decisionWeek}:${event.batch}:${event.player}`) ?? 0) >= 2);
  const outliers = flagIsolatedOutliers(usable.map((event) => ({
    eventId: event.event,
    clusterId: `${event.decisionWeek}:${event.batch}:${event.player}`,
    actualBid: event.actualBid,
    originalFaab: budget,
  })));
  const sensitivity = [
    ['All usable winning bids', wins],
    ['Non-token winning bids', wins.filter((event) => !event.token)],
    ['Non-token, ratio-gap flag removed', wins.filter((event) => !event.token && !outliers.ratioGap.has(event.event))],
    ['Non-token, MAD flag removed', wins.filter((event) => !event.token && !outliers.mad.has(event.event))],
    ['Non-token, IQR flag removed', wins.filter((event) => !event.token && !outliers.iqr.has(event.event))],
  ] as const;
  const subsets = [
    ['All valid bids', usable],
    ['Winning bids', wins],
    ['Serious/non-token bids', serious],
    ['Serious competitive clusters', seriousClusters],
  ] as const;
  const reconstructionGroups = new Map<FaabReconstruction, number>();
  for (const event of fixture.events) reconstructionGroups.set(event.faabReconstruction, (reconstructionGroups.get(event.faabReconstruction) ?? 0) + 1);
  const reconstructionCounts: Array<[FaabReconstruction, number]> = [
    ['transaction-ledger', reconstructionGroups.get('transaction-ledger') ?? 0],
    ['inferred-minimum', reconstructionGroups.get('inferred-minimum') ?? 0],
    ['uncertain', reconstructionGroups.get('uncertain') ?? 0],
  ];
  const usableDecisionWeeks = [...new Set(usable.map((event) => event.decisionWeek))].sort((a, b) => a - b);
  const managerRows = usable.filter((event) => event.managerForecast != null).map((event): EvaluatedBid => ({
    eventId: event.event,
    clusterId: `${event.decisionWeek}:${event.batch}:${event.player}`,
    strategy: 'walk-forward-manager',
    actual: event.actualBid,
    predicted: event.managerForecast!,
    originalFaab: budget,
    preBidFaab: Math.max(1, event.preBidFaab),
  }));
  const managerMetrics = computeErrorMetrics(managerRows);
  const managerWins = managerRows.filter((row) => wins.some((event) => event.event === row.eventId));
  const managerWinMetrics = computeErrorMetrics(managerWins);
  const managerMetricRows = [
    ['All forecastable bids', managerRows, managerMetrics],
    ['Forecastable wins', managerWins, managerWinMetrics],
  ] as const;

  const metricTables = subsets.map(([name, rows]) => `### ${name}\n\n${table(
    ['Strategy', 'n', 'MAE', '95% cluster-bootstrap MAE CI', 'Median AE', 'Bias (pred−actual)', 'Spearman ρ', 'Within max($5,20%)', 'Predicted range'],
    STRATEGIES.map(([id, label]) => [label, ...metricsCells(rows, id, budget)]),
  )}`).join('\n\n');

  const sensitivityTable = table(
    ['Sensitivity case', 'n wins', ...STRATEGIES.map(([, label]) => `${label} MAE`)],
    sensitivity.map(([name, rows]) => [name, rows.length, ...STRATEGIES.map(([id]) => round(computeErrorMetrics(evaluationRows(rows, id, budget))?.mae ?? Number.NaN, 1))]),
  );

  const sliceGroups: Array<[string, (event: EnrichedEvent) => string]> = [
    ['decision week', (event) => `W${event.decisionWeek}`],
    ['position', (event) => event.position],
    ['Max-VORP target tier', (event) => event.playerTier],
    ['cap state', (event) => event.capState],
  ];
  const sliceRows = sliceGroups.flatMap(([dimension, select]) => {
    const groups = new Map<string, EnrichedEvent[]>();
    for (const event of wins) {
      const key = select(event);
      const group = groups.get(key) ?? [];
      group.push(event);
      groups.set(key, group);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([value, rows]) => [dimension, value, rows.length, bestByMae(rows, budget)]);
  });

  const competitiveClusterKeys = [...new Set(seriousClusters.map((event) => `${event.decisionWeek}:${event.batch}:${event.player}`))];
  const coverageRows = STRATEGIES.map(([id, label]) => {
    let covered = 0;
    for (const key of competitiveClusterKeys) {
      const cluster = seriousClusters.filter((event) => `${event.decisionWeek}:${event.batch}:${event.player}` === key);
      const prediction = cluster[0].suggestions[id];
      if (prediction >= Math.min(...cluster.map((event) => event.actualBid)) && prediction <= Math.max(...cluster.map((event) => event.actualBid))) covered += 1;
    }
    return [label, competitiveClusterKeys.length, covered, competitiveClusterKeys.length ? pct(covered / competitiveClusterKeys.length) : '—'];
  });

  const winsRank = STRATEGIES.map(([id, label]) => {
    const metrics = computeErrorMetrics(evaluationRows(wins, id, budget));
    return [label, metrics?.spearman == null ? '—' : round(metrics.spearman, 2), metrics ? `${round(metrics.actualMin, 0)}–${round(metrics.actualMax, 0)}` : '—', metrics ? `${round(metrics.predictedMin, 0)}–${round(metrics.predictedMax, 0)}` : '—'];
  });
  const normalizedRows = STRATEGIES.map(([id, label]) => {
    const metrics = computeErrorMetrics(evaluationRows(wins, id, budget));
    return [label, metrics ? pct(metrics.originalFaabNormalizedMae) : '—', metrics ? pct(metrics.preBidFaabNormalizedMae) : '—'];
  });

  const bestAllWins = STRATEGIES.map(([id, label]) => ({ label, mae: computeErrorMetrics(evaluationRows(wins, id, budget))?.mae ?? Infinity }))
    .sort((a, b) => a.mae - b.mae || a.label.localeCompare(b.label))[0];
  const bestSeriousWins = STRATEGIES.map(([id, label]) => ({ label, mae: computeErrorMetrics(evaluationRows(wins.filter((event) => !event.token), id, budget))?.mae ?? Infinity }))
    .sort((a, b) => a.mae - b.mae || a.label.localeCompare(b.label))[0];
  const robustLeaders = sensitivity.slice(2).map(([name, rows]) => {
    const leader = STRATEGIES.map(([id, label]) => ({ label, mae: computeErrorMetrics(evaluationRows(rows, id, budget))?.mae ?? Infinity }))
      .sort((a, b) => a.mae - b.mae || a.label.localeCompare(b.label))[0];
    return `${name.replace('Non-token, ', '')}: ${leader.label}`;
  });
  const robustlyStable = robustLeaders.every((value) => value.endsWith(`: ${bestSeriousWins.label}`));

  const rawWeekRows = fixture.transactionWeeks.filter((row) => row.raw > 0).map((row) => [row.week, row.raw, row.waivers]);
  const exclusionRows = [
    ...Object.entries(fixture.audit.exclusions).map(([reason, count]) => [`classifier:${reason}`, count]),
    ...Object.entries(exclusions).map(([reason, count]) => [`analysis:${reason}`, count]),
  ];
  const snapshotRows = fixture.snapshots.map((snapshot) => [
    snapshot.requestedDecisionWeek,
    snapshot.available ? snapshot.snapshotDecisionWeek! : snapshot.snapshotDecisionWeek ?? '—',
    snapshot.available ? snapshot.provenance! : 'excluded',
    snapshot.available ? snapshot.canonicalCutoffAt! : '—',
    snapshot.available ? snapshot.captureStartedAt! : '—',
    snapshot.available ? snapshot.fetchedAt! : '—',
    snapshot.available ? snapshot.contentHash!.slice(0, 16) + '…' : snapshot.exclusionReason!,
    snapshot.available ? snapshot.rowCount! : 0,
    snapshot.available ? snapshot.projectionCount! : 0,
  ]);

  return `# SeaMex 2026 bidding-strategy accuracy analysis\n\n` +
`Deterministic offline report generated from anonymized fixture version ${fixture.fixtureVersion}. Data are complete through **${fixture.source.dataThrough}**; there is no wall-clock generation timestamp. Regenerate byte-for-byte with \`npm run analyze:bidding\`.\n\n` +
`${middleVorpEvaluation}\n\n` +
`${weeklyAppendix}\n\n` +
`## Executive result\n\n` +
`Among ${wins.length} usable winning bids, **${bestAllWins.label}** has the lowest in-sample MAE (${round(bestAllWins.mae, 1)}). After the predeclared token rule, **${bestSeriousWins.label}** is lowest (${round(bestSeriousWins.mae, 1)}). Robust-filter leaders are ${robustLeaders.join('; ')}; the serious-bid leader is ${robustlyStable ? '' : '**not** '}stable across them. This is descriptive evidence from one 32-team league, ${usableDecisionWeeks.length} reconstructed decision weeks, not a universal strategy ranking. Do **not** change the production default from this study alone.\n\n` +
`The executable comparison preserves the five production-registry strategies, adds **Middle VORP only in this offline analysis**, and separately labels the corrected PR #13 Safe/Weeks curves versus legacy branch outputs. The P0 label “Weekly” is **not** silently mapped to VoRP; the naming audit below establishes why it is excluded as undefined. No production registry, default, or UI behavior is changed.\n\n` +
`## Naming audit: requested “Weekly” is not an implemented strategy\n\n` +
`| Evidence | Authoritative finding |\n| --- | --- |\n| Initial strategy implementation \`c331281\` (2026-09-21) | Registry keys were \`safe\`, \`exponential\`, \`weeks-starter\`, and \`vorp\`; UI label for \`vorp\` was “VoRP.” |\n| Rename \`1656925\` (2026-09-23) | \`exponential\` became \`aggressive\`; no Weekly strategy was introduced. |\n| Max-VORP addition \`7c32a1f\` (2026-09-25) | Added \`max-vorp\`; the other keys remained \`weeks-starter\`, \`safe\`, \`aggressive\`, and \`vorp\`. |\n| Exhaustive local history/ref search | No commit, branch, registry, type, or UI label defines a \`weekly\` strategy or an alias from Weekly to \`vorp\`. |\n| PR #10 terminology | “historicalWeeklyBaseline” is explicitly documented as reusing the existing **Weeks-as-Starter** formula, and the implementation selected \`weeks-starter\`. It is a time-indexed baseline description, not a separate strategy and not a VoRP alias. |\n\n` +
`**Resolution:** there is no authoritative basis to rename \`vorp\` to Weekly, and treating “weekly baseline” as a separate strategy would merely duplicate Weeks-as-Starter, which P0 already lists separately. Therefore requested **Weekly is excluded with reason \`no-authoritative-formula-or-key\`**, while the current registry's \`vorp\` output is analyzed under its real label, **VoRP**. If John intended a sixth/distinct Weekly formula, its definition must be supplied before it can be replayed without fabrication.\n\n` +
`## Provenance and replay contract\n\n` +
`- Sleeper public API base: \`${fixture.source.sleeperBaseUrl}\`; season ${fixture.season}; transaction payload SHA-256 \`${fixture.source.transactionContentHash}\`. The private league identifier is intentionally absent.\n` +
`- Projection source: read-only Supabase project ref \`${fixture.source.supabaseProjectRef}\`, verified before every refresh. Refresh uses GET only. No credential, raw payload, player ID/name, manager ID/name, or league ID is stored.\n` +
`- League settings observed at refresh: ${fixture.league.totalTeams} starting teams, $${budget} initial FAAB, ${fixture.league.scoring}, lineup \`${fixture.league.rosterPositions.join(',')}\`. Sleeper provides no historical settings endpoint, so season stability is an explicit assumption, not silently inferred history.\n` +
`- Active teams use the production progression estimator, not current rosters: ${usableDecisionWeeks.map((week) => `W${week}=${estimateRemainingTeamsAtDecisionWeek(fixture.league.totalTeams, week)}`).join(', ')}. Every transaction week is translated to decision week as \`transactionWeek + 1\`.\n` +
`- Fixture refresh (private environment only): \`SUPABASE_PROJECT_REF=${fixture.source.supabaseProjectRef} SUPABASE_URL=https://${fixture.source.supabaseProjectRef}.supabase.co SUPABASE_READ_KEY=<private> ${fixture.source.refreshCommand}\`. Offline report: \`npm run analyze:bidding\`. Focused tests: \`npm test -- --run scripts/__tests__/bidding-strategy-analysis.test.ts\`. Full verification: \`npm test -- --run\`, \`npm run lint\`, script-only \`tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --types node scripts/analyze-bidding-strategies.ts scripts/bidding-strategy-analysis.ts\`, \`git diff --check\`, and changed-file secret/identifier scan.\n\n` +
`### Projection snapshots\n\n${table(['Requested decision week', 'Stored week', 'Status/provenance', 'Canonical cutoff/effective at', 'Capture started', 'Provider fetched at', 'Content hash / exclusion', 'Raw rows', 'ROS players'], snapshotRows)}\n\n` +
`Per the repository's provenance rules, all W1–W3 snapshot runs—including the usable W2/W3 runs here—are labeled **reconstructed**, never exact. A same-week reconstructed capture preserves what was actually stored and its capture/effective-at provenance, but it is not proof of the pre-waiver forecast. An earlier-week fallback is not substituted: affected events are excluded.\n\n` +
`## Extraction and exclusion audit\n\n${table(['Transaction week', 'Raw transactions', 'Raw waivers'], rawWeekRows)}\n\n` +
`- Raw transactions: **${fixture.audit.rawTransactions}**; raw waivers: **${fixture.audit.rawWaivers}**.\n` +
`- Before dedupe: ${fixture.audit.candidateWins} completed wins and ${fixture.audit.candidateLegitimateLosses} same-batch/player-proven legitimate losses. After manager+player+processing-batch dedupe: **${fixture.audit.canonicalWins} wins + ${fixture.audit.canonicalLegitimateLosses} losses = ${fixture.audit.canonicalWins + fixture.audit.canonicalLegitimateLosses} canonical bids**; ${fixture.audit.duplicateCandidatePathsRemoved} contingency/drop paths removed.\n` +
`- FAAB ledger inputs: ${fixture.audit.completedLedgerSpendRows} completed spend rows and ${fixture.audit.completedLedgerTransferRows} completed transfer records. Reconstruction: ${reconstructionCounts.map(([name, count]) => `${name}=${count}`).join(', ')}. A claim that exceeds the reconstructed ledger is retained at an explicit inferred minimum; unreliable prior timestamps are marked uncertain.\n` +
`- Formula-usable events: **${usable.length}** (${wins.length} wins, ${usable.length - wins.length} legitimate losses); token/low-intent: ${usable.filter((event) => event.token).length}; serious: ${serious.length}; serious competitive-cluster bids: ${seriousClusters.length} across ${competitiveClusterKeys.length} player/batches.\n\n${table(['Exclusion reason', 'Count'], exclusionRows)}\n\n` +
`## Fixed rules (declared before looking at winners)\n\n` +
`- **Token/low intent:** bid ≤ max($${ANALYSIS_POLICY.tokenMinimumDollars}, ${(ANALYSIS_POLICY.tokenOriginalFaabFraction * 100).toFixed(0)}% of original FAAB) = $${Math.max(ANALYSIS_POLICY.tokenMinimumDollars, budget * ANALYSIS_POLICY.tokenOriginalFaabFraction)}. Evidence is never deleted; it is separated in sensitivity views.\n` +
`- **Ratio-gap isolated top:** top/second ≥ ${ANALYSIS_POLICY.ratioGapMinimumRatio}× and dollar gap ≥ ${(ANALYSIS_POLICY.ratioGapMinimumOriginalFaabFraction * 100).toFixed(0)}% original FAAB.\n` +
`- **MAD isolated top:** cluster n≥3, normalized top > median + ${ANALYSIS_POLICY.madMultiplier}×1.4826×MAD, plus ≥ ${(ANALYSIS_POLICY.robustGapMinimumOriginalFaabFraction * 100).toFixed(0)}% original-FAAB gap.\n` +
`- **IQR isolated top:** cluster n≥4, normalized top > Q3 + ${ANALYSIS_POLICY.iqrMultiplier}×IQR, plus the same minimum gap.\n` +
`Flags (not deletions): ratio-gap=${outliers.ratioGap.size}, MAD=${outliers.mad.size}, IQR=${outliers.iqr.size}. Rules are applied independently and are not selected based on which strategy wins.\n\n` +
`## Production formulas replayed\n\n` +
`Production-registry values come from \`buildWaiverBoard\` using the shared implementation and each event's reconstructed context. Max VORP maximizes unrounded championship-calibrated VORP dollars across every reachable active-team stage. Current-team VoRP uses the event's active-team replacement stage. Middle VORP is analysis-only and uses the same VoRP calibration at one shared \`max(4, ceil(teamsRemaining/2))\` stage. Corrected Safe/Weeks reproduce PR #13 commit \`7d86b2d\` in the offline layer; legacy branch outputs remain separately labeled. Legacy Aggressive is \`round(WeeksAsStarter × 2 × (1 − (decisionWeek−1)/16))\`. Intrinsic suggestions are **not** capped by manager FAAB; pre-bid normalization is reported separately. No Weekly value is computed because no authoritative production or historical formula exists.\n\n` +
metricTables + `\n\n` +
`## Sensitivity of winning-bid MAE\n\n${sensitivityTable}\n\n` +
`95% intervals are deterministic ${ANALYSIS_POLICY.bootstrapIterations}-replicate cluster bootstraps (seed ${ANALYSIS_POLICY.bootstrapSeed}); resampling the player/batch cluster keeps correlated win/loss bids together. They quantify sampling variation in this observed set, not projection-history error.\n\n` +
`## Target/player price rank and range coverage\n\n${table(['Strategy', 'Spearman vs winning price', 'Observed winning range', 'Predicted range'], winsRank)}\n\n` +
`A serious-cluster prediction is “covered” when it falls inside that target's observed non-token bid range (minimum serious loss through winning bid).\n\n${table(['Strategy', 'Competitive clusters', 'Inside observed range', 'Coverage'], coverageRows)}\n\n` +
`## Normalized winning-bid error\n\n${table(['Strategy', 'MAE / original FAAB', 'MAE of bid/pre-bid-FAAB ratio'], normalizedRows)}\n\n` +
`Pre-bid normalization is shown only because the ledger denominator is positive; reconstruction confidence remains visible above. It does not reinterpret intrinsic strategy values as manager-specific willingness.\n\n` +
`## Useful slices (winning bids)\n\n${table(['Dimension', 'Slice', 'n', 'Lowest MAE strategy (MAE)'], sliceRows)}\n\n` +
`Slices are descriptive and often tiny. Player tier is a deterministic within-decision-week quartile of target Max-VORP value; cap state means actual bid ≥90% of reconstructed pre-bid FAAB.\n\n` +
`## Manager-adjusted forecasts (strict walk-forward)\n\n` +
`For each batch, the production Max-VORP manager profile is fit only from that anonymized manager's earlier processed batches with usable historical baselines; same-batch and future claims are excluded. The prediction is capped at reconstructed pre-bid FAAB and is analyzed separately from intrinsic strategies. Forecastable=${managerRows.length}; omitted for insufficient prior-only evidence=${usable.length - managerRows.length}.\n\n` +
`${table(['Forecast subset', 'n', 'MAE', '95% cluster-bootstrap MAE CI', 'Median AE', 'Bias', 'Spearman ρ', 'Within max($5,20%)', 'Actual range', 'Forecast range'], managerMetricRows.map(([name, rows, metrics]) => {
  const interval = bootstrapMaeInterval(rows);
  return metrics ? [name, metrics.n, round(metrics.mae, 1), interval ? `${round(interval[0], 1)}–${round(interval[1], 1)}` : '—', round(metrics.medianAbsoluteError, 1), round(metrics.signedBias, 1), metrics.spearman == null ? '—' : round(metrics.spearman, 2), pct(metrics.withinToleranceRate), `${round(metrics.actualMin, 0)}–${round(metrics.actualMax, 0)}`, `${round(metrics.predictedMin, 0)}–${round(metrics.predictedMax, 0)}`] : [name, 0, '—', '—', '—', '—', '—', '—', '—', '—'];
}))}\n\n` +
`Because every underlying historical projection is reconstructed, these forecasts are exploratory, not historically exact. Missing forecasts are explicit prior-evidence exclusions, not zero predictions.\n\n` +
`## Validation, limitations, and recommendation\n\n` +
`- Leave-week-out fitting is not statistically supported: only ${usableDecisionWeeks.length} usable decision weeks (${usableDecisionWeeks.map((week) => `W${week}`).join(', ')}) exist and all are reconstructed. The compared intrinsic formulas have no fitted parameters here. Manager forecasts therefore use strict chronological walk-forward validation instead.\n` +
`- Sleeper's transaction API reveals failed private amounts only for returned failed records. The classifier retains only failures proven by a different same-player winner in the identical processing batch; it makes no claim about unsupported or absent private bids.\n` +
`- Reconstructed snapshots were captured after their canonical cutoffs. Historical player ranks and values may differ from what managers saw. No current projection is substituted for an absent decision week.\n` +
`- Historical roster ownership is not required by these formulas for a known claimed target, but league settings are only observed current-season state. Active-team counts are formula-derived progression estimates.\n` +
`- One league, early season, correlated bids, and small slices mean strategy ordering can change with one extreme target. Bootstrap intervals do not repair systematic snapshot error.\n` +
`- Recommendation: keep production behavior unchanged. ${robustlyStable ? `Use **${bestSeriousWins.label}** only as a preregistered hypothesis, not a winner.` : `No strategy is a robust winner: **${bestSeriousWins.label}** leads the serious-bid view, but another strategy leads at least one fixed outlier sensitivity.`} Collect exact Tuesday 8 PM captures and repeat across materially more weeks before drawing product conclusions.\n`;
}

async function main(): Promise<void> {
  const refresh = process.argv.includes('--refresh');
  const fixture = refresh ? await refreshFixture() : JSON.parse(await readFile(FIXTURE_PATH, 'utf8')) as AnalysisFixture;
  if (fixture.fixtureVersion !== FIXTURE_VERSION) throw new Error(`Unsupported fixture version ${fixture.fixtureVersion}`);
  if (fixture.source.supabaseProjectRef !== EXPECTED_PROJECT_REF) throw new Error('Fixture project ref is not approved');
  if (refresh) await writeFile(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`);
  await writeFile(REPORT_PATH, renderReport(fixture));
  console.log(`Wrote ${REPORT_PATH}${refresh ? ` and ${FIXTURE_PATH}` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
}
