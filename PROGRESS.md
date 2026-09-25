# Guillotine Companion — Progress

## ✅ PR #9 review blockers — corrected; awaiting review

- [x] Restored Tuesday **8:00 PM `America/Los_Angeles` DST-aware** cutoff across workflow runtime guard, API, DB constraint, docs, seed tooling, and PDT/PST tests.
- [x] Added immutable explicit provenance (`exact` / `reconstructed`). GET trusts stored provenance and only downgrades older fallback evidence; same-week equality cannot manufacture exactness.
- [x] Audited existing Week 4 row (`7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8`) through migration 003: canonical cutoff corrected to `2026-09-30T03:00:00Z`, preserved fetch/hash/15,821 values, classified reconstructed. Reviewer replay fix makes the correction no-op when this production-only ID is absent, while a present row with any audited metadata mismatch still raises before mutation.
- [x] Seeded Weeks 1–2 and late current Week 3 from Sleeper's currently available mutable routes as explicit **reconstructed** evidence. No historical row is labeled exact.
- [x] Credential-free GET initializes without `PROJECTION_SNAPSHOT_SCHEDULER_SECRET`; POST alone requires it.
- [x] Re-ran remote DB guards/counts/migrations, focused API tests, full tests, lint, typecheck, build, diff check, and secret scan. No merge, production setting, scheduler activation, dispatch, or deployment performed.

## P0 — Bidding Profiles V1 (John, 2026-09-24)

Architecture: `docs/BIDDING-PROFILES-PLAN.md`

- [ ] **PR1: Dedicated projection-snapshot backend (PR #9 open; correction pushed for review)** — Core immutable forced-RLS tables, explicit immutable provenance, DST-aware cutoff/window guards, transactional/idempotent service-role RPC with honest conflicts, managed Function, Sleeper compaction/hash, tests, and operations docs are complete. Dedicated project `xduqpomhjdlgmtmmkfed` has reconstructed Weeks 1–4 with audited metadata/counts; no historical exact evidence is fabricated. Deployment/app settings, merge, scheduler activation, and production deployment remain owner-controlled.
- [ ] **PR2: Canonical bid evidence and manager profile math** — Expand Sleeper transaction types; classify completed wins and legitimate same-batch losses; reject invalid/unmatched failures; dedupe contingency/drop-path claims; reconstruct pre-bid FAAB; select each manager's top three canonical bids; calculate capped event ratios, geometric multiplier, budget-constrained state, style, and confidence. Add frozen fixtures and boundary/edge tests.
- [ ] **PR3: Bidding profiles UI** — Show top-three evidence, historical baseline/provenance, constrained marker, multiplier, style, confidence, predicted willingness, and current-FAAB-capped feasible bid. Browser-test on a real Sleeper guillotine league.

## Constraints

- Feature branch and PR only; never push directly to `main`.
- No production deployment.
- Dedicated Supabase project; do not use another app's database.
- No per-league weekly roster/ownership/needs snapshots in V1.
- Existing historical weeks are labeled reconstructed; only prospectively captured snapshots are exact.
- Formula constants are versioned and tested in code.
