const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compactProjectionPayload,
  createProjectionSnapshotService,
  hashRows,
  isAuthorized,
  parsePostBody,
} = require('../_shared/projectionSnapshots');

const SECRET = 'a-secure-scheduler-secret-at-least-32-chars';
const body = { season: 2026, decisionWeek: 17, canonicalCutoffAt: '2026-12-22T23:00:00Z' };

function sleeperFetch(payload = { z: { pts_ppr: 3 }, a: { pts_std: 1, pts_half_ppr: 2 } }) {
  return async () => ({ ok: true, json: async () => payload });
}

function request(overrides = {}) {
  return { headers: { authorization: `Bearer ${SECRET}` }, body, query: {}, ...overrides };
}

function parse(response) { return JSON.parse(response.body); }

test('constant-time bearer comparison rejects malformed and incorrect credentials', () => {
  assert.equal(isAuthorized(undefined, SECRET), false);
  assert.equal(isAuthorized('Basic value', SECRET), false);
  assert.equal(isAuthorized('Bearer short', SECRET), false);
  assert.equal(isAuthorized(`Bearer ${SECRET}`, SECRET), true);
});

test('POST rejects missing auth before fetching or writing', async () => {
  let touched = false;
  const service = createProjectionSnapshotService({
    schedulerSecret: SECRET,
    fetchImpl: async () => { touched = true; },
    repository: { ingest: async () => { touched = true; } },
  });
  const response = await service.post(request({ headers: {} }));
  assert.equal(response.status, 401);
  assert.equal(touched, false);
});

test('strict POST validation rejects unknown fields, invalid weeks, and timestamps without offsets', () => {
  assert.throws(() => parsePostBody({ ...body, extra: true }), /unknown fields/);
  assert.throws(() => parsePostBody({ ...body, decisionWeek: 19 }), /between 1 and 18/);
  assert.throws(() => parsePostBody({ ...body, canonicalCutoffAt: '2026-12-22T23:00:00' }), /with an offset/);
  assert.throws(() => parsePostBody({ ...body, canonicalCutoffAt: '2026-12-22T23:00:00-08:00' }), /Tuesday at exactly 23:00:00 UTC/);
});

test('compaction retains finite scoring values only and canonical hashing is deterministic', () => {
  const rows = compactProjectionPayload({
    b: { pts_std: 0, pts_half_ppr: Infinity, pts_ppr: '4' },
    a: { pts_ppr: 2.5 },
    empty: { pts_std: null },
  }, 3);
  assert.deepEqual(rows, [
    { projection_week: 3, player_id: 'b', pts_std: 0, pts_half_ppr: null, pts_ppr: null },
    { projection_week: 3, player_id: 'a', pts_std: null, pts_half_ppr: null, pts_ppr: 2.5 },
  ]);
  assert.equal(hashRows(rows), hashRows([...rows].reverse()));
  assert.match(hashRows(rows), /^[0-9a-f]{64}$/);
});

test('POST fetches every remaining week and returns stored idempotency result', async () => {
  const urls = [];
  let saved;
  const service = createProjectionSnapshotService({
    schedulerSecret: SECRET,
    now: () => new Date('2026-12-20T00:00:00Z'),
    fetchImpl: async (url) => { urls.push(url); return sleeperFetch()(); },
    repository: { ingest: async (snapshot) => { saved = snapshot; return { snapshotId: 'id', created: false, rowCount: 4, status: 'completed', contentHash: 'f'.repeat(64) }; } },
  });
  const response = await service.post(request());
  assert.equal(response.status, 200);
  assert.equal(urls.length, 2);
  assert.equal(saved.rows.length, 4);
  assert.deepEqual(parse(response), {
    snapshotId: 'id', status: 'completed', created: false,
    fetchedWeeks: { from: 17, through: 18 }, rowCount: 4, contentHash: 'f'.repeat(64),
  });
});

test('concurrent POST calls delegate uniqueness to transactional repository and reuse one run', async () => {
  let id;
  let calls = 0;
  const repository = {
    async ingest(snapshot) {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      const created = !id;
      id ||= 'canonical-id';
      return { snapshotId: id, created, rowCount: snapshot.rows.length, status: 'completed', contentHash: snapshot.contentHash };
    },
  };
  const service = createProjectionSnapshotService({ repository, schedulerSecret: SECRET, fetchImpl: sleeperFetch() });
  const responses = await Promise.all([service.post(request()), service.post(request())]);
  assert.equal(calls, 2);
  assert.deepEqual(responses.map((response) => parse(response).snapshotId), ['canonical-id', 'canonical-id']);
  assert.deepEqual(responses.map((response) => parse(response).created).sort(), [false, true]);
});

test('POST fails honestly when any Sleeper route or database write fails', async () => {
  const upstream = createProjectionSnapshotService({
    repository: { ingest: async () => assert.fail('must not write') }, schedulerSecret: SECRET,
    fetchImpl: async (url) => url.endsWith('/17') ? { ok: false, status: 503 } : sleeperFetch()(),
  });
  assert.equal((await upstream.post(request())).status, 502);

  const database = createProjectionSnapshotService({
    repository: { ingest: async () => { throw new Error('transaction rolled back'); } }, schedulerSecret: SECRET,
    fetchImpl: sleeperFetch(),
  });
  const response = await database.post(request());
  assert.equal(response.status, 502);
  assert.match(parse(response).error, /rolled back/);
});

test('GET validates input and returns selected snapshot rows with exact provenance', async () => {
  const repository = { findLatest: async () => ({
    id: 'id', source: 'sleeper', season: 2026, decisionWeek: 4,
    canonicalCutoffAt: '2026-09-29T23:00:00Z', fetchedAt: '2026-09-29T23:00:01Z',
    endpointTemplate: 'template', rowCount: 1, contentHash: 'a'.repeat(64),
    rows: [{ projectionWeek: 4, playerId: 'p', ptsStd: 1, ptsHalfPpr: 2, ptsPpr: 3 }],
  }) };
  const service = createProjectionSnapshotService({ repository, schedulerSecret: SECRET });
  assert.equal((await service.get({ query: { season: '2026', decisionWeek: '0' } })).status, 400);
  const response = await service.get({ query: { season: '2026', decisionWeek: '4' } });
  assert.equal(response.status, 200);
  assert.equal(parse(response).provenance.kind, 'exact');
  assert.equal(parse(response).rows[0].playerId, 'p');
});

test('GET marks an older selected snapshot reconstructed and handles missing/failure paths', async () => {
  const older = { id: 'id', source: 'sleeper', season: 2026, decisionWeek: 3, canonicalCutoffAt: 'x', fetchedAt: 'x', endpointTemplate: 'x', rowCount: 0, contentHash: 'x', rows: [] };
  const service = createProjectionSnapshotService({ repository: { findLatest: async () => older }, schedulerSecret: SECRET });
  const response = await service.get({ query: { season: '2026', decisionWeek: '4' } });
  assert.deepEqual(parse(response).provenance, { kind: 'reconstructed', exact: false, requestedDecisionWeek: 4, snapshotDecisionWeek: 3 });

  const missing = createProjectionSnapshotService({ repository: { findLatest: async () => null }, schedulerSecret: SECRET });
  assert.equal((await missing.get({ query: { season: '2026', decisionWeek: '4' } })).status, 404);
  const failed = createProjectionSnapshotService({ repository: { findLatest: async () => { throw new Error('read failed'); } }, schedulerSecret: SECRET });
  assert.equal((await failed.get({ query: { season: '2026', decisionWeek: '4' } })).status, 502);
});
