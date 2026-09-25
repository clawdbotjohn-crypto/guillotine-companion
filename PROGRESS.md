# Guillotine Companion — Progress

## ✅ PR #9 final pre-activation correction — early W4 deleted; not activated (2026-09-25)

- [x] Honored John's final direction to delete the too-early reconstructed decision-Week-4 run instead of retaining it. Migration `202609250006` is absent-safe on clean replay and deletes only ID `7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8` after exact metadata, 15,821-child, and ordered child-audit-hash checks.
- [x] Changed the values FK to `ON DELETE CASCADE`; the migration transaction temporarily disables only the two immutable delete triggers after all guards pass, deletes the exact parent ID, verifies parent and children are gone, and restores trigger state. Any mismatch fails the migration.
- [x] Reverified linked and credential refs as dedicated project `xduqpomhjdlgmtmmkfed`, rehearsed migration 006 inside a rolled-back real PostgreSQL transaction, confirmed dry-run listed only 006, and applied only 006. Remote migration history is now 001–006 and up to date.
- [x] Post-apply proof: target parent `0`, target children `0`, exact Week 4 coordinate rows `0`. W1–W3 IDs, content hashes, row/child counts, and independent ordered child audit hashes remain unchanged.
- [x] A rolled-back synthetic exact Week 4 probe succeeded; identical retry reused the same ID with `created=false`; differing exact evidence failed with SQLSTATE `23505`; rollback left no fabricated Week 4 row.
- [x] Migration 005 remains valid additive history and continues to provide provenance-aware exact/reconstructed idempotency and conflict behavior. No history was hidden or rewritten.
- [x] Docs now state that Sleeper route `week` is a matchup week, not a Tuesday snapshot; the route has no as-of/revision contract; live Sleeper returns current forecasts; and the canonical Tuesday snapshot preserves the historical ROS bidding baseline. Only reconstructed W1–W3 rows exist; there are no historical exact rows.
- [x] Focused/full tests, lint, typecheck, build, diff check, secret scan, clean replay through 006, and a mismatched-target rollback rehearsal all pass. Independent review is recorded in `HANDOFF.md`.
- [x] Did not merge, configure application/repository settings, activate the scheduler, dispatch a workflow, or deploy.

## ✅ PR #9 exact/reconstructed coexistence correction — migration 005 retained

- [x] Migration `202609250005` replaced the old coordinate-only uniqueness constraint with a provenance-aware evidence key; valid reconstructed and exact evidence can coexist when intentionally retained.
- [x] The service-role RPC keeps identical exact retries idempotent and rejects differing exact hash, count, or actual child values. Forced RLS, immutability, calendar, and capture-window checks remain intact.
- [x] GET is deterministic within the requested season: highest decision week first, then exact before reconstructed. API provenance separates decision week from preceding playing week and exposes same-week/fallback, stored capture kind/timing, and effective exactness.

## ✅ PR #9 late integrity findings — corrected; awaiting review

- [x] Persisted immutable `capture_started_at` alongside `fetched_at`; API passes the actual sampled start, GET/types/docs expose it, and exact DB/API rules validate start >= cutoff, finish >= start, and finish <= cutoff + 15 minutes.
- [x] Added sequenced-clock acceptance, early-start rejection, and late-finish rejection tests for both PDT and PST. A direct service-role RPC early-start exact claim is rejected remotely.
- [x] Added forced-RLS/default-deny immutable `projection_season_calendar`, seeded authoritative 2026 Week 1 local Tuesday `2026-09-08`. DB RPC/trigger derive expected coordinates, and API validates the calendar for exact and reconstructed captures.
- [x] Applied only reviewed migration 004 to verified dedicated ref `xduqpomhjdlgmtmmkfed`. It preserved the then-existing evidence and backfilled reconstructed rows with the only honest historical start (`capture_started_at = fetched_at`); migration 006 later removed only the explicitly audited early W4 run.
- [x] Re-ran remote early-start/wrong-reconstructed-cutoff/default-deny/immutability/credential-free-GET/idempotency/metadata probes plus API/full tests, lint, typecheck, build, syntax, diff, secret scan, and migration dry-run.
- [x] Documented the reviewed-migration owner process for adding future immutable season calendar rows. No merge, production setting, scheduler activation, workflow dispatch, or production deployment performed.

## P0 — Bidding Profiles V1 (John, 2026-09-24)

Architecture: `docs/BIDDING-PROFILES-PLAN.md`

- [ ] **PR1: Dedicated projection-snapshot backend (PR #9 open; final correction ready for review)** — Core immutable forced-RLS tables, explicit immutable provenance, DST-aware cutoff/window guards, transactional/idempotent service-role RPC with honest conflicts, managed Function, Sleeper compaction/hash, tests, and operations docs are complete. Dedicated project `xduqpomhjdlgmtmmkfed` retains reconstructed Weeks 1–3 only; the too-early W4 seed was guard-deleted, the exact W4 coordinate is free, and no historical exact evidence exists. Immutable DB-owned season calendar coordinates and start/finish window guards are enforced. Deployment/app settings, merge, scheduler activation, and production deployment remain owner-controlled.
- [ ] **PR2: Canonical bid evidence and manager profile math** — Expand Sleeper transaction types; classify completed wins and legitimate same-batch losses; reject invalid/unmatched failures; dedupe contingency/drop-path claims; reconstruct pre-bid FAAB; select each manager's top three canonical bids; calculate capped event ratios, geometric multiplier, budget-constrained state, style, and confidence. Add frozen fixtures and boundary/edge tests.
- [ ] **PR3: Bidding profiles UI** — Show top-three evidence, historical baseline/provenance, constrained marker, multiplier, style, confidence, predicted willingness, and current-FAAB-capped feasible bid. Browser-test on a real Sleeper guillotine league.

## Constraints

- Feature branch and PR only; never push directly to `main`.
- No production deployment.
- Dedicated Supabase project; do not use another app's database.
- No per-league weekly roster/ownership/needs snapshots in V1.
- Existing historical weeks are labeled reconstructed; only prospectively captured snapshots are exact.
- Formula constants are versioned and tested in code.
