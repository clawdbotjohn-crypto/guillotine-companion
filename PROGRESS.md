# Guillotine Companion — Progress

## ✅ Bidding-behavior profiles + bid predictions FE PR #10 (2026-09-25)

- PR: <https://github.com/clawdbotjohn-crypto/guillotine-companion/pull/10>
- Preview: <https://nice-moss-07ec56310-10.centralus.7.azurestaticapps.net>

- [x] Passed the hard backend gate before branching: PR #9 is merged to `main`; production credential-free GET returns explicit effective provenance; dedicated DB contains reconstructed decision Weeks 1–3 only and no Week 4 row.
- [x] Added versioned, strongly typed `bidding-profile-v1` modeling: completed wins plus proved same-batch losses; invalid/unmatched failure rejection; manager/player/batch contingency collapse; transaction-ledger pre-submission FAAB; deterministic top three; capped event ratios; geometric multiplier; style thresholds `<0.85`, `0.85–1.15`, `>1.15`; evidence-aware confidence; and willingness vs current-FAAB-capped prediction.
- [x] Added credential-free projection snapshot client/types/query hook. Historical evidence uses effective snapshot provenance and never promotes reconstructed/fallback evidence to exact.
- [x] Added the Waivers `Manager bid profiles` UI with live Sleeper target baselines, all-manager summaries, raw baseline/willingness/feasible bid, multiplier/style/confidence, expandable top-three rows, explicit provenance/ledger/budget/duplicate details, and loading/empty/error/insufficient states.
- [x] Kept V1 honest: historical baselines reuse the Weeks-as-Starter formula with immutable snapshot rows and static league setup, while clearly deferring unavailable historical roster/ownership/needs/survivor replay.
- [x] Added deterministic fixtures and 17 new logic/component/API-hook tests covering wins, legitimate losses, invalid/unmatched failures, duplicate paths, ledger spend/transfers, inferred budget lower bounds, top-three tie-breaking, tiny/zero baseline, zero bid, constrained observations, exact/reconstructed/fallback confidence, thresholds, exhausted FAAB, partial snapshot failure retention, snapshot filtering, explainability, and UI states.
- [x] Browser-tested the real 2026 32-team `SeaMex Guillotine` Sleeper league against the live production snapshot GET at desktop and 390px mobile: 32 manager profiles, real W1–W3 evidence, reconstructed labels, no horizontal overflow, 44px select target, and no console errors.
- [x] Full 128-test suite, 36 API regressions, lint, typecheck, production build, diff review, and secret scan pass. Independent review's one medium partial-snapshot resilience finding was fixed and regression-tested; no high findings.
- [ ] Owner review/merge only. No production deploy or self-merge.

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

- [x] **PR1: Dedicated projection-snapshot backend (merged as PR #9)** — Core immutable forced-RLS tables, explicit immutable provenance, DST-aware cutoff/window guards, transactional/idempotent service-role RPC with honest conflicts, managed Function, Sleeper compaction/hash, tests, and operations docs are complete. Dedicated project `xduqpomhjdlgmtmmkfed` retains reconstructed Weeks 1–3 only; the too-early W4 seed was guard-deleted, the exact W4 coordinate is free, and no historical exact evidence exists. Immutable DB-owned season calendar coordinates and start/finish window guards are enforced.
- [x] **PR2/PR3: Canonical evidence, profile math, and explainable UI (feature PR ready)** — Strongly typed classification, duplicate handling, FAAB reconstruction, top-three selection, ratio/multiplier/style/confidence, public snapshot reads, live prediction, evidence UI, fixtures, real-league browser QA, and verification are complete on `feat/bidding-behavior-profiles`.

## Constraints

- Feature branch and PR only; never push directly to `main`.
- No production deployment.
- Dedicated Supabase project; do not use another app's database.
- No per-league weekly roster/ownership/needs snapshots in V1.
- Existing historical weeks are labeled reconstructed; only prospectively captured snapshots are exact.
- Formula constants are versioned and tested in code.
