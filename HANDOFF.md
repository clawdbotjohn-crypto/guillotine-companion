# Handoff — PR #9 final W4 deletion + activation readiness (2026-09-25)

## Current state

Branch: `feat/bidding-profile-backend`
PR: https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/9
Preview: https://nice-moss-07ec56310-9.centralus.7.azurestaticapps.net

John's final direction is complete: the too-early reconstructed decision-Week-4 run was deleted from the dedicated Supabase project. Migration 005 remains intact as valid additive history; migration 006 performs the audited deletion. No PR merge, SWA/GitHub configuration, scheduler activation, workflow dispatch, or production deployment was performed.

The current dedicated database contains reconstructed decision Weeks 1–3 only. There are no `exact` rows. The exact Week 4 canonical coordinate is free for the first prospective Tuesday capture.

## Dedicated target and deletion proof

The linked project ref, credential ref, and pooler host were all independently checked as exactly `xduqpomhjdlgmtmmkfed` before rehearsal and apply. `supabase migration list --linked` showed only migration 006 pending; `supabase db push --linked --dry-run` listed only 006. After apply, migrations 001–006 match local/remote and a second dry-run reports the remote is up to date.

Pre-delete, exact ID `7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8` was re-read and matched every stored field:

- source / season / decision week: `sleeper / 2026 / 4`
- canonical cutoff: `2026-09-30T03:00:00Z`
- capture start / fetch finish: `2026-09-25T05:34:01.333Z / 2026-09-25T05:34:01.333Z`
- endpoint: `https://api.sleeper.app/v1/projections/nfl/regular/{season}/{week}`
- status / error: `completed / NULL`
- provenance: `reconstructed`
- content hash: `ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d`
- metadata row count / actual children: `15,821 / 15,821`
- created at: `2026-09-25T05:34:02.498385Z`
- independent ordered child audit SHA-256: `e948c6abc6248df5aac3296c585e83b6fd77c48a13d72356529cbad469cb2ec6`

Migration `202609250006_delete_early_reconstructed_week4.sql`:

- changes the child FK to `ON DELETE CASCADE`;
- safely no-ops if the seeded target ID never existed (clean replay);
- if that ID exists, requires all metadata above, exact child count, and independent child audit hash;
- only after all checks pass, temporarily disables the two immutable delete triggers inside the migration transaction, deletes by the exact UUID only, restores triggers, and asserts parent plus children are absent;
- never deletes by week/source/season/cutoff predicates; any mismatch aborts and rolls back the migration.

The migration was first executed in a real remote transaction and rolled back. Inside rehearsal, target parent/children were `0 / 0`; after rollback they were restored as `1 / 15,821`. It was then applied as the only pending migration.

Post-apply proof:

- target parent rows: `0`
- target child rows: `0`
- rows at exact canonical Week 4 coordinate: `0`
- all `exact` rows in the database: `0`
- all remaining Sleeper 2026 run weeks: `1, 2, 3` only

## W1–W3 unchanged proof

IDs, provenance, content hashes, metadata row counts, actual child counts, and independent ordered child hashes were identical before rehearsal, inside rehearsal, and after migration 006:

- W1 — `1daa2aa0-2487-41fc-a836-32fdad86ae69`; reconstructed; content `2ea5e90ff24e48bb744b3e84661baa17882705c6ee2775f37ef97cb70fc9050d`; rows/children `18,695 / 18,695`; child audit `741678e2205ccb20aa132c76d316d5598b31816a85999f0a85e04d58a448a2ed`
- W2 — `168015a7-397d-4c5e-91b7-baba95182d27`; reconstructed; content `c6613f6cb9a739f18563aa40a7a143c22e99edadc892e17c36fdd10333ae079a`; rows/children `17,847 / 17,847`; child audit `68fd0c357f667c75feeebc2c51b4305fd672a399380f861045146d4d86462103`
- W3 — `24ed736c-93a0-4e69-8e2e-ccbd4b445576`; reconstructed; content `0aea608679cb52d12b4bc95fb7f3966e33d2f61012e44a364230ad23aa01c1b9`; rows/children `16,867 / 16,867`; child audit `4eb1d55d08ab8ddd3ec8bc3dff4e920baf3d5bd7296c1b5f8553030def5271ff`

## Exact Week 4 activation probe

A real PostgreSQL transaction inserted one synthetic exact W4 row at `2026-09-30T03:00:00Z` through the service-role RPC:

- first insert returned `created=true`, one child;
- identical retry returned the same snapshot ID with `created=false`;
- differing exact hash/value evidence failed with SQLSTATE `23505`;
- the transaction was rolled back;
- post-rollback coordinate count is `0`, so no fabricated exact row remains.

This proves the coordinate is free and the current migration-005 RPC preserves exact idempotency/conflict behavior after the migration-006 deletion.

## Source semantics documented

Both bidding-plan and operations docs now say explicitly:

- Sleeper route `week` is an NFL matchup week, not a Tuesday snapshot/revision;
- Sleeper exposes no `as-of` argument or immutable revision contract for these routes;
- a live request returns Sleeper's current forecast for that matchup week;
- one prospective Tuesday cutoff capture preserves the then-current set of future-week forecasts as the historical rest-of-season bidding baseline;
- reconstructed W1–W3 are not exact historical cutoff evidence, and no exact historical rows currently exist.

## Validation

- focused schema test: `8/8` passed
- frontend full suite: `18` files, `111/111` tests passed
- API full suite: `36/36` tests passed
- lint: 0 warnings / 0 errors
- typecheck: passed
- production build: passed
- `git diff --check`: passed
- high-signal diff secret scan: passed
- clean migration replay 001–006 in an isolated schema/transaction: passed; zero seeded runs, one current RPC signature, cascade FK (`confdeltype=c`), all four user triggers enabled; rolled back
- isolated mismatched-target rehearsal: migration 006 failed with its audited precondition error and the transaction rolled back completely
- independent review: no high findings; its one medium activation-setting-name finding was fixed, and its low static-coverage suggestion was also addressed by asserting the exact child-hash surface, single DELETE, row-count guard, and parent/child postconditions

## Remaining owner-controlled activation steps

1. Review and merge PR #9 when satisfied. Do not rewrite or squash away applied migration history 001–006.
2. Configure all four deployed-backend settings listed verbatim in `docs/PROJECTION-SNAPSHOTS.md`: the dedicated Supabase URL, the backend-only service credential, `PROJECTION_SNAPSHOT_SCHEDULER_SECRET`, and `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE`.
3. Configure repository secrets `PROJECTION_SNAPSHOT_API_URL` and `PROJECTION_SNAPSHOT_SCHEDULER_SECRET`, plus repository variables `PROJECTION_SEASON` and `PROJECTION_FIRST_DECISION_WEEK_LOCAL_DATE`, without exposing values. The scheduler secret and first-decision-week date must match the backend settings.
4. Deploy/promote only through John's normal owner-controlled process, then run the documented deployed read/auth smoke checks.
5. Activate the scheduler only after deployment/configuration is verified. The first `exact` row must come from a successful prospective Tuesday 8:00 PM America/Los_Angeles capture window—not a reconstruction or manual fabricated historical row.
6. Frontend bidding-profile work remains separate.

Do not activate, workflow-dispatch, merge, or deploy from this handoff without John's explicit instruction.
