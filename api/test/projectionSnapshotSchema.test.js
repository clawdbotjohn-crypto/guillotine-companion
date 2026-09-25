const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrations = fs.readdirSync(path.join(__dirname, '../../supabase/migrations'))
  .sort()
  .map((name) => fs.readFileSync(path.join(__dirname, '../../supabase/migrations', name), 'utf8'))
  .join('\n');

test('schema keeps both snapshot tables forced-RLS and direct browser roles default-deny', () => {
  for (const table of ['projection_snapshot_runs', 'projection_snapshot_values']) {
    assert.match(migrations, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    assert.match(migrations, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, 'i'));
  }
  assert.doesNotMatch(migrations, /create\s+policy/i);
});

test('schema enforces Pacific cutoff, immutable provenance, exact timing, and service-role-only RPC', () => {
  assert.match(migrations, /America\/Los_Angeles/);
  assert.match(migrations, /provenance in \('exact', 'reconstructed'\)/);
  assert.match(migrations, /fetched_at >= canonical_cutoff_at/);
  assert.match(migrations, /fetched_at <= canonical_cutoff_at \+ interval '15 minutes'/);
  assert.match(migrations, /service_role required/);
  assert.match(migrations, /snapshot conflict: canonical coordinate already has different immutable content or provenance/);
});
