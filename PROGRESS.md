# Guillotine Companion — Progress

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
