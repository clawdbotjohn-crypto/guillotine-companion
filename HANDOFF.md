# Handoff — Manager bidding profiles + bid predictions (2026-09-25)

## Current state

- Branch: `feat/bidding-behavior-profiles`
- Base: latest `origin/main` after PR #9 merge
- Worktree: `/home/john/guillotine-bidding-fe-work`
- Production/deploy: not touched
- Merge: not performed

The frontend/modeling feature is complete and ready for owner review. It reads the shared immutable snapshot endpoint but keeps all per-league transaction evidence and profile formulas client-side.

## Hard backend gate

All gates passed before the feature branch was created:

1. PR #9 was `MERGED` into `main` at commit `94797606e95774c3e65ef255d2e63e671ca84d50`.
2. Production credential-free `GET https://nice-moss-07ec56310.7.azurestaticapps.net/api/projection-snapshots` returned HTTP 200 with explicit stored/effective provenance and snapshot rows.
3. Dedicated project `xduqpomhjdlgmtmmkfed` contained exactly reconstructed 2026 decision Weeks 1–3; there were no exact rows and no Week 4 row. Week 4 remains free for the first prospective Tuesday exact capture.

No backend duplicate, schema/migration, credential, or workaround was added.

## Architecture and real data mapping

- `useAllTransactions()` supplies `Map<transactionWeek, Transaction[]>` from Sleeper. The model maps transaction/matchup week N to snapshot decision week N+1, matching the backend's explicit `requestedPlayingWeek = decisionWeek - 1` semantics.
- Canonical events include successful waiver bids plus failed bids only when Sleeper says another owner claimed the player **and** a different manager's completed winner exists for the same player, week/leg, and processing timestamp.
- Invalid roster failures and unmatched failures are excluded. Same manager/player/processing-batch contingency or drop paths collapse to one event, keeping the highest amount with deterministic winner/time/ID tie-breaking.
- Historical FAAB is reconstructed at claim submission time from the league's initial budget, prior completed waiver spend, and exposed FAAB transfers. If public evidence cannot explain a bid, the accepted amount is used only as an explicit proved lower bound (`inferred-minimum`) and lowers confidence.
- Each manager's top three canonical bids are selected by amount with deterministic recency/player/ID ties.
- Historical projection reads use only public `GET /api/projection-snapshots?season=&decisionWeek=`. No service role or scheduler secret enters frontend source or bundles.
- Snapshot rows are converted to ROS projections and passed through the existing Weeks-as-Starter baseline formula. V1 uses immutable projection evidence and static league setup; the UI explicitly says it does not replay unavailable historical rosters, ownership, needs, position weakness, survivor state, or exact lineup context.
- The current target's raw baseline always uses live Sleeper ROS projections, independent of the user's optional display ranking source.

## Formula behavior

Versioned constants live in `BIDDING_PROFILE_MODEL_V1`:

- maximum evidence: 3
- minimum usable baseline: $1
- budget-constrained threshold: 90% of pre-bid FAAB
- conservative: multiplier `< 0.85`
- standard: `0.85–1.15` inclusive
- aggressive: `> 1.15`

Per event:

- `effectiveBaseline = min(historicalWeeklyBaseline, faabAvailableBeforeBid)`
- `eventRatio = actualBid / effectiveBaseline`
- zero/tiny denominators and zero ratios remain visible but are excluded from logarithmic aggregation

Per manager/current target:

- `managerMultiplier = exp(mean(log(eventRatio)))`
- `predictedWillingness = currentWeeklyBaseline * managerMultiplier`
- `feasiblePredictedBid = min(predictedWillingness, currentFaab)`

Confidence is high only for three usable exact, unconstrained, transaction-ledger rows; medium requires at least two strong rows (or three usable including a strong row); reconstructed-only, censored-only, sparse, or uncertain-ledger profiles are low; no usable ratio is insufficient.

## UI

`Waivers` now has a `Manager bid profiles` section:

- live Sleeper target-player selector;
- one accessible expandable summary per manager;
- multiplier, style, confidence, and usable/evidence counts;
- raw current baseline, uncapped willingness, feasible/capped bid, current FAAB;
- evidence rows with actual bid, raw/effective historical baseline, ratio, pre-bid FAAB, ledger quality, outcome, exact/reconstructed/fallback provenance, constrained marker, and collapsed contingency count;
- loading, empty, endpoint error/retry, current-baseline-unavailable, and manager-insufficient states.

## Tests and verification

New deterministic coverage:

- completed wins and proved legitimate losses;
- invalid roster and unmatched failure exclusion;
- duplicate contingency/drop-path collapse;
- prior spend, FAAB transfer, and impossible-ledger lower bound;
- top-three order/ties;
- effective-baseline cap and constrained observations;
- zero/tiny baseline and zero bid;
- exact/reconstructed/uncertain confidence;
- geometric mean and exact style boundaries;
- exhausted current FAAB preserving willingness while capping feasibility;
- snapshot week/scoring conversion;
- loading/empty/error/retry/insufficient/explainability UI states.

Validation completed:

- frontend: 21 files, 128/128 tests passed
- API regression: 36/36 passed
- lint: 0 warnings/errors
- typecheck: passed
- production build: passed
- `git diff --check`: passed
- changed-file secret scan: passed
- independent review: no high findings; its one medium finding (a single failed snapshot coordinate rejected the whole batch) was fixed with per-coordinate settled reads, retained successful evidence, an explicit partial-data warning, and a regression test

## Browser QA

Used John's real 2026 32-team Sleeper guillotine league `SeaMex Guillotine` (`1312112493526536192`) against the live production snapshot GET through a local dev proxy.

Verified:

- actual W1–W3 transaction evidence produced 32 manager profiles;
- reconstructed rows stayed labeled reconstructed and all current confidence reflected that limitation;
- raw baseline, willingness, feasible bid, current FAAB, evidence ratio, ledger, and provenance rendered correctly;
- native details/summary and labeled target select were keyboard/accessibility-friendly;
- 390×844 mobile: no horizontal overflow, 336px section inside viewport, 44px select target;
- 1280×900 desktop: no horizontal overflow;
- browser console: no errors.

## Deferred honestly

- Historical roster/ownership/needs/position-weakness/survivor/elimination replay.
- Claims of exact historical Weeks-as-Starter context beyond immutable snapshot provenance.
- Per-league backend profile/history persistence.
- Automatic bid submission or predicting whether a manager will target a player.

## Owner next steps

1. Review the feature PR and its preview.
2. Merge only when satisfied.
3. Promote/deploy through John's owner-controlled process; this branch does not deploy production.
