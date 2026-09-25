const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationDir = path.join(__dirname, '../../supabase/migrations');
const migrations = fs.readdirSync(migrationDir)
  .sort()
  .map((name) => fs.readFileSync(path.join(migrationDir, name), 'utf8'))
  .join('\n');
const integrityMigration = fs.readFileSync(
  path.join(migrationDir, '202609250004_exact_capture_and_season_calendar.sql'),
  'utf8',
);
const correctionMigration = fs.readFileSync(
  path.join(migrationDir, '202609250003_dst_provenance_and_seed_correction.sql'),
  'utf8',
);
const coexistenceMigrationName = '202609250005_exact_reconstructed_coexistence.sql';
const coexistenceMigration = fs.readFileSync(path.join(migrationDir, coexistenceMigrationName), 'utf8');
const deletionMigrationName = '202609250006_delete_early_reconstructed_week4.sql';
const deletionMigration = fs.readFileSync(path.join(migrationDir, deletionMigrationName), 'utf8');

test('schema keeps both snapshot tables forced-RLS and direct browser roles default-deny', () => {
  for (const table of ['projection_snapshot_runs', 'projection_snapshot_values', 'projection_season_calendar']) {
    assert.match(migrations, new RegExp(`alter table public\\.${table} force row level security`, 'i'));
    assert.match(migrations, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, 'i'));
  }
  assert.doesNotMatch(migrations, /create\s+policy/i);
  assert.match(integrityMigration, /projection_season_calendar_immutable/);
  assert.match(integrityMigration, /grant select on table public\.projection_season_calendar to service_role/i);
  assert.doesNotMatch(integrityMigration, /grant (?:insert|update|delete).*projection_season_calendar/i);
});

test('schema persists both capture instants and enforces exact timing in the service-role-only RPC', () => {
  assert.match(migrations, /America\/Los_Angeles/);
  assert.match(migrations, /provenance in \('exact', 'reconstructed'\)/);
  assert.match(integrityMigration, /add column capture_started_at timestamptz/);
  assert.match(integrityMigration, /set capture_started_at = fetched_at[\s\S]*where provenance = 'reconstructed'/);
  assert.match(integrityMigration, /alter column capture_started_at set not null/);
  assert.match(integrityMigration, /capture_started_at >= canonical_cutoff_at/);
  assert.match(integrityMigration, /fetched_at >= capture_started_at/);
  assert.match(integrityMigration, /fetched_at <= canonical_cutoff_at \+ interval '15 minutes'/);
  assert.match(integrityMigration, /p_capture_started_at timestamptz/);
  assert.match(migrations, /service_role required/);
  assert.match(migrations, /snapshot conflict: canonical coordinate already has different immutable content or provenance/);
});

test('database owns immutable 2026 season/week calendar coordinates for both provenance kinds', () => {
  assert.match(integrityMigration, /create table public\.projection_season_calendar/);
  assert.match(integrityMigration, /values \(2026, date '2026-09-08'\)/);
  assert.match(integrityMigration, /first_decision_week_local_date \+ \(\(p_decision_week - 1\) \* 7\)/);
  assert.match(integrityMigration, /at time zone 'America\/Los_Angeles'/);
  assert.match(integrityMigration, /canonical cutoff does not match season % decision week % calendar/);
  assert.match(integrityMigration, /create trigger projection_snapshot_runs_calendar_coordinate[\s\S]*before insert/);
  const calendarValidation = integrityMigration.indexOf('if p_canonical_cutoff_at is distinct from v_expected_cutoff');
  const exactValidation = integrityMigration.indexOf("if p_provenance = 'exact'");
  assert.ok(calendarValidation > -1 && calendarValidation < exactValidation, 'calendar validation must apply before exact-only timing');
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

test('migration 005 replaces the coordinate key with one evidence key per provenance kind', () => {
  const sql = coexistenceMigration.replace(/\s+/g, ' ');
  assert.match(sql, /drop constraint projection_snapshot_runs_cutoff_unique/i);
  assert.match(sql, /add constraint projection_snapshot_runs_evidence_unique unique \(source, season, decision_week, canonical_cutoff_at, provenance\)/i);
  assert.match(sql, /on conflict on constraint projection_snapshot_runs_evidence_unique do nothing/i);
  assert.match(sql, /canonical_cutoff_at = p_canonical_cutoff_at and r\.provenance = p_provenance/i);
  assert.match(sql, /content_hash is distinct from p_content_hash or r\.row_count is distinct from v_count/i);
  assert.match(sql, /projection_snapshot_values[\s\S]*except[\s\S]*jsonb_to_recordset\(p_values\)[\s\S]*jsonb_to_recordset\(p_values\)[\s\S]*except[\s\S]*projection_snapshot_values/i);
  assert.match(sql, /snapshot conflict: evidence key already has different immutable content/i);
  assert.match(sql, /p_provenance = 'exact'[\s\S]*p_capture_started_at < v_expected_cutoff[\s\S]*p_fetched_at > v_expected_cutoff \+ interval '15 minutes'/i);
});

test('migration 006 deletes only the fully audited early reconstructed Week 4 ID', () => {
  const sql = deletionMigration.replace(/\s+/g, ' ').trim();
  const targetId = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8';
  const presenceGuard = sql.indexOf(`if exists ( select 1 from public.projection_snapshot_runs where id = '${targetId}'::uuid ) then`);
  const metadataGuard = sql.indexOf('if not exists (', presenceGuard);
  const metadataRejection = sql.indexOf(
    "raise exception 'known early reconstructed Week 4 run does not match audited deletion preconditions'",
    metadataGuard,
  );
  const childCountCheck = sql.indexOf('if v_actual_child_count <> 15821', metadataRejection);
  const childHashCheck = sql.indexOf(
    "if v_actual_child_audit_hash <> 'e948c6abc6248df5aac3296c585e83b6fd77c48a13d72356529cbad469cb2ec6'",
    childCountCheck,
  );
  const deleteStatement = sql.indexOf(
    `delete from public.projection_snapshot_runs where id = '${targetId}'::uuid`,
    childHashCheck,
  );

  assert.ok(presenceGuard > -1, 'clean replays must no-op when the seeded ID is absent');
  assert.ok(metadataGuard > presenceGuard && metadataRejection > metadataGuard);
  assert.ok(childCountCheck > metadataRejection && childHashCheck > childCountCheck);
  assert.ok(deleteStatement > childHashCheck, 'deletion must happen only after metadata and child audits');
  assert.match(
    sql.slice(metadataGuard, metadataRejection),
    /source = 'sleeper'.*season = 2026.*decision_week = 4.*canonical_cutoff_at = '2026-09-30T03:00:00Z'::timestamptz.*capture_started_at = '2026-09-25T05:34:01\.333Z'::timestamptz.*fetched_at = '2026-09-25T05:34:01\.333Z'::timestamptz.*endpoint_template = 'https:\/\/api\.sleeper\.app\/v1\/projections\/nfl\/regular\/\{season\}\/\{week\}'.*status = 'completed'.*content_hash = 'ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d'.*row_count = 15821.*error_message is null.*provenance = 'reconstructed'.*created_at = '2026-09-25T05:34:02\.498385Z'::timestamptz/i,
  );
  const childAuditQuery = sql.slice(sql.indexOf('select count(*),', metadataRejection), childCountCheck);
  assert.match(
    childAuditQuery,
    /projection_week::text.*player_id.*pts_std::text.*pts_half_ppr::text.*pts_ppr::text.*where v\.snapshot_id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid/i,
    'the independent child audit must cover every child field and only the exact target ID',
  );
  assert.match(deletionMigration, /foreign key \(snapshot_id\)[\s\S]*on delete cascade/i);
  assert.match(deletionMigration, /disable trigger projection_snapshot_values_immutable[\s\S]*disable trigger projection_snapshot_runs_immutable[\s\S]*delete from public\.projection_snapshot_runs/i);
  assert.match(deletionMigration, /enable trigger projection_snapshot_runs_immutable[\s\S]*enable trigger projection_snapshot_values_immutable/i);
  assert.match(deletionMigration, /get diagnostics v_deleted_count = row_count;[\s\S]*if v_deleted_count <> 1/i);
  assert.match(
    deletionMigration,
    /if exists \([\s\S]*projection_snapshot_runs[\s\S]*where id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid[\s\S]*or exists \([\s\S]*projection_snapshot_values[\s\S]*where snapshot_id = '7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8'::uuid[\s\S]*raise exception 'known early reconstructed Week 4 run or children remain after deletion'/i,
    'postconditions must prove both the exact parent and its children are gone',
  );
  assert.equal(
    deletionMigration.match(/delete\s+from\s+public\.projection_snapshot_runs/gi)?.length,
    1,
    'migration 006 must contain exactly one parent DELETE',
  );
  assert.doesNotMatch(
    sql.slice(deleteStatement, sql.indexOf('get diagnostics', deleteStatement)),
    /decision_week|canonical_cutoff_at|source|season/,
    'the destructive predicate must be the exact audited ID, never a broad coordinate predicate',
  );
});

test('migration-chain static guard keeps immutable/calendar defenses and recreates only the current RPC signature', () => {
  const names = fs.readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort();
  assert.equal(names.at(-2), coexistenceMigrationName);
  assert.equal(names.at(-1), deletionMigrationName);
  assert.match(coexistenceMigration, /drop function public\.ingest_projection_snapshot\(text, integer, integer, timestamptz, timestamptz, timestamptz, text, text, text, jsonb\)/i);
  assert.match(coexistenceMigration, /create function public\.ingest_projection_snapshot\([\s\S]*security invoker/i);
  assert.match(coexistenceMigration, /service_role required/i);
  assert.match(coexistenceMigration, /canonical cutoff does not match season % decision week % calendar/i);
  assert.match(coexistenceMigration, /grant execute on function[\s\S]*to service_role/i);
  assert.doesNotMatch(coexistenceMigration, /drop trigger|disable trigger|drop table|alter table public\.projection_season_calendar/i);
  assert.doesNotMatch(deletionMigration, /drop function|create function|projection_season_calendar/i);
});

test('RPC exact retry is scoped to exact evidence and differing exact content conflicts', () => {
  const sql = coexistenceMigration.replace(/\s+/g, ' ');
  const conflictTarget = sql.indexOf('on conflict on constraint projection_snapshot_runs_evidence_unique do nothing');
  const exactLookup = sql.indexOf('and r.provenance = p_provenance', conflictTarget);
  const differingContent = sql.indexOf('r.content_hash is distinct from p_content_hash', exactLookup);
  const conflict = sql.indexOf("raise exception 'snapshot conflict: evidence key already has different immutable content'", differingContent);
  const returnExisting = sql.indexOf('return query', conflict);
  assert.ok(conflictTarget > -1 && exactLookup > conflictTarget);
  assert.ok(differingContent > exactLookup && conflict > differingContent);
  assert.ok(returnExisting > conflict, 'identical exact retries reach the existing-row return path');
});
