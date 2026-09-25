# Guillotine Companion — Progress

## P0 — Bidding Profiles V1 (John, 2026-09-24)

Architecture: `docs/BIDDING-PROFILES-PLAN.md`

- [x] **PR1: Dedicated projection-snapshot backend (authorized first)** — Implemented immutable forced-RLS tables, transactional/idempotent service-role RPC, authenticated POST and public credential-free GET managed Function, deterministic Sleeper compaction/hash, Tuesday 23:00 UTC scheduler workflow, tests, and operations documentation. Applied only to dedicated project `xduqpomhjdlgmtmmkfed`. Seeded 2026 Week 4 cutoff with 15,821 rows; retry reused snapshot `7a6cfceb-c1f8-4eb5-b64b-d84db2ac38e8` and hash `ed711697f3b1e00a5fd81b09355b58ba566cccbd88a54d4cf4eb762226b3759d`. Deployment/app settings and GitHub secrets/variables remain John-controlled setup steps documented in `docs/PROJECTION-SNAPSHOTS.md`.
- [ ] **PR2: Canonical bid evidence and manager profile math** — Expand Sleeper transaction types; classify completed wins and legitimate same-batch losses; reject invalid/unmatched failures; dedupe contingency/drop-path claims; reconstruct pre-bid FAAB; select each manager's top three canonical bids; calculate capped event ratios, geometric multiplier, budget-constrained state, style, and confidence. Add frozen fixtures and boundary/edge tests.
- [ ] **PR3: Bidding profiles UI** — Show top-three evidence, historical baseline/provenance, constrained marker, multiplier, style, confidence, predicted willingness, and current-FAAB-capped feasible bid. Browser-test on a real Sleeper guillotine league.

## Constraints

- Feature branch and PR only; never push directly to `main`.
- No production deployment.
- Dedicated Supabase project; do not use another app's database.
- No per-league weekly roster/ownership/needs snapshots in V1.
- Existing historical weeks are labeled reconstructed; only prospectively captured snapshots are exact.
- Formula constants are versioned and tested in code.
