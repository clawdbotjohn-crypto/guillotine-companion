# Guillotine Companion — Projection Snapshot Backend Handoff

## Scope completed

PR1 implements only the dedicated projection-snapshot backend from `docs/BIDDING-PROFILES-PLAN.md`:

- Supabase migrations create immutable `projection_snapshot_runs` and `projection_snapshot_values` tables with validation checks, lookup/player indexes, forced RLS, zero anon/authenticated grants or policies, and update/delete rejection triggers.
- `ingest_projection_snapshot` is a service-role-only, security-invoker RPC. One PostgreSQL transaction claims the unique `(source, season, decision_week, canonical_cutoff_at)` key, inserts all compact rows, verifies the count, and completes—or rolls back everything. Concurrent/retry losers return the committed run.
- Azure SWA managed Function route `/api/projection-snapshots` supports constant-time bearer-authenticated POST and credential-free GET. POST fetches every remaining Sleeper Week through 18 and hashes canonical compact rows. GET chooses the latest completed decision week at or before the request and labels older fallback evidence `reconstructed`.
- `.github/workflows/projection-snapshot.yml` invokes POST Tuesdays at 23:00 UTC or by manual dispatch. It never deploys.
- API contract/failure/idempotency/read-provenance tests run under Node's built-in test runner. Root Vitest excludes the separately tested API tree; CI runs both suites.

## Dedicated database verification

Only linked project ref `xduqpomhjdlgmtmmkfed` was changed. Migrations applied with Supabase CLI:

- `202609250001_projection_snapshots.sql`
- `202609250002_enforce_canonical_snapshot_cutoff.sql`

Remote metadata after apply:

- tables: 2; both `rls=true`, `force_rls=true`
- constraints: 19 total after the canonical-cutoff constraint
- indexes: 5 total (`projection_snapshot_runs_pkey`, `projection_snapshot_runs_cutoff_unique`, `projection_snapshot_runs_lookup_idx`, `projection_snapshot_values_pkey`, `projection_snapshot_values_player_idx`)
- routines: 2 (`ingest_projection_snapshot`, `reject_projection_snapshot_mutation`), both security invoker
- trigger events: 4 (UPDATE/DELETE on each table)
- direct policies: 0
- anon/authenticated/PUBLIC table grants: 0
- anon REST table probe: HTTP 401, zero visible rows; anon RPC probe: HTTP 404

## Seed and idempotency proof

Local backend script fetched real Sleeper 2026 Weeks 4–18 and called the dedicated database RPC twice for canonical cutoff `2026-09-29T23:00:00Z`:

- first call: `created=true`
- retry: `created=false`
- snapshot: `7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8`
- stored/declared rows: `15821 / 15821`
- status: `completed`
- content hash: `ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d`

`fetched_at` records the actual early prospective fetch; it is not represented as occurring at the future canonical cutoff.

## Verification commands

All were green after the API test exclusion fix:

```bash
npm test                          # 18 files / 111 tests
npm --prefix api test             # 12 tests
npm run lint                      # 0 warnings / 0 errors
npm run typecheck                 # passed
npm run build                     # passed
node --check api/_shared/projectionSnapshots.js
node --check api/_shared/supabaseProjectionRepository.js
git diff --check                  # passed
```

The initial root test attempt discovered that Vitest was collecting Node `node:test` files under `api/`; the root test scripts now exclude `api/**`, while CI has a separate managed-Functions test step.

## Remaining owner-controlled setup (no production changes made)

Before scheduled capture can run:

1. Deploy/merge through the normal approved Azure SWA process.
2. Add SWA backend settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a random 32+ character `PROJECTION_SNAPSHOT_SCHEDULER_SECRET`.
3. Add GitHub secrets: `PROJECTION_SNAPSHOT_API_URL` and the matching `PROJECTION_SNAPSHOT_SCHEDULER_SECRET`.
4. Add GitHub variables: `PROJECTION_SEASON` and `PROJECTION_FIRST_DECISION_WEEK_CUTOFF_AT`.
5. After deployment, John may manually dispatch once if desired; this worker did not run `workflow_dispatch` or change Azure settings.

Exact setup and local seed syntax are in `docs/PROJECTION-SNAPSHOTS.md`.

## Risks / review focus

- The SWA route is not live until approved deployment and app-setting configuration.
- The GitHub scheduler intentionally fails on missing season configuration and skips scheduled dates outside Weeks 1–18.
- GET paginates database values in 1,000-row chunks and verifies the returned count against immutable provenance.
- Snapshot point values are bounded to `[-1000, 1000]`; only finite numeric JSON values are retained.
- A canonical cutoff is strictly Tuesday 23:00:00 UTC in both API and database. Supporting another global cutoff requires a deliberate schema/API version change rather than timestamp drift.
