# HANDOFF — Suggested Bids no-harm outcome tree + transaction VORP

## Status / owner requirements

Existing review-only PR #28 branch `fix/suggested-bids-non-worsening` started exactly at `14041a450ff01e7660cd03ea142917bd4612afaf` on main base `97bef73b09a6766784a5f9a608eaa012e683c2fc`. Outcome/VORP implementation commit: `dd1b19d149fe764414443d636c368a8ffdcb75dc`.

Owner clarification Discord `1565047528997527744` requires every drop round to account for best, worst, and mixed prior outcomes so an unguaranteed earlier win can never justify team harm. Owner clarification Discord `1565050012399046859` requires pickup suggestions themselves to be VORP-based so gross QB totals cannot dominate the roster. The full verbatim wording is preserved in `PROGRESS.md`.

## Implemented semantics

For every position-player target/drop pair, using one source for both player values:

- `targetVorp = targetValue - replacement[targetPosition]`
- `dropVorp = dropValue - replacement[dropPosition]`
- `transactionGain = targetVorp - dropVorp`
- require `transactionGain >= 0`

Cross-position transactions fail closed unless both player values and both native-position baselines are finite. Same-position fallback may use `targetValue - dropValue` because the identical baseline cancels. Recommendations sort first by transaction gain, then deterministic survival/risk, optimized weekly impact, and player ID—not gross weekly/ROS/source value across positions.

The original actual-roster guard remains: a displayed card independently must preserve optimized next-week points, not worsen Overall Rank, and improve weekly points or durable transaction VORP. FLEX/SUPER_FLEX therefore still permit legitimate cross-position rebalancing.

For each later position round, prior displayed groups expand to every materially reachable roster. Each prior group has a miss outcome or exactly one displayed target win. A target already present or a drop already gone makes that particular later execution unreachable; it is never double-added/double-dropped. Roster IDs are sorted, deduplicated, and keyed canonically after every group. The later card must preserve optimized weekly points and Overall Rank in every reachable state where it can execute.

Caps remain five position rounds and five displayed targets per round. Therefore the tree stores at most `6^5 = 7,776` states after the fifth group, while the final round evaluates cards against at most `6^4 = 1,296` prior states. Durable VORP and standalone safety prefilter before outcome-state evaluation.

Bid caps/reservation, repeated-target display semantics, DST/K streamer logic, advisory/no-write behavior, and current-main features remain unchanged.

## Files / validation

Changed in the outcome/VORP completion:

- `src/logic/weeklyBidPlan.ts`
- `src/logic/weeklyBidPlan.test.ts`
- `PROGRESS.md`
- `HANDOFF.md`

Regression coverage includes original-safe/all-hit-safe/mixed-harm rejection; explicit all-miss/all-hit/mixed subsets; multiple alternatives and duplicate-target unreachability; high-gross-QB/lower-VORP ordering; transaction-VORP primary and deterministic ties; same-position fallback; complete/partial calibration; FLEX/SUPER_FLEX; original screenshot shape; caps/duplicates; and all-card nonnegative-points/non-worse-rank invariants. The synthetic maximum 5×5 plan and all 7,776 canonical states complete under a generous five-second non-stalling ceiling.

Local gates passed: 27/27 focused Suggested Bids tests; 395/395 frontend tests across 47 files; 61/61 API tests; TypeScript typecheck; production build; changed-file Oxlint (0 warnings/errors); `git diff --check`; bounded privacy/secret/scope review. Final PR head, natural CI checks, exact Azure preview URL, and hosted QA are recorded in PR #28/status because a commit cannot contain its own SHA.

## Boundaries

PR #28 remains review-only. Do not merge/auto-merge, push main, delete the branch/environment, manually deploy or dispatch workflows, or mutate provider/database/live-user data.
