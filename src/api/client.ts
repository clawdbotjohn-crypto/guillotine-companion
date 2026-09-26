// Sleeper API client — all fetches go through here for consistency

import type {
  League,
  SleeperUser,
  Roster,
  Matchup,
  Transaction,
  DraftPick,
  UserLeague,
  NflState,
  WeeklyProjectionMap,
  FantasyCalcResponse,
  FantasyProsResponse,
  ProjectionSnapshotProvenance,
  ProjectionSnapshotResponse,
} from './types';

const BASE = 'https://api.sleeper.app/v1';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new ApiError(`API error: ${res.statusText}`, res.status);
  }
  return res.json();
}

// League
export const getLeague = (id: string) => get<League>(`/league/${id}`);
export const getLeagueUsers = (id: string) => get<SleeperUser[]>(`/league/${id}/users`);
export const getLeagueRosters = (id: string) => get<Roster[]>(`/league/${id}/rosters`);
export const getMatchups = (id: string, week: number) =>
  get<Matchup[]>(`/league/${id}/matchups/${week}`);
export const getTransactions = (id: string, week: number) =>
  get<Transaction[]>(`/league/${id}/transactions/${week}`);

// Draft
export const getDraftPicks = (draftId: string) => get<DraftPick[]>(`/draft/${draftId}/picks`);

// User
export const getUserByUsername = (username: string) =>
  get<SleeperUser>(`/user/${username}`);
export const getUserLeagues = (userId: string, season: string) =>
  get<UserLeague[]>(`/user/${userId}/leagues/nfl/${season}`);

// Players (large payload ~30MB)
export const getAllPlayers = () => get<Record<string, any>>('/players/nfl');

// NFL state and weekly projections
export const getNflState = () => get<NflState>('/state/nfl');
export const getWeeklyProjections = (season: string, week: number) =>
  get<WeeklyProjectionMap>(`/projections/nfl/regular/${season}/${week}`);

async function getLocal<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(body?.error || `Application API error: ${res.statusText}`, res.status);
  }
  return res.json();
}

export function getFantasyCalcRankings(options: {
  teams: number;
  ppr: number;
  superflex: boolean;
}): Promise<FantasyCalcResponse> {
  const params = new URLSearchParams({
    mode: 'redraft',
    teams: String(options.teams),
    ppr: String(options.ppr),
    sf: options.superflex ? '1' : '0',
  });
  return getLocal(`/api/fc-rankings?${params}`);
}

export function getFantasyProsRankings(
  scoring: 'ppr' | 'half' | 'standard',
): Promise<FantasyProsResponse> {
  return getLocal(`/api/ecr-rankings?scoring=${scoring}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid snapshot response: ${path} must be a non-empty string.`);
  }
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid snapshot response: ${path} must be a finite number.`);
  }
  return value;
}

function requireInteger(value: unknown, path: string, min?: number, max?: number): number {
  const number = requireNumber(value, path);
  if (!Number.isInteger(number) || (min != null && number < min) || (max != null && number > max)) {
    throw new Error(`Invalid snapshot response: ${path} must be an integer${min != null || max != null ? ` (${min ?? '-∞'}..${max ?? '∞'})` : ''}.`);
  }
  return number;
}

function requireNullableNumber(value: unknown, path: string): number | null {
  if (value == null) return null;
  return requireNumber(value, path);
}

function requireProvenance(value: unknown, path: string): ProjectionSnapshotProvenance {
  if (value !== 'exact' && value !== 'reconstructed') {
    throw new Error(`Invalid snapshot response: ${path} must be "exact" or "reconstructed".`);
  }
  return value;
}

function requireOneOf<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`Invalid snapshot response: ${path} must be one of ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function parseProjectionSnapshotResponse(
  payload: unknown,
  expectedSeason: number,
  expectedDecisionWeek: number,
): ProjectionSnapshotResponse {
  if (!isRecord(payload)) {
    throw new Error('Invalid snapshot response: payload must be an object.');
  }

  const snapshot = payload.snapshot;
  const provenance = payload.provenance;
  const rows = payload.rows;

  if (!isRecord(snapshot)) throw new Error('Invalid snapshot response: snapshot must be an object.');
  if (!isRecord(provenance)) throw new Error('Invalid snapshot response: provenance must be an object.');
  if (!Array.isArray(rows)) throw new Error('Invalid snapshot response: rows must be an array.');

  const snapshotSeason = requireInteger(snapshot.season, 'snapshot.season', 2000, 3000);
  const snapshotDecisionWeek = requireInteger(snapshot.decisionWeek, 'snapshot.decisionWeek', 1, 18);
  const snapshotProvenance = requireProvenance(snapshot.provenance, 'snapshot.provenance');
  const rowCount = requireInteger(snapshot.rowCount, 'snapshot.rowCount', 0);

  if (snapshotSeason !== expectedSeason) {
    throw new Error(`Invalid snapshot response: expected season ${expectedSeason}, got ${snapshotSeason}.`);
  }

  const requestedDecisionWeek = requireInteger(provenance.requestedDecisionWeek, 'provenance.requestedDecisionWeek', 1, 18);
  const requestedPlayingWeek = requireInteger(provenance.requestedPlayingWeek, 'provenance.requestedPlayingWeek', 0, 17);
  const effectiveKind = requireProvenance(provenance.effectiveKind, 'provenance.effectiveKind');
  const captureKind = requireProvenance(provenance.captureKind, 'provenance.captureKind');
  const snapshotProvenanceWeek = requireInteger(provenance.snapshotDecisionWeek, 'provenance.snapshotDecisionWeek', 1, 18);
  const snapshotPlayingWeek = requireInteger(provenance.snapshotPlayingWeek, 'provenance.snapshotPlayingWeek', 0, 17);
  requireOneOf(provenance.kind, 'provenance.kind', ['exact', 'reconstructed']);
  requireOneOf(provenance.selection, 'provenance.selection', ['same-decision-week', 'earlier-decision-week-fallback']);
  requireOneOf(provenance.captureTiming, 'provenance.captureTiming', ['exact-at-cutoff', 'early-reconstruction', 'post-cutoff-reconstruction']);

  if (typeof provenance.exact !== 'boolean'
    || typeof provenance.effectiveExact !== 'boolean'
    || typeof provenance.matchesRequestedDecisionWeek !== 'boolean') {
    throw new Error('Invalid snapshot response: provenance boolean fields are malformed.');
  }

  if (requestedDecisionWeek !== expectedDecisionWeek) {
    throw new Error(`Invalid snapshot response: expected requestedDecisionWeek ${expectedDecisionWeek}, got ${requestedDecisionWeek}.`);
  }
  if (requestedPlayingWeek !== requestedDecisionWeek - 1) {
    throw new Error('Invalid snapshot response: requested playing week does not match decision week - 1.');
  }
  if (snapshotPlayingWeek !== snapshotProvenanceWeek - 1) {
    throw new Error('Invalid snapshot response: snapshot playing week does not match snapshot decision week - 1.');
  }
  if (snapshotDecisionWeek !== snapshotProvenanceWeek) {
    throw new Error('Invalid snapshot response: snapshot decision week mismatch between metadata and provenance.');
  }
  if (!snapshot.contentHash || typeof snapshot.contentHash !== 'string') {
    throw new Error('Invalid snapshot response: snapshot.contentHash must be present.');
  }

  const parsedRows = rows.map((row, index) => {
    if (!isRecord(row)) throw new Error(`Invalid snapshot response: rows[${index}] must be an object.`);
    return {
      projectionWeek: requireInteger(row.projectionWeek, `rows[${index}].projectionWeek`, 1, 18),
      playerId: requireString(row.playerId, `rows[${index}].playerId`),
      ptsStd: requireNullableNumber(row.ptsStd, `rows[${index}].ptsStd`),
      ptsHalfPpr: requireNullableNumber(row.ptsHalfPpr, `rows[${index}].ptsHalfPpr`),
      ptsPpr: requireNullableNumber(row.ptsPpr, `rows[${index}].ptsPpr`),
    };
  });

  if (parsedRows.length !== rowCount) {
    throw new Error(`Invalid snapshot response: snapshot.rowCount (${rowCount}) does not match rows length (${parsedRows.length}).`);
  }

  return {
    snapshot: {
      id: requireString(snapshot.id, 'snapshot.id'),
      source: requireOneOf(snapshot.source, 'snapshot.source', ['sleeper']),
      season: snapshotSeason,
      decisionWeek: snapshotDecisionWeek,
      canonicalCutoffAt: requireString(snapshot.canonicalCutoffAt, 'snapshot.canonicalCutoffAt'),
      captureStartedAt: requireString(snapshot.captureStartedAt, 'snapshot.captureStartedAt'),
      fetchedAt: requireString(snapshot.fetchedAt, 'snapshot.fetchedAt'),
      endpointTemplate: requireString(snapshot.endpointTemplate, 'snapshot.endpointTemplate'),
      rowCount,
      contentHash: requireString(snapshot.contentHash, 'snapshot.contentHash'),
      provenance: snapshotProvenance,
    },
    provenance: {
      kind: requireProvenance(provenance.kind, 'provenance.kind'),
      exact: provenance.exact,
      captureKind,
      captureTiming: requireOneOf(provenance.captureTiming, 'provenance.captureTiming', ['exact-at-cutoff', 'early-reconstruction', 'post-cutoff-reconstruction']),
      effectiveKind,
      effectiveExact: provenance.effectiveExact,
      selection: requireOneOf(provenance.selection, 'provenance.selection', ['same-decision-week', 'earlier-decision-week-fallback']),
      matchesRequestedDecisionWeek: provenance.matchesRequestedDecisionWeek,
      requestedDecisionWeek,
      requestedPlayingWeek,
      snapshotDecisionWeek: snapshotProvenanceWeek,
      snapshotPlayingWeek,
    },
    rows: parsedRows,
  };
}

const SNAPSHOT_CONCURRENCY = 4;
let snapshotInFlight = 0;
const snapshotWaiters: Array<() => void> = [];

async function withSnapshotConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  if (snapshotInFlight >= SNAPSHOT_CONCURRENCY) {
    await new Promise<void>((resolve) => snapshotWaiters.push(resolve));
  }
  snapshotInFlight += 1;
  try {
    return await fn();
  } finally {
    snapshotInFlight = Math.max(0, snapshotInFlight - 1);
    const next = snapshotWaiters.shift();
    if (next) next();
  }
}

/** Credential-free, server-safe read of immutable shared projection evidence. */
export async function getProjectionSnapshot(
  season: number,
  decisionWeek: number,
): Promise<ProjectionSnapshotResponse> {
  const params = new URLSearchParams({
    season: String(season),
    decisionWeek: String(decisionWeek),
  });
  const payload = await withSnapshotConcurrency(() => getLocal<unknown>(`/api/projection-snapshots?${params}`));
  return parseProjectionSnapshotResponse(payload, season, decisionWeek);
}

/** Fetch projection weeks with a small concurrency cap so one page load does not fan out 16 requests. */
export async function getProjectionWeeks(
  season: string,
  weeks: number[],
  concurrency = 4,
): Promise<Map<number, WeeklyProjectionMap>> {
  const results = new Map<number, WeeklyProjectionMap>();
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < weeks.length) {
      const week = weeks[nextIndex++];
      try {
        results.set(week, await getWeeklyProjections(season, week));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        throw new Error(`Could not load Sleeper projections for week ${week}: ${message}`);
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), weeks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

// League history — walk previous_league_id chain
export async function getLeagueHistory(leagueId: string): Promise<League[]> {
  const history: League[] = [];
  let currentId: string | null = leagueId;
  while (currentId) {
    const league = await getLeague(currentId);
    history.push(league);
    currentId = league.previous_league_id;
  }
  return history; // Most recent first
}
