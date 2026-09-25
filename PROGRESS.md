# Guillotine Companion — Progress

## ✅ PR #9 activation blocker — corrected without deleting evidence (2026-09-25)

- [x] Current date is NFL playing Week 3; DB rows are **decision weeks**, where decision Week 4 means the upcoming Tue Sep 29 waiver cutoff, not a completed Week 4 historical capture. API/docs now distinguish those concepts.
- [x] W1–W3 reconstructed rows and the early W4 row were all fetched from Sleeper's live mutable projection endpoints on Sep 25 UTC. They are authentic Sleeper payloads but are not historical cutoff snapshots and cannot show genuine cutoff-time rank movement.
- [x] Reproduced that the old coordinate-only key blocked Tuesday's future `exact` Week 4 capture.
- [x] Preserved the early W4 run and every child. Migration 005 allows one immutable reconstructed row and one immutable exact row at the same decision coordinate, while exact retries remain idempotent and differing exact hash/count/values conflict.
- [x] Verified the upgrade and exact/reconstructed coexistence in a real dedicated-ref transaction, then rolled back the synthetic exact row. No exact W4 row was fabricated before Tue Sep 29 at 8 PM Pacific.
- [x] Did not merge, configure production, activate the scheduler, dispatch a workflow, or deploy production.

## ✅ PR #9 exact/reconstructed coexistence correction — migrated; not activated

- [x] Added additive migration `202609250005` replacing the old coordinate-only uniqueness constraint with a provenance-aware evidence key; one reconstructed and one exact row can coexist without changing existing evidence.
- [x] Recreated the service-role RPC against the new key. Identical exact retries reuse the exact row; differing exact hash, count, or actual child values conflict. Forced RLS, immutability, calendar, and capture-window checks remain intact.
- [x] GET is deterministic within the requested season: highest decision week first, then exact before reconstructed. API provenance now separates decision week from preceding playing week and exposes same-week/fallback, stored capture kind/timing, and effective exactness.
- [x] Added focused Node coverage for migration-chain guards, exact preference, exact retry/conflict behavior, fallback/no-cross-season behavior, and 2026 playing Week 3 / decision Week 4 semantics; clean-replayed all five migrations in an isolated dedicated-ref schema and rolled the schema back.
- [x] Reverified dedicated ref `xduqpomhjdlgmtmmkfed`; rehearsed migration 005 and synthetic exact W4 coexistence in rolled-back real PostgreSQL transactions, applied only 005, and confirmed zero exact W4 rows remain. IDs, metadata hashes, child counts, and independent child audit hashes are unchanged.
- [x] Independent review found no high defect; its real-PostgreSQL verification concern was closed and its digest-trust finding was fixed. No configuration, scheduler activation, workflow dispatch, merge, or production deployment occurred.

## ✅ PR #9 late integrity findings — corrected; awaiting review

- [x] Persisted immutable `capture_started_at` alongside `fetched_at`; API passes the actual sampled start, GET/types/docs expose it, and exact DB/API rules validate start >= cutoff, finish >= start, and finish <= cutoff + 15 minutes.
- [x] Added sequenced-clock acceptance, early-start rejection, and late-finish rejection tests for both PDT and PST. A direct service-role RPC early-start exact claim is rejected remotely.
- [x] Added forced-RLS/default-deny immutable `projection_season_calendar`, seeded authoritative 2026 Week 1 local Tuesday `2026-09-08`. DB RPC/trigger derive expected coordinates, and API validates the calendar for exact and reconstructed captures.
- [x] Applied only reviewed migration 004 to verified dedicated ref `xduqpomhjdlgmtmmkfed`. Existing W1–W4 IDs/times/hashes/counts/children/provenance are preserved; reconstructed rows received the only honest historical start backfill (`capture_started_at = fetched_at`).
- [x] Re-ran remote early-start/wrong-reconstructed-cutoff/default-deny/immutability/credential-free-GET/idempotency/metadata probes plus API/full tests, lint, typecheck, build, syntax, diff, secret scan, and migration dry-run.
- [x] Documented the reviewed-migration owner process for adding future immutable season calendar rows. No merge, production setting, scheduler activation, workflow dispatch, or production deployment performed.

## P0 — Bidding Profiles V1 (John, 2026-09-24)

Architecture: `docs/BIDDING-PROFILES-PLAN.md`

- [ ] **PR1: Dedicated projection-snapshot backend (PR #9 open; correction pushed for review)** — Core immutable forced-RLS tables, explicit immutable provenance, DST-aware cutoff/window guards, transactional/idempotent service-role RPC with honest conflicts, managed Function, Sleeper compaction/hash, tests, and operations docs are complete. Dedicated project `xduqpomhjdlgmtmmkfed` has reconstructed Weeks 1–4 with audited metadata/counts and complete conservative historical capture intervals; no historical exact evidence is fabricated. Immutable DB-owned season calendar coordinates and start/finish window guards are enforced. Deployment/app settings, merge, scheduler activation, and production deployment remain owner-controlled.
- [ ] **PR2: Canonical bid evidence and manager profile math** — Expand Sleeper transaction types; classify completed wins and legitimate same-batch losses; reject invalid/unmatched failures; dedupe contingency/drop-path claims; reconstruct pre-bid FAAB; select each manager's top three canonical bids; calculate capped event ratios, geometric multiplier, budget-constrained state, style, and confidence. Add frozen fixtures and boundary/edge tests.
- [ ] **PR3: Bidding profiles UI** — Show top-three evidence, historical baseline/provenance, constrained marker, multiplier, style, confidence, predicted willingness, and current-FAAB-capped feasible bid. Browser-test on a real Sleeper guillotine league.

## Constraints

- Feature branch and PR only; never push directly to `main`.
- No production deployment.
- Dedicated Supabase project; do not use another app's database.
- No per-league weekly roster/ownership/needs snapshots in V1.
- Existing historical weeks are labeled reconstructed; only prospectively captured snapshots are exact.
- Formula constants are versioned and tested in code.
