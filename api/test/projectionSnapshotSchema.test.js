const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationDir = path.join(__dirname, '../../supabase/migrations');
const migrations = fs.readdirSync(migrationDir)
  .sort()
  .map((name) => fs.readFileSync(path.join(migrationDir, name), 'utf8'))
  .join('\n');
const correctionMigration = fs.readFileSync(
  path.join(migrationDir, '202609250003_dst_provenance_and_seed_correction.sql'),
  'utf8',
);

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

test('seed correction no-ops when the audited ID is absent and rejects present metadata mismatches', () => {
  const sql = correctionMigration.replace(/\s+/g, ' ').trim();
  const seedId = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8';
  const presenceGuard = new RegExp(
    `if exists \\( select 1 from public\\.projection_snapshot_runs where id = '${seedId}'::uuid \\) then`,
    'i',
  );
  const guardMatch = presenceGuard.exec(sql);

  assert.ok(guardMatch, 'the correction must be conditional on the audited seed ID existing');

  const guardStart = guardMatch.index;
  const mismatchCheck = sql.indexOf('if not exists (', guardStart + guardMatch[0].length);
  const rejection = sql.indexOf(
    "raise exception 'known Week 4 seed does not match audited correction preconditions'",
    mismatchCheck,
  );
  const disableTrigger = sql.indexOf(
    'alter table public.projection_snapshot_runs disable trigger projection_snapshot_runs_immutable',
    rejection,
  );
  const updateSeed = sql.indexOf('update public.projection_snapshot_runs', disableTrigger);
  const enableTrigger = sql.indexOf(
    'alter table public.projection_snapshot_runs enable trigger projection_snapshot_runs_immutable',
    updateSeed,
  );

  assert.ok(mismatchCheck > guardStart, 'a present seed must enter an audited metadata check');
  assert.ok(rejection > mismatchCheck, 'metadata mismatch must raise before mutation');
  assert.ok(disableTrigger > rejection, 'the immutable trigger is disabled only after audit validation');
  assert.ok(updateSeed > disableTrigger, 'the guarded block performs the correction after disabling the trigger');
  assert.ok(enableTrigger > updateSeed, 'the guarded block re-enables the immutable trigger after correction');
  assert.match(
    sql.slice(mismatchCheck, rejection),
    /source = 'sleeper'.*season = 2026.*decision_week = 4.*canonical_cutoff_at = '2026-09-29T23:00:00Z'::timestamptz.*fetched_at = '2026-09-25T05:34:01\.333Z'::timestamptz.*endpoint_template = 'https:\/\/api\.sleeper\.app\/v1\/projections\/nfl\/regular\/\{season\}\/\{week\}'.*status = 'completed'.*error_message is null.*row_count = 15821.*content_hash = 'ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d'.*provenance = 'reconstructed'/i,
  );
  assert.match(
    sql.slice(enableTrigger),
    /enable trigger projection_snapshot_runs_immutable; end if; end; \$\$;/i,
    'trigger restoration and mutation must remain inside the absent-safe ID guard',
  );
});
