const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canonicalCutoffForLocalDate, compactProjectionPayload, createProjectionSnapshotService, hashRows,
  isAuthorized, isCanonicalCutoff, parsePostBody,
} = require('../_shared/projectionSnapshots');

const SECRET = 'a-secure-scheduler-secret-at-least-32-chars';
const body = {
  season: 2026, decisionWeek: 17, canonicalCutoffAt: '2026-12-23T04:00:00Z', provenance: 'reconstructed',
};

function sleeperFetch(payload = { z: { pts_ppr: 3 }, a: { pts_std: 1, pts_half_ppr: 2 } }) {
  return async () => ({ ok: true, json: async () => payload });
}
function request(overrides = {}) { return { headers: { authorization: `Bearer ${SECRET}` }, body, query: {}, ...overrides }; }
function parse(response) { return JSON.parse(response.body); }

// Sep 29 is PDT (UTC-7), Nov 10 is PST (UTC-8).
test('canonical Tuesday 8 PM Los Angeles cutoff is DST-aware for PDT and PST', () => {
  assert.equal(canonicalCutoffForLocalDate('2026-09-29'), '2026-09-30T03:00:00.000Z');
  assert.equal(canonicalCutoffForLocalDate('2026-11-10'), '2026-11-11T04:00:00.000Z');
  assert.equal(isCanonicalCutoff('2026-09-30T03:00:00Z'), true);
  assert.equal(isCanonicalCutoff('2026-11-11T04:00:00Z'), true);
  assert.equal(isCanonicalCutoff('2026-09-29T23:00:00Z'), false);
});

test('constant-time bearer comparison rejects malformed and incorrect credentials', () => {
  assert.equal(isAuthorized(undefined, SECRET), false);
  assert.equal(isAuthorized('Basic value', SECRET), false);
  assert.equal(isAuthorized('Bearer short', SECRET), false);
  assert.equal(isAuthorized(`Bearer ${SECRET}`, SECRET), true);
});

test('POST rejects missing auth before fetching or writing', async () => {
  let touched = false;
  const service = createProjectionSnapshotService({
    schedulerSecret: SECRET, fetchImpl: async () => { touched = true; }, repository: { ingest: async () => { touched = true; } },
  });
  const response = await service.post(request({ headers: {} }));
  assert.equal(response.status, 401);
  assert.equal(touched, false);
});

test('strict POST validation requires explicit provenance and canonical Pacific cutoff', () => {
  assert.throws(() => parsePostBody({ ...body, extra: true }), /unknown fields/);
  assert.throws(() => parsePostBody({ ...body, decisionWeek: 19 }), /between 1 and 18/);
  assert.throws(() => parsePostBody({ ...body, provenance: undefined }), /exact or reconstructed/);
  assert.throws(() => parsePostBody({ ...body, canonicalCutoffAt: '2026-12-22T20:00:00' }), /with an offset/);
  assert.throws(() => parsePostBody({ ...body, canonicalCutoffAt: '2026-12-22T23:00:00Z' }), /8:00 PM America\/Los_Angeles/);
  assert.equal(parsePostBody({ ...body, provenance: 'exact' }).provenance, 'exact');
});

test('exact POST cannot be early or late, while reconstructed capture is allowed', async () => {
  let touched = false;
  const repository = { ingest: async () => { touched = true; return {}; } };
  const early = createProjectionSnapshotService({
    repository, schedulerSecret: SECRET, firstDecisionWeekLocalDate: '2026-09-01',
    fetchImpl: sleeperFetch(), now: () => new Date('2026-12-23T03:59:59Z'),
  });
  const exactBody = { ...body, provenance: 'exact' };
  assert.equal((await early.post(request({ body: exactBody }))).status, 409);
  assert.equal(touched, false);

  const late = createProjectionSnapshotService({
    repository, schedulerSecret: SECRET, firstDecisionWeekLocalDate: '2026-09-01',
    fetchImpl: sleeperFetch(), now: () => new Date('2026-12-23T04:15:01Z'),
  });
  assert.equal((await late.post(request({ body: exactBody }))).status, 409);

  const mismatchedWeek = createProjectionSnapshotService({
    repository, schedulerSecret: SECRET, firstDecisionWeekLocalDate: '2026-09-08',
    fetchImpl: sleeperFetch(), now: () => new Date('2026-12-23T04:05:00Z'),
  });
  assert.equal((await mismatchedWeek.post(request({ body: exactBody }))).status, 409);
  const unconfigured = createProjectionSnapshotService({
    repository, schedulerSecret: SECRET, fetchImpl: sleeperFetch(), now: () => new Date('2026-12-23T04:05:00Z'),
  });
  assert.equal((await unconfigured.post(request({ body: exactBody }))).status, 503);

  const reconstructed = createProjectionSnapshotService({
    repository: { ingest: async (snapshot) => ({ snapshotId: 'id', created: true, rowCount: snapshot.rows.length, status: 'completed', contentHash: snapshot.contentHash, provenance: snapshot.provenance }) },
    schedulerSecret: SECRET, fetchImpl: sleeperFetch(), now: () => new Date('2026-12-20T00:00:00Z'),
  });
  assert.equal((await reconstructed.post(request())).status, 201);
});

test('compaction retains finite scoring values only and canonical hashing is deterministic', () => {
  const rows = compactProjectionPayload({
    b: { pts_std: 0, pts_half_ppr: Infinity, pts_ppr: '4' }, a: { pts_ppr: 2.5 }, empty: { pts_std: null },
  }, 3);
  assert.deepEqual(rows, [
    { projection_week: 3, player_id: 'b', pts_std: 0, pts_half_ppr: null, pts_ppr: null },
    { projection_week: 3, player_id: 'a', pts_std: null, pts_half_ppr: null, pts_ppr: 2.5 },
  ]);
  assert.equal(hashRows(rows), hashRows([...rows].reverse()));
  assert.match(hashRows(rows), /^[0-9a-f]{64}$/);
});

test('POST fetches every remaining week and returns stored idempotency/provenance result', async () => {
  const urls = [];
  let saved;
  const service = createProjectionSnapshotService({
    schedulerSecret: SECRET, now: () => new Date('2026-12-20T00:00:00Z'),
    fetchImpl: async (url) => { urls.push(url); return sleeperFetch()(); },
    repository: { ingest: async (snapshot) => { saved = snapshot; return { snapshotId: 'id', created: false, rowCount: 4, status: 'completed', contentHash: 'f'.repeat(64), provenance: 'reconstructed' }; } },
  });
  const response = await service.post(request());
  assert.equal(response.status, 200);
  assert.equal(urls.length, 2);
  assert.equal(saved.rows.length, 4);
  assert.equal(saved.provenance, 'reconstructed');
  assert.deepEqual(parse(response), {
    snapshotId: 'id', status: 'completed', created: false, provenance: 'reconstructed',
    fetchedWeeks: { from: 17, through: 18 }, rowCount: 4, contentHash: 'f'.repeat(64),
  });
});

test('repository conflict is returned honestly as HTTP 409', async () => {
  const conflict = new Error('snapshot conflict: different immutable content');
  conflict.code = 'SNAPSHOT_CONFLICT';
  const service = createProjectionSnapshotService({
    repository: { ingest: async () => { throw conflict; } }, schedulerSecret: SECRET, fetchImpl: sleeperFetch(),
  });
  const response = await service.post(request());
  assert.equal(response.status, 409);
  assert.match(parse(response).error, /snapshot conflict/);
});

test('POST fails honestly when any Sleeper route or database write fails', async () => {
  const upstream = createProjectionSnapshotService({
    repository: { ingest: async () => assert.fail('must not write') }, schedulerSecret: SECRET,
    fetchImpl: async (url) => url.endsWith('/17') ? { ok: false, status: 503 } : sleeperFetch()(),
  });
  assert.equal((await upstream.post(request())).status, 502);
  const database = createProjectionSnapshotService({
    repository: { ingest: async () => { throw new Error('transaction rolled back'); } }, schedulerSecret: SECRET, fetchImpl: sleeperFetch(),
  });
  assert.equal((await database.post(request())).status, 502);
});

test('GET trusts stored reconstructed provenance even for same decision week', async () => {
  const repository = { findLatest: async () => ({
    id: 'id', source: 'sleeper', season: 2026, decisionWeek: 4, provenance: 'reconstructed',
    canonicalCutoffAt: '2026-09-30T03:00:00Z', fetchedAt: '2026-09-25T05:34:01Z',
    endpointTemplate: 'template', rowCount: 1, contentHash: 'a'.repeat(64),
    rows: [{ projectionWeek: 4, playerId: 'p', ptsStd: 1, ptsHalfPpr: 2, ptsPpr: 3 }],
  }) };
  const service = createProjectionSnapshotService({ repository });
  const response = await service.get({ query: { season: '2026', decisionWeek: '4' } });
  assert.equal(response.status, 200);
  assert.equal(parse(response).snapshot.provenance, 'reconstructed');
  assert.deepEqual(parse(response).provenance, {
    kind: 'reconstructed', exact: false, captureKind: 'reconstructed', matchesRequestedDecisionWeek: true,
    requestedDecisionWeek: 4, snapshotDecisionWeek: 4,
  });
});

test('GET downgrades an older exact capture to reconstructed fallback evidence', async () => {
  const older = {
    id: 'id', source: 'sleeper', season: 2026, decisionWeek: 3, provenance: 'exact',
    canonicalCutoffAt: 'x', fetchedAt: 'x', endpointTemplate: 'x', rowCount: 0, contentHash: 'x', rows: [],
  };
  const service = createProjectionSnapshotService({ repository: { findLatest: async () => older } });
  const response = await service.get({ query: { season: '2026', decisionWeek: '4' } });
  assert.equal(parse(response).provenance.kind, 'reconstructed');
  assert.equal(parse(response).provenance.captureKind, 'exact');
  assert.equal(parse(response).provenance.matchesRequestedDecisionWeek, false);
});
