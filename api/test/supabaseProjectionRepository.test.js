const test = require('node:test');
const assert = require('node:assert/strict');
const { createSupabaseProjectionRepository, requireConfig } = require('../_shared/supabaseProjectionRepository');

test('repository requires backend-only Supabase configuration', () => {
  assert.throws(() => requireConfig({}), /SUPABASE_URL/);
  assert.throws(() => requireConfig({ SUPABASE_URL: 'https://example.supabase.co' }), /SERVICE_ROLE/);
});

test('findLatest selects explicit stored provenance with completed run', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    if (url.includes('projection_snapshot_runs')) {
      return { ok: true, json: async () => [{
        id: 'run', source: 'sleeper', season: 2026, decision_week: 3,
        canonical_cutoff_at: 'cutoff', capture_started_at: 'started', fetched_at: 'fetched', endpoint_template: 'endpoint',
        row_count: 1, content_hash: 'a'.repeat(64), status: 'completed', provenance: 'reconstructed',
      }] };
    }
    return { ok: true, json: async () => [{ projection_week: 4, player_id: 'p', pts_std: '1.5', pts_half_ppr: null, pts_ppr: '2.5' }] };
  };
  const repository = createSupabaseProjectionRepository({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret' }, fetchImpl,
  });
  const result = await repository.findLatest({ season: 2026, decisionWeek: 4 });
  assert.match(requests[0].url, /season=eq\.2026/);
  assert.match(requests[0].url, /decision_week=lte\.4/);
  assert.match(requests[0].url, /order=decision_week\.desc%2Cprovenance\.asc%2Ccanonical_cutoff_at\.desc%2Cid\.asc/);
  assert.match(requests[0].url, /capture_started_at/);
  assert.match(requests[0].url, /provenance/);
  assert.equal(result.captureStartedAt, 'started');
  assert.equal(result.provenance, 'reconstructed');
  assert.deepEqual(result.rows[0], { projectionWeek: 4, playerId: 'p', ptsStd: 1.5, ptsHalfPpr: null, ptsPpr: 2.5 });
  assert.equal(requests[1].options.headers.Range, '0-999');
});

test('duplicate exact ingest uses transactional RPC and returns the existing exact row', async () => {
  let request;
  const repository = createSupabaseProjectionRepository({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => [{
        snapshot_id: 'id', created: false, row_count: 1, status: 'completed',
        stored_content_hash: 'a'.repeat(64), stored_provenance: 'exact',
      }] };
    },
  });
  const result = await repository.ingest({
    source: 'sleeper', season: 2026, decisionWeek: 4, canonicalCutoffAt: 'cutoff', captureStartedAt: 'started', fetchedAt: 'fetched',
    endpointTemplate: 'endpoint', contentHash: 'a'.repeat(64), provenance: 'exact',
    rows: [{ projection_week: 4, player_id: 'p', pts_ppr: 1 }],
  });
  const payload = JSON.parse(request.options.body);
  assert.match(request.url, /rpc\/ingest_projection_snapshot$/);
  assert.equal(payload.p_capture_started_at, 'started');
  assert.equal(payload.p_fetched_at, 'fetched');
  assert.equal(payload.p_provenance, 'exact');
  assert.deepEqual(result, {
    snapshotId: 'id', created: false, rowCount: 1, status: 'completed',
    contentHash: 'a'.repeat(64), provenance: 'exact',
  });
});

test('differing exact content conflict is classified for HTTP 409', async () => {
  const repository = createSupabaseProjectionRepository({
    env: { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'secret' },
    fetchImpl: async () => ({
      ok: false, status: 409,
      text: async () => JSON.stringify({ code: '23505', message: 'snapshot conflict: evidence key already has different immutable content' }),
    }),
  });
  await assert.rejects(
    () => repository.ingest({ provenance: 'exact', contentHash: 'b'.repeat(64), rows: [] }),
    (error) => error.code === 'SNAPSHOT_CONFLICT',
  );
});
