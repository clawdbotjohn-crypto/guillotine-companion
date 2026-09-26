# Guillotine Companion — Progress

## 🚨 PR #10 owner review — redesign bidding predictions inside player cards (John, 2026-09-25; feedback continuing)

**Status: implemented and verified on the PR #10 branch; awaiting owner review.**

- [x] Remove the standalone **Manager bid profiles** section from Waivers.
- [x] Put manager bid predictions directly on each waiver player card instead.
- [x] Compact the collapsed player-card layout to make room:
  - Hide `14/14 starter weeks` until the card is expanded.
  - Remove the duplicate `• WR4` text before starter weeks (John had already requested its removal).
  - Shorten projection copy where possible, e.g. `18.8 proj.`.
  - Remove the right-side `21%`; useful, but lower priority than predicted bids.
- [x] Collapsed player card, right side: show the **top 3 highest predicted manager bids**, each with owner/username. For each visible prediction show only username, predicted bid, multiplier, and category; also consider remaining FAAB because it is decision-useful. Do **not** show confidence labels.
- [x] Clicking a player expands that same card. Expanded card should show the top 10 predicted bids, with a **Show more…** control when additional managers exist.
- [x] Expanded manager rows should retain the useful Manager-profile evidence but remove implementation language such as `reconstructed` and confidence labels.
- [x] Simplify confusing `Raw`, `Willingness`, and `Feasible` columns. Candidate user-facing fields are **FAAB available** and **Predicted bid**. Before revising copy, explain to John exactly what all three current values mean.
- [x] Simplify each historical evidence row from six numbers to: **Suggested** value (the historical weekly baseline used by the multiplier), **Actual bid**, **Pre-bid FAAB**, and **Ratio**.
- [x] Replace the confusing `Transaction Wk 1 · decision Wk 2` display with one user-facing label for the week that just finished: **`Wk 1`** in this example. Keep the decision-week mapping internal.
- [x] Rename **Evidence** to **Bidding History**.
- [x] Remove visible `Model bidding-profile-v1` copy and the duplicate FAAB footer; these are implementation details, and current FAAB belongs in the manager prediction fields.
- [x] Add a Teams **Bid Profiles** sub-tab: list managers from most to least aggressive, show current FAAB, multiplier and category, and expand a manager to show the same simplified Bidding History/behavior details used on Waivers.
- [x] Week 1/no manager behavior: retain the existing overall **Predicted winning bid** rather than fabricating manager-specific predictions.
- [x] Add a simple buyer-need signal per manager/player using active-team position strength thirds: top third/strong at the target player's position = **Unlikely buyer**; middle third = **Possible buyer**; bottom third/weak = **Likely buyer**. Treat this as a visible heuristic, not a hidden multiplier in the numeric bid prediction. Reuse existing position-strength logic where possible and handle ties/small leagues honestly.
- [x] Preserve the overall Waivers page structure: same player list, now with top-three manager predictions in collapsed cards and additional manager/team bidding details only after expansion.
- [x] Add focused responsive/browser tests for collapsed density, expansion, top-3/top-10 ordering, Show more behavior, Week-1 fallback, need tiers, Teams Bid Profiles ordering/expansion, and truthful missing-data states.

### Implementation completion — 2026-09-25 19:40 PDT

Implemented the owner revision in the existing PR branch. Waiver cards now show the top three active-manager, FAAB-capped predictions while collapsed and top ten plus Show more when expanded. The full-card toggle is a native button with keyboard support. Player metadata uses the requested Position/Value and Week/Rank labels. Teams now has aggressiveness-sorted Bid Profiles with current FAAB and simplified expandable history/behavior. Buyer likelihood uses active-team positional-strength thirds only and never feeds bid math. Week 1/no canonical history leaves only the overall predicted winning bid. Existing canonical history, snapshot provenance, deduplication, FAAB reconstruction, geometric multiplier, and backend security logic remain intact.

Verification completed: focused owner-requirement tests, full frontend suite, API suite, lint, TypeScript/build, production build, diff check, changed-file secret scan, and desktop/mobile SeaMex browser QA. Final counts, hosted-preview evidence, commit, and PR status are recorded in `HANDOFF.md`.

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
