const crypto = require('node:crypto');

const SOURCE = 'sleeper';
const ENDPOINT_TEMPLATE = 'https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}';
const MAX_WEEK = 18;
const CAPTURE_TIME_ZONE = 'America/Los_Angeles';
const EXACT_CAPTURE_WINDOW_MS = 15 * 60 * 1000;
// Exact upstream work must stop two minutes before the immutable finish boundary so
// canonicalization and transactional ingestion are not competing with the cutoff.
const EXACT_FETCH_DEADLINE_OFFSET_MS = 13 * 60 * 1000;
const PROVENANCE = new Set(['exact', 'reconstructed']);
const SCHEDULER_SECRET_HEADER = 'x-projection-snapshot-secret';
const POINT_FIELDS = [
  ['pts_std', 'pts_std'],
  ['pts_half_ppr', 'pts_half_ppr'],
  ['pts_ppr', 'pts_ppr'],
];

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || ({
      400: 'INVALID_REQUEST',
      401: 'UNAUTHORIZED',
      404: 'NOT_FOUND',
      409: 'REQUEST_CONFLICT',
      503: 'SERVICE_UNAVAILABLE',
    }[status] || 'INTERNAL_ERROR');
  }
}

function jsonResponse(status, body, extraHeaders = {}) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Projection-Snapshot-Secret, Content-Type',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function parseInteger(value, name, minimum, maximum) {
  const text = String(value ?? '');
  if (!/^\d+$/.test(text)) throw new HttpError(400, `${name} must be an integer`);
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${name} must be between ${minimum} and ${maximum}`);
  }
  return number;
}

function parseIsoTimestamp(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new HttpError(400, `${name} must be an ISO-8601 timestamp with an offset`);
  }
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) throw new HttpError(400, `${name} is invalid`);
  return instant.toISOString();
}

function zonedParts(instant, timeZone = CAPTURE_TIME_ZONE) {
  const values = {};
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return values;
}

function isCanonicalCutoff(instant) {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (!Number.isFinite(date.getTime()) || date.getUTCMilliseconds() !== 0) return false;
  const parts = zonedParts(date);
  return parts.weekday === 'Tue' && parts.hour === '20' && parts.minute === '00' && parts.second === '00';
}

// Converts an unambiguous local 8 PM date to an instant without assuming a fixed UTC offset.
function canonicalCutoffForLocalDate(localDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate || '');
  if (!match) throw new Error('local cutoff date must be YYYY-MM-DD');
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 20, 0, 0);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(new Date(candidate));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    candidate += desired - represented;
  }
  const result = new Date(candidate);
  if (!isCanonicalCutoff(result)) throw new Error('local cutoff date is not a Tuesday');
  return result.toISOString();
}

function parsePostBody(rawBody) {
  let body = rawBody;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { throw new HttpError(400, 'body must be valid JSON'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'body must be a JSON object');
  const allowed = new Set(['season', 'decisionWeek', 'canonicalCutoffAt', 'provenance']);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new HttpError(400, 'body contains unknown fields');
  if (!Object.hasOwn(body, 'season') || !Object.hasOwn(body, 'decisionWeek') || !Object.hasOwn(body, 'canonicalCutoffAt') || !Object.hasOwn(body, 'provenance')) {
    throw new HttpError(400, 'season, decisionWeek, canonicalCutoffAt, and provenance are required');
  }
  const canonicalCutoffAt = parseIsoTimestamp(body.canonicalCutoffAt, 'canonicalCutoffAt');
  if (!isCanonicalCutoff(new Date(canonicalCutoffAt))) {
    throw new HttpError(400, 'canonicalCutoffAt must be Tuesday at exactly 8:00 PM America/Los_Angeles');
  }
  if (!PROVENANCE.has(body.provenance)) throw new HttpError(400, 'provenance must be exact or reconstructed');
  return {
    season: parseInteger(body.season, 'season', 2000, 2100),
    decisionWeek: parseInteger(body.decisionWeek, 'decisionWeek', 1, MAX_WEEK),
    canonicalCutoffAt,
    provenance: body.provenance,
  };
}

function validateCalendarConfiguration(firstDecisionWeekLocalDate, season) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDecisionWeekLocalDate || '')) {
    throw new HttpError(503, 'capture is unavailable until the season calendar is configured', 'CALENDAR_UNAVAILABLE');
  }
  const [firstYear, firstMonth, firstDay] = firstDecisionWeekLocalDate.split('-').map(Number);
  const firstLocalDay = new Date(Date.UTC(firstYear, firstMonth - 1, firstDay));
  if (
    (season !== undefined && firstYear !== season)
    || firstLocalDay.getUTCFullYear() !== firstYear
    || firstLocalDay.getUTCMonth() !== firstMonth - 1
    || firstLocalDay.getUTCDate() !== firstDay
    || firstLocalDay.getUTCDay() !== 2
  ) {
    throw new HttpError(503, season === undefined
      ? 'the configured season calendar must be a valid Tuesday'
      : 'the configured season calendar must be a Tuesday in the requested season', 'CALENDAR_UNAVAILABLE');
  }
  return firstLocalDay;
}

function validateCalendarCoordinate({ season, decisionWeek, canonicalCutoffAt }, firstDecisionWeekLocalDate) {
  const firstLocalDay = validateCalendarConfiguration(firstDecisionWeekLocalDate, season);
  const expectedDay = firstLocalDay.getTime() + (decisionWeek - 1) * 7 * 86400000;
  const parts = zonedParts(new Date(canonicalCutoffAt));
  const actualDay = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  if (actualDay !== expectedDay) {
    throw new HttpError(409, 'capture cutoff does not match the configured decision-week calendar', 'CALENDAR_MISMATCH');
  }
}

function validateCaptureTiming({ canonicalCutoffAt, provenance }, captureStartedAt, captureFinishedAt = captureStartedAt) {
  const cutoffMs = new Date(canonicalCutoffAt).getTime();
  const startedMs = captureStartedAt.getTime();
  const finishedMs = captureFinishedAt.getTime();
  if (finishedMs < startedMs) {
    throw new HttpError(409, 'capture finish cannot precede capture start', 'CAPTURE_TIMING_INVALID');
  }
  if (provenance !== 'exact') return;
  if (startedMs < cutoffMs) {
    throw new HttpError(409, 'exact capture cannot start before the canonical cutoff', 'WINDOW_NOT_OPEN');
  }
  if (startedMs >= cutoffMs + EXACT_FETCH_DEADLINE_OFFSET_MS) {
    throw new HttpError(409, 'exact capture cannot start after the upstream fetch deadline', 'WINDOW_CLOSED');
  }
  if (finishedMs > cutoffMs + EXACT_CAPTURE_WINDOW_MS) {
    throw new HttpError(409, 'exact capture must finish within 15 minutes after the canonical cutoff', 'WINDOW_CLOSED');
  }
}

function parseGetQuery(query = {}) {
  return {
    season: parseInteger(query.season, 'season', 2000, 2100),
    decisionWeek: parseInteger(query.decisionWeek, 'decisionWeek', 1, MAX_WEEK),
  };
}

function isAuthorized(supplied, expectedSecret) {
  if (typeof expectedSecret !== 'string' || expectedSecret.length < 32) return false;
  if (typeof supplied !== 'string' || supplied.length === 0) return false;
  const suppliedDigest = crypto.createHash('sha256').update(supplied).digest();
  const expectedDigest = crypto.createHash('sha256').update(expectedSecret).digest();
  return crypto.timingSafeEqual(suppliedDigest, expectedDigest);
}

function finitePoint(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1000 ? value : null;
}

function compactProjectionPayload(payload, projectionWeek) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error(`Sleeper week ${projectionWeek} returned an invalid payload`);
  const rows = [];
  for (const [rawPlayerId, projection] of Object.entries(payload)) {
    const playerId = rawPlayerId.trim();
    if (!playerId || playerId.length > 64 || !projection || typeof projection !== 'object' || Array.isArray(projection)) continue;
    const row = { projection_week: projectionWeek, player_id: playerId };
    let populated = false;
    for (const [sourceField, targetField] of POINT_FIELDS) {
      const point = finitePoint(projection[sourceField]);
      row[targetField] = point;
      if (point !== null) populated = true;
    }
    if (populated) rows.push(row);
  }
  return rows;
}

function canonicalizeRows(rows) {
  return [...rows].sort((a, b) => {
    const weekOrder = a.projection_week - b.projection_week;
    if (weekOrder !== 0) return weekOrder;
    return a.player_id < b.player_id ? -1 : a.player_id > b.player_id ? 1 : 0;
  });
}

function hashRows(rows) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalizeRows(rows))).digest('hex');
}

async function fetchRemainingProjections({ fetchImpl, season, decisionWeek, signal }) {
  const requests = [];
  for (let week = decisionWeek; week <= MAX_WEEK; week += 1) {
    requests.push((async () => {
      const url = ENDPOINT_TEMPLATE.replace('{season}', season).replace('{week}', week);
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'GuillotineCompanion/1.0' },
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) throw new Error(`Sleeper week ${week} returned ${response.status}`);
      return compactProjectionPayload(await response.json(), week);
    })());
  }
  const rows = canonicalizeRows((await Promise.all(requests)).flat());
  if (rows.length === 0) throw new Error('Sleeper returned no finite projection values');
  return rows;
}

function getHeader(headers = {}, name) {
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

function describeCaptureTiming(snapshot) {
  if (snapshot.provenance === 'exact') return 'exact-at-cutoff';
  return new Date(snapshot.captureStartedAt).getTime() < new Date(snapshot.canonicalCutoffAt).getTime()
    ? 'early-reconstruction'
    : 'post-cutoff-reconstruction';
}

function createDeadlineSignal(timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new HttpError(409, 'exact capture upstream fetch deadline has passed', 'WINDOW_CLOSED');
  }
  return AbortSignal.timeout(Math.max(1, Math.floor(timeoutMs)));
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.name === 'TimeoutError' || error?.code === 'ABORT_ERR';
}

function errorResponse(error, fallbackStatus, fallbackMessage, fallbackCode) {
  const status = error instanceof HttpError ? error.status : fallbackStatus;
  const code = error instanceof HttpError ? error.code : fallbackCode;
  return jsonResponse(status, { code, error: error instanceof Error ? error.message : fallbackMessage });
}

function createProjectionSnapshotService({
  repository,
  fetchImpl = fetch,
  schedulerSecret,
  firstDecisionWeekLocalDate,
  now = () => new Date(),
  deadlineSignalFactory = createDeadlineSignal,
}) {
  return {
    async health(req) {
      try {
        if (!isAuthorized(getHeader(req.headers, SCHEDULER_SECRET_HEADER), schedulerSecret)) throw new HttpError(401, 'unauthorized');
        validateCalendarConfiguration(firstDecisionWeekLocalDate);
        const response = jsonResponse(204, {});
        response.body = '';
        return response;
      } catch (error) {
        return errorResponse(error, 500, 'scheduler health check failed', 'HEALTH_CHECK_FAILED');
      }
    },

    async post(req) {
      if (!isAuthorized(getHeader(req.headers, SCHEDULER_SECRET_HEADER), schedulerSecret)) {
        return jsonResponse(401, { code: 'UNAUTHORIZED', error: 'Unauthorized' });
      }
      try {
        const input = parsePostBody(req.body);
        validateCalendarCoordinate(input, firstDecisionWeekLocalDate);
        const startedAt = now();
        validateCaptureTiming(input, startedAt);

        if (input.provenance === 'exact') {
          const existing = await repository.findCompletedMetadata({
            source: SOURCE,
            season: input.season,
            decisionWeek: input.decisionWeek,
            canonicalCutoffAt: input.canonicalCutoffAt,
            provenance: input.provenance,
          });
          if (existing) {
            return jsonResponse(200, {
              snapshotId: existing.snapshotId,
              status: existing.status,
              created: false,
              alreadyCompleted: true,
              provenance: existing.provenance,
              rowCount: existing.rowCount,
              contentHash: existing.contentHash,
            });
          }
        }

        let signal;
        if (input.provenance === 'exact') {
          const fetchStartedAt = now();
          validateCaptureTiming(input, fetchStartedAt);
          const fetchDeadlineMs = new Date(input.canonicalCutoffAt).getTime() + EXACT_FETCH_DEADLINE_OFFSET_MS;
          signal = deadlineSignalFactory(fetchDeadlineMs - fetchStartedAt.getTime());
        }

        let rows;
        try {
          rows = await fetchRemainingProjections({ fetchImpl, signal, ...input });
        } catch (error) {
          if (input.provenance === 'exact' && isAbortError(error)) {
            throw new HttpError(409, 'exact capture upstream fetch did not finish before its deadline', 'WINDOW_CLOSED');
          }
          throw error;
        }
        const contentHash = hashRows(rows);
        // This is the immutable exact capture finish instant. It is sampled after
        // upstream completion and canonicalization, immediately before ingestion.
        const fetchedAt = now();
        validateCaptureTiming(input, startedAt, fetchedAt);
        const saved = await repository.ingest({
          source: SOURCE, endpointTemplate: ENDPOINT_TEMPLATE,
          captureStartedAt: startedAt.toISOString(), fetchedAt: fetchedAt.toISOString(), contentHash, rows, ...input,
        });
        return jsonResponse(saved.created ? 201 : 200, {
          snapshotId: saved.snapshotId, status: saved.status, created: saved.created, provenance: saved.provenance || input.provenance,
          fetchedWeeks: { from: input.decisionWeek, through: MAX_WEEK }, rowCount: saved.rowCount, contentHash: saved.contentHash || contentHash,
        });
      } catch (error) {
        if (error && error.code === 'SNAPSHOT_CONFLICT') {
          return jsonResponse(409, { code: 'SNAPSHOT_CONFLICT', error: error.message });
        }
        return errorResponse(error, 502, 'Snapshot ingestion failed', 'SNAPSHOT_INGESTION_FAILED');
      }
    },

    async get(req) {
      try {
        const input = parseGetQuery(req.query);
        const snapshot = await repository.findLatest(input);
        if (!snapshot) return jsonResponse(404, { code: 'SNAPSHOT_NOT_FOUND', error: 'No completed snapshot is available at or before the requested decision week' });
        if (snapshot.season !== input.season) throw new Error('Snapshot lookup crossed the requested season boundary');
        const matchesRequestedDecisionWeek = snapshot.decisionWeek === input.decisionWeek;
        const effectiveKind = matchesRequestedDecisionWeek ? snapshot.provenance : 'reconstructed';
        const effectiveExact = effectiveKind === 'exact';
        return jsonResponse(200, {
          snapshot: {
            id: snapshot.id, source: snapshot.source, season: snapshot.season, decisionWeek: snapshot.decisionWeek,
            canonicalCutoffAt: snapshot.canonicalCutoffAt, captureStartedAt: snapshot.captureStartedAt,
            fetchedAt: snapshot.fetchedAt, endpointTemplate: snapshot.endpointTemplate,
            rowCount: snapshot.rowCount, contentHash: snapshot.contentHash, provenance: snapshot.provenance,
          },
          provenance: {
            // kind/exact/matchesRequestedDecisionWeek remain for existing consumers.
            kind: effectiveKind, exact: effectiveExact, captureKind: snapshot.provenance,
            captureTiming: describeCaptureTiming(snapshot), effectiveKind, effectiveExact,
            selection: matchesRequestedDecisionWeek ? 'same-decision-week' : 'earlier-decision-week-fallback',
            matchesRequestedDecisionWeek,
            requestedDecisionWeek: input.decisionWeek, requestedPlayingWeek: input.decisionWeek - 1,
            snapshotDecisionWeek: snapshot.decisionWeek, snapshotPlayingWeek: snapshot.decisionWeek - 1,
          },
          rows: snapshot.rows,
        });
      } catch (error) {
        return errorResponse(error, 502, 'Snapshot lookup failed', 'SNAPSHOT_LOOKUP_FAILED');
      }
    },
  };
}

module.exports = {
  CAPTURE_TIME_ZONE, ENDPOINT_TEMPLATE, EXACT_CAPTURE_WINDOW_MS, EXACT_FETCH_DEADLINE_OFFSET_MS, MAX_WEEK, HttpError,
  canonicalCutoffForLocalDate, canonicalizeRows, compactProjectionPayload, createDeadlineSignal, createProjectionSnapshotService,
  describeCaptureTiming, fetchRemainingProjections, hashRows, isAuthorized, isCanonicalCutoff, parseGetQuery, parseIsoTimestamp,
  parsePostBody, validateCalendarConfiguration, validateCalendarCoordinate, validateCaptureTiming, zonedParts,
};
