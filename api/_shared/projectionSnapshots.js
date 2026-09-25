const crypto = require('node:crypto');

const SOURCE = 'sleeper';
const ENDPOINT_TEMPLATE = 'https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}';
const MAX_WEEK = 18;
const POINT_FIELDS = [
  ['pts_std', 'pts_std'],
  ['pts_half_ppr', 'pts_half_ppr'],
  ['pts_ppr', 'pts_ppr'],
];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(status, body, extraHeaders = {}) {
  return {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

function parsePostBody(rawBody) {
  let body = rawBody;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { throw new HttpError(400, 'body must be valid JSON'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'body must be a JSON object');
  const allowed = new Set(['season', 'decisionWeek', 'canonicalCutoffAt']);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new HttpError(400, 'body contains unknown fields');
  if (!Object.hasOwn(body, 'season') || !Object.hasOwn(body, 'decisionWeek') || !Object.hasOwn(body, 'canonicalCutoffAt')) {
    throw new HttpError(400, 'season, decisionWeek, and canonicalCutoffAt are required');
  }
  const canonicalCutoffAt = parseIsoTimestamp(body.canonicalCutoffAt, 'canonicalCutoffAt');
  const cutoff = new Date(canonicalCutoffAt);
  if (cutoff.getUTCDay() !== 2 || cutoff.getUTCHours() !== 23 || cutoff.getUTCMinutes() !== 0 || cutoff.getUTCSeconds() !== 0 || cutoff.getUTCMilliseconds() !== 0) {
    throw new HttpError(400, 'canonicalCutoffAt must be Tuesday at exactly 23:00:00 UTC');
  }
  return {
    season: parseInteger(body.season, 'season', 2000, 2100),
    decisionWeek: parseInteger(body.decisionWeek, 'decisionWeek', 1, MAX_WEEK),
    canonicalCutoffAt,
  };
}

function parseGetQuery(query = {}) {
  return {
    season: parseInteger(query.season, 'season', 2000, 2100),
    decisionWeek: parseInteger(query.decisionWeek, 'decisionWeek', 1, MAX_WEEK),
  };
}

function isAuthorized(authorization, expectedSecret) {
  if (typeof expectedSecret !== 'string' || expectedSecret.length < 32) return false;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice(7);
  const suppliedDigest = crypto.createHash('sha256').update(supplied).digest();
  const expectedDigest = crypto.createHash('sha256').update(expectedSecret).digest();
  return crypto.timingSafeEqual(suppliedDigest, expectedDigest);
}

function finitePoint(value) {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1000 ? value : null;
}

function compactProjectionPayload(payload, projectionWeek) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Sleeper week ${projectionWeek} returned an invalid payload`);
  }
  const rows = [];
  for (const [rawPlayerId, projection] of Object.entries(payload)) {
    const playerId = rawPlayerId.trim();
    if (!playerId || playerId.length > 64 || !projection || typeof projection !== 'object' || Array.isArray(projection)) continue;
    const row = { projection_week: projectionWeek, player_id: playerId };
    let populated = false;
    for (const [sourceField, targetField] of POINT_FIELDS) {
      const point = finitePoint(projection[sourceField]);
      if (point !== null) {
        row[targetField] = point;
        populated = true;
      } else {
        row[targetField] = null;
      }
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

async function fetchRemainingProjections({ fetchImpl, season, decisionWeek }) {
  const requests = [];
  for (let week = decisionWeek; week <= MAX_WEEK; week += 1) {
    requests.push((async () => {
      const url = ENDPOINT_TEMPLATE.replace('{season}', season).replace('{week}', week);
      const response = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': 'GuillotineCompanion/1.0' } });
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

function createProjectionSnapshotService({ repository, fetchImpl = fetch, schedulerSecret, now = () => new Date() }) {
  return {
    async post(req) {
      if (!isAuthorized(getHeader(req.headers, 'authorization'), schedulerSecret)) {
        return jsonResponse(401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
      }
      try {
        const input = parsePostBody(req.body);
        const rows = await fetchRemainingProjections({ fetchImpl, ...input });
        const contentHash = hashRows(rows);
        const saved = await repository.ingest({
          source: SOURCE,
          endpointTemplate: ENDPOINT_TEMPLATE,
          fetchedAt: now().toISOString(),
          contentHash,
          rows,
          ...input,
        });
        return jsonResponse(saved.created ? 201 : 200, {
          snapshotId: saved.snapshotId,
          status: saved.status,
          created: saved.created,
          fetchedWeeks: { from: input.decisionWeek, through: MAX_WEEK },
          rowCount: saved.rowCount,
          contentHash: saved.contentHash || contentHash,
        });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 502;
        return jsonResponse(status, { error: error instanceof Error ? error.message : 'Snapshot ingestion failed' });
      }
    },

    async get(req) {
      try {
        const input = parseGetQuery(req.query);
        const snapshot = await repository.findLatest(input);
        if (!snapshot) return jsonResponse(404, { error: 'No completed snapshot is available at or before the requested decision week' });
        return jsonResponse(200, {
          snapshot: {
            id: snapshot.id,
            source: snapshot.source,
            season: snapshot.season,
            decisionWeek: snapshot.decisionWeek,
            canonicalCutoffAt: snapshot.canonicalCutoffAt,
            fetchedAt: snapshot.fetchedAt,
            endpointTemplate: snapshot.endpointTemplate,
            rowCount: snapshot.rowCount,
            contentHash: snapshot.contentHash,
          },
          provenance: {
            kind: snapshot.decisionWeek === input.decisionWeek ? 'exact' : 'reconstructed',
            exact: snapshot.decisionWeek === input.decisionWeek,
            requestedDecisionWeek: input.decisionWeek,
            snapshotDecisionWeek: snapshot.decisionWeek,
          },
          rows: snapshot.rows,
        });
      } catch (error) {
        const status = error instanceof HttpError ? error.status : 502;
        return jsonResponse(status, { error: error instanceof Error ? error.message : 'Snapshot lookup failed' });
      }
    },
  };
}

module.exports = {
  ENDPOINT_TEMPLATE,
  HttpError,
  canonicalizeRows,
  compactProjectionPayload,
  createProjectionSnapshotService,
  fetchRemainingProjections,
  hashRows,
  isAuthorized,
  parseGetQuery,
  parsePostBody,
};
