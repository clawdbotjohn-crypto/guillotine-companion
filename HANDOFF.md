# HANDOFF — Suggested Bids no-harm outcome tree + transaction VORP

## Status / owner requirements

Existing review-only PR #28 branch `fix/suggested-bids-non-worsening` started this follow-up exactly at required head `21f0340486ca3c655d9462667bed2b5dccef5b60` on required main base `97bef73b09a6766784a5f9a608eaa012e683c2fc`. Earlier outcome/VORP implementation commit: `dd1b19d149fe764414443d636c368a8ffdcb75dc`.

Owner clarification Discord `1565047528997527744` requires every drop round to account for best, worst, and mixed prior outcomes so an unguaranteed earlier win can never justify team harm. Discord `1565050012399046859` requires pickup suggestions themselves to be VORP-based so gross QB totals cannot dominate the roster. The exact primary-sequencing owner source is Discord `1565087484512305283`: each completed position row's first target is gone after processing and must not repeat later. Full verbatim wording is preserved in `PROGRESS.md`.

## Implemented semantics

For every position-player target/drop pair, using one source for both player values:

- `targetVorp = targetValue - replacement[targetPosition]`
- `dropVorp = dropValue - replacement[dropPosition]`
- `transactionGain = targetVorp - dropVorp`
- require `transactionGain >= 0`

Cross-position transactions fail closed unless both player values and both native-position baselines are finite. Same-position fallback may use `targetValue - dropValue` because the identical baseline cancels. Recommendations sort first by transaction gain, then deterministic survival/risk, optimized weekly impact, and player ID—not gross weekly/ROS/source value across positions.

The original actual-roster guard remains: a displayed card independently must preserve optimized next-week points, not worsen Overall Rank, and improve weekly points or durable transaction VORP. FLEX/SUPER_FLEX therefore still permit legitimate cross-position rebalancing.

For each later position round, prior displayed groups expand to every materially reachable roster. Each prior group has a miss outcome or exactly one displayed target win. A target already present or a drop already gone makes that particular later execution unreachable; it is never double-added/double-dropped. Roster IDs are sorted, deduplicated, and keyed canonically after every group. The later card must preserve optimized weekly points and Overall Rank in every reachable state where it can execute.

For every successfully emitted position row, `recommendations[0]` after the existing transaction-VORP comparator/ties is now consumed before candidate generation for the next row. Consumed primary IDs are excluded from all later recommendations, including fallbacks, so the next eligible target promotes. The outcome tree still keeps both team-wins (changed roster) and team-loses (unchanged roster) branches; consumption is an additional display-availability constraint in both, not a replacement for safety reachability. This specifically assumes the Suggested Bids claim was validly submitted and reached processing—the player is then gone to this team or another manager—and does not generalize to unsubmitted or invalid claims.

Only an emitted row's canonical primary is consumed. Same-round alternatives remain visible and can recur later unless they become a later primary or existing branch-specific reachability excludes them. Empty/skipped rows consume nothing. DST/K streamers do not use this position-primary set.

Caps remain five position rounds and five displayed targets per round. Therefore the safety tree can still store at most `6^5 = 7,776` states after the fifth group, while the final round evaluates cards against at most `6^4 = 1,296` prior states. Durable VORP and standalone safety prefilter before outcome-state evaluation.

Bid/budget/opponent/duplicate caps and reservation, standalone best/worst/mixed no-harm, calibration fallback, FLEX/SUPER_FLEX, DST/K streamer logic, advisory/no-write behavior, and current-main features remain unchanged.

## Files / validation

Changed in the outcome/VORP completion:

- `src/logic/weeklyBidPlan.ts`
- `src/logic/weeklyBidPlan.test.ts`
- `PROGRESS.md`
- `HANDOFF.md`

Regression coverage includes the Aaron-Jones-shaped repeated-primary fixture; promotion to distinct Round 2/3 primaries; exclusion from every later fallback; processed-claim win/loss roster branches; recurring same-round alternatives; deterministic equal-cost/equal-value ordering; original-safe/all-hit-safe/mixed-harm rejection; explicit all-miss/all-hit/mixed subsets; multiple alternatives and duplicate-target unreachability; high-gross-QB/lower-VORP ordering; transaction-VORP primary and deterministic ties; same-position fallback; complete/partial calibration; FLEX/SUPER_FLEX; original screenshot shape; caps/duplicates; and all-card nonnegative-points/non-worse-rank invariants. The synthetic maximum 5×5 safety enumerator and all 7,776 canonical states remain covered under a generous five-second non-stalling ceiling; display-row recommendation counts now reflect consumed primaries and branch-specific reachability without weakening that bound.

Primary-sequencing implementation commit: `9187cd6168a76b6cda2d4648684f6a2902af02e2`. Local gates passed: 30/30 focused Suggested Bids tests; 398/398 frontend tests across 47 files; 61/61 API tests; TypeScript typecheck; production build; changed-file Oxlint (0 warnings/errors); `git diff --check`; bounded privacy/secret/scope review. Exact final PR head, natural CI checks, Azure preview URL, and hosted QA are recorded in PR #28/status because a commit cannot contain its own SHA.

## Boundaries

PR #28 remains review-only. Do not merge/auto-merge, push main, delete the branch/environment, manually deploy or dispatch workflows, or mutate provider/database/live-user data.
