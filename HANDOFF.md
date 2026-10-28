# HANDOFF — Suggested Bids independently non-worsening swaps

## Status

Implemented on isolated branch `fix/suggested-bids-non-worsening` from exact main base `97bef73b09a6766784a5f9a608eaa012e683c2fc`. Owner source: Discord `1565045421162889416`.

The branch is review-only. Do not merge, auto-merge, delete its branch/environment, deploy, dispatch workflows, or mutate provider/database/live-user state. Unrelated PR #24 was not modified or used.

## Confirmed root cause

1. `buildStablePositionDropQueue` used raw same-source positional VORP only to order original-roster drops; it did not prove a target-for-drop transaction preserved durable value.
2. Eligibility compared the target's gross weekly and ROS totals directly with the drop's gross totals. Gross totals across QB/RB/WR/TE are not position-adjusted and can make a plentiful backup QB look more valuable than a scarce starting RB.
3. Later cards were admitted and priced when `scenarioWeeklyGain >= 0` after earlier top targets were optimistically inserted. The card's visible gain/rank were separately calculated against the real roster, allowing contradictory harmful cards such as `-7.7 pts`, `#2 → #5`.

## Formula before / after

Before:

- Drop ordering only: `drop raw VORP = drop value − same-position replacement`.
- Eligibility: `target weekly > drop weekly && target gross ROS > drop gross ROS && conditional scenario gain >= 0`.
- Pricing: conditional risk/gain after assumed earlier wins.

After, for every displayed transaction independently:

- `standalone roster = actual current roster − drop + target`.
- Require `optimizedWeekly(standalone) − optimizedWeekly(actual) >= 0`.
- Require `afterOverallRank <= beforeOverallRank`.
- With complete per-transaction calibration, durable delta is `(targetValue − replacement[targetPosition]) − (dropValue − replacement[dropPosition])`; require delta `>= 0` and require weekly or durable strict improvement.
- Conservative fallback: if target/drop values or either native-position baseline is absent, reject cross-position swaps. A same-position swap may use `targetValue − dropValue` because its unknown common baseline cancels exactly. Never compare gross ROS with net VORP.
- Eligibility, sorting, and pricing use standalone impact/risk. Sequential state is retained only for truthful budget reservation/scenario bookkeeping.

The existing optimizer continues to model native slots, FLEX, and SUPER_FLEX; therefore independently safe/useful cross-position roster rebalancing remains available.

## Code and tests

Changed only:

- `src/logic/weeklyBidPlan.ts`
- `src/logic/weeklyBidPlan.test.ts`
- `PROGRESS.md`
- `HANDOFF.md`

Synthetic tests cover the reported starting-RB→backup-QB failure shape, an unsafe later card that only works after an unguaranteed earlier win, every-card weekly/rank invariants, same-position fallback, safe FLEX/SUPER_FLEX cross-position rebalancing, complete/partial/missing positional calibration, and existing cap/budget/streamer semantics.

## Validation / hosted QA

Implementation commit: `bc8fa61ec51b700d1e2f986d16a777934b015517`.

Local gates passed:

- focused Suggested Bids: 22/22
- full frontend: 390/390 across 47 files
- API: 61/61
- TypeScript typecheck: passed
- production build: passed
- changed-file Oxlint: 0 warnings / 0 errors
- `git diff --check`: passed
- bounded privacy/secret review: only synthetic player/team IDs; no screenshot, private league/user IDs, credentials, or secret values added

Final PR head, PR URL, natural CI, exact preview URL, and hosted desktop/mobile QA evidence are recorded in the PR description/status because a commit cannot contain its own final SHA.
