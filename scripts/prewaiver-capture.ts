import { createHash, createHmac } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ManagerBiddingProfile } from '../src/logic/biddingProfiles.ts';
import { predictManagerBid } from '../src/logic/biddingProfiles.ts';
import { computeProjectedLineupGroupRanks, parseLineupSlots, projectBestLineup, type TeamProjection } from '../src/logic/analytics.ts';
import { buyerLikelihood, type BuyerLikelihood } from '../src/logic/managerPredictionDisplay.ts';
import type { RosPlayerProjection, WeeklyScoredPlayer } from '../src/logic/projections.ts';
import { buildWaiverBoard, type LeagueContext } from '../src/logic/waivers.ts';
import { resolveBiddingBaseline } from '../src/logic/waiverStrategies.ts';

export const PREWAIVER_SCHEMA_VERSION = 'prewaiver-opportunity-v1';
export const PREWAIVER_CAPTURE_MODEL = Object.freeze({
  managerPrediction: 'predictManagerBid (production)',
  buyerLikelihood: 'buyerLikelihood/rankQuartile (production)',
  lineup: 'projectBestLineup + computeProjectedLineupGroupRanks (production)',
  targetStrategies: 'buildWaiverBoard + resolveBiddingBaseline (production)',
});

export interface PrewaiverPlayerInput {
  sourceId: string;
  position: string;
  weeklyPoints: number | null;
  rosPoints: number;
  sleeperRosPoints?: number | null;
  sourceValue?: number;
  sourceRank?: number | null;
  injuryStatus?: string | null;
  byeWeek?: number | null;
}

export interface PrewaiverManagerInput {
  sourceRosterId: string;
  active: boolean;
  eliminatedWeek: number | null;
  preWaiverFaab: number;
  playerSourceIds: string[];
  profile: Omit<ManagerBiddingProfile, 'managerRosterId' | 'evidence'> & {
    evidence?: ManagerBiddingProfile['evidence'];
  };
}

export interface PrewaiverCaptureInput {
  schemaVersion: 'prewaiver-capture-input-v1';
  season: number;
  decisionWeek: number;
  playingWeek: number;
  captureAt: string;
  captureWindow: { opensAt: string; closesAt: string; waiverProcessesAt: string };
  projectionSnapshot?: {
    contentHash: string;
    season: number;
    decisionWeek: number;
    canonicalCutoffAt: string;
  } | null;
  league: {
    budget: number;
    activeTeamCount: number;
    weeksRemaining: number;
    currentWeek: number;
    rosterPositions: string[];
  };
  managers: PrewaiverManagerInput[];
  players: PrewaiverPlayerInput[];
  targetSourceIds: string[];
}

export interface FrozenNeedInput {
  playerKey: string;
  position: string;
  weeklyPoints: number | null;
  selectedGroup: string | null;
  selectedPoints: number | null;
}

export interface PrewaiverOpportunityRow {
  managerKey: string;
  active: boolean;
  eliminatedWeek: number | null;
  preWaiverFaab: number;
  targetKey: string;
  targetPosition: string;
  targetValue: number;
  targetRank: number | null;
  targetPositionRank: number;
  positionalStrengthPoints: number | null;
  positionalStrengthRank: number | null;
  positionalStrengthOutOf: number | null;
  needPercentile: number | null;
  needScore: number | null;
  likelihood: BuyerLikelihood;
  predictedBid: number | null;
  feasiblePrediction: number | null;
  cappedByFaab: boolean | null;
  predictionInputs: {
    baseline: number | null;
    managerMultiplier: ManagerBiddingProfile['managerMultiplier'];
    style: ManagerBiddingProfile['style'];
    confidence: ManagerBiddingProfile['confidence'];
    usableEvidenceCount: number;
    baselineStrategyId: string;
    baselineStrategyVersion: string;
  };
  targetStrategies: {
    maxVorp: number | null;
    safe: number | null;
    weeksAsStarter: number | null;
    aggressive: number | null;
  };
  targetStarterWeeks: number;
  targetPossibleStarterWeeks: number;
  injuryStatus: string | null;
  byeWeek: number | null;
  activeTeamCount: number;
  totalActiveFaab: number;
  medianActiveFaab: number;
  frozenRoster: FrozenNeedInput[];
}

export interface PrewaiverPanel {
  schemaVersion: typeof PREWAIVER_SCHEMA_VERSION;
  coordinate: {
    season: number;
    decisionWeek: number;
    playingWeek: number;
    captureAt: string;
    windowOpensAt: string;
    windowClosesAt: string;
    waiverProcessesAt: string;
  };
  timing: { exact: true; state: 'pre-waiver-exact' };
  context: {
    initialFaab: number;
    activeTeamCount: number;
    totalPreWaiverFaab: number;
    medianPreWaiverFaab: number;
    weeksRemaining: number;
    currentWeek: number;
    rosterPositions: string[];
  };
  projectionLink: {
    contentHash: string;
    season: number;
    decisionWeek: number;
    canonicalCutoffAt: string;
  } | null;
  model: typeof PREWAIVER_CAPTURE_MODEL;
  rows: PrewaiverOpportunityRow[];
  audit: {
    managerCount: number;
    activeManagerCount: number;
    targetCount: number;
    expectedRowCount: number;
    actualRowCount: number;
    uniqueRowCount: number;
    tieBreakRule: string;
    inputHash: string;
    rowsHash: string;
    artifactHash: string;
  };
}

export interface CaptureComputation {
  panel: PrewaiverPanel | null;
  timing: {
    eligible: boolean;
    state: 'pre-waiver-exact' | 'before-window' | 'post-waiver';
    checkedAt: string;
    reason: string | null;
  };
  validation: {
    managerCount: number;
    activeManagerCount: number;
    targetCount: number;
    expectedRowCount: number;
    actualRowCount: number;
    uniqueRowCount: number;
    inputHash: string;
    rowsHash: string;
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function round(value: number, digits = 6): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function requireFinite(value: unknown, path: string, minimum = 0): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${path} must be a finite number >= ${minimum}.`);
  }
}

function requireIso(value: string, path: string): number {
  const parsed = Date.parse(value);
  if (!value || !Number.isFinite(parsed)) throw new Error(`${path} must be an ISO timestamp.`);
  return parsed;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function alias(salt: string, namespace: 'manager' | 'player', sourceId: string): string {
  const digest = createHmac('sha256', salt).update(`${namespace}:${sourceId}`).digest('hex').slice(0, 16);
  return `${namespace}_${digest}`;
}

function validateInput(input: PrewaiverCaptureInput, salt: string): void {
  if (input.schemaVersion !== 'prewaiver-capture-input-v1') throw new Error('Unsupported input schemaVersion.');
  if (salt.length < 16) throw new Error('PREWAIVER_ALIAS_SALT must contain at least 16 characters.');
  if (!Number.isInteger(input.season) || input.season < 2000 || input.season > 3000) throw new Error('season is invalid.');
  if (!Number.isInteger(input.decisionWeek) || input.decisionWeek < 1 || input.decisionWeek > 18) throw new Error('decisionWeek must be 1..18.');
  if (input.playingWeek !== input.decisionWeek - 1) throw new Error('playingWeek must equal decisionWeek - 1.');
  if (input.league.currentWeek !== input.decisionWeek) throw new Error('league.currentWeek must equal decisionWeek.');
  requireFinite(input.league.budget, 'league.budget');
  requireFinite(input.league.activeTeamCount, 'league.activeTeamCount', 1);
  requireFinite(input.league.weeksRemaining, 'league.weeksRemaining', 1);
  requireIso(input.captureAt, 'captureAt');
  const opens = requireIso(input.captureWindow.opensAt, 'captureWindow.opensAt');
  const closes = requireIso(input.captureWindow.closesAt, 'captureWindow.closesAt');
  const processes = requireIso(input.captureWindow.waiverProcessesAt, 'captureWindow.waiverProcessesAt');
  if (!(opens < closes && closes <= processes)) throw new Error('capture window must satisfy opensAt < closesAt <= waiverProcessesAt.');
  const managerIds = input.managers.map((row) => row.sourceRosterId);
  if (new Set(managerIds).size !== managerIds.length) throw new Error('manager sourceRosterId values must be unique.');
  const playerIds = input.players.map((row) => row.sourceId);
  if (new Set(playerIds).size !== playerIds.length) throw new Error('player sourceId values must be unique.');
  const playerSet = new Set(playerIds);
  for (const manager of input.managers) {
    requireFinite(manager.preWaiverFaab, `manager ${manager.sourceRosterId} preWaiverFaab`);
    if (manager.preWaiverFaab > input.league.budget) throw new Error(`manager ${manager.sourceRosterId} FAAB exceeds initial budget.`);
    for (const playerId of manager.playerSourceIds) {
      if (!playerSet.has(playerId)) throw new Error(`manager ${manager.sourceRosterId} references missing player ${playerId}.`);
    }
  }
  for (const targetId of input.targetSourceIds) {
    if (!playerSet.has(targetId)) throw new Error(`targetSourceIds references missing player ${targetId}.`);
  }
  if (new Set(input.targetSourceIds).size !== input.targetSourceIds.length) throw new Error('targetSourceIds must be unique.');
  if (input.managers.filter((row) => row.active).length !== input.league.activeTeamCount) {
    throw new Error('league.activeTeamCount does not match active managers.');
  }
  if (input.projectionSnapshot && (input.projectionSnapshot.season !== input.season
    || input.projectionSnapshot.decisionWeek !== input.decisionWeek)) {
    throw new Error('projection snapshot coordinate does not match capture coordinate.');
  }
}

function timingState(input: PrewaiverCaptureInput, checkedAt: string): CaptureComputation['timing'] {
  const captured = requireIso(input.captureAt, 'captureAt');
  const checked = requireIso(checkedAt, 'checkedAt');
  const opens = requireIso(input.captureWindow.opensAt, 'captureWindow.opensAt');
  const closes = requireIso(input.captureWindow.closesAt, 'captureWindow.closesAt');
  if (captured < opens || checked < opens) return {
    eligible: false,
    state: 'before-window',
    checkedAt,
    reason: captured < opens
      ? `captureAt precedes exact window opening ${input.captureWindow.opensAt}.`
      : `execution time precedes exact window opening ${input.captureWindow.opensAt}.`,
  };
  if (captured >= closes || checked >= closes) return {
    eligible: false,
    state: 'post-waiver',
    checkedAt,
    reason: captured >= closes
      ? `captureAt is at/after exact window close ${input.captureWindow.closesAt}; mutable state must not be reconstructed.`
      : `execution time is at/after exact window close ${input.captureWindow.closesAt}; stale timestamps cannot create an exact panel.`,
  };
  if (checked < captured) return {
    eligible: false,
    state: 'before-window',
    checkedAt,
    reason: 'execution time precedes captureAt; clock/input provenance is invalid.',
  };
  return { eligible: true, state: 'pre-waiver-exact', checkedAt, reason: null };
}

function strategyValue(row: ReturnType<typeof buildWaiverBoard>[number], strategy: string): number | null {
  return row.suggestions.find((item) => item.strategy === strategy)?.value ?? null;
}

export function computePrewaiverCapture(
  input: PrewaiverCaptureInput,
  salt: string,
  checkedAt = input.captureAt,
): CaptureComputation {
  validateInput(input, salt);
  const timing = timingState(input, checkedAt);
  const managerKey = new Map(input.managers.map((manager) => [manager.sourceRosterId, alias(salt, 'manager', manager.sourceRosterId)]));
  const playerKey = new Map(input.players.map((player) => [player.sourceId, alias(salt, 'player', player.sourceId)]));
  const players = new Map(input.players.map((player) => [player.sourceId, player]));
  const weekly = new Map<string, WeeklyScoredPlayer>();
  const displayRos = new Map<string, RosPlayerProjection>();
  const sleeperRos = new Map<string, RosPlayerProjection>();
  const projectedWeeks = input.league.weeksRemaining;
  for (const player of input.players) {
    if (player.weeklyPoints != null) {
      requireFinite(player.weeklyPoints, `player ${player.sourceId} weeklyPoints`);
      weekly.set(player.sourceId, { playerId: player.sourceId, position: player.position, points: player.weeklyPoints });
    }
    requireFinite(player.rosPoints, `player ${player.sourceId} rosPoints`);
    displayRos.set(player.sourceId, {
      playerId: player.sourceId,
      position: player.position,
      totalPoints: player.rosPoints,
      pointsPerWeek: player.rosPoints / projectedWeeks,
      projectedWeeks,
      sourceValue: player.sourceValue ?? player.rosPoints,
      sourceRank: player.sourceRank ?? undefined,
    });
    const sleeperPoints = player.sleeperRosPoints ?? player.rosPoints;
    if (sleeperPoints != null) sleeperRos.set(player.sourceId, {
      playerId: player.sourceId,
      position: player.position,
      totalPoints: sleeperPoints,
      pointsPerWeek: sleeperPoints / projectedWeeks,
      projectedWeeks,
    });
  }

  const slots = parseLineupSlots(input.league.rosterPositions);
  // Numeric source-ID ordering preserves the production roster-ID tie-break while the
  // generated synthetic IDs keep private source identifiers out of the artifact.
  const sortedManagers = [...input.managers].sort((left, right) =>
    left.sourceRosterId.localeCompare(right.sourceRosterId, 'en', { numeric: true }));
  const managerIndex = new Map(sortedManagers.map((manager, index) => [manager.sourceRosterId, index + 1]));
  const teamProjections: TeamProjection[] = sortedManagers.map((manager, index) => {
    const lineup = projectBestLineup(manager.playerSourceIds, weekly, slots);
    return {
      rosterId: index + 1,
      displayName: managerKey.get(manager.sourceRosterId)!,
      projPoints: lineup.total,
      eliminated: !manager.active,
      projRank: 0,
      projOutOf: manager.active ? input.league.activeTeamCount : 0,
      risk: 'warning',
      starters: lineup.starters,
    };
  });
  const leagueShape = { roster_positions: input.league.rosterPositions } as Parameters<typeof computeProjectedLineupGroupRanks>[2];
  const groupRanks = computeProjectedLineupGroupRanks(teamProjections, weekly, leagueShape).byRosterId;
  const context: LeagueContext = {
    budget: input.league.budget,
    teamsRemaining: input.league.activeTeamCount,
    weeksRemaining: input.league.weeksRemaining,
    currentWeek: input.league.currentWeek,
    startersPerPos: {
      QB: slots.QB,
      RB: slots.RB,
      WR: slots.WR,
      TE: slots.TE,
      FLEX: slots.FLEX,
      SUPER_FLEX: slots.SUPER_FLEX,
    },
  };
  const targetRows = buildWaiverBoard(
    input.targetSourceIds,
    displayRos,
    context,
    [],
    (id) => playerKey.get(id)!,
    { maxPerPos: Number.MAX_SAFE_INTEGER, sleeperRosProjections: sleeperRos },
  );
  const targetRowById = new Map(targetRows.map((row) => [row.playerId, row]));
  for (const targetId of input.targetSourceIds) {
    if (!targetRowById.has(targetId)) {
      const position = players.get(targetId)?.position ?? 'unknown';
      throw new Error(`Target ${targetId} (${position}) is not eligible for the production waiver board.`);
    }
  }

  const allManagers = input.managers
    .map((manager) => ({ manager, rosterId: managerIndex.get(manager.sourceRosterId)! }))
    .sort((a, b) => managerKey.get(a.manager.sourceRosterId)!.localeCompare(managerKey.get(b.manager.sourceRosterId)!));
  const activeManagers = allManagers.filter(({ manager }) => manager.active);
  const activeFaab = activeManagers.map(({ manager }) => manager.preWaiverFaab);
  const totalActiveFaab = activeFaab.reduce((sum, value) => sum + value, 0);
  const medianActiveFaab = median(activeFaab);
  const rows: PrewaiverOpportunityRow[] = [];
  for (const targetId of [...input.targetSourceIds].sort((a, b) => playerKey.get(a)!.localeCompare(playerKey.get(b)!))) {
    const target = players.get(targetId)!;
    const boardRow = targetRowById.get(targetId)!;
    const baseline = resolveBiddingBaseline(boardRow);
    for (const { manager, rosterId } of allManagers) {
      const rankRow = groupRanks.get(rosterId)?.find((item) => item.group === target.position);
      const rank = rankRow?.rank ?? null;
      const outOf = rankRow?.outOf ?? null;
      const needPercentile = rank != null && outOf != null && outOf > 1 ? (rank - 1) / (outOf - 1) : null;
      const profile: ManagerBiddingProfile = {
        ...manager.profile,
        managerRosterId: rosterId,
        evidence: manager.profile.evidence ?? [],
      };
      const prediction = !manager.active || baseline == null
        ? null
        : predictManagerBid(profile, baseline, manager.preWaiverFaab);
      const lineup = teamProjections[rosterId - 1].starters;
      const selected = new Map(lineup.map((starter) => [starter.playerId, starter]));
      const frozenRoster = [...manager.playerSourceIds]
        .sort((a, b) => playerKey.get(a)!.localeCompare(playerKey.get(b)!))
        .map((sourceId) => {
          const player = players.get(sourceId)!;
          const starter = selected.get(sourceId);
          return {
            playerKey: playerKey.get(sourceId)!,
            position: player.position,
            weeklyPoints: player.weeklyPoints,
            selectedGroup: starter?.position ?? null,
            selectedPoints: starter?.proj ?? null,
          };
        });
      rows.push({
        managerKey: managerKey.get(manager.sourceRosterId)!,
        active: manager.active,
        eliminatedWeek: manager.eliminatedWeek,
        preWaiverFaab: manager.preWaiverFaab,
        targetKey: playerKey.get(targetId)!,
        targetPosition: target.position,
        targetValue: boardRow.sourceValue,
        targetRank: boardRow.sourceRank ?? null,
        targetPositionRank: boardRow.posRank,
        positionalStrengthPoints: rankRow?.points ?? null,
        positionalStrengthRank: rank,
        positionalStrengthOutOf: outOf,
        needPercentile: needPercentile == null ? null : round(needPercentile),
        needScore: needPercentile == null ? null : round(needPercentile),
        likelihood: buyerLikelihood(rank, outOf),
        predictedBid: prediction == null ? null : Math.round(prediction.predictedWillingness),
        feasiblePrediction: prediction == null ? null : Math.round(prediction.feasiblePredictedBid),
        cappedByFaab: prediction?.cappedByFaab ?? null,
        predictionInputs: {
          baseline,
          managerMultiplier: profile.managerMultiplier,
          style: profile.style,
          confidence: profile.confidence,
          usableEvidenceCount: profile.usableEvidenceCount,
          baselineStrategyId: profile.baselineStrategyId,
          baselineStrategyVersion: profile.baselineStrategyVersion,
        },
        targetStrategies: {
          maxVorp: strategyValue(boardRow, 'max-vorp'),
          safe: strategyValue(boardRow, 'safe'),
          weeksAsStarter: strategyValue(boardRow, 'weeks-starter'),
          aggressive: strategyValue(boardRow, 'aggressive'),
        },
        targetStarterWeeks: boardRow.starterWeeks,
        targetPossibleStarterWeeks: boardRow.possibleStarterWeeks,
        injuryStatus: target.injuryStatus ?? null,
        byeWeek: target.byeWeek ?? null,
        activeTeamCount: input.league.activeTeamCount,
        totalActiveFaab,
        medianActiveFaab,
        frozenRoster,
      });
    }
  }
  rows.sort((a, b) => a.targetKey.localeCompare(b.targetKey) || a.managerKey.localeCompare(b.managerKey));
  const expectedRowCount = allManagers.length * input.targetSourceIds.length;
  const uniqueRowCount = new Set(rows.map((row) => `${row.managerKey}|${row.targetKey}`)).size;
  if (rows.length !== expectedRowCount || uniqueRowCount !== expectedRowCount) {
    throw new Error(`Cardinality failure: expected ${expectedRowCount}, actual ${rows.length}, unique ${uniqueRowCount}.`);
  }
  const inputHash = stableHash(input);
  const rowsHash = stableHash(rows);
  const validation = {
    managerCount: input.managers.length,
    activeManagerCount: activeManagers.length,
    targetCount: input.targetSourceIds.length,
    expectedRowCount,
    actualRowCount: rows.length,
    uniqueRowCount,
    inputHash,
    rowsHash,
  };
  if (!timing.eligible) return { panel: null, timing, validation };

  const withoutArtifactHash = {
    schemaVersion: PREWAIVER_SCHEMA_VERSION,
    coordinate: {
      season: input.season,
      decisionWeek: input.decisionWeek,
      playingWeek: input.playingWeek,
      captureAt: input.captureAt,
      windowOpensAt: input.captureWindow.opensAt,
      windowClosesAt: input.captureWindow.closesAt,
      waiverProcessesAt: input.captureWindow.waiverProcessesAt,
    },
    timing: { exact: true as const, state: 'pre-waiver-exact' as const },
    context: {
      initialFaab: input.league.budget,
      activeTeamCount: input.league.activeTeamCount,
      totalPreWaiverFaab: activeFaab.reduce((sum, value) => sum + value, 0),
      medianPreWaiverFaab: median(activeFaab),
      weeksRemaining: input.league.weeksRemaining,
      currentWeek: input.league.currentWeek,
      rosterPositions: [...input.league.rosterPositions],
    },
    projectionLink: input.projectionSnapshot ?? null,
    model: PREWAIVER_CAPTURE_MODEL,
    rows,
    audit: {
      ...validation,
      tieBreakRule: 'Production lineup-group rank: points descending, synthetic roster ID ascending; aliases/rows then lexical.',
    },
  };
  const artifactHash = stableHash(withoutArtifactHash);
  const panel: PrewaiverPanel = {
    ...withoutArtifactHash,
    audit: { ...withoutArtifactHash.audit, artifactHash },
  };
  return { panel, timing, validation };
}

export function artifactFilename(panel: PrewaiverPanel): string {
  const compact = panel.coordinate.captureAt.replace(/[-:]/g, '').replace('.000', '');
  return `prewaiver-${panel.coordinate.season}-dw${String(panel.coordinate.decisionWeek).padStart(2, '0')}-${compact}.json`;
}

export async function writeImmutablePanel(panel: PrewaiverPanel, outputDir: string): Promise<{ path: string; status: 'written' | 'unchanged' }> {
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, artifactFilename(panel));
  const body = `${JSON.stringify(panel, null, 2)}\n`;
  try {
    await access(outputPath, fsConstants.F_OK);
    const existing = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(existing) as PrewaiverPanel;
    const { artifactHash: existingArtifactHash, ...existingAudit } = parsed.audit ?? {};
    const computedExistingArtifactHash = stableHash({ ...parsed, audit: existingAudit });
    if (existingArtifactHash === panel.audit.artifactHash
      && computedExistingArtifactHash === existingArtifactHash
      && stableHash(parsed.rows) === panel.audit.rowsHash) {
      return { path: outputPath, status: 'unchanged' };
    }
    throw new Error(`Immutable artifact conflict at ${outputPath}; existing hash differs. Refusing overwrite.`);
  } catch (error) {
    if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
  }
  await writeFile(outputPath, body, { flag: 'wx', mode: 0o600 });
  return { path: outputPath, status: 'written' };
}

interface CliOptions { input: string; outputDir: string; dryRun: boolean; saltEnv: string }

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { input: '', outputDir: 'analysis/prewaiver-panels', dryRun: false, saltEnv: 'PREWAIVER_ALIAS_SALT' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') options.input = argv[++index] ?? '';
    else if (arg === '--output-dir') options.outputDir = argv[++index] ?? '';
    else if (arg === '--salt-env') options.saltEnv = argv[++index] ?? '';
    else if (arg === '--dry-run') options.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.input) throw new Error('Usage: npm run capture:prewaiver -- --input <local-input.json> [--output-dir <dir>] [--dry-run]');
  return options;
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseArgs(argv);
  const salt = process.env[options.saltEnv];
  if (!salt) throw new Error(`${options.saltEnv} is required and must remain local-only.`);
  const inputText = await readFile(options.input, 'utf8');
  const input = JSON.parse(inputText) as PrewaiverCaptureInput;
  // The CLI always checks wall-clock execution time as well as the frozen source timestamp.
  // This prevents a stale pre-cutoff captureAt value from producing an "exact" panel later.
  const result = computePrewaiverCapture(input, salt, new Date().toISOString());
  const summary = {
    input: basename(options.input),
    dryRun: options.dryRun,
    timing: result.timing,
    validation: result.validation,
    wouldWrite: !options.dryRun && result.panel != null,
    expectedArtifact: result.panel ? resolve(options.outputDir, artifactFilename(result.panel)) : null,
  };
  if (options.dryRun || !result.panel) {
    console.log(JSON.stringify(summary, null, 2));
    return result.timing.eligible ? 0 : 2;
  }
  const write = await writeImmutablePanel(result.panel, options.outputDir);
  console.log(JSON.stringify({ ...summary, write }, null, 2));
  return 0;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  runCli().then((code) => { process.exitCode = code; }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
