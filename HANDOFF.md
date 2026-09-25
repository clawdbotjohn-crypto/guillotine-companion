# Guillotine Companion — Projection Snapshot Backend Handoff

## PR #9 coexistence blocker corrected and migration applied

Additive migration `202609250005` replaces the old coordinate-only unique constraint with a provenance-aware evidence key. A reconstructed row and an exact row can now coexist at the same source/season/decision-week/cutoff. The recreated service-role RPC remains calendar/timing guarded and immutable: identical exact retries reuse the exact row, while differing exact hash, count, or actual child values conflict. GET stays inside the requested season and deterministically selects highest decision week, then exact before reconstructed for the same week.

API provenance now states requested and selected decision weeks, their preceding playing weeks (`decisionWeek - 1`), same-week versus fallback selection, stored capture kind, early/post-cutoff reconstruction versus exact-at-cutoff timing, and effective exactness. In 2026, playing Week 3 waiver evidence is decision Week 4.

**Evidence limitation:** all reconstructed W1–W3 rows and the early W4 row have Sep 25 UTC fetch timestamps from Sleeper's mutable live projection routes (early W4 was Sep 24 at 10:34 PM Pacific). They cannot show historical cutoff-time rank movement. They preserve what Sleeper returned then, not what its rankings were at the W1–W4 cutoffs.

The linked ref and credential ref were reverified as `xduqpomhjdlgmtmmkfed`. Migration 005 was reviewed, rehearsed in a real remote transaction, rolled back, and then applied as the only pending migration. A post-apply transaction proved reconstructed/exact W4 coexistence, exact preference, identical retry reuse, and differing-value conflict, then rolled back; the remote still has zero exact W4 rows. No configuration, scheduler activation, workflow dispatch, merge, or production deployment occurred.

## PR #9 integrity correction completed

PR1 now persists and validates the complete capture interval:

- Every run has immutable `capture_started_at` and `fetched_at`. The API samples immediately before and after upstream fetching, passes both to the service-role RPC, exposes both on GET, and types/tests/docs use `captureStartedAt`.
- `exact` requires start >= canonical cutoff, finish >= start, and finish <= cutoff + 15 minutes in both API and PostgreSQL. Sequenced-clock tests cover accepted captures, early starts, and in-window starts with late finishes in PDT and PST.
- Calendar-coordinate validation applies to both `exact` and `reconstructed`. PostgreSQL owns the authoritative mapping in forced-RLS/default-deny immutable `projection_season_calendar`; 2026 Week 1 is `2026-09-08`. The SECURITY INVOKER RPC and an insert trigger derive the expected Tuesday 8 PM `America/Los_Angeles` cutoff rather than trusting caller input.
- The calendar table is service-role SELECT-only; update/delete are rejected. Future seasons must be added through a reviewed migration, with the API/GitHub calendar variable set to the identical local date. `docs/PROJECTION-SNAPSHOTS.md` documents the owner process.
- GET still initializes without `PROJECTION_SNAPSHOT_SCHEDULER_SECRET`; POST remains authenticated. Idempotent identical-content retries reuse the immutable run, while changed content/count/provenance conflicts.

## Dedicated migration and remote audit

The linked ref and credential ref were both verified as exactly `xduqpomhjdlgmtmmkfed`. Only `202609250004_exact_capture_and_season_calendar.sql` was pending and applied. Migration 004:

- validated every existing season/week/cutoff before mutation;
- rejected any pre-004 exact row because its true start could not be reconstructed;
- backfilled `capture_started_at = fetched_at` only for reconstructed rows, then made it non-null;
- added interval constraints, immutable calendar ownership, insert-trigger defense, and the required ten-argument RPC signature.

A pre-apply execution of the complete migration inside a real remote transaction succeeded and was rolled back. Post-apply dry-run reports the database up to date.

Remote probes after apply:

- direct service-role RPC with an exact start one second early: rejected (`23514`);
- direct service-role RPC with reconstructed Week 5 attached to Week 6's cutoff: rejected (`23514`);
- anon run/calendar SELECT and anon RPC: HTTP 401 default-deny;
- service-role run UPDATE and calendar UPDATE: HTTP 400 immutable-trigger rejection;
- real Function-handler GET with scheduler secret absent: HTTP 200, Week 4, `captureStartedAt` present, all 15,821 values;
- exact-content Week 3 reconstructed RPC replay: same ID/hash/count/provenance, `created: false`.

## Preserved remote reconstructed evidence

Migrations 004 and 005 preserved all IDs, cutoffs, fetched times, hashes, counts, children, and provenance. The new start is conservatively equal to the known finish only because all pre-004 evidence remains reconstructed:

- Week 1 — ID `1daa2aa0-2487-41fc-a836-32fdad86ae69`; cutoff `2026-09-09T03:00:00Z`; start/finish `2026-09-25T07:57:26.248Z`; reconstructed; rows/children `18,695 / 18,695`; hash `2ea5e90ff24e48bb744b3e84661baa17882705c6ee2775f37ef97cb70fc9050d`
- Week 2 — ID `168015a7-397d-4c5e-91b7-baba95182d27`; cutoff `2026-09-16T03:00:00Z`; start/finish `2026-09-25T07:57:31.224Z`; reconstructed; rows/children `17,847 / 17,847`; hash `c6613f6cb9a739f18563aa40a7a143c22e99edadc892e17c36fdd10333ae079a`
- Week 3 — ID `24ed736c-93a0-4e69-8e2e-ccbd4b445576`; cutoff `2026-09-23T03:00:00Z`; start/finish `2026-09-25T07:57:35.629Z`; reconstructed; rows/children `16,867 / 16,867`; hash `0aea608679cb52d12b4bc95fb7f3966e33d2f61012e44a364230ad23aa01c1b9`
- Week 4 — ID `7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8`; cutoff `2026-09-30T03:00:00Z`; start/finish `2026-09-25T05:34:01.333Z`; reconstructed; rows/children `15,821 / 15,821`; hash `ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d`

No historical row is exact. Independent ordered child-value audit hashes were identical before and after migration 005 for all four IDs; counts remain `18,695 / 17,847 / 16,867 / 15,821`.

A separate clean local replay was unavailable because this host has neither Docker nor local PostgreSQL server binaries. Static migration-chain guards passed, and the upgrade path was exercised against real PostgreSQL inside a rolled-back transaction before apply. The independent reviewer reported no high-severity defect; its migration-verification concern was closed by that transaction, and its digest-trust finding was fixed by comparing stored child values in the RPC.

## Verification

Green at handoff:

```text
npm --prefix api test     35/35
npm test                  18 files / 111 tests
npm run lint              0 warnings / 0 errors
npm run typecheck         passed
npm run build             passed
node --check changed API JS passed
git diff --check          passed
practical secret scans    passed
supabase dry-run          remote database up to date
```

## Remaining owner-controlled setup

No merge, workflow dispatch, production deploy, production setting/secret change, or scheduler activation was performed. After review/merge, the owner must configure the backend settings and repository secret/variables documented in `docs/PROJECTION-SNAPSHOTS.md`, using `2026-09-08` for the 2026 API/workflow calendar copy, then activate/deploy through the approved process. Future seasons require a reviewed immutable calendar-row migration before scheduling.
